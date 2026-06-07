import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/lib/use-i18n";
import { color, radius } from "@/design/tokens";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import type { DashboardWidget, WidgetType } from "@/dashboard/dashboard-types";
import { appendVideoSource, normalizeParsedVideoSource, type VideoSource } from "@/widgets/embed/video-source-label";
import {
  fetchDomains, fetchMembers, fetchSources,
  createDomain, updateDomain, deleteDomain,
  createMember, deleteMember, updateMember,
  rescoreMemberBaseline,
  createSource, deleteSource, updateSource,
  aiSuggestDates, aiParseVideo, aiStatApi,
  fetchSourcesLibrary,
  type DomainItem, type MemberItem, type SourceItem,
  type LibraryDoc,
} from "@/dashboard/api";
import { TreemapConfig } from "@/components/config/treemap-config";
import { FeedConfig } from "@/components/config/feed-config";

type ClockEntry = { label: string; tz: string };

type ConfigField = {
  key: string;
  label: string;
  type: "text" | "select" | "datetime" | "checkbox";
  options?: string[];
};

type ConfigPanelProps = {
  widget?: DashboardWidget;
  createType?: WidgetType;
  createDefaults?: Record<string, unknown>;
  onCreated?: (id: string) => void;
  onPipelineTriggered?: () => void;
  onClose: () => void;
};

const CONFIG_FIELDS: Record<WidgetType, ConfigField[]> = {
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
    { key: "symbol", label: "Symbol (e.g. $, ¥, %)", type: "text" },
    { key: "symbolPosition", label: "Symbol Position", type: "select", options: ["prefix", "suffix"] },
    { key: "trend", label: "Trend", type: "select", options: ["none", "up", "down"] },
    { key: "change", label: "Change (e.g. +2.5%)", type: "text" },
    { key: "showChange", label: "Show Change", type: "checkbox" },
  ],
  clock: [{ key: "localLabel", label: "本地标签", type: "text" }],
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

const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
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

const COMMON_TIMEZONES = [
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

function resolveSourcesFromConfig(config: Record<string, unknown>): VideoSource[] {
  if (Array.isArray(config.sources) && config.sources.length > 0) {
    return config.sources as VideoSource[];
  }
  const src = config.src as string | undefined;
  if (src) return [{ url: src, label: "Source" }];
  return [];
}

function resolveClocks(config: Record<string, unknown>): ClockEntry[] {
  if (Array.isArray(config.clocks) && config.clocks.length > 0) {
    return config.clocks as ClockEntry[];
  }
  return [
    { label: "Local", tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { label: "UTC", tz: "UTC" },
  ];
}

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  color: color.textPrimary,
  background: color.surface2,
  border: `1px solid ${color.hairline}`,
  borderRadius: radius.inner,
  outline: "none",
} as const;

const smallInput = { ...inputStyle, padding: "4px 8px", fontSize: 12 } as const;

// ── Button styles (consistent hierarchy) ──

const btnBase = {
  padding: "8px 16px",
  fontSize: 12,
  fontWeight: 650,
  borderRadius: 999,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "opacity 0.15s",
} as const;

/** Primary: solid bg, contrasting text. Used for Save, Add, confirm actions. */
const btnPrimary = {
  ...btnBase,
  color: color.bg,
  background: color.accent,
  border: "none",
} as const;

/** Secondary: outlined, muted. Used for Refresh, Parse, Test, AI actions. */
const btnSecondary = {
  ...btnBase,
  color: color.textSecondary,
  background: "transparent",
  border: `1px solid ${color.hairline}`,
} as const;

/** Danger: red text, outlined. Used for Delete, Remove actions. */
const btnDanger = {
  ...btnBase,
  color: color.neg,
  background: "transparent",
  border: `1px solid ${color.hairline}`,
} as const;

/** Ghost: minimal, for inline adds (+) and small toggles. */
const btnGhost = {
  ...btnBase,
  padding: "4px 10px",
  fontSize: 11,
  color: color.textMuted,
  background: "transparent",
  border: `1px dashed ${color.hairline}`,
  borderRadius: 6,
} as const;

export function ConfigPanel({ widget, createType, createDefaults, onCreated, onPipelineTriggered, onClose }: ConfigPanelProps) {
  const updateWidgetConfig = useDashboardStore((s) => s.updateWidgetConfig);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const refreshData = useDashboardStore((s) => s.refreshData);
  const { t } = useI18n();

  const isCreate = !!createType;
  const widgetType = widget?.type ?? createType!;
  const initialConfig = widget?.config ?? createDefaults ?? {};

  const [title, setTitle] = useState(widget?.title ?? WIDGET_TYPE_LABELS[widgetType] ?? "");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [clocks, setClocks] = useState<ClockEntry[]>([]);
  const [weatherLocation, setWeatherLocation] = useState("");
  const [weatherSearching, setWeatherSearching] = useState(false);

  // Treemap: domains + members
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [allMembers, setAllMembers] = useState<MemberItem[]>([]);
  const [rssSources, setRssSources] = useState<SourceItem[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberAliases, setNewMemberAliases] = useState("");

  // Stat API test
  const [statTesting, setStatTesting] = useState(false);
  const [statTestResult, setStatTestResult] = useState<string | null>(null);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Embed parse
  const [embedParsing, setEmbedParsing] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");
  const [embedCandidates, setEmbedCandidates] = useState<VideoSource[]>([]);
  const [selectedEmbedCandidate, setSelectedEmbedCandidate] = useState(0);

  // Sources library
  const [library, setLibrary] = useState<LibraryDoc | null>(null);

  // Countdown AI suggest + targets
  const [countdownKeyword, setCountdownKeyword] = useState("");
  const [countdownSuggesting, setCountdownSuggesting] = useState(false);
  const [countdownSuggestions, setCountdownSuggestions] = useState<Array<{ date: string; label: string }>>([]);
  const [countdownError, setCountdownError] = useState("");
  const [countdownTargets, setCountdownTargets] = useState<Array<{ id: string; title: string; target: string; source?: string; keyword?: string }>>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [editingTargetIdx, setEditingTargetIdx] = useState<number | null>(null);
  const [editTargetTitle, setEditTargetTitle] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");

  useEffect(() => {
    if (widget) setTitle(widget.title);
    const cfg: Record<string, string> = {};
    for (const field of CONFIG_FIELDS[widgetType]) {
      if (field.type === "checkbox") {
        cfg[field.key] = initialConfig[field.key] === false ? "false" : "true";
      } else {
        cfg[field.key] = String(initialConfig[field.key] ?? "");
      }
    }
    setConfig(cfg);
    if (widgetType === "embed") {
      setSources(resolveSourcesFromConfig(initialConfig));
      setEmbedCandidates([]);
      setSelectedEmbedCandidate(0);
      setEmbedUrl("");
    }
    if (widgetType === "clock") {
      setClocks(resolveClocks(initialConfig));
    }
    if (widgetType === "weather") {
      setWeatherLocation((initialConfig.location as string) ?? "");
    }
    if (widgetType === "countdown") {
      // Load targets from config (new format) or migrate from legacy single target
      if (Array.isArray(initialConfig.targets) && initialConfig.targets.length > 0) {
        setCountdownTargets(initialConfig.targets as Array<{ id: string; title: string; target: string; source?: string }>);
      } else if (initialConfig.target) {
        setCountdownTargets([{ id: "legacy", title: "", target: initialConfig.target as string, source: "manual" }]);
      } else {
        setCountdownTargets([]);
      }
      setCountdownSuggestions([]);
      setSelectedSuggestions(new Set());
    }
    // Load shared data for treemap/feed/timeseries
    if (widgetType === "treemap") {
      fetchDomains().then((d) => { if (d) setDomains(d); });
      fetchMembers().then((m) => { if (m) setAllMembers(m); });
    }
    if (widgetType === "feed") {
      fetchSources().then((s) => { if (s) setRssSources(s); });
      fetchMembers().then((m) => { if (m) setAllMembers(m); });
    }
    if (widgetType === "embed" || widgetType === "feed") {
      fetchSourcesLibrary().then((d) => { if (d) setLibrary(d); });
    }
  }, [widget, widgetType, initialConfig]);

  const handleSave = () => {
    const configPatch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(config)) {
      const field = CONFIG_FIELDS[widgetType].find((f) => f.key === k);
      if (field?.type === "checkbox") {
        configPatch[k] = v === "true";
      } else {
        configPatch[k] = v;
      }
    }

    if (widgetType === "embed") {
      configPatch.sources = sources.filter((s) => s.url.trim() !== "");
    }
    if (widgetType === "clock") {
      configPatch.clocks = clocks.filter((c) => c.tz.trim() !== "");
    }
    if (widgetType === "weather") {
      configPatch.location = weatherLocation;
    }
    if (widgetType === "countdown") {
      configPatch.targets = countdownTargets;
    }

    if (isCreate) {
      addWidget(widgetType, title || WIDGET_TYPE_LABELS[widgetType], configPatch);
      const ws = useDashboardStore.getState().doc.widgets;
      const newId = ws[ws.length - 1]?.id;
      if (newId && onCreated) onCreated(newId);
    } else {
      updateWidgetConfig(widget!.id, { ...configPatch, _title: title });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!isCreate && widget) removeWidget(widget.id);
    onClose();
  };

  // Embed sources
  const addSource = () => setSources((p) => [...p, { url: "", label: `Source ${p.length + 1}` }]);
  const removeSource = (i: number) => setSources((p) => p.filter((_, j) => j !== i));
  const updateStreamField = (i: number, field: "url" | "label", v: string) =>
    setSources((p) => p.map((s, j) => (j === i ? { ...s, [field]: v } : s)));
  const addSelectedEmbedCandidate = () => {
    const candidate = embedCandidates[selectedEmbedCandidate];
    if (!candidate) return;
    setSources((p) => appendVideoSource(p, candidate));
    setEmbedCandidates([]);
    setSelectedEmbedCandidate(0);
  };

  const parseEmbedUrl = useCallback(async () => {
    const url = embedUrl.trim();
    if (!url) return;
    setEmbedParsing(true);
    setEmbedCandidates([]);
    setSelectedEmbedCandidate(0);
    try {
      const res = await aiParseVideo(url);
      if (res?.ok && res.sources) {
        const candidates = res.sources
          .filter((s) => s.url.trim() !== "")
          .map((s, i) => normalizeParsedVideoSource(s, i));
        setEmbedCandidates(candidates);
        setSelectedEmbedCandidate(0);
        if (candidates.length > 0) setEmbedUrl("");
      }
    } finally {
      setEmbedParsing(false);
    }
  }, [embedUrl]);

  // Clock entries
  const addClock = () => setClocks((p) => [...p, { label: "", tz: "UTC" }]);
  const removeClock = (i: number) => setClocks((p) => p.filter((_, j) => j !== i));
  const updateClock = (i: number, field: keyof ClockEntry, v: string) =>
    setClocks((p) => p.map((c, j) => (j === i ? { ...c, [field]: v } : c)));

  // Weather geocoding
  const searchLocation = useCallback(async () => {
    if (!weatherLocation.trim()) return;
    setWeatherSearching(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherLocation)}&count=1`);
      const data = await res.json();
      if (data.results?.[0]) {
        const r = data.results[0];
        setConfig((c) => ({ ...c, lat: String(r.latitude), lon: String(r.longitude) }));
        setWeatherLocation(r.name + (r.country ? `, ${r.country}` : ""));
      }
    } catch {
      // ignore
    } finally {
      setWeatherSearching(false);
    }
  }, [weatherLocation]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 300,
          background: color.surface,
          borderLeft: `1px solid ${color.hairline}`,
          boxShadow: `-4px 0 24px rgba(0,0,0,0.4)`,
          padding: 20,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: color.textPrimary }}>
            {isCreate ? `Add ${WIDGET_TYPE_LABELS[widgetType]}` : "Configure Widget"}
          </span>
          <button
            onClick={onClose}
            style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: color.textMuted, fontSize: 14, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
          {/* Title */}
          <div>
            <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={WIDGET_TYPE_LABELS[widgetType]} style={inputStyle} />
          </div>

          {/* Embed sources editor */}
          {widgetType === "embed" && (
            <div>
              <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>Sources</label>
              <div className="flex flex-col gap-2">
                {sources.map((s, i) => (
                  <div key={i} style={{ padding: 8, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
                    <div className="flex items-center gap-1 mb-1.5">
                      <input value={s.label} onChange={(e) => updateStreamField(i, "label", e.target.value)} placeholder="Label" title={s.fullLabel ?? s.label} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12, flex: 1 }} />
                      {s.type && (
                        <span style={{ padding: "2px 6px", borderRadius: 999, background: color.surfaceElev, border: `1px solid ${color.hairline}`, color: color.textMuted, fontSize: 10, textTransform: "uppercase", flexShrink: 0 }}>
                          {s.type}
                        </span>
                      )}
                      <button onClick={() => removeSource(i)} style={{ ...btnGhost, padding: "2px 6px", border: "none", color: color.neg }}>✕</button>
                    </div>
                    <input value={s.url} onChange={(e) => updateStreamField(i, "url", e.target.value)} placeholder="https://..." style={{ ...inputStyle, padding: "4px 6px", fontSize: 12, color: color.textSecondary }} />
                  </div>
                ))}
              </div>
              <button onClick={addSource} style={{ ...btnGhost, width: "100%", padding: "6px 0", color: color.textSecondary }}>+ Add source</button>
              {library && library.streams.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>{t("config.common.pickFromLibrary")}</label>
                  <div className="flex flex-col gap-1" style={{ maxHeight: 120, overflowY: "auto" }}>
                    {library.streams.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setSources((p) => [...p, { url: s.url, label: s.name, type: s.type as VideoSource["type"] }])}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, width: "100%",
                          padding: "5px 8px", fontSize: 12, textAlign: "left",
                          color: color.textPrimary, background: "transparent",
                          border: `1px solid ${color.hairline}`, borderRadius: radius.inner, cursor: "pointer",
                        }}
                      >
                        <span className="flex-1 truncate">{s.name}</span>
                        {s.type && <span style={{ fontSize: 9, color: color.textMuted, textTransform: "uppercase" }}>{s.type}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clock editor */}
          {widgetType === "clock" && (
            <div>
              <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>Clocks</label>
              <div className="flex flex-col gap-2">
                {clocks.map((c, i) => (
                  <div key={i} style={{ padding: 8, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
                    <div className="flex items-center gap-1 mb-1.5">
                      <input value={c.label} onChange={(e) => updateClock(i, "label", e.target.value)} placeholder="Label" style={{ ...inputStyle, padding: "4px 6px", fontSize: 12, flex: 1 }} />
                      <button onClick={() => removeClock(i)} style={{ ...btnGhost, padding: "2px 6px", border: "none", color: color.neg }}>✕</button>
                    </div>
                    <select value={c.tz} onChange={(e) => updateClock(i, "tz", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }}>
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={addClock} style={{ ...btnGhost, marginTop: 8, width: "100%", padding: "6px 0", color: color.textSecondary }}>+ Add clock</button>
            </div>
          )}

          {/* Weather location editor */}
          {widgetType === "weather" && (
            <div>
              <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>Location</label>
              <div className="flex gap-1.5">
                <input
                  value={weatherLocation}
                  onChange={(e) => setWeatherLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchLocation()}
                  placeholder="City name (e.g. Tokyo)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={searchLocation}
                  disabled={weatherSearching}
                  style={{ ...btnPrimary, padding: "8px 12px" }}
                >
                  {weatherSearching ? "..." : "Find"}
                </button>
              </div>
              {config.lat && config.lon && (
                <div style={{ fontSize: 10, color: color.textMuted, marginTop: 4 }}>
                  📍 {config.lat}, {config.lon}
                </div>
              )}
            </div>
          )}

          {/* Treemap: domain + members */}
          {widgetType === "treemap" && (
            <TreemapConfig
              domains={domains}
              members={allMembers}
              selectedDomain={config.group || "tech"}
              onSelectDomain={(d) => setConfig((c) => ({ ...c, group: d }))}
              onAddDomain={async (key, label) => {
                await createDomain({ key, label_zh: label, label_en: "", weight: 1.0 });
                const d = await fetchDomains();
                if (d) setDomains(d);
              }}
              onDeleteDomain={async (key) => {
                await deleteDomain(key);
                const d = await fetchDomains();
                if (d) setDomains(d);
              }}
              onEditDomain={async (key, patch) => {
                await updateDomain(key, patch);
                const d = await fetchDomains();
                if (d) setDomains(d);
              }}
              onAddMember={async (name, aliases, domain) => {
                await createMember({ name, aliases: aliases.split(",").map((s) => s.trim()).filter(Boolean), domains: [domain] });
                const m = await fetchMembers();
                if (m) setAllMembers(m);
                await refreshData();
              }}
              onDeleteMember={async (id) => {
                await deleteMember(id);
                const m = await fetchMembers();
                if (m) setAllMembers(m);
              }}
              onEditMember={async (id, patch) => {
                await updateMember(id, patch);
                const m = await fetchMembers();
                if (m) setAllMembers(m);
                await refreshData();
              }}
              onScoreMember={async (id) => {
                await rescoreMemberBaseline(id);
                const m = await fetchMembers();
                if (m) setAllMembers(m);
                await refreshData();
              }}
            />
          )}

          {/* Feed: sources + mode */}
          {widgetType === "feed" && (
            <FeedConfig
              variant={config.variant || "signals"}
              sources={rssSources}
              members={allMembers}
              keywords={initialConfig.keywords as string || ""}
              filterPrompt={initialConfig.filterPrompt as string || ""}
              library={library}
              onChangeVariant={(v) => setConfig((c) => ({ ...c, variant: v }))}
              onChangeKeywords={(kw) => {
                const patch = { keywords: kw };
                if (!isCreate && widget) updateWidgetConfig(widget.id, patch);
              }}
              onChangeFilterPrompt={(fp) => {
                const patch = { filterPrompt: fp };
                if (!isCreate && widget) updateWidgetConfig(widget.id, patch);
              }}
              onAddSource={async (name, url) => {
                await createSource({ name, url });
                const s = await fetchSources();
                if (s) setRssSources(s);
              }}
              onDeleteSource={async (id) => {
                await deleteSource(id);
                const s = await fetchSources();
                if (s) setRssSources(s);
              }}
              onEditSource={async (id, patch) => {
                await updateSource(id, patch);
                const s = await fetchSources();
                if (s) setRssSources(s);
              }}
            />
          )}

          {/* Stat: API test */}
          {widgetType === "stat" && config.statMode === "api" && (
            <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={async () => {
                    setStatTesting(true);
                    setStatTestResult(null);
                    const res = await aiStatApi(config.apiUrl || "", config.jsonPath || "");
                    setStatTestResult(res?.ok ? String(res.value) : res?.error || "Failed");
                    setStatTesting(false);
                  }}
                  disabled={statTesting || !config.apiUrl}
                  style={{ ...btnSecondary, opacity: statTesting ? 0.6 : 1 }}
                >
                  {statTesting ? t("config.stat.testing") : t("config.stat.testApi")}
                </button>
                {statTestResult !== null && (
                  <span style={{ fontSize: 12, color: statTestResult.startsWith("Failed") || statTestResult.startsWith("Error") ? color.neg : color.pos }}>
                    {statTestResult.length > 40 ? statTestResult.slice(0, 40) + "..." : statTestResult}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: color.textMuted }}>{t("config.stat.testHelp")}</div>
            </div>
          )}

          {/* Embed: URL parse button */}
          {widgetType === "embed" && (
            <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
              <div className="flex items-center gap-2">
                <input
                  value={embedUrl}
                  onChange={(e) => {
                    setEmbedUrl(e.target.value);
                    setEmbedCandidates([]);
                    setSelectedEmbedCandidate(0);
                  }}
                  placeholder={t("config.embed.placeholder")}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      await parseEmbedUrl();
                    }
                  }}
                  style={{ ...smallInput, flex: 1 }}
                />
                <button
                  onClick={parseEmbedUrl}
                  disabled={embedParsing || !embedUrl.trim()}
                  style={{ ...btnSecondary, opacity: embedParsing ? 0.6 : 1 }}
                >
                  {embedParsing ? "Parsing..." : "Parse"}
                </button>
              </div>
              {embedCandidates.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: color.textMuted, textTransform: "uppercase", letterSpacing: 0 }}>
                      Parsed sources
                    </span>
                    <span style={{ fontSize: 10, color: color.textMuted }}>
                      Choose one
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5" style={{ maxHeight: 132, overflowY: "auto", paddingRight: 2 }}>
                    {embedCandidates.map((candidate, i) => {
                      const selected = i === selectedEmbedCandidate;
                      return (
                        <button
                          key={`${candidate.url}-${i}`}
                          type="button"
                          onClick={() => setSelectedEmbedCandidate(i)}
                          title={candidate.fullLabel ?? candidate.label}
                          aria-pressed={selected}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "7px 8px",
                            textAlign: "left",
                            color: selected ? color.textPrimary : color.textSecondary,
                            background: selected ? color.surfaceElev : "transparent",
                            border: `1px solid ${selected ? color.textMuted : color.hairline}`,
                            borderRadius: radius.inner,
                            cursor: "pointer",
                          }}
                        >
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 12, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {candidate.label}
                            </span>
                            <span style={{ display: "block", marginTop: 2, fontSize: 10, color: color.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {candidate.url}
                            </span>
                          </span>
                          <span style={{ padding: "2px 6px", borderRadius: 999, background: color.bg, border: `1px solid ${color.hairline}`, color: color.textMuted, fontSize: 10, textTransform: "uppercase" }}>
                            {candidate.type ?? "src"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={addSelectedEmbedCandidate}
                    style={{ ...btnPrimary, marginTop: 8, width: "100%", padding: "7px 0" }}
                  >
                    Add selected
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Countdown: targets editor + AI suggest */}
          {widgetType === "countdown" && (
            <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
              {/* Existing targets */}
              <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>{t("config.countdown.targets")}</label>
              {countdownTargets.length > 0 ? (
                <div className="flex flex-col gap-1 mb-2">
                  {countdownTargets.map((ct, i) => (
                    editingTargetIdx === i ? (
                      <div key={ct.id} style={{ fontSize: 11 }}>
                        <div className="flex gap-1 mb-1">
                          <input value={editTargetTitle} onChange={(e) => setEditTargetTitle(e.target.value)} placeholder={t("config.countdown.title")} style={{ ...smallInput, flex: 1, padding: "2px 6px" }} />
                          <input value={editTargetDate} onChange={(e) => setEditTargetDate(e.target.value)} placeholder={t("config.countdown.datePlaceholder")} style={{ ...smallInput, width: 100, padding: "2px 6px" }} />
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => {
                            const newDate = editTargetDate.trim();
                            if (!newDate || isNaN(new Date(newDate).getTime())) return;
                            setCountdownTargets((prev) => prev.map((item, j) => j === i ? { ...item, title: editTargetTitle, target: newDate } : item));
                            setEditingTargetIdx(null);
                          }} style={{ ...btnPrimary, padding: "2px 8px", fontSize: 10 }}>{t("config.common.save")}</button>
                          <button onClick={() => setEditingTargetIdx(null)} style={{ ...btnGhost, padding: "2px 8px", fontSize: 10 }}>{t("config.common.cancel")}</button>
                        </div>
                      </div>
                    ) : (
                      <div key={ct.id} className="flex items-center gap-1" style={{ fontSize: 11 }}>
                        <span className="flex-1 truncate" style={{ color: color.textPrimary }}>{ct.title || ct.target}</span>
                        {ct.keyword && (
                          <span style={{ fontSize: 9, color: color.accent, background: `${color.accent}18`, padding: "1px 5px", borderRadius: 999, flexShrink: 0 }}>auto</span>
                        )}
                        <span style={{ color: color.textMuted, fontSize: 10, flexShrink: 0 }}>{ct.target.split("T")[0]}</span>
                        <button onClick={() => { setEditingTargetIdx(i); setEditTargetTitle(ct.title); setEditTargetDate(ct.target); }} title={t("config.common.edit")} style={{ ...btnGhost, padding: "0 3px", fontSize: 9, color: color.textMuted }}>✎</button>
                        <button
                          onClick={() => setCountdownTargets((prev) => prev.filter((_, j) => j !== i))}
                          style={{ ...btnGhost, padding: "0 4px", border: "none", color: color.neg, fontSize: 12 }}
                        >
                          x
                        </button>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 8 }}>{t("config.countdown.emptyTargets")}</div>
              )}
              {/* Manual add */}
              <div className="flex gap-1 mb-2">
                <input
                  placeholder={t("config.countdown.datePlaceholder")}
                  style={{ ...smallInput, flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement;
                      const val = input.value.trim();
                      if (val && !isNaN(new Date(val).getTime())) {
                        setCountdownTargets((prev) => [...prev, { id: `manual-${Date.now()}`, title: "", target: val, source: "manual" }]);
                        input.value = "";
                      }
                    }
                  }}
                />
              </div>
              {/* AI suggest */}
              <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>{t("config.countdown.aiSuggest")}</label>
              <div className="flex gap-1 mb-2">
                <input
                  value={countdownKeyword}
                  onChange={(e) => setCountdownKeyword(e.target.value)}
                  placeholder={t("config.countdown.keywordPlaceholder")}
                  style={{ ...smallInput, flex: 1 }}
                />
                <button
                  onClick={async () => {
                    if (!countdownKeyword.trim()) return;
                    setCountdownSuggesting(true);
                    setCountdownError("");
                    setSelectedSuggestions(new Set());
                    const res = await aiSuggestDates(countdownKeyword);
                    if (res?.ok && res.dates) {
                      setCountdownSuggestions(res.dates.map((d) => ({ date: d.date, label: d.label })));
                    } else {
                      setCountdownError(res?.error || "Request failed — check model config");
                    }
                    setCountdownSuggesting(false);
                  }}
                  disabled={countdownSuggesting}
                  style={{ ...btnSecondary, opacity: countdownSuggesting ? 0.6 : 1 }}
                >
                  {countdownSuggesting ? "..." : t("config.countdown.aiRecommend")}
                </button>
              </div>
              {countdownError && (
                <div style={{ padding: "4px 8px", fontSize: 11, color: color.neg, background: `${color.neg}10`, borderRadius: radius.inner, marginTop: 4 }}>
                  {countdownError}
                </div>
              )}
              {countdownSuggestions.length > 0 && (
                <>
                  <div className="flex flex-col gap-1">
                    {countdownSuggestions.map((s, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-2"
                        style={{ padding: "4px 8px", fontSize: 12, color: color.textPrimary, border: `1px solid ${color.hairline}`, borderRadius: radius.inner, cursor: "pointer", background: selectedSuggestions.has(i) ? `${color.accent}18` : "transparent" }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSuggestions.has(i)}
                          onChange={() => {
                            setSelectedSuggestions((prev) => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i);
                              else next.add(i);
                              return next;
                            });
                          }}
                        />
                        <span className="flex-1">{s.label}</span>
                        <span style={{ fontSize: 10, color: color.textMuted }}>{s.date.split("T")[0]}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const toAdd = [...selectedSuggestions].map((i) => countdownSuggestions[i]).filter(Boolean);
                      if (toAdd.length === 0) return;
                      const kw = countdownKeyword.trim();
                      setCountdownTargets((prev) => [
                        ...prev,
                        ...toAdd.map((s) => ({ id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: s.label, target: s.date, source: "ai", keyword: kw || undefined })),
                      ]);
                      setCountdownSuggestions([]);
                      setSelectedSuggestions(new Set());
                    }}
                    style={{ ...btnPrimary, marginTop: 6, width: "100%", padding: "6px 0", fontSize: 11 }}
                  >
                    {t("config.countdown.addSelected")} ({selectedSuggestions.size})
                  </button>
                </>
              )}
            </div>
          )}

          {/* Standard config fields */}
          {CONFIG_FIELDS[widgetType].filter((f) => {
            // Hide fields handled by custom sections above
            if (widgetType === "treemap" && f.key === "group") return false;
            if (widgetType === "feed" && f.key === "variant") return false;
            // Stat: hide API fields in manual mode, hide manual fields in API mode
            if (widgetType === "stat" && config.statMode === "manual" && (f.key === "apiUrl" || f.key === "jsonPath")) return false;
            if (widgetType === "stat" && config.statMode === "api" && ["value", "label", "symbol", "symbolPosition", "trend", "change", "showChange"].includes(f.key)) return false;
            return true;
          }).map((field) => (
            <div key={field.key}>
              <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>
                {field.label}
              </label>
              {field.type === "select" ? (
                <select
                  value={config[field.key] ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                  style={inputStyle}
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === "datetime" ? (
                <input
                  type="datetime-local"
                  value={config[field.key] ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                  style={inputStyle}
                />
              ) : field.type === "checkbox" ? (
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={config[field.key] !== "false"}
                    onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.checked ? "true" : "false" }))}
                    style={{ width: 16, height: 16, accentColor: color.textPrimary }}
                  />
                  <span style={{ fontSize: 12, color: color.textSecondary }}>
                    {config[field.key] !== "false" ? "Enabled" : "Disabled"}
                  </span>
                </label>
              ) : (
                <input
                  value={config[field.key] ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto flex gap-2" style={{ paddingTop: 16 }}>
          <button
            onClick={handleSave}
            style={{ ...btnPrimary, flex: 1, padding: "10px 0", fontSize: 13 }}
          >
            {isCreate ? "Add" : "Save"}
          </button>
          {!isCreate && (
            <button
              onClick={async () => {
                if (refreshing) return;
                setRefreshing(true);
                // Trigger pipeline in background (non-blocking)
                const { triggerPipeline } = await import("@/dashboard/api");
                triggerPipeline().then(() => onPipelineTriggered?.()).catch(() => {});
                // Fetch current cached data immediately
                await refreshData();
                clearTimeout(refreshTimer.current);
                refreshTimer.current = setTimeout(() => setRefreshing(false), 3000);
              }}
              title={t("config.common.refreshTooltip")}
              style={{ ...btnSecondary, padding: "10px 14px", fontSize: 13, color: refreshing ? color.pos : color.textSecondary }}
            >
              {refreshing ? t("config.common.triggered") : t("config.common.refresh")}
            </button>
          )}
          {!isCreate && (
            <button
              onClick={handleDelete}
              style={{ ...btnDanger, padding: "10px 16px", fontSize: 13 }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  );
}
