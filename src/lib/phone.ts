/**
 * Phone number utilities for Ghanaian mobile numbers.
 *
 * Domain rules:
 * - Ghana mobile: 10 digits
 * - Starts with 0
 * - Second digit must be 2, 3, or 5 (MTN, Vodafone, AirtelTigo ranges)
 */

/**
 * Normalises a phone number string by stripping spaces, dashes, and brackets.
 * Replaces a +233 or 233 prefix with a leading 0.
 */
export function normalisePhone(input: string): string {
  let cleaned = input.replace(/[\s\-()]/g, '');
  
  if (cleaned.startsWith('+233')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('233')) {
    cleaned = '0' + cleaned.slice(3);
  }
  
  return cleaned;
}

/**
 * Validates a Ghanaian mobile number.
 * Normalises first, then tests the 10-digit pattern.
 */
export function isValidGhanaPhone(input: string): boolean {
  const normalised = normalisePhone(input);
  return /^0[235][0-9]{8}$/.test(normalised);
}

/**
 * Derives a synthetic email address from a phone number.
 * 
 * WHY THIS EXISTS:
 * Target users are smallholder farmers on mobile phones, many with no email address. 
 * But Supabase phone auth sends an OTP, which needs a paid SMS provider (out of scope). 
 * So the farmer sees a phone field, and underneath the client derives a synthetic 
 * email and calls standard email auth. The real number is stored in profiles by a 
 * database trigger. The trade-off is accepted because the phone is an IDENTIFIER, 
 * not a channel.
 */
export function phoneToSyntheticEmail(phone: string): string {
  const normalised = normalisePhone(phone);
  return `${normalised}@farmpilot.local`;
}

/**
 * Formats a phone number for display (e.g. "0241234567" -> "024 123 4567").
 * Assumes the input is already a valid, normalised 10-digit phone number.
 */
export function formatPhoneDisplay(phone: string): string {
  const normalised = normalisePhone(phone);
  if (normalised.length === 10) {
    return `${normalised.slice(0, 3)} ${normalised.slice(3, 6)} ${normalised.slice(6)}`;
  }
  return phone;
}
