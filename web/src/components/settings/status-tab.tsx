import { useEffect, useState } from "react";
import { color, radius } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { type HealthResponse, fetchBudgetStatus, fetchLastRunSummary } from "@/dashboard/api";
import type { BudgetStatus, LastRunSummary } from "@/dashboard/api-types";
import { SectionLabel, StatCard } from "./settings-ui";

function ProviderHealthPanel({ health }: { health: HealthResponse | null }) {
  const { t } = useI18n();
  const providers = [
    { provider: "RSS Ingest", key: "rss" },
    { provider: "SearXNG", key: "search_searxng" },
    { provider: "Tavily", key: "search_tavily" },
    { provider: t("settings.module.baseModel"), key: "base_model" },
    { provider: t("settings.module.proModel"), key: "pro_model" },
  ];

  const getStatus = (key: string) => {
    if (!health?.modules?.[key]) return "unknown";
    const mod = health.modules[key];
    if (mod.status === "ok") return "healthy";
    if (mod.status === "degraded") return "degraded";
    return "unavailable";
  };

  const statusColor = (s: string) => {
    if (s === "healthy") return color.pos;
    if (s === "degraded") return color.neu;
    return color.neg;
  };

  return (
    <section>
      <SectionLabel>{t("settings.status.providerHealth")}</SectionLabel>
      <div style={{ padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
        {providers.map((p) => {
          const status = getStatus(p.key);
          return (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor(status) }} />
              <span style={{ fontSize: 12, flex: 1, color: color.textPrimary }}>{p.provider}</span>
              <span style={{ fontSize: 11, color: color.textMuted }}>{status === "unknown" ? t("settings.status.unknown") : status}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BudgetStatusBadge() {
  const { t } = useI18n();
  const [budget, setBudget] = useState<BudgetStatus | null>(null);

  useEffect(() => {
    fetchBudgetStatus().then(setBudget).catch(() => {});
  }, []);

  if (!budget) return null;

  const items = [
    { label: t("settings.budget.aiCalls"), ...budget.daily_ai_calls },
    { label: t("settings.budget.llmTokens"), ...budget.daily_llm_tokens },
    { label: t("settings.budget.tavilySpend"), ...budget.daily_tavily_budget_usd },
    { label: t("settings.budget.deepSearch"), ...budget.daily_deep_search_calls },
  ];

  return (
    <section>
      <SectionLabel>{t("settings.status.budgetToday")}</SectionLabel>
      <div style={{ padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: color.textPrimary }}>{item.label}</span>
            <span style={{ fontSize: 12, color: color.textMuted }}>
              {item.used} / {item.limit}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LastRunPanel() {
  const { t } = useI18n();
  const [lastRun, setLastRun] = useState<LastRunSummary | null>(null);

  useEffect(() => {
    fetchLastRunSummary().then(setLastRun).catch(() => {});
  }, []);

  if (!lastRun || lastRun.status === "no_runs") return null;

  return (
    <section>
      <SectionLabel>{t("settings.status.lastPipelineRun")}</SectionLabel>
      <div style={{ padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}`, fontSize: 12, color: color.textSecondary }}>
        {lastRun.last_ok && <div>{t("settings.status.time")}{new Date(lastRun.last_ok).toLocaleString()}</div>}
        {lastRun.module && <div>{t("settings.status.module")}{lastRun.module}</div>}
        {lastRun.last_error && <div style={{ color: color.neg }}>{t("settings.status.error")}{lastRun.last_error}</div>}
      </div>
    </section>
  );
}

export function StatusTab({ health }: { health: HealthResponse | null }) {
  const { t } = useI18n();
  const settings = useDashboardStore((s) => s.settings);

  const STATUS_LABEL: Record<string, string> = { ok: t("settings.status.ok"), degraded: t("settings.status.degraded"), failed: t("settings.status.failed") };
  const MODULE_LABEL: Record<string, string> = {
    pipeline: t("settings.module.pipeline"), rss: t("settings.module.rss"), base_model: t("settings.module.baseModel"),
    pro_model: t("settings.module.proModel"), tavily: t("settings.module.tavily"), prices: t("settings.module.prices"),
    fetch: t("settings.module.fetch"),
  };

  // Hints for modules that are degraded because they're not enabled
  const STALE_HINTS: Record<string, string> = {
    pro_model: settings.pro_enabled !== "true" ? t("settings.status.hintDisabled") : "",
    search_tavily: settings.tavily_enabled !== "true" ? t("settings.status.hintDisabled") : "",
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
                    <span style={{ fontSize: 11, color: color.textMuted }}>{mod.age_hours < 1 ? `${Math.round(mod.age_hours * 60)}m` : `${Math.round(mod.age_hours)}h`}</span>
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

      <section>
        <SectionLabel>{t("settings.status.dataOverview")}</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label={t("settings.status.events")} value={health.event_count} />
          <StatCard label={t("settings.status.members")} value={health.member_count} />
          <StatCard label={t("settings.status.sources")} value={health.source_count} />
        </div>
      </section>

      <ProviderHealthPanel health={health} />
      <BudgetStatusBadge />
      <LastRunPanel />
    </div>
  );
}
