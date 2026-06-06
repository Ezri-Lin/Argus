import { color, radius } from "@/design/tokens";
import type { WatchlistItem } from "@/dashboard/mock-data";

export function DetailContentWatchlist({ item }: { item: WatchlistItem }) {
  const positive = item.changePct >= 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: color.textPrimary, margin: 0 }}>
            {item.ticker}
          </h2>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: positive ? color.posFg : color.negFg,
              background: positive ? color.posBg : color.negBg,
              borderRadius: radius.pill,
              padding: "2px 8px",
            }}
          >
            {positive ? "+" : ""}
            {item.changePct.toFixed(2)}%
          </span>
        </div>
        <div style={{ fontSize: 13, color: color.textSecondary }}>{item.name}</div>
      </div>

      {/* Price */}
      <div
        style={{
          padding: "14px 16px",
          background: color.surface2,
          borderRadius: radius.inner,
          border: `1px solid ${color.hairline}`,
        }}
      >
        <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 4 }}>Current Price</div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: color.textPrimary,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {item.price}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2">
        {item.prevClose && (
          <InfoCard label="Prev Close" value={item.prevClose} />
        )}
        {item.volume && (
          <InfoCard label="Volume" value={item.volume} />
        )}
        {item.dayRange && (
          <InfoCard label="Day Range" value={item.dayRange} span={2} />
        )}
        {item.weekRange52 && (
          <InfoCard label="52 Week Range" value={item.weekRange52} span={2} />
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value, span }: { label: string; value: string; span?: number }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        background: color.surface2,
        borderRadius: radius.inner,
        border: `1px solid ${color.hairline}`,
        gridColumn: span === 2 ? "span 2" : undefined,
      }}
    >
      <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: color.textPrimary, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}
