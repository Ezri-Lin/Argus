import { PopupBubble } from "@/components/popup-bubble";
import { color } from "@/design/tokens";
import type { PositionedCell } from "./treemap-layout";

export function TreemapTooltip({ cell }: { cell: PositionedCell }) {
  return (
    <PopupBubble
      x={cell.x + cell.w / 2}
      y={cell.y > 60 ? cell.y : cell.y + cell.h}
      anchor={cell.y > 60 ? "top" : "bottom"}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{cell.item.name}</div>
      <div style={{ color: color.textSecondary, fontSize: 11 }}>
        {cell.item.metric} · value {cell.item.value} · heat{" "}
        {cell.item.heat.toFixed(2)}
      </div>
    </PopupBubble>
  );
}
