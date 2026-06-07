import { color, radius } from "@/design/tokens";

export const inputStyle = {
  width: "100%", padding: "8px 10px", fontSize: 13,
  color: color.textPrimary, background: color.surface2,
  border: `1px solid ${color.hairline}`, borderRadius: radius.inner, outline: "none",
} as const;

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{children}</div>;
}

export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}`, textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color.textPrimary, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 10, color: color.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function ToggleRow({ label, desc, enabled, onToggle }: { label: string; desc: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      <div>
        <div style={{ fontSize: 13, color: color.textPrimary }}>{label}</div>
        <div style={{ fontSize: 10, color: color.textMuted, marginTop: 2 }}>{desc}</div>
      </div>
      <button onClick={onToggle} style={{ width: 36, height: 20, borderRadius: 10, border: "none", background: enabled ? color.textPrimary : color.surfaceElev, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
        <span style={{ width: 16, height: 16, borderRadius: "50%", background: enabled ? color.bg : color.textMuted, position: "absolute", top: 2, left: enabled ? 18 : 2, transition: "left 0.2s" }} />
      </button>
    </div>
  );
}
