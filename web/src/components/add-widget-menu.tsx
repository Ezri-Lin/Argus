import { color, radius, shadow } from "@/design/tokens";
import type { WidgetType } from "@/dashboard/dashboard-types";
import { useI18n } from "@/lib/use-i18n";
import type { I18nKey } from "@/lib/i18n";

const WIDGET_OPTIONS: { type: WidgetType; labelKey: I18nKey; defaultConfig: Record<string, unknown> }[] = [
  { type: "treemap", labelKey: "widget.type.treemap", defaultConfig: { group: "tech" } },
  { type: "feed", labelKey: "widget.type.feed", defaultConfig: { variant: "signals" } },
  { type: "timeseries", labelKey: "widget.type.timeseries", defaultConfig: { variant: "watchlist" } },
  { type: "embed", labelKey: "widget.type.embed", defaultConfig: { src: "", mode: "iframe" } },
  { type: "stat", labelKey: "widget.type.stat", defaultConfig: { value: "0", label: "", symbol: "", trend: "none", change: "" } },
  { type: "clock", labelKey: "widget.type.clock", defaultConfig: {} },
  { type: "weather", labelKey: "widget.type.weather", defaultConfig: { unit: "C" } },
  { type: "countdown", labelKey: "widget.type.countdown", defaultConfig: { label: "", showSeconds: true } },
  { type: "search", labelKey: "widget.type.search", defaultConfig: { query: "", domain: "" } },
];

export function AddWidgetMenu({ onSelect, onClose }: { onSelect: (type: WidgetType, defaults: Record<string, unknown>) => void; onClose: () => void }) {
  const { t } = useI18n();
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
            {t(opt.labelKey)}
          </button>
        ))}
      </div>
    </>
  );
}
