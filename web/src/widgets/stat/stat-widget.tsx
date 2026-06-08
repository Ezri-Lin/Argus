import { WidgetFrame } from "@/components/widget-frame";
import { MetricDisplay } from "@/widgets/primitives/metric-display";
import { Sparkline } from "@/widgets/primitives/sparkline";
import { color } from "@/design/tokens";
import type { DashboardWidget } from "@/dashboard/dashboard-types";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { useFreshness } from "@/lib/use-freshness";
import { useI18n } from "@/lib/use-i18n";

export function StatWidget({
  widget,
  onConfig,
  onDetail,
  onDelete,
  onMinimize,
}: {
  widget: DashboardWidget;
  onConfig?: () => void;
  onDetail?: () => void;
  onDelete?: () => void;
  onMinimize?: () => void;
}) {
  const { freshness, staleAge } = useFreshness();
  const { t } = useI18n();
  const selectItem = useDashboardStore((s) => s.selectItem);

  const rawValue = String(widget.config.value ?? "0");
  const symbol = String(widget.config.symbol ?? "");
  const symbolPosition = String(widget.config.symbolPosition ?? "prefix");
  const configuredLabel = typeof widget.config.label === "string" ? widget.config.label.trim() : "";
  const configuredTitle = widget.title.trim();
  const title = configuredLabel ? configuredTitle || undefined : undefined;
  const label = configuredLabel || configuredTitle || t("stat.defaultLabel");
  const trend = String(widget.config.trend ?? "none") as "up" | "down" | "flat" | "none";
  const showChange = widget.config.showChange !== false;
  const change = showChange ? String(widget.config.change ?? "") : "";
  const series = Array.isArray(widget.config.series)
    ? (widget.config.series as unknown[]).map(Number).filter(Number.isFinite)
    : [];

  const numericValue = Number(String(rawValue).replace(/,/g, ""));
  const formattedValue = Number.isFinite(numericValue)
    ? numericValue.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : rawValue;
  const value = symbol && symbolPosition === "prefix" ? `${symbol}${formattedValue}` : formattedValue;
  const unit = String(widget.config.unit ?? (symbol && symbolPosition === "suffix" ? symbol : t("stat.defaultUnit")));
  const deltaPrefix = trend === "up" ? "▲" : trend === "down" ? "▼" : "";
  const delta = change ? `${deltaPrefix}${change.replace(/^[▲▼+-]/, "")}` : undefined;

  return (
    <WidgetFrame
      widget={widget}
      freshness={freshness}
      staleAge={staleAge}
      onConfig={onConfig}
      onDetail={onDetail}
      onDelete={onDelete}
      onMinimize={onMinimize}
      contentOwnsHeader
    >
      <MetricDisplay
        title={title}
        label={label}
        value={value}
        unit={unit || undefined}
        delta={delta}
        trend={trend}
        accent={series.length > 1 ? <Sparkline values={series} stroke={trend === "down" ? color.neg : color.pos} fill="transparent" /> : undefined}
        onClick={() => selectItem({ type: "stat", data: widget.config })}
      />
    </WidgetFrame>
  );
}
