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

export type MetricMode =
  | "micro"
  | "compact"
  | "regular"
  | "wide"
  | "tall"
  | "hero";

export function pickMetricMode(w: number, h: number): MetricMode {
  const area = w * h;
  const aspect = w / Math.max(1, h);
  if (w < 88 || h < 58 || area < 6500) return "micro";
  if (aspect >= 2.25 && h < 124) return "wide";
  if (aspect <= 0.72 && h >= 112) return "tall";
  if (area >= 42000 && w >= 180 && h >= 150) return "hero";
  if (area < 15000) return "compact";
  return "regular";
}

export function fitPrimaryLine(args: {
  width: number;
  height: number;
  valueEm: number;
  unitEm?: number;
  unitRatio?: number;
  min: number;
  max: number;
  heightRatio: number;
}): number {
  const unitWidth = (args.unitEm ?? 0) * (args.unitRatio ?? 0);
  const totalEm = args.valueEm + unitWidth + (unitWidth > 0 ? 0.35 : 0);
  return clamp(
    Math.min(args.width / Math.max(0.1, totalEm), args.height * args.heightRatio),
    args.min,
    args.max,
  );
}

/** Compact number: 10000→"10k", 1500000→"1.5M". Does NOT compact percentages or small decimals. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
