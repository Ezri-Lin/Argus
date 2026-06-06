/**
 * Argus design tokens — dark/light theme via CSS variables.
 * SSOT for all visual constants. Components import from here,
 * never hardcode magic values.
 *
 * Colors resolve to `var(--color-*)` CSS custom properties.
 * Theme switching is handled by [data-theme="light"] in globals.css.
 */

function cv(name: string): string {
  return `var(--color-${name})`;
}

export const color = {
  get bg() { return cv("bg"); },
  get card() { return cv("card"); },
  get cardHover() { return cv("card-hover"); },
  get surface() { return cv("surface"); },
  get surface2() { return cv("surface-2"); },
  get surfaceElev() { return cv("surface-elev"); },

  get border() { return cv("border"); },
  get hairline() { return cv("hairline"); },

  get textPrimary() { return cv("text-primary"); },
  get textSecondary() { return cv("text-secondary"); },
  get textMuted() { return cv("text-muted"); },
  get white() { return cv("white"); },

  get accent() { return cv("accent"); },
  get accentSoft() { return cv("accent-soft"); },
  get brand() { return cv("brand"); },

  get pos() { return cv("pos"); },
  get posBg() { return cv("pos-bg"); },
  get posFg() { return cv("pos-fg"); },
  get neg() { return cv("neg"); },
  get negBg() { return cv("neg-bg"); },
  get negFg() { return cv("neg-fg"); },
  get warn() { return cv("warn"); },
  get warnBg() { return cv("warn-bg"); },
  get warnFg() { return cv("warn-fg"); },
  get neu() { return cv("neu"); },

  get treemapPosBorder() { return cv("treemap-pos-border"); },
  get treemapNeuBorder() { return cv("treemap-neu-border"); },
  get treemapNegBorder() { return cv("treemap-neg-border"); },
  get heatGlow() { return cv("heat-glow"); },
} as const;

export const shadow = "var(--shadow)";
export const shadowElev = "var(--shadow-elev)";
export const blur = "18px";

export const fontFamily =
  '"Geist Variable", "HarmonyOS Sans SC", "Source Han Sans SC", "Noto Sans CJK SC", system-ui, sans-serif';

export const radius = {
  card: 14,
  inner: 8,
  pill: 999,
} as const;

export const fontSize = {
  display: 28,
  title: 14,
  body: 13,
  label: 10,
  metricTitle: 10,
  metricLabel: 15,
} as const;
