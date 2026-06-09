import { color, fontFamily } from "@/design/tokens";
import { CardShell } from "./card-shell";
import { DeltaChip } from "./delta-chip";
import { compactNumber } from "@/design/scale";

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
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${symbol}${(value / 1_000).toFixed(1)}k`;
  return `${symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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
          fontFamily, fontSize: 38, fontWeight: 760,
          color: color.textPrimary,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1, letterSpacing: "-0.06em",
          marginTop: 12,
        }}>
          {formatAmount(value, currency)}
        </div>

        {delta != null && (
          <div style={{ marginTop: 12 }}>
            <DeltaChip direction={direction}>
              {Math.abs(delta).toFixed(1)}%
            </DeltaChip>
          </div>
        )}

        <div className="flex-1" />
      </div>
    </CardShell>
  );
}
