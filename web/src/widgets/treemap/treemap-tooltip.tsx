import { PopupBubble } from "@/components/popup-bubble";
import { color } from "@/design/tokens";
import type { PositionedCell } from "./treemap-layout";
import { useI18n } from "@/lib/use-i18n";

export function TreemapTooltip({ cell }: { cell: PositionedCell }) {
  const { t } = useI18n();
  return (
    <PopupBubble
      x={cell.x + cell.w / 2}
      y={cell.y > 60 ? cell.y : cell.y + cell.h}
      anchor={cell.y > 60 ? "top" : "bottom"}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{cell.item.name}</div>
      <div style={{ color: color.textSecondary, fontSize: 11 }}>
        {cell.item.metric} · {t("treemap.value")} {cell.item.value} · {t("treemap.heat")}{" "}
        {cell.item.heat.toFixed(2)}
      </div>
    </PopupBubble>
  );
}
