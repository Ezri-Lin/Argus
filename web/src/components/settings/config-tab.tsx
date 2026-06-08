import { useState, useEffect } from "react";
import { color, radius } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";
import {
  createModel, updateModels, deleteModel, testModel, fetchModels,
  type SettingsResponse, type ModelsResponse,
} from "@/dashboard/api";
import { ModelCard } from "./model-card";
import { SectionLabel, inputStyle } from "./settings-ui";

/** Mask API key: show first 5 + last 4 chars */
function maskKey(key: string): string {
  if (key.length <= 10) return "••••••••";
  return key.slice(0, 5) + "••••••" + key.slice(-4);
}

export function ConfigTab({ settings, modelsData, setModelsData, markChanged }: {
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
      [id]: res ? { ok: res.ok, msg: res.ok ? res.response || t("settings.config.ok") : res.error || t("settings.config.failed") } : { ok: false, msg: t("settings.config.networkError") },
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
        <SectionLabel>{t("settings.config.tavilyApiKey")}</SectionLabel>
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
