import { useState } from "react";
import { color, radius, shadowElev } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";
import type { DashboardWidget } from "@/dashboard/dashboard-types";
import { WidgetSlot } from "@/dashboard/widget-registry";

const TYPE_ICON: Record<string, string> = {
  treemap: "T", feed: "F", timeseries: "S", embed: "E", stat: "#",
  clock: "C", weather: "W", countdown: "D", search: "Q",
};

export function MinimizedBar({ widgets, onRestore }: {
  widgets: DashboardWidget[];
  onRestore: (id: string) => void;
}) {
  const { t } = useI18n();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (widgets.length === 0) return null;

  return (
    <div
      className="flex items-center gap-1 px-4"
      style={{
        minHeight: 32,
        borderBottom: `1px solid ${color.hairline}`,
        background: color.surface,
      }}
    >
      <span style={{ fontSize: 10, color: color.textMuted, marginRight: 4, flexShrink: 0 }}>{t("minimized.label")}</span>
      {widgets.map((w) => (
        <div
          key={w.id}
          className="relative"
          onMouseEnter={() => setHoveredId(w.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <button
            onClick={() => onRestore(w.id)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", fontSize: 11, fontWeight: 500,
              color: color.textSecondary, background: color.surface2,
              border: `1px solid ${color.hairline}`, borderRadius: radius.inner,
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 10, opacity: 0.5 }}>{TYPE_ICON[w.type] ?? "?"}</span>
            {w.title}
          </button>

          {/* Hover preview popup */}
          {hoveredId === w.id && (
            <div
              style={{
                position: "absolute", top: "100%", left: 0, marginTop: 4,
                width: 260, maxHeight: 200,
                background: color.surface, border: `1px solid ${color.hairline}`,
                borderRadius: radius.card, boxShadow: shadowElev,
                overflow: "hidden", zIndex: 100,
                pointerEvents: "none",
              }}
            >
              <div style={{ padding: "6px 10px", borderBottom: `1px solid ${color.hairline}`, fontSize: 11, fontWeight: 600, color: color.textPrimary }}>
                {w.title}
              </div>
              <div style={{ height: 140, overflow: "hidden", transform: "scale(0.6)", transformOrigin: "top left", width: "166.7%" }}>
                <WidgetSlot widget={w} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
