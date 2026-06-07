import { useState, useEffect, useRef, useCallback } from "react";
import { color, radius } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import {
  fetchSettings, saveSettings,
  fetchHealth, fetchModels,
  createModel, updateModels, deleteModel, assignModelRole, testModel,
  fetchSourcesLibrary, importSourcesLibrary,
  fetchSearchProviders, updateSearchProvider, testSearchProvider, fetchSearchLogs,
  type HealthResponse, type SettingsResponse, type ModelsResponse, type ModelItem,
  type LibraryDoc, type SearchProvider as SearchProviderType, type SearchLog,
} from "@/dashboard/api";

type Tab = "config" | "features" | "params" | "search" | "status" | "import";

const TAB_KEYS: Tab[] = ["config", "features", "params", "search", "status", "import"];

type SettingsPanelProps = { onClose: () => void };

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("config");
  const [settings, setSettings] = useState<SettingsResponse>({});

  const tabLabels: Record<Tab, string> = {
    config: t("settings.tab.config"),
    features: t("settings.tab.features"),
    params: t("settings.tab.params"),
    search: t("settings.tab.search"),
    status: t("settings.tab.status"),
    import: t("settings.tab.import"),
  };
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [modelsData, setModelsData] = useState<ModelsResponse | null>(null);

  useEffect(() => {
    fetchSettings().then((s) => { if (s) setSettings(s); });
    fetchHealth().then(setHealth);
    fetchModels().then(setModelsData);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Batched save — saves all changed key/value pairs at once
  const [pending, setPending] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const markChanged = useCallback((key: string, value: string) => {
    setPending((p) => ({ ...p, [key]: value }));
    setSettings((s) => ({ ...s, [key]: value }));
    setSaveMsg("");
  }, []);

  const handleSave = useCallback(async () => {
    if (Object.keys(pending).length === 0) {
      setSaveMsg(t("settings.save.noChanges"));
      return;
    }
    setSaving(true);
    setSaveMsg("");
    const ok = await saveSettings(pending);
    setSaving(false);
    if (ok) {
      // Sync saved settings into the store so StatusTab hints update immediately
      useDashboardStore.setState((s) => ({ settings: { ...s.settings, ...pending } }));
      // Re-fetch health to reflect any changes
      fetchHealth().then((h) => { if (h) useDashboardStore.setState({ healthData: h }); });
      setPending({});
      setSaveMsg(t("settings.save.success"));
    } else {
      setSaveMsg(t("settings.save.failed"));
    }
  }, [pending, t]);

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{ width: 420, background: color.surface, borderLeft: `1px solid ${color.hairline}`, animation: "slide-in-right 0.2s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${color.hairline}` }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: color.textPrimary }}>{t("settings.title")}</span>
          <button onClick={onClose} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: radius.inner, border: `1px solid ${color.hairline}`, background: "transparent", color: color.textSecondary, fontSize: 16, cursor: "pointer" }}>×</button>
        </div>

        {/* Tabs */}
        <div className="flex px-5" style={{ borderBottom: `1px solid ${color.hairline}` }}>
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: "10px 14px", fontSize: 13, fontWeight: tab === key ? 600 : 400,
                color: tab === key ? color.textPrimary : color.textMuted,
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: tab === key ? `2px solid ${color.textSecondary}` : "2px solid transparent",
              }}
            >
              {tabLabels[key]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "config" && <ConfigTab settings={settings} modelsData={modelsData} setModelsData={setModelsData} markChanged={markChanged} />}
          {tab === "features" && <FeaturesTab settings={settings} modelsData={modelsData} setModelsData={setModelsData} markChanged={markChanged} />}
          {tab === "params" && <ParamsTab settings={settings} markChanged={markChanged} />}
          {tab === "search" && <SearchTab settings={settings} markChanged={markChanged} />}
          {tab === "status" && <StatusTab health={health} />}
          {tab === "import" && <ImportTab />}
        </div>

        {/* Bottom save bar — hidden on status tab */}
        {tab !== "status" && (
          <div className="flex items-center gap-3 px-5 py-3" style={{ borderTop: `1px solid ${color.hairline}` }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "8px 20px", fontSize: 13, fontWeight: 650, color: color.bg, background: saving ? color.textMuted : color.accent, border: "none", borderRadius: 999, cursor: "pointer" }}
            >
              {saving ? t("settings.save.saving") : t("settings.save.button")}
            </button>
            {saveMsg && (
              <span style={{ fontSize: 12, color: saveMsg === t("settings.save.success") ? color.pos : saveMsg === t("settings.save.noChanges") ? color.textMuted : color.neg }}>
                {saveMsg}
              </span>
            )}
            {Object.keys(pending).length > 0 && !saving && (
              <span style={{ fontSize: 11, color: color.textMuted }}>
                {Object.keys(pending).length} {t("settings.save.unsavedSuffix")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Config Tab: Models + Tavily API Key ──

function ConfigTab({ settings, modelsData, setModelsData, markChanged }: {
  settings: SettingsResponse;
  modelsData: ModelsResponse | null;
  setModelsData: (d: ModelsResponse) => void;
  markChanged: (k: string, v: string) => void;
}) {
  const { t } = useI18n();
  const [tavilyKey, setTavilyKey] = useState(settings.tavily_api_key || "");
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, { ok: boolean; msg: string }>>({});

  useEffect(() => {
    setTavilyKey(settings.tavily_api_key || "");
  }, [settings.tavily_api_key]);

  const handleTest = async (id: number) => {
    setTesting(id);
    const res = await testModel(id);
    setTestResult((prev) => ({
      ...prev,
      [id]: res ? { ok: res.ok, msg: res.ok ? res.response || "OK" : res.error || "Failed" } : { ok: false, msg: "Network error" },
    }));
    setTesting(null);
  };

  const handleAddModel = async () => {
    const res = await createModel({ label: t("settings.model.new"), base_url: "", api_key: "", model: "" });
    if (res) {
      const updated = await fetchModels();
      if (updated) setModelsData(updated);
    }
  };

  const handleDeleteModel = async (id: number) => {
    await deleteModel(id);
    const updated = await fetchModels();
    if (updated) setModelsData(updated);
  };

  const handleUpdateModel = async (id: number, patch: Record<string, unknown>) => {
    const ok = await updateModels([{ id, ...patch }]);
    if (!ok) return false;
    const updated = await fetchModels();
    if (updated) setModelsData(updated);
    return true;
  };

  const models = modelsData?.models ?? [];

  return (
    <div className="flex flex-col gap-5">
      {/* Models */}
      <section>
        <SectionLabel>{t("settings.config.aiModels")}</SectionLabel>
        <div className="flex flex-col gap-2">
          {models.map((m) => (
            <ModelCard
              key={m.id}
              model={m}
              onTest={() => handleTest(m.id)}
              onDelete={() => handleDeleteModel(m.id)}
              onUpdate={(patch) => handleUpdateModel(m.id, patch)}
              testing={testing === m.id}
              testResult={testResult[m.id]}
            />
          ))}
        </div>
        <button onClick={handleAddModel} style={{ marginTop: 8, width: "100%", padding: "8px 0", fontSize: 12, color: color.textSecondary, background: "transparent", border: `1px dashed ${color.hairline}`, borderRadius: radius.inner, cursor: "pointer" }}>+ {t("settings.config.addModel")}</button>
      </section>

      {/* Tavily API Key */}
      <section>
        <SectionLabel>Tavily API Key</SectionLabel>
        {settings.tavily_api_key && (
          <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 6 }}>
            {t("settings.config.currentPrefix")} {maskKey(settings.tavily_api_key)}
          </div>
        )}
        <input
          type="password"
          value={tavilyKey}
          onChange={(e) => setTavilyKey(e.target.value)}
          onBlur={() => { if (tavilyKey !== (settings.tavily_api_key || "")) markChanged("tavily_api_key", tavilyKey); }}
          placeholder="tvly-..."
          style={inputStyle}
        />
      </section>

      {/* Language */}
      <section>
        <SectionLabel>{t("settings.config.language")}</SectionLabel>
        <div className="flex gap-1">
          {(["zh", "en"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => markChanged("language", lang)}
              style={{
                padding: "6px 16px", fontSize: 12, fontWeight: 500, borderRadius: radius.inner,
                border: `1px solid ${(settings.language || "zh") === lang ? color.accent : color.hairline}`,
                background: (settings.language || "zh") === lang ? color.accentSoft : "transparent",
                color: (settings.language || "zh") === lang ? color.textPrimary : color.textMuted,
                cursor: "pointer",
              }}
            >
              {lang === "zh" ? "中文" : "English"}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Model Card ──

function ModelCard({ model, onTest, onDelete, onUpdate, testing, testResult }: {
  model: ModelItem;
  onTest: () => void;
  onDelete: () => void;
  onUpdate: (patch: Record<string, unknown>) => Promise<boolean>;
  testing: boolean;
  testResult?: { ok: boolean; msg: string };
}) {
  const { t } = useI18n();
  const [label, setLabel] = useState(model.label);
  const [baseUrl, setBaseUrl] = useState(model.base_url);
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState(model.model);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setLabel(model.label);
    setBaseUrl(model.base_url);
    setModelName(model.model);
    setSaveState("idle");
  }, [model.base_url, model.label, model.model]);

  const handleSave = async () => {
    const patch: Record<string, unknown> = {};
    if (label !== model.label) patch.label = label;
    if (baseUrl !== model.base_url) patch.base_url = baseUrl;
    if (modelName !== model.model) patch.model = modelName;
    if (apiKey) patch.api_key = apiKey;
    if (Object.keys(patch).length === 0) {
      setSaveState("saved");
      return;
    }
    setSaveState("saving");
    const ok = await onUpdate(patch);
    if (ok) {
      setApiKey("");
      setSaveState("saved");
    } else {
      setSaveState("error");
    }
  };

  // Auto-save on unmount if dirty
  const dirtyRef = useRef({ label, baseUrl, modelName, apiKey });
  dirtyRef.current = { label, baseUrl, modelName, apiKey };
  const modelRef = useRef(model);
  modelRef.current = model;
  useEffect(() => {
    return () => {
      const { label: l, baseUrl: b, modelName: m, apiKey: k } = dirtyRef.current;
      const orig = modelRef.current;
      const patch: Record<string, unknown> = {};
      if (l !== orig.label) patch.label = l;
      if (b !== orig.base_url) patch.base_url = b;
      if (m !== orig.model) patch.model = m;
      if (k) patch.api_key = k;
      if (Object.keys(patch).length > 0) {
        updateModels([{ id: orig.id, ...patch }]).catch(() => {});
      }
    };
  }, []);

  return (
    <div style={{ padding: 12, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      <div className="flex items-center gap-2 mb-2">
        <input value={label} onChange={(e) => { setLabel(e.target.value); setSaveState("idle"); }} placeholder={t("settings.model.namePlaceholder")} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, flex: 1 }} />
        <button onClick={async () => { await handleSave(); onTest(); }} disabled={testing || saveState === "saving"} style={{ padding: "5px 11px", fontSize: 11, color: color.bg, background: testing ? color.textMuted : color.accent, border: "none", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap", fontWeight: 650 }}>{testing ? "..." : saveState === "saving" ? "..." : t("settings.model.test")}</button>
        <button onClick={onDelete} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: color.neg, fontSize: 13, cursor: "pointer" }}>✕</button>
      </div>
      <input value={baseUrl} onChange={(e) => { setBaseUrl(e.target.value); setSaveState("idle"); }} placeholder="Base URL" style={{ ...inputStyle, padding: "4px 8px", fontSize: 11, marginBottom: 4 }} />
      <div className="flex gap-2">
        <div className="flex-1">
          <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setSaveState("idle"); }} placeholder={model.has_api_key ? "API Key saved · enter to replace" : "API Key"} style={{ ...inputStyle, padding: "4px 8px", fontSize: 11 }} />
          {model.has_api_key && !apiKey && (
            <div style={{ fontSize: 10, color: color.pos, marginTop: 2 }}>{t("settings.model.configured")}</div>
          )}
        </div>
        <input value={modelName} onChange={(e) => { setModelName(e.target.value); setSaveState("idle"); }} placeholder="Model name" style={{ ...inputStyle, padding: "4px 8px", fontSize: 11, flex: 1 }} />
      </div>
      {testResult && (
        <div style={{ marginTop: 4, fontSize: 11, color: testResult.ok ? color.pos : color.neg }}>
          {testResult.ok ? "✓ " : "✕ "}{testResult.msg}
        </div>
      )}
      {saveState === "saved" && <div style={{ fontSize: 10, color: color.pos, marginTop: 4 }}>{t("settings.model.saved")}</div>}
      {saveState === "error" && <div style={{ fontSize: 10, color: color.neg, marginTop: 4 }}>{t("settings.model.saveFailed")}</div>}
    </div>
  );
}

// ── Features Tab: Toggles + Role Assignment ──

function FeaturesTab({ settings, modelsData, setModelsData, markChanged }: {
  settings: SettingsResponse;
  modelsData: ModelsResponse | null;
  setModelsData: (d: ModelsResponse) => void;
  markChanged: (k: string, v: string) => void;
}) {
  const { t } = useI18n();
  const models = modelsData?.models ?? [];
  const roles = modelsData?.roles ?? {};

  const toggle = (key: string) => markChanged(key, settings[key] === "true" ? "false" : "true");

  const handleRoleAssigned = (role: string, modelId: number) => {
    if (modelsData) {
      setModelsData({ ...modelsData, roles: { ...modelsData.roles, [role]: modelId } });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <section>
        <SectionLabel>{t("settings.features.toggleSection")}</SectionLabel>
        <div className="flex flex-col gap-1">
          <ToggleRow label={t("settings.features.tavilyDeep")} desc={t("settings.features.tavilyDeepDesc")} enabled={settings.tavily_enabled === "true"} onToggle={() => toggle("tavily_enabled")} />
          <ToggleRow label={t("settings.features.proModel")} desc={t("settings.features.proModelDesc")} enabled={settings.pro_enabled === "true"} onToggle={() => toggle("pro_enabled")} />
        </div>
      </section>

      <section>
        <SectionLabel>{t("settings.features.roleAssign")}</SectionLabel>
        <div className="flex flex-col gap-2">
          <RoleSelect label={t("settings.features.baseModel")} role="base" models={models} currentId={roles.base} onAssigned={handleRoleAssigned} />
          <RoleSelect label={t("settings.module.proModel")} role="pro" models={models} currentId={roles.pro} onAssigned={handleRoleAssigned} />
        </div>
      </section>
    </div>
  );
}

function RoleSelect({ label, role, models, currentId, onAssigned }: {
  label: string; role: string; models: ModelItem[]; currentId: number | undefined;
  onAssigned: (role: string, modelId: number) => void;
}) {
  const { t } = useI18n();
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = parseInt(e.target.value);
    if (isNaN(modelId)) return;
    const ok = await assignModelRole(role, modelId);
    if (ok) onAssigned(role, modelId);
  };
  return (
    <div style={{ padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      <div style={{ fontSize: 12, color: color.textSecondary, marginBottom: 6 }}>{label}</div>
      <select
        value={currentId ?? ""}
        onChange={handleChange}
        style={inputStyle}
      >
        <option value="">{t("settings.model.unassigned")}</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.label} ({m.model || "?"})</option>
        ))}
      </select>
    </div>
  );
}

// ── Params Tab ──

function ParamsTab({ settings, markChanged }: {
  settings: SettingsResponse;
  markChanged: (k: string, v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <section>
        <SectionLabel>{t("settings.params.refreshInterval")}</SectionLabel>
        <div className="flex items-center gap-2">
          <input
            type="number" min={5} max={240}
            value={settings.refresh_min ?? "60"}
            onChange={(e) => markChanged("refresh_min", e.target.value)}
            style={{ ...inputStyle, width: 70 }}
          />
          <span style={{ fontSize: 12, color: color.textMuted }}>{t("settings.params.minutes")}</span>
        </div>
      </section>
      <section>
        <SectionLabel>{t("settings.params.healthThresholds")}</SectionLabel>
        <ParamRow label={t("settings.params.degradedThreshold")} desc={t("settings.params.degradedThresholdDesc")} field="stale_threshold_min" value={settings.stale_threshold_min ?? "90"} unit={t("settings.params.minutes")} onChange={markChanged} />
        <ParamRow label={t("settings.params.failThreshold")} desc={t("settings.params.failThresholdDesc")} field="global_fail_count" value={settings.global_fail_count ?? "2"} unit={t("settings.params.countUnit")} onChange={markChanged} />
      </section>
    </div>
  );
}

function ParamRow({ label, desc, field, value, unit, onChange }: {
  label: string; desc: string; field: string; value: string; unit: string;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <div style={{ padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}`, marginBottom: 8 }}>
      <div style={{ fontSize: 13, color: color.textPrimary }}>{label}</div>
      <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 6 }}>{desc}</div>
      <div className="flex items-center gap-2">
        <input type="number" value={value} onChange={(e) => onChange(field, e.target.value)} style={{ ...inputStyle, width: 70, padding: "4px 8px", fontSize: 12 }} />
        <span style={{ fontSize: 11, color: color.textMuted }}>{unit}</span>
      </div>
    </div>
  );
}

// ── Search Tab ──

function SearchTab({ settings, markChanged }: {
  settings: SettingsResponse;
  markChanged: (k: string, v: string) => void;
}) {
  const { t } = useI18n();
  const [providers, setProviders] = useState<SearchProviderType[]>([]);
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const loadProviders = () => fetchSearchProviders().then((p) => { if (p) setProviders(p); });
  const loadLogs = () => fetchSearchLogs(20).then((r) => { if (r) setLogs(r.logs); });

  useEffect(() => { loadProviders(); loadLogs(); }, []);

  const handleToggle = async (name: string, current: number) => {
    const ok = await updateSearchProvider(name, { enabled: current ? 0 : 1 });
    if (ok) loadProviders();
  };

  const handleFieldChange = async (name: string, field: string, value: number) => {
    await updateSearchProvider(name, { [field]: value });
    loadProviders();
  };

  const handleTest = async (name: string) => {
    setTesting(name);
    setTestResult((r) => ({ ...r, [name]: { ok: false, msg: t("search.testing") } }));
    const res = await testSearchProvider(name);
    setTesting(null);
    if (res) {
      setTestResult((r) => ({
        ...r,
        [name]: { ok: res.ok, msg: res.ok ? `${t("search.testOk")} (${res.latency_ms}ms)` : (res.error || t("search.testFail")) },
      }));
    } else {
      setTestResult((r) => ({ ...r, [name]: { ok: false, msg: t("search.testFail") } }));
    }
  };

  // Group providers by profile
  const discoveryProviders = providers.filter((p) => p.profile === "discovery" || p.profile === "both");
  const deepProviders = providers.filter((p) => p.profile === "deep" || p.profile === "both");

  const profileBadge = (profile: string) => {
    const colors: Record<string, string> = { discovery: "#3b82f6", deep: "#f59e0b", both: "#8b5cf6" };
    return (
      <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 999, background: colors[profile] || color.textMuted, color: "#fff", marginLeft: 6, verticalAlign: "middle" }}>
        {profile}
      </span>
    );
  };

  const renderProviderCard = (p: SearchProviderType) => (
    <div key={p.name} style={{ padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: color.textPrimary, textTransform: "capitalize" }}>
          {p.name}{profileBadge(p.profile)}
        </span>
        <button
          onClick={() => handleToggle(p.name, p.enabled)}
          style={{
            padding: "3px 10px", fontSize: 11, fontWeight: 500, borderRadius: 999,
            border: `1px solid ${p.enabled ? color.accent : color.hairline}`,
            background: p.enabled ? color.accentSoft : "transparent",
            color: p.enabled ? color.accent : color.textMuted,
            cursor: "pointer",
          }}
        >
          {p.enabled ? t("search.enabled") : "OFF"}
        </button>
      </div>
      <div className="flex items-center gap-3" style={{ fontSize: 11, color: color.textSecondary }}>
        <label className="flex items-center gap-1">
          {t("search.priority")}
          <input type="number" value={p.priority} onChange={(e) => handleFieldChange(p.name, "priority", parseInt(e.target.value) || 99)} style={{ ...inputStyle, width: 50, padding: "2px 6px", fontSize: 11 }} />
        </label>
        <label className="flex items-center gap-1">
          {t("search.dailyCap")}
          <input type="number" value={p.daily_cap} onChange={(e) => handleFieldChange(p.name, "daily_cap", parseInt(e.target.value) || 100)} style={{ ...inputStyle, width: 60, padding: "2px 6px", fontSize: 11 }} />
        </label>
        <label className="flex items-center gap-1">
          {t("search.timeout")}
          <input type="number" value={p.timeout_sec} onChange={(e) => handleFieldChange(p.name, "timeout_sec", parseInt(e.target.value) || 8)} style={{ ...inputStyle, width: 50, padding: "2px 6px", fontSize: 11 }} />
        </label>
        <button
          onClick={() => handleTest(p.name)}
          disabled={testing === p.name}
          style={{ padding: "2px 8px", fontSize: 11, borderRadius: radius.inner, border: `1px solid ${color.hairline}`, background: "transparent", color: color.textSecondary, cursor: "pointer" }}
        >
          {testing === p.name ? t("search.testing") : t("search.test")}
        </button>
      </div>
      {testResult[p.name] && (
        <div style={{ fontSize: 10, color: testResult[p.name].ok ? "#4ade80" : "#f87171", marginTop: 4 }}>
          {testResult[p.name].msg}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Discovery providers */}
      <section>
        <SectionLabel>Discovery {t("search.provider")}</SectionLabel>
        <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 6 }}>SearXNG / Serper / Bocha — 低成本扫描，每成员每轮</div>
        <div className="flex flex-col gap-2">
          {discoveryProviders.length === 0 && (
            <div style={{ fontSize: 12, color: color.textMuted, padding: 12 }}>{t("search.noProviders")}</div>
          )}
          {discoveryProviders.map(renderProviderCard)}
        </div>
      </section>

      {/* Deep search providers */}
      <section>
        <SectionLabel>Deep Search {t("search.provider")}</SectionLabel>
        <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 6 }}>Tavily — 高质量补证，由 EscalationPolicy 按需触发</div>
        <div className="flex flex-col gap-2">
          {deepProviders.length === 0 && (
            <div style={{ fontSize: 12, color: color.textMuted, padding: 12 }}>{t("search.noProviders")}</div>
          )}
          {deepProviders.map(renderProviderCard)}
        </div>
      </section>

      {/* Search logs */}
      <section>
        <SectionLabel>{t("search.logs")}</SectionLabel>
        {logs.length === 0 ? (
          <div style={{ fontSize: 12, color: color.textMuted, padding: 12 }}>{t("search.noLogs")}</div>
        ) : (
          <div style={{ fontSize: 11, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: color.textMuted, textAlign: "left" }}>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>{t("search.time")}</th>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>{t("search.provider")}</th>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>Profile</th>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>{t("search.results")}</th>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>{t("search.latency")}</th>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>{t("search.fallback")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderTop: `1px solid ${color.hairline}` }}>
                    <td style={{ padding: "4px 6px", color: color.textSecondary }}>{log.ts?.slice(5, 16)}</td>
                    <td style={{ padding: "4px 6px", color: color.textPrimary, textTransform: "capitalize" }}>{log.provider}</td>
                    <td style={{ padding: "4px 6px", color: color.textSecondary }}>{log.profile}</td>
                    <td style={{ padding: "4px 6px", color: color.textPrimary }}>{log.results_count}</td>
                    <td style={{ padding: "4px 6px", color: color.textSecondary }}>{log.latency_ms ? `${log.latency_ms}ms` : "-"}</td>
                    <td style={{ padding: "4px 6px", color: log.fallback_used ? "#fbbf24" : color.textMuted }}>{log.fallback_used ? "Y" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Status Tab ──

function StatusTab({ health }: { health: HealthResponse | null }) {
  const { t } = useI18n();
  const pipelineProgress = useDashboardStore((s) => s.pipelineProgress);
  const settings = useDashboardStore((s) => s.settings);

  const STATUS_LABEL: Record<string, string> = { ok: t("settings.status.ok"), degraded: t("settings.status.degraded"), failed: t("settings.status.failed") };
  const MODULE_LABEL: Record<string, string> = {
    pipeline: t("settings.module.pipeline"), rss: t("settings.module.rss"), base_model: t("settings.module.baseModel"),
    pro_model: t("settings.module.proModel"), tavily: t("settings.module.tavily"), prices: t("settings.module.prices"),
  };

  // Hints for modules that are degraded because they're not enabled
  const STALE_HINTS: Record<string, string> = {
    pro_model: settings.pro_enabled !== "true" ? t("settings.status.hintDisabled") : "",
    tavily: settings.tavily_enabled !== "true" ? t("settings.status.hintDisabled") : "",
  };

  if (!health) return <div style={{ fontSize: 13, color: color.textMuted }}>{t("settings.status.loading")}</div>;

  return (
    <div className="flex flex-col gap-5">
      <section>
        <SectionLabel>{t("settings.status.systemHealth")}</SectionLabel>
        <div className="flex flex-col gap-1">
          {Object.entries(health.modules).map(([key, mod]) => {
            const hint = mod.status !== "ok" ? (mod.last_error || STALE_HINTS[key] || "") : "";
            return (
              <div key={key} style={{ padding: "8px 10px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="flex items-center gap-2">
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: mod.status === "ok" ? color.pos : mod.status === "degraded" ? color.neu : color.neg }} />
                    <span style={{ fontSize: 13, color: color.textPrimary }}>{MODULE_LABEL[key] ?? key}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, color: color.textMuted }}>{mod.age_min < 60 ? `${mod.age_min}m` : `${Math.round(mod.age_min / 60)}h`}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: color.white, background: mod.status === "ok" ? color.posBg : mod.status === "degraded" ? "rgba(139,141,152,0.3)" : color.negBg, borderRadius: radius.pill, padding: "1px 6px" }}>{STATUS_LABEL[mod.status] ?? mod.status}</span>
                  </div>
                </div>
                {hint && (
                  <div style={{ fontSize: 10, color: mod.status === "failed" ? color.neg : color.textMuted, marginTop: 4, paddingLeft: 15 }}>
                    {hint}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Member Progress */}
      {pipelineProgress && pipelineProgress.members.length > 0 && (
        <section>
          <SectionLabel>
            {t("settings.status.memberProgress")}
            <span style={{ fontSize: 11, fontWeight: 400, color: color.textMuted, marginLeft: 8 }}>
              {Math.round(pipelineProgress.members.filter((m) => m.status === "done").length / pipelineProgress.members.length * 100)}%
              ({pipelineProgress.members.filter((m) => m.status === "done").length}/{pipelineProgress.members.length})
            </span>
          </SectionLabel>
          {/* Progress bar */}
          <div style={{
            height: 4, borderRadius: 2, background: color.surface,
            marginBottom: 8, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 2,
              width: `${Math.round(pipelineProgress.members.filter((m) => m.status === "done").length / pipelineProgress.members.length * 100)}%`,
              background: pipelineProgress.running ? "var(--color-accent)" : color.pos,
            }} />
          </div>
          <div className="flex flex-col gap-0.5" style={{ maxHeight: 240, overflow: "auto" }}>
            {pipelineProgress.members.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-2"
                style={{
                  padding: "5px 8px",
                  background: color.surface2,
                  borderRadius: radius.inner,
                  border: `1px solid ${color.hairline}`,
                }}
              >
                <span style={{ fontSize: 12, width: 18, textAlign: "center" }}>
                  {m.status === "done" ? "✅" : m.status === "running" ? "⏳" : m.status === "failed" ? "❌" : "⏸"}
                </span>
                <span style={{ fontSize: 12, color: color.textPrimary, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.domain && <span style={{ color: color.textMuted }}>{m.domain} · </span>}
                  {m.name}
                </span>
                <span style={{ fontSize: 11, color: color.textMuted, flexShrink: 0 }}>
                  {m.status === "done" && m.events > 0 && `${m.events} ${t("detail.events")}`}
                  {m.status === "done" && m.events === 0 && m.log}
                  {m.status === "failed" && <span style={{ color: color.neg }}>{m.log}</span>}
                  {m.status === "running" && <span style={{ color: "var(--color-accent)" }}>…</span>}
                  {m.status === "pending" && <span style={{ opacity: 0.5 }}>{t("detail.waiting")}</span>}
                </span>
              </div>
            ))}
          </div>
          {pipelineProgress.events_found > 0 && (
            <div style={{ fontSize: 11, color: color.textMuted, marginTop: 6 }}>
              {t("detail.eventsFound")} {pipelineProgress.events_found}
            </div>
          )}
        </section>
      )}

      <section>
        <SectionLabel>{t("settings.status.dataOverview")}</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label={t("settings.status.events")} value={health.event_count} />
          <StatCard label={t("settings.status.members")} value={health.member_count} />
          <StatCard label={t("settings.status.sources")} value={health.source_count} />
        </div>
      </section>
    </div>
  );
}

// ── Import Tab: Sources Library ──

function ImportTab() {
  const { t } = useI18n();
  const [lib, setLib] = useState<LibraryDoc | null>(null);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSourcesLibrary().then((d) => { if (d) setLib(d); });
  }, []);

  const sCount = lib?.streams?.length ?? 0;
  const fCount = lib?.feeds?.length ?? 0;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImporting(true);
    setMsg("");

    const streams: LibraryDoc["streams"] = [];
    const feeds: LibraryDoc["feeds"] = [];

    for (const file of Array.from(files)) {
      const text = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

      if (ext === "json") {
        parseJsonFile(text, streams, feeds);
      } else {
        // .md, .txt, or any other text format — extract URLs
        parseTextFile(text, streams, feeds);
      }
    }

    if (streams.length === 0 && feeds.length === 0) {
      setMsg(t("settings.import.noValidUrl"));
      setImporting(false);
      return;
    }

    const doc: LibraryDoc = { streams, feeds };
    const res = await importSourcesLibrary(doc);
    if (res?.ok) {
      setMsg(`+${res.added_streams} ${t("settings.import.streams")}, +${res.added_feeds} ${t("settings.import.rss")}`);
      const fresh = await fetchSourcesLibrary();
      if (fresh) setLib(fresh);
    } else {
      setMsg(t("settings.import.failed"));
    }
    setImporting(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  // Drag & drop
  const [dragging, setDragging] = useState(false);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Current stats */}
      <section>
        <SectionLabel>{t("settings.import.libraryOverview")}</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label={t("settings.import.streams")} value={sCount} />
          <StatCard label={t("settings.import.rssSources")} value={fCount} />
        </div>
      </section>

      {/* Drop zone */}
      <section>
        <SectionLabel>{t("settings.import.dropZone")}</SectionLabel>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            padding: "24px 16px",
            border: `2px dashed ${dragging ? color.textSecondary : color.hairline}`,
            borderRadius: radius.inner,
            background: dragging ? color.surfaceElev : color.surface2,
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <div style={{ fontSize: 13, color: color.textPrimary, marginBottom: 4 }}>
            {importing ? t("settings.import.importing") : t("settings.import.dropHint")}
          </div>
          <div style={{ fontSize: 11, color: color.textMuted }}>
            {t("settings.import.supportedFormats")}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.md,.txt,.xml"
          multiple
          onChange={handleFileInput}
          style={{ display: "none" }}
        />
        {msg && (
          <div style={{ fontSize: 12, color: msg.startsWith("+") ? color.pos : color.neg, marginTop: 8 }}>
            {msg}
          </div>
        )}
      </section>

      {/* Explanation */}
      <section>
        <SectionLabel>{t("settings.import.formatHelp")}</SectionLabel>
        <div style={{ fontSize: 11, color: color.textMuted, lineHeight: 1.6 }}>
          <div style={{ marginBottom: 6 }}>
            <strong style={{ color: color.textSecondary }}>{t("settings.import.jsonFormat")}</strong> — {t("settings.import.jsonFormatDesc")}
          </div>
          <pre style={{ fontSize: 10, color: color.textMuted, background: color.surface2, padding: 8, borderRadius: radius.inner, overflow: "auto", marginBottom: 10 }}>
{`{"streams": [{"name": "...", "url": "..."}],
 "feeds":   [{"name": "...", "url": "..."}]}`}
          </pre>
          <div style={{ marginBottom: 6 }}>
            <strong style={{ color: color.textSecondary }}>MD / TXT</strong> — {t("settings.import.mdFormatDesc")}
          </div>
          <div style={{ paddingLeft: 8 }}>
            <div>含 <code>.m3u8</code> / <code>.mpd</code> / <code>.mp4</code> → 视频流</div>
            <div>含 <code>.xml</code> / <code>.rss</code> / <code>/feed</code> → RSS 源</div>
            <div>{t("settings.import.defaultClassification")}</div>
          </div>
        </div>
      </section>

      {/* Current library contents */}
      {lib && (sCount > 0 || fCount > 0) && (
        <section>
          <SectionLabel>{t("settings.import.importedContent")}</SectionLabel>
          {sCount > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 4 }}>{t("settings.import.streams")} ({sCount})</div>
              <div className="flex flex-col gap-1" style={{ maxHeight: 120, overflowY: "auto" }}>
                {lib.streams.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
                    <span style={{ fontSize: 12, color: color.textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                    {s.type && <span style={{ fontSize: 9, color: color.textMuted, textTransform: "uppercase", flexShrink: 0 }}>{s.type}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {fCount > 0 && (
            <div>
              <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 4 }}>{t("settings.import.rssSources")} ({fCount})</div>
              <div className="flex flex-col gap-1" style={{ maxHeight: 120, overflowY: "auto" }}>
                {lib.feeds.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
                    <span style={{ fontSize: 12, color: color.textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <span style={{ fontSize: 9, color: color.textMuted, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.url}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ── Shared components ──

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{children}</div>;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}`, textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color.textPrimary, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 10, color: color.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ToggleRow({ label, desc, enabled, onToggle }: { label: string; desc: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      <div>
        <div style={{ fontSize: 13, color: color.textPrimary }}>{label}</div>
        <div style={{ fontSize: 10, color: color.textMuted, marginTop: 2 }}>{desc}</div>
      </div>
      <button onClick={onToggle} style={{ width: 36, height: 20, borderRadius: 10, border: "none", background: enabled ? color.textPrimary : color.surfaceElev, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
        <span style={{ width: 16, height: 16, borderRadius: "50%", background: enabled ? color.bg : color.textMuted, position: "absolute", top: 2, left: enabled ? 18 : 2, transition: "left 0.2s" }} />
      </button>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px", fontSize: 13,
  color: color.textPrimary, background: color.surface2,
  border: `1px solid ${color.hairline}`, borderRadius: radius.inner, outline: "none",
} as const;

// ── Helpers ──

/** Mask API key: show first 5 + last 4 chars */
function maskKey(key: string): string {
  if (key.length <= 10) return "••••••••";
  return key.slice(0, 5) + "••••••" + key.slice(-4);
}

/** Parse JSON file containing streams/feeds arrays */
function parseJsonFile(text: string, streams: LibraryDoc["streams"], feeds: LibraryDoc["feeds"]) {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data.streams)) {
      for (const s of data.streams) {
        if (s.url) streams.push({ name: s.name || s.label || new URL(s.url).hostname, url: s.url, type: s.type, domain: s.domain });
      }
    }
    if (Array.isArray(data.feeds)) {
      for (const f of data.feeds) {
        if (f.url) feeds.push({ name: f.name || f.label || new URL(f.url).hostname, url: f.url, domain: f.domain });
      }
    }
    // Also handle bare array of URLs
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "string") {
      for (const url of data) classifyUrl(url, streams, feeds);
    }
  } catch {
    // Not valid JSON, try as text
    parseTextFile(text, streams, feeds);
  }
}

/** Extract URLs from markdown/text and classify them */
function parseTextFile(text: string, streams: LibraryDoc["streams"], feeds: LibraryDoc["feeds"]) {
  // Match URLs in various formats: bare URLs, markdown links [text](url), or href="url"
  const urlRegex = /https?:\/\/[^\s\)\]>"',;]+/gi;
  const matches = text.match(urlRegex) ?? [];
  for (const url of matches) {
    classifyUrl(url, streams, feeds);
  }
}

/** Classify a URL as stream or feed based on extension/path */
function classifyUrl(url: string, streams: LibraryDoc["streams"], feeds: LibraryDoc["feeds"]) {
  const lower = url.toLowerCase();
  const name = safeHostname(url);

  if (/\.(xml|rss)(\?|$)/i.test(lower) || /\/feed[s]?(\?|$|\/)/i.test(lower) || /\/rss(\?|$|\/)/i.test(lower)) {
    feeds.push({ name, url });
  } else if (/\.(m3u8|mpd|mp4|webm|ogg)(\?|$)/i.test(lower)) {
    const type = /\.m3u8/i.test(lower) ? "hls" : /\.mpd/i.test(lower) ? "dash" : "video";
    streams.push({ name, url, type });
  } else {
    // Default: treat as video stream
    streams.push({ name, url });
  }
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url.slice(0, 30); }
}
