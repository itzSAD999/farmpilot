/**
 * Splits a shared cost proportionally across seasons by planted acreage —
 * the Weekly Check-in's core rule: a 1-acre and a 5-acre active season
 * sharing a category should not absorb the same share of a combined cost.
 * Falls back to an even split only if no season in the group has a usable
 * area (all zero). The returned amounts always sum to exactly
 * `totalPesewas` — any pesewa lost to rounding is corrected onto the
 * largest share, not silently dropped.
 *
 * Extracted from WeeklyCatchUp.tsx so the split math itself — not just
 * the UI around it — can be unit tested directly (see splitByAcreage.test.ts).
 */
export function splitByAcreage(totalPesewas: number, areas: number[]): number[] {
  if (areas.length === 0) return [];

  const totalArea = areas.reduce((a, b) => a + b, 0);
  const shares = totalArea > 0
    ? areas.map((area) => area / totalArea)
    : areas.map(() => 1 / areas.length);

  const amounts = shares.map((share) => Math.round(totalPesewas * share));

  const roundingDiff = totalPesewas - amounts.reduce((a, b) => a + b, 0);
  if (roundingDiff !== 0) {
    const largestIdx = shares.indexOf(Math.max(...shares));
    amounts[largestIdx] += roundingDiff;
  }

  return amounts;
}
