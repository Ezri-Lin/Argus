import { useEffect, useRef, useState } from "react";
import { WidgetFrame } from "@/components/widget-frame";
import { color, radius } from "@/design/tokens";
import { MetricDisplay } from "@/widgets/primitives/metric-display";
import { Sparkline } from "@/widgets/primitives/sparkline";
import { EntityLogo } from "@/widgets/primitives/entity-logo";
import { watchlist, sentimentTrend } from "@/dashboard/mock-data";
import type { DashboardWidget } from "@/dashboard/dashboard-types";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { useFreshness } from "@/lib/use-freshness";

export function TimeSeriesWidget({ widget, onConfig, onDetail, onDelete, onMinimize }: { widget: DashboardWidget; onConfig?: () => void; onDetail?: () => void; onDelete?: () => void; onMinimize?: () => void }) {
  const { freshness, staleAge } = useFreshness();
  const variant = (widget.config.variant as string) ?? "watchlist";

  return (
    <WidgetFrame widget={widget} freshness={freshness} staleAge={staleAge} onConfig={onConfig} onDetail={onDetail} onDelete={onDelete} onMinimize={onMinimize} contentOwnsHeader={variant === "sentiment"}>
      <div className="flex h-full flex-col overflow-hidden">
        {variant === "sentiment" ? <SentimentView widget={widget} /> : <WatchlistView />}
      </div>
    </WidgetFrame>
  );
}

function WatchlistView() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const selectItem = useDashboardStore((s) => s.selectItem);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    if (!containerRef.current) return;
    let raf = 0;
    const obs = new ResizeObserver((entries) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setWidth(entries[0]?.contentRect.width ?? 300);
      });
    });
    obs.observe(containerRef.current);
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, []);

  // Compact mode when widget is narrow enough that the sparkline would crowd prices.
  const compact = width < 270;

  return (
    <div
      ref={containerRef}
      className="watchlist-scroll flex-1 overflow-y-auto overflow-x-hidden"
      style={{ paddingRight: 6, paddingBottom: 8 }}
    >
      {watchlist.map((item, i) => {
        const positive = item.changePct >= 0;
        const isHovered = hoveredIdx === i;
        const chartWidth = compact ? 42 : 64;
        return (
          <div
            key={item.ticker}
            style={{
              borderRadius: 8,
              padding: "0 4px",
              background: isHovered ? color.hairline : "transparent",
              transition: "background 0.15s",
              cursor: "pointer",
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => selectItem({ type: "watchlist", data: item })}
          >
            {i > 0 && (
              <div style={{ height: 1, background: color.hairline }} />
            )}

            <div
              className="grid items-center"
              style={{
                gridTemplateColumns: compact
                  ? "24px minmax(50px, 1fr) 42px minmax(66px, 70px)"
                  : "26px minmax(74px, 1fr) 64px minmax(76px, 86px)",
                gap: compact ? 6 : 9,
                padding: compact ? "7px 0" : "9px 0",
              }}
            >
              <EntityLogo entity={item} fallback={item.ticker} size={compact ? 22 : 24} />

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: compact ? 14 : 15, fontWeight: 760, color: color.textPrimary, fontVariantNumeric: "tabular-nums", lineHeight: 1.05 }}>
                  {item.ticker}
                </div>
                <div style={{ fontSize: compact ? 10 : 11, color: color.textMuted, marginTop: compact ? 4 : 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.name}
                </div>
              </div>

              <WatchlistSparkline values={item.sparkline} positive={positive} width={chartWidth} />

              <div className="text-right" style={{ minWidth: compact ? 66 : 76 }}>
                <div style={{ fontSize: compact ? 16 : 18, fontWeight: 720, color: color.textPrimary, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {item.price}
                </div>
                <span style={{ display: "inline-block", fontSize: compact ? 10 : 11, fontWeight: 720, color: positive ? color.posFg : color.negFg, background: positive ? color.posBg : color.negBg, borderRadius: radius.pill, padding: compact ? "2px 6px" : "2px 7px", fontVariantNumeric: "tabular-nums", marginTop: compact ? 7 : 8 }}>
                  {positive ? "+" : ""}{item.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WatchlistSparkline({
  values,
  positive,
  width = 68,
}: {
  values: number[];
  positive: boolean;
  width?: number;
}) {
  return (
    <div style={{ width, height: 30, minWidth: width, justifySelf: "center" }}>
      <Sparkline
        values={values}
        stroke={positive ? color.pos : color.neg}
        fill="transparent"
      />
    </div>
  );
}

function SentimentView({ widget }: { widget: DashboardWidget }) {
  const last = sentimentTrend[sentimentTrend.length - 1];
  const prev = sentimentTrend[sentimentTrend.length - 2] ?? sentimentTrend[0];
  const delta = last.idx - prev.idx;
  const sign = delta >= 0 ? "▲" : "▼";
  const configuredLabel = typeof widget.config.label === "string" ? widget.config.label.trim() : "";
  const configuredTitle = widget.title.trim();
  const title = configuredLabel ? configuredTitle || undefined : undefined;
  const label = configuredLabel || configuredTitle || "Sentiment";

  return (
    <MetricDisplay
      title={title}
      label={label}
      value={last.idx.toFixed(2)}
      delta={`${sign}${Math.abs(delta).toFixed(2)}`}
      trend={delta >= 0 ? "up" : "down"}
      accent={<Sparkline values={sentimentTrend.map((d) => d.idx)} />}
    />
  );
}
