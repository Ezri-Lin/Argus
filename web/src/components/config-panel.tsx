import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/lib/use-i18n";
import { color } from "@/design/tokens";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import type { WidgetType } from "@/dashboard/dashboard-types";
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
import { inputStyle, btnPrimary, btnSecondary, btnDanger } from "@/components/config/config-styles";
import {
  CONFIG_FIELDS, WIDGET_TYPE_LABELS,
  resolveSourcesFromConfig, resolveClocks,
  type ClockEntry, type ConfigPanelProps,
} from "@/components/config/config-fields";
import { ClockConfig } from "@/components/config/clock-config";
import { WeatherConfig } from "@/components/config/weather-config";
import { StatConfig } from "@/components/config/stat-config";
import { EmbedConfig } from "@/components/config/embed-config";
import { CountdownConfig } from "@/components/config/countdown-config";

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
  const addFromLibrary = (s: { url: string; name: string; type?: string }) => {
    setSources((p) => [...p, { url: s.url, label: s.name, type: s.type as VideoSource["type"] }]);
  };
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

  // Countdown AI suggest
  const handleCountdownSuggest = useCallback(async () => {
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
  }, [countdownKeyword]);

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

          {/* Embed sources + URL parse */}
          {widgetType === "embed" && (
            <EmbedConfig
              sources={sources}
              addSource={addSource}
              removeSource={removeSource}
              updateStreamField={updateStreamField}
              addFromLibrary={addFromLibrary}
              library={library}
              embedUrl={embedUrl}
              setEmbedUrl={(v) => { setEmbedUrl(v); setEmbedCandidates([]); setSelectedEmbedCandidate(0); }}
              embedParsing={embedParsing}
              parseEmbedUrl={parseEmbedUrl}
              embedCandidates={embedCandidates}
              selectedEmbedCandidate={selectedEmbedCandidate}
              setSelectedEmbedCandidate={setSelectedEmbedCandidate}
              addSelectedEmbedCandidate={addSelectedEmbedCandidate}
              pickFromLibraryLabel={t("config.common.pickFromLibrary")}
              placeholderLabel={t("config.embed.placeholder")}
            />
          )}

          {/* Clock editor */}
          {widgetType === "clock" && (
            <ClockConfig
              clocks={clocks}
              addClock={addClock}
              removeClock={removeClock}
              updateClock={updateClock}
            />
          )}

          {/* Weather location editor */}
          {widgetType === "weather" && (
            <WeatherConfig
              weatherLocation={weatherLocation}
              setWeatherLocation={setWeatherLocation}
              weatherSearching={weatherSearching}
              searchLocation={searchLocation}
              lat={config.lat ?? ""}
              lon={config.lon ?? ""}
            />
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
            <StatConfig
              apiUrl={config.apiUrl || ""}
              jsonPath={config.jsonPath || ""}
              statTesting={statTesting}
              statTestResult={statTestResult}
              onTest={async () => {
                setStatTesting(true);
                setStatTestResult(null);
                const res = await aiStatApi(config.apiUrl || "", config.jsonPath || "");
                setStatTestResult(res?.ok ? String(res.value) : res?.error || "Failed");
                setStatTesting(false);
              }}
              testLabel={t("config.stat.testApi")}
              testingLabel={t("config.stat.testing")}
              helpText={t("config.stat.testHelp")}
            />
          )}

          {/* Countdown: targets editor + AI suggest */}
          {widgetType === "countdown" && (
            <CountdownConfig
              targets={countdownTargets}
              setTargets={setCountdownTargets}
              editingTargetIdx={editingTargetIdx}
              setEditingTargetIdx={setEditingTargetIdx}
              editTargetTitle={editTargetTitle}
              setEditTargetTitle={setEditTargetTitle}
              editTargetDate={editTargetDate}
              setEditTargetDate={setEditTargetDate}
              keyword={countdownKeyword}
              setKeyword={setCountdownKeyword}
              suggesting={countdownSuggesting}
              suggestions={countdownSuggestions}
              setSuggestions={setCountdownSuggestions}
              error={countdownError}
              setError={setCountdownError}
              selectedSuggestions={selectedSuggestions}
              setSelectedSuggestions={setSelectedSuggestions}
              onSuggest={handleCountdownSuggest}
              targetsLabel={t("config.countdown.targets")}
              titleLabel={t("config.countdown.title")}
              datePlaceholder={t("config.countdown.datePlaceholder")}
              emptyTargetsLabel={t("config.countdown.emptyTargets")}
              aiSuggestLabel={t("config.countdown.aiSuggest")}
              keywordPlaceholder={t("config.countdown.keywordPlaceholder")}
              aiRecommendLabel={t("config.countdown.aiRecommend")}
              addSelectedLabel={t("config.countdown.addSelected")}
              saveLabel={t("config.common.save")}
              cancelLabel={t("config.common.cancel")}
              editTitle={t("config.common.edit")}
            />
          )}

          {/* Standard config fields */}
          {CONFIG_FIELDS[widgetType].filter((f) => {
            if (widgetType === "treemap" && f.key === "group") return false;
            if (widgetType === "feed" && f.key === "variant") return false;
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
                const { triggerPipeline } = await import("@/dashboard/api");
                triggerPipeline().then(() => onPipelineTriggered?.()).catch(() => {});
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
