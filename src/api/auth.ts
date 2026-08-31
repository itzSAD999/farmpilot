import { supabase } from '../lib/supabase';
import { phoneToSyntheticEmail } from '../lib/phone';

export type Profile = {
  id: string;
  phone?: string | null;
  email?: string | null;
  full_name?: string | null;
  preferred_language: 'en' | 'tw' | 'ee' | 'gaa' | 'dag';
  auth_method: 'phone' | 'email';
  created_at: string;
};
/**
 * Maps Supabase Auth errors to friendly, farmer-facing messages.
 */
function handleAuthError(error: any): Error {
  const msg = error.message || String(error);

  // Network failures
  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return new Error('Cannot connect to the network. Please check your internet connection and try again.');
  }

  // Duplicate accounts
  if (msg.toLowerCase().includes('already registered') || error.status === 422 || error.code === 'user_already_exists') {
    return new Error('This number is already registered. Try signing in instead.');
  }

  // Invalid credentials
  if (msg.toLowerCase().includes('invalid login credentials')) {
    return new Error('The phone number or password you entered is incorrect. Please try again.');
  }

  // Password too short, etc.
  if (msg.toLowerCase().includes('password should be')) {
    return new Error('Your password is too weak. Please use at least 6 characters.');
  }

  // Fallback for everything else to ensure no raw DB errors leak
  return new Error('Something went wrong. Please try again or contact support if the issue continues.');
}

/**
 * Signs up a new farmer using their phone number.
 * Under the hood, this uses a synthetic email address to leverage Supabase's email auth,
 * while the real phone number is stored in the user metadata (and mirrored to the profile).
 */
export async function signUpWithPhone(phone: string, password: string, fullName: string) {
  const syntheticEmail = phoneToSyntheticEmail(phone);

  const { data, error } = await supabase.auth.signUp({
    email: syntheticEmail,
    password,
    options: {
      data: {
        phone,
        full_name: fullName,
        auth_method: 'phone'
      }
    }
  });

  if (error) {
    throw handleAuthError(error);
  }
  return data;
}

/**
 * Signs in an existing farmer using their phone number.
 */
export async function signInWithPhone(phone: string, password: string) {
  const syntheticEmail = phoneToSyntheticEmail(phone);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  });

  if (error) {
    throw handleAuthError(error);
  }
  return data;
}

/**
 * Signs up a user using standard email auth.
 */
export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        real_email: email,
        full_name: fullName,
        auth_method: 'email'
      }
    }
  });

  if (error) {
    throw handleAuthError(error);
  }
  return data;
}

/**
 * Signs in a user using standard email auth.
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw handleAuthError(error);
  }
  return data;
}

/**
 * Signs out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw handleAuthError(error);
  }
}

/**
 * Fetches the profile of the currently authenticated user.
 */
export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    throw handleAuthError(error);
  }

  return data;
}

/**
 * Links a real email address to an existing phone-based account.
 */
export async function linkEmail(email: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to link an email.');

  // Note: True email linking would require updating the Supabase Auth email 
  // (which would trigger confirmation flows) or just saving it to the profile.
  // For Phase 11, we store it in the profile and user metadata.
  const { error: updateAuthError } = await supabase.auth.updateUser({
    data: { real_email: email }
  });

  if (updateAuthError) {
    throw handleAuthError(updateAuthError);
  }

  const { error: updateProfileError } = await supabase
    .from('profiles')
    .update({ email })
    .eq('id', user.id);

  if (updateProfileError) {
    throw handleAuthError(updateProfileError);
  }
}

/**
 * Updates the user's preferred language.
 */
export async function updateLanguage(lang: 'en' | 'tw' | 'dag') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to update your language preference.');

  const { error } = await supabase
    .from('profiles')
    .update({ preferred_language: lang })
    .eq('id', user.id);

  if (error) {
    throw handleAuthError(error);
  }
}



/**
 * Updates the current user's profile.
 */
export async function updateProfile(updates: Partial<Profile>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to update your profile.');

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    throw handleAuthError(error);
  }
}
