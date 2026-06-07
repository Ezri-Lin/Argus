import { useState, useEffect, useCallback } from "react";
import { color, radius } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import {
  fetchSettings, saveSettings,
  fetchHealth, fetchModels,
  type HealthResponse, type SettingsResponse, type ModelsResponse,
} from "@/dashboard/api";
import { ConfigTab } from "./settings/config-tab";
import { FeaturesTab } from "./settings/features-tab";
import { ParamsTab } from "./settings/params-tab";
import { SearchTab } from "./settings/search-tab";
import { StatusTab } from "./settings/status-tab";
import { ImportTab } from "./settings/import-tab";

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

  // Batched save -- saves all changed key/value pairs at once
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
          <button onClick={onClose} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: radius.inner, border: `1px solid ${color.hairline}`, background: "transparent", color: color.textSecondary, fontSize: 16, cursor: "pointer" }}>x</button>
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

        {/* Bottom save bar -- hidden on status tab */}
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
