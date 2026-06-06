import { color, radius, shadow } from "@/design/tokens";
import type { WidgetType } from "@/dashboard/dashboard-types";

const WIDGET_OPTIONS: { type: WidgetType; label: string; defaultConfig: Record<string, unknown> }[] = [
  { type: "treemap", label: "Treemap", defaultConfig: { group: "tech" } },
  { type: "feed", label: "Feed", defaultConfig: { variant: "signals" } },
  { type: "timeseries", label: "Time Series", defaultConfig: { variant: "watchlist" } },
  { type: "embed", label: "Embed", defaultConfig: { src: "", mode: "iframe" } },
  { type: "stat", label: "Stat Card", defaultConfig: { value: "0", label: "", symbol: "", trend: "none", change: "" } },
  { type: "clock", label: "Clock", defaultConfig: {} },
  { type: "weather", label: "Weather", defaultConfig: { unit: "C" } },
  { type: "countdown", label: "Countdown", defaultConfig: { label: "", showSeconds: true } },
  { type: "search", label: "AI Search", defaultConfig: { query: "", domain: "" } },
];

export function AddWidgetMenu({ onSelect, onClose }: { onSelect: (type: WidgetType, defaults: Record<string, unknown>) => void; onClose: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="absolute right-0 top-full z-50 mt-2"
        style={{
          minWidth: 160,
          background: color.surface,
          border: `1px solid ${color.hairline}`,
          borderRadius: radius.inner,
          boxShadow: shadow,
          padding: 4,
        }}
      >
        {WIDGET_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => {
              onSelect(opt.type, opt.defaultConfig);
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 12px",
              fontSize: 13,
              color: color.textPrimary,
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = color.surface2;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </>
  );
}
