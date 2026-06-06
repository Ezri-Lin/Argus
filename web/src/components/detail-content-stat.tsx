import { color, radius } from "@/design/tokens";

export function DetailContentStat({ config }: { config: Record<string, unknown> }) {
  const value = (config.value as string) ?? "0";
  const label = (config.label as string) ?? "";
  const symbol = (config.symbol as string) ?? "";
  const symbolPosition = (config.symbolPosition as string) ?? "prefix";
  const trend = (config.trend as string) ?? "none";
  const change = (config.change as string) ?? "";

  const trendColor = trend === "up" ? color.pos : trend === "down" ? color.neg : color.neu;

  return (
    <div className="flex flex-col gap-5">
      {/* Big number */}
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div className="flex items-baseline justify-center gap-1">
          {symbol && symbolPosition === "prefix" && (
            <span style={{ fontSize: 28, color: color.textSecondary, fontWeight: 500 }}>{symbol}</span>
          )}
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: color.textPrimary,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </span>
          {symbol && symbolPosition === "suffix" && (
            <span style={{ fontSize: 28, color: color.textSecondary, fontWeight: 500 }}>{symbol}</span>
          )}
        </div>
        {label && (
          <div style={{ fontSize: 14, color: color.textSecondary, marginTop: 8 }}>{label}</div>
        )}
      </div>

      {/* Trend + change */}
      {(trend !== "none" || change) && (
        <div
          style={{
            padding: "12px 16px",
            background: color.surface2,
            borderRadius: radius.inner,
            border: `1px solid ${color.hairline}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: color.textMuted }}>Trend</span>
          <div className="flex items-center gap-2">
            {trend !== "none" && (
              <svg width={14} height={14} viewBox="0 0 16 16" fill={trendColor}>
                {trend === "up" ? (
                  <path d="M8 3l5 6H3z" />
                ) : (
                  <path d="M8 13l5-6H3z" />
                )}
              </svg>
            )}
            {change && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: trend === "none" ? color.textSecondary : trend === "up" ? color.posFg : color.negFg,
                  background: trend === "none" ? "transparent" : trend === "up" ? color.posBg : color.negBg,
                  borderRadius: radius.pill,
                  padding: trend === "none" ? 0 : "2px 8px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {change}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Config summary */}
      <div>
        <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 8 }}>Configuration</div>
        <div className="flex flex-col gap-0">
          {Object.entries(config).map(([key, val]) => {
            if (key === "value" || key === "label" || !val || val === "" || val === "none") return null;
            return (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${color.hairline}` }}>
                <span style={{ fontSize: 12, color: color.textSecondary }}>{key}</span>
                <span style={{ fontSize: 12, color: color.textPrimary, fontVariantNumeric: "tabular-nums" }}>{String(val)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
