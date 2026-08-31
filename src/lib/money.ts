/**
 * Money formatting utilities.
 *
 * All money in the system is stored as INTEGER PESEWAS.
 * Conversion to cedis happens ONLY at render time, here.
 * No arithmetic is ever performed on a cedi value.
 */

/**
 * Convert pesewas to a formatted GHS string.
 * @example formatCedis(523456) => "GHS 5,234.56"
 */
export function formatCedis(pesewas: number): string {
  const cedis = pesewas / 100;
  return `GHS ${cedis.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Convert a cedi input (e.g. from a form field) to pesewas.
 * @example cedisToPesewas(52.34) => 5234
 */
export function cedisToPesewas(cedis: number): number {
  return Math.round(cedis * 100);
}

/**
 * Convert pesewas to cedis as a number (for display in input fields).
 */
export function pesewasToCedis(pesewas: number): number {
  return pesewas / 100;
}
