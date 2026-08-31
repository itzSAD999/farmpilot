import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type Farm = Database['public']['Tables']['farms']['Row'];

export interface CreateFarmInput {
  name: string;
  district?: string | null;
  region?: string | null;
  total_area_acres: number;
}

export type UpdateFarmInput = Partial<CreateFarmInput>;

/**
 * Maps Supabase farm-related errors to farmer-friendly messages.
 */
function handleFarmError(error: any): Error {
  const msg = error.message || String(error);

  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return new Error('Cannot connect to the network. Please check your internet connection and try again.');
  }

  if (msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('expired') || error.code === 'PGRST301') {
    return new Error('Your session has expired. Any unsaved changes were lost. Please sign in again.');
  }

  if (msg.toLowerCase().includes('not found') || error.code === 'PGRST116') {
     return new Error('This farm was not found, has been deleted, or you do not have permission to view it.');
  }

  // Handle the Postgres CHECK constraint for area
  if (msg.toLowerCase().includes('total_area_acres') && msg.toLowerCase().includes('check')) {
    return new Error('Farm area must be greater than zero acres.');
  }

  return new Error('Something went wrong saving your farm. Please try again.');
}

/**
 * Fetches the current user's farm.
 * Returns null if the user hasn't set up a farm yet.
 */
export async function getFarm(): Promise<Farm | null> {
  // Use getSession() instead of getUser() because getSession() reads from
  // local storage instantly, while getUser() makes a server call that can
  // fail during the brief window while tokens are refreshing.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to view your farm.');

  // RLS restricts to owned rows, so no explicit user_id filter is strictly needed,
  // but we add it anyway as a second line of defence against policy misconfiguration.
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('user_id', session.user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw handleFarmError(error);
  }

  return data;
}

/**
 * Creates a new farm for the current user.
 */
export async function createFarm(input: CreateFarmInput): Promise<Farm> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to create a farm.');

  // Client-side validation for area
  if (input.total_area_acres <= 0) {
    throw new Error('Farm area must be greater than zero acres.');
  }

  const { data, error } = await supabase
    .from('farms')
    .insert({
      ...input,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    throw handleFarmError(error);
  }

  return data;
}

/**
 * Updates an existing farm's details.
 */
export async function updateFarm(id: string | number, input: UpdateFarmInput): Promise<Farm> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to update your farm.');

  if (input.total_area_acres !== undefined && input.total_area_acres <= 0) {
    throw new Error('Farm area must be greater than zero acres.');
  }

  const { data, error } = await supabase
    .from('farms')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id) // Second line of defence
    .select()
    .single();

  if (error) {
    throw handleFarmError(error);
  }

  return data;
}
