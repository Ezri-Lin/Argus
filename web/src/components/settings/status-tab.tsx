import { color, radius } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { type HealthResponse } from "@/dashboard/api";
import { SectionLabel, StatCard } from "./settings-ui";

export function StatusTab({ health }: { health: HealthResponse | null }) {
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
                  {m.status === "running" && <span style={{ color: "var(--color-accent)" }}>...</span>}
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
