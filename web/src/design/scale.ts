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
 * Multi-line height constraint (P0 core).
 * Given font sizes and line-height ratios for N lines,
 * scales all sizes down proportionally so the total height
 * fits within availH - 2*padY.
 * Returns the adjusted font sizes (same order as input).
 */
export const fitLines = (
  sizes: number[],
  lineHeights: number[],
  availH: number,
  padY: number,
): number[] => {
  const sum = sizes.reduce((s, fs, i) => s + fs * lineHeights[i], 0);
  const usable = availH - 2 * padY;
  if (sum <= usable) return sizes;
  const scale = usable / sum;
  return sizes.map((fs) => fs * scale);
};

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
