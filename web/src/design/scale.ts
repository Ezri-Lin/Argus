/**
 * Centralized scaling functions for widget text/layout.
 * Pure functions — no side effects, no DOM access.
 * All widgets MUST call these, never inline scaling constants.
 */

/** Clamp x to [lo, hi] */
export const clamp = (x: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, x));

/** Font size proportional to sqrt(cell area), clamped to [min, max] */
export const areaFontSize = (
  area: number,
  ratio: number,
  min: number,
  max: number,
) => clamp(Math.sqrt(area) * ratio, min, max);

/**
 * CJK-aware character width estimation (in em units).
 * CJK / fullwidth chars ≈ 1.0em, tabular digits ≈ 0.52em, other ≈ 0.5em.
 */
export const charW = (ch: string): number =>
  /[\u3000-\u9fff\uff00-\uffef]/.test(ch)
    ? 1.0
    : /[0-9.,]/.test(ch)
      ? 0.52
      : 0.5;

/** Estimate total width in em for a string (CJK-aware). */
export const estEm = (s: string): number =>
  [...s].reduce((w, c) => w + charW(c), 0);

/** Compact number: 10000→"10k", 1500000→"1.5M". Does NOT compact percentages or small decimals. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
