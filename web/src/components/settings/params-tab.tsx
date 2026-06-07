import { useI18n } from "@/lib/use-i18n";
import { color, radius } from "@/design/tokens";
import { type SettingsResponse } from "@/dashboard/api";
import { SectionLabel, inputStyle } from "./settings-ui";

export function ParamsTab({ settings, markChanged }: {
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
