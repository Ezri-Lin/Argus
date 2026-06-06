import { WidgetFrame } from "@/components/widget-frame";
import { TreemapWidget } from "@/widgets/treemap/treemap-widget";
import { FeedListWidget } from "@/widgets/feed/feed-list-widget";
import { TimeSeriesWidget } from "@/widgets/timeseries/time-series-widget";
import { EmbedWidget } from "@/widgets/embed/embed-widget";
import { StatWidget } from "@/widgets/stat/stat-widget";
import { ClockWidget } from "@/widgets/clock/clock-widget";
import { WeatherWidget } from "@/widgets/weather/weather-widget";
import { CountdownWidget } from "@/widgets/countdown/countdown-widget";
import { SearchWidget } from "@/widgets/search/search-widget";
import { color } from "@/design/tokens";
import type { DashboardWidget } from "./dashboard-types";

export function WidgetSlot({
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
  const props = { widget, onConfig, onDetail, onDelete, onMinimize };
  switch (widget.type) {
    case "treemap":
      return <TreemapWidget {...props} />;
    case "feed":
      return <FeedListWidget {...props} />;
    case "timeseries":
      return <TimeSeriesWidget {...props} />;
    case "embed":
      return <EmbedWidget {...props} />;
    case "stat":
      return <StatWidget {...props} />;
    case "clock":
      return <ClockWidget {...props} />;
    case "weather":
      return <WeatherWidget {...props} />;
    case "countdown":
      return <CountdownWidget {...props} />;
    case "search":
      return <SearchWidget {...props} />;
    default:
      return (
        <WidgetFrame
          widget={{ ...widget, status: "degraded", title: "Unknown Widget" }}
          onConfig={onConfig}
          onDelete={onDelete}
          onMinimize={onMinimize}
        >
          <div
            className="flex h-full items-center justify-center"
            style={{ fontSize: 13, color: color.textMuted }}
          >
            Unsupported widget type
          </div>
        </WidgetFrame>
      );
  }
}
