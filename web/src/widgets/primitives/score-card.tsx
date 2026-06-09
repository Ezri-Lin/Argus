import { color, fontFamily } from "@/design/tokens";
import { CardShell } from "./card-shell";
import { DeltaChip } from "./delta-chip";

type ScoreCardProps = {
  label: string;
  value: number | string;
  delta?: number;
  caption?: string;
  title?: string;
  onClick?: () => void;
};

export function ScoreCard({
  label,
  value,
  delta,
  caption,
  title,
  onClick,
}: ScoreCardProps) {
  const direction: "up" | "down" | "flat" =
    delta == null ? "flat" : delta >= 0 ? "up" : "down";

  return (
    <CardShell>
      <div
        className="flex h-full flex-col"
        style={{ padding: 16, cursor: onClick ? "pointer" : undefined }}
        onClick={onClick}
      >
        {title && (
          <div style={{
            fontFamily, fontSize: 10, fontWeight: 560,
            color: color.textMuted, marginBottom: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{title}</div>
        )}
        <div style={{
          fontFamily, fontSize: 12, fontWeight: 600,
          color: color.textSecondary,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{label}</div>

        <div style={{
          fontFamily, fontSize: 46, fontWeight: 760,
          color: color.textPrimary,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1, letterSpacing: "-0.05em",
          marginTop: 12,
        }}>
          {value}
        </div>

        {caption && (
          <div style={{
            fontFamily, fontSize: 12, fontWeight: 500,
            color: color.textMuted, marginTop: 4,
          }}>{caption}</div>
        )}

        {delta != null && (
          <div style={{ marginTop: 12 }}>
            <DeltaChip direction={direction}>
              {Math.abs(delta).toFixed(2)}
            </DeltaChip>
          </div>
        )}

        <div className="flex-1" />
      </div>
    </CardShell>
  );
}
