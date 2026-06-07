import { useI18n } from "@/lib/use-i18n";
import { color, radius } from "@/design/tokens";
import { assignModelRole, type SettingsResponse, type ModelsResponse, type ModelItem } from "@/dashboard/api";
import { SectionLabel, ToggleRow, inputStyle } from "./settings-ui";

export function FeaturesTab({ settings, modelsData, setModelsData, markChanged }: {
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
