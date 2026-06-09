import { color, fontFamily, fontSize } from "@/design/tokens";
import { CardShell } from "./card-shell";
import { DeltaChip } from "./delta-chip";

type AmountCardProps = {
  label: string;
  value: number;
  currency?: "USD" | "CNY" | string;
  delta?: number;
  title?: string;
  onClick?: () => void;
};

function formatAmount(value: number, currency: string = "USD"): string {
  const symbol = currency === "CNY" ? "\u00A5" : "$";
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  if (abs >= 1_000_000) return `${symbol}${(rounded / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${symbol}${(rounded / 1_000).toFixed(1)}k`;
  return `${symbol}${rounded.toLocaleString()}`;
}

export function AmountCard({
  label,
  value,
  currency = "USD",
  delta,
  title,
  onClick,
}: AmountCardProps) {
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
            fontFamily, fontSize: 38, fontWeight: 760,
            color: color.textPrimary,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1, letterSpacing: "-0.06em",
          }}>
            {formatAmount(value, currency)}
          </div>
          {delta != null && (
            <DeltaChip direction={direction}>
              {Math.abs(delta).toFixed(1)}%
            </DeltaChip>
          )}
        </div>
      </div>
    </CardShell>
  );
}
