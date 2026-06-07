import { useState, useEffect, useRef } from "react";
import { color, radius } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";
import { updateModels, type ModelItem } from "@/dashboard/api";

const inputStyle = {
  width: "100%", padding: "8px 10px", fontSize: 13,
  color: color.textPrimary, background: color.surface2,
  border: `1px solid ${color.hairline}`, borderRadius: radius.inner, outline: "none",
} as const;

export function ModelCard({ model, onTest, onDelete, onUpdate, testing, testResult }: {
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
