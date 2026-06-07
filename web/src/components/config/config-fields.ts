import type { DashboardWidget, WidgetType } from "@/dashboard/dashboard-types";
import type { VideoSource } from "@/widgets/embed/video-source-label";

export type ClockEntry = { label: string; tz: string };

export type ConfigField = {
  key: string;
  label: string;
  type: "text" | "select" | "datetime" | "checkbox";
  options?: string[];
};

export type ConfigPanelProps = {
  widget?: DashboardWidget;
  createType?: WidgetType;
  createDefaults?: Record<string, unknown>;
  onCreated?: (id: string) => void;
  onPipelineTriggered?: () => void;
  onClose: () => void;
};

export const CONFIG_FIELDS: Record<WidgetType, ConfigField[]> = {
  treemap: [{ key: "group", label: "Group", type: "select", options: ["tech", "markets", "geo"] }],
  feed: [{ key: "variant", label: "Variant", type: "select", options: ["signals", "rss"] }],
  timeseries: [
    { key: "variant", label: "Variant", type: "select", options: ["watchlist", "sentiment"] },
    { key: "label", label: "Label", type: "text" },
  ],
  embed: [{ key: "mode", label: "Mode", type: "select", options: ["iframe", "video"] }],
  stat: [
    { key: "statMode", label: "Mode", type: "select", options: ["manual", "api"] },
    { key: "apiUrl", label: "API URL", type: "text" },
    { key: "jsonPath", label: "JSON Path (e.g. data.price)", type: "text" },
    { key: "value", label: "Value", type: "text" },
    { key: "label", label: "Label", type: "text" },
    { key: "symbol", label: "Symbol (e.g. $, \u00a5, %)", type: "text" },
    { key: "symbolPosition", label: "Symbol Position", type: "select", options: ["prefix", "suffix"] },
    { key: "trend", label: "Trend", type: "select", options: ["none", "up", "down"] },
    { key: "change", label: "Change (e.g. +2.5%)", type: "text" },
    { key: "showChange", label: "Show Change", type: "checkbox" },
  ],
  clock: [{ key: "localLabel", label: "\u672c\u5730\u6807\u7b7e", type: "text" }],
  weather: [
    { key: "label", label: "Label", type: "text" },
    { key: "unit", label: "Unit", type: "select", options: ["C", "F"] },
  ],
  countdown: [
    { key: "label", label: "Label", type: "text" },
  ],
  search: [
    { key: "query", label: "Search Query", type: "text" },
    { key: "domain", label: "Domain Filter (optional)", type: "text" },
  ],
};

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  treemap: "Treemap",
  feed: "Feed",
  timeseries: "Time Series",
  embed: "Embed",
  stat: "Stat Card",
  clock: "Clock",
  weather: "Weather",
  countdown: "Countdown",
  search: "AI Search",
};

export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function resolveSourcesFromConfig(config: Record<string, unknown>): VideoSource[] {
  if (Array.isArray(config.sources) && config.sources.length > 0) {
    return config.sources as VideoSource[];
  }
  const src = config.src as string | undefined;
  if (src) return [{ url: src, label: "Source" }];
  return [];
}

export function resolveClocks(config: Record<string, unknown>): ClockEntry[] {
  if (Array.isArray(config.clocks) && config.clocks.length > 0) {
    return config.clocks as ClockEntry[];
  }
  return [
    { label: "Local", tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { label: "UTC", tz: "UTC" },
  ];
}
