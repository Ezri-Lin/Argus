import { color, fontFamily, fontSize } from "@/design/tokens";
import { CardShell } from "./card-shell";
import { DeltaChip } from "./delta-chip";
import { Sparkline } from "./sparkline";

type ScoreCardProps = {
  label: string;
  value: number | string;
  delta?: number;
  caption?: string;
  title?: string;
  sparkline?: number[];
  onClick?: () => void;
};

export function ScoreCard({
  label,
  value,
  delta,
  caption,
  title,
  sparkline,
  onClick,
}: ScoreCardProps) {
  const direction: "up" | "down" | "flat" =
    delta == null ? "flat" : delta >= 0 ? "up" : "down";

  return (
    <CardShell>
      <div
        className="flex h-full flex-col"
        style={{ cursor: onClick ? "pointer" : undefined }}
        onClick={onClick}
      >
        {/* Title row */}
        <div style={{ flexShrink: 0, marginBottom: 4, paddingLeft: 2 }}>
          <div style={{
            fontFamily, fontSize: fontSize.title, fontWeight: 680,
            color: color.textPrimary, lineHeight: 1.2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{title || label}</div>
          {title && (
            <div style={{
              fontFamily, fontSize: fontSize.label, fontWeight: 560,
              color: color.textMuted, lineHeight: 1.2, marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{label}</div>
          )}
        </div>

        {/* Centered value + delta */}
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center" style={{ gap: 6 }}>
          <div style={{
            fontFamily, fontSize: 46, fontWeight: 760,
            color: color.textPrimary,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1, letterSpacing: "-0.05em",
          }}>
            {value}
          </div>
          {caption && (
            <div style={{
              fontFamily, fontSize: 12, fontWeight: 500,
              color: color.textMuted,
            }}>{caption}</div>
          )}
          {delta != null && (
            <DeltaChip direction={direction}>
              {Math.abs(delta).toFixed(2)}
            </DeltaChip>
          )}
        </div>

        {/* Sparkline at bottom 1/5 */}
        {sparkline && sparkline.length >= 2 && (
          <div style={{ flexShrink: 0, height: "20%", minHeight: 24, position: "relative" }}>
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(to top, rgba(0,0,0,0.25), transparent)`,
              borderRadius: "0 0 14px 14px",
              pointerEvents: "none",
            }} />
            <Sparkline
              values={sparkline}
              stroke={direction === "down" ? color.neg : color.pos}
              fill="transparent"
            />
          </div>
        )}
      </div>
    </CardShell>
  );
}
