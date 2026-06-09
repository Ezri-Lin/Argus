import { WidgetFrame } from "@/components/widget-frame";
import { AmountCard } from "@/widgets/primitives/amount-card";
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
  const configuredLabel = typeof widget.config.label === "string" ? widget.config.label.trim() : "";
  const configuredTitle = widget.title.trim();
  const title = configuredLabel ? configuredTitle || undefined : undefined;
  const label = configuredLabel || configuredTitle || t("stat.defaultLabel");
  const showChange = widget.config.showChange !== false;
  const changeStr = showChange ? String(widget.config.change ?? "") : "";

  const numericValue = Number(String(rawValue).replace(/,/g, ""));
  const deltaNum = changeStr
    ? parseFloat(changeStr.replace(/[^0-9.-]/g, ""))
    : undefined;
  const delta = Number.isFinite(deltaNum) ? deltaNum : undefined;

  const currency = symbol === "\u00A5" || symbol === "CNY" ? "CNY" : "USD";

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
      <AmountCard
        title={title}
        label={label}
        value={Number.isFinite(numericValue) ? numericValue : 0}
        currency={currency}
        delta={delta}
        onClick={() => selectItem({ type: "stat", data: widget.config })}
      />
    </WidgetFrame>
  );
}
