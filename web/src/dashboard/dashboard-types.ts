/** Grid position for a widget in react-grid-layout */
export type LayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type WidgetType = "treemap" | "feed" | "timeseries" | "embed" | "stat" | "clock" | "weather" | "countdown" | "search";

export type WidgetStatus = "ok" | "degraded" | "failed";

export type DashboardWidget = {
  id: string;
  type: WidgetType;
  title: string;
  status: WidgetStatus;
  updatedAt: string;
  config: Record<string, unknown>;
  minimized?: boolean;
};

export type DashboardDoc = {
  widgets: DashboardWidget[];
  layout: {
    lg: LayoutItem[];
    md: LayoutItem[];
    sm: LayoutItem[];
  };
};
