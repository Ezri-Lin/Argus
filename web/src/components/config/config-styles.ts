import { color, radius } from "@/design/tokens";

export const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  color: color.textPrimary,
  background: color.surface2,
  border: `1px solid ${color.hairline}`,
  borderRadius: radius.inner,
  outline: "none",
} as const;

export const smallInput = { ...inputStyle, padding: "4px 8px", fontSize: 12 } as const;

const btnBase = {
  padding: "8px 16px",
  fontSize: 12,
  fontWeight: 650,
  borderRadius: 999,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "opacity 0.15s",
} as const;

/** Primary: solid bg, contrasting text. Used for Save, Add, confirm actions. */
export const btnPrimary = {
  ...btnBase,
  color: color.bg,
  background: color.accent,
  border: "none",
} as const;

/** Secondary: outlined, muted. Used for Refresh, Parse, Test, AI actions. */
export const btnSecondary = {
  ...btnBase,
  color: color.textSecondary,
  background: "transparent",
  border: `1px solid ${color.hairline}`,
} as const;

/** Danger: red text, outlined. Used for Delete, Remove actions. */
export const btnDanger = {
  ...btnBase,
  color: color.neg,
  background: "transparent",
  border: `1px solid ${color.hairline}`,
} as const;

/** Ghost: minimal, for inline adds (+) and small toggles. */
export const btnGhost = {
  ...btnBase,
  padding: "4px 10px",
  fontSize: 11,
  color: color.textMuted,
  background: "transparent",
  border: `1px dashed ${color.hairline}`,
  borderRadius: 6,
} as const;
