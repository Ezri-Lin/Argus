/** Lightweight overlay showing pipeline progress and system health for a widget. */

import { useState, useEffect } from "react";
import { color, radius, fontSize, fontFamily } from "@/design/tokens";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { useFreshness } from "@/lib/use-freshness";
import { useI18n } from "@/lib/use-i18n";

type DetailOverlayProps = {
  widgetTitle: string;
  widgetType: string;
  onClose: () => void;
  onRefresh: () => void;
};

const PIPELINE_WIDGET_TYPES = ["treemap", "feed", "timeseries", "search"];

const STATUS_DOT: Record<string, string> = {
  ok: "var(--color-pos)",
  degraded: "var(--color-warn)",
  failed: "var(--color-neg)",
  running: "var(--color-accent)",
};

const MEMBER_ICONS: Record<string, string> = {
  pending: "⏸",
  running: "⏳",
  done: "✅",
  failed: "❌",
};

export function DetailOverlay({ widgetTitle, widgetType, onClose, onRefresh }: DetailOverlayProps) {
  const showPipeline = PIPELINE_WIDGET_TYPES.includes(widgetType);
  const { t } = useI18n();
  const healthData = useDashboardStore((s) => s.healthData);
  const pipelineProgress = useDashboardStore((s) => s.pipelineProgress);
  const { freshness, staleAge } = useFreshness();
  const [refreshing, setRefreshing] = useState(false);

  const modules = healthData?.modules ?? {};
  const globalStatus = healthData?.status ?? "ok";

  const members = pipelineProgress?.members ?? [];
  const runningCount = members.filter((m) => m.status === "running").length;
  const doneCount = members.filter((m) => m.status === "done").length;
  const isRunning = pipelineProgress?.running ?? false;
  const pct = members.length > 0 ? Math.round(doneCount / members.length * 100) : 0;

  // Clear refreshing state when pipeline starts running
  useEffect(() => {
    if (isRunning) setRefreshing(false);
  }, [isRunning]);

  const handleRefresh = () => {
    if (refreshing || isRunning) return;
    setRefreshing(true);
    onRefresh();
    // Revert after 3s only if pipeline didn't start
    setTimeout(() => {
      const p = useDashboardStore.getState().pipelineProgress;
      if (!p?.running) setRefreshing(false);
    }, 3000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          maxHeight: "80vh",
          overflow: "auto",
          background: color.surface,
          borderRadius: radius.card,
          border: `1px solid ${color.hairline}`,
          boxShadow: "var(--shadow-elev)",
          padding: 20,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: fontSize.title, fontFamily, fontWeight: 600, color: color.textPrimary, margin: 0 }}>
              {widgetTitle}
            </h3>
            <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: STATUS_DOT[freshness] ?? STATUS_DOT.ok,
              }} />
              <span style={{ fontSize: 12, color: color.textMuted }}>
                {freshness === "ok" ? t("settings.status.ok") : staleAge}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: radius.inner, border: "none", background: "transparent",
              color: color.textMuted, fontSize: 14, cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Pipeline Progress — data widgets only */}
        {showPipeline && (
          <div style={{
            padding: "10px 12px",
            background: color.surface2,
            borderRadius: radius.inner,
            border: `1px solid ${color.hairline}`,
            marginBottom: 12,
          }}>
            {isRunning && members.length > 0 ? (
              <>
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <div className="flex items-center gap-2">
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: STATUS_DOT.running,
                      animation: "pulse 1.5s ease-in-out infinite",
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: color.textPrimary }}>
                      {t("detail.pipelineRunning")}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: color.textMuted, fontVariantNumeric: "tabular-nums" }}>
                    {pct}% ({doneCount}/{members.length})
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{
                  height: 4, borderRadius: 2, background: color.surface,
                  marginBottom: 8, overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 2, transition: "width 0.3s",
                    width: `${pct}%`,
                    background: STATUS_DOT.running,
                  }} />
                </div>

                {/* RSS phase */}
                {pipelineProgress?.step === "rss" && (
                  <div style={{ fontSize: 11, color: color.textSecondary, marginBottom: 4 }}>
                    {t("detail.fetchingRss")}
                    {pipelineProgress.rss_sources_total > 0 && (
                      <span style={{ color: color.textMuted }}> ({pipelineProgress.rss_sources_done}/{pipelineProgress.rss_sources_total})</span>
                    )}
                  </div>
                )}

                {/* Member progress list */}
                <div className="flex flex-col gap-0.5" style={{ maxHeight: 200, overflow: "auto" }}>
                  {members.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2"
                      style={{
                        padding: "4px 6px",
                        borderRadius: 4,
                        background: m.status === "running" ? "rgba(255,255,255,0.04)" : "transparent",
                      }}
                    >
                      <span style={{ fontSize: 11, width: 16, textAlign: "center" }}>
                        {MEMBER_ICONS[m.status] ?? "⏸"}
                      </span>
                      <span style={{ fontSize: 11, color: color.textPrimary, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.domain && <span style={{ color: color.textMuted }}>{m.domain} · </span>}
                        {m.name}
                      </span>
                      <span style={{ fontSize: 10, color: color.textMuted, flexShrink: 0 }}>
                        {m.status === "done" && m.events > 0 && `${m.events} ${t("detail.events")}`}
                        {m.status === "done" && m.events === 0 && m.log}
                        {m.status === "failed" && <span style={{ color: color.neg }}>{m.log}</span>}
                        {m.status === "running" && <span style={{ color: STATUS_DOT.running }}>…</span>}
                        {m.status === "pending" && <span style={{ opacity: 0.5 }}>{t("detail.waiting")}</span>}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Snapshot phase */}
                {pipelineProgress?.step === "snapshot" && (
                  <div style={{ fontSize: 11, color: color.textSecondary, marginTop: 4 }}>
                    {t("detail.buildingSnapshot")}
                  </div>
                )}

                {pipelineProgress && pipelineProgress.events_found > 0 && (
                  <div style={{ fontSize: 11, color: color.textMuted, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${color.hairline}` }}>
                    {t("detail.eventsFound")} {pipelineProgress.events_found}
                  </div>
                )}
              </>
            ) : (
              /* Idle state — show last run info */
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 12, color: color.textSecondary }}>
                  {isRunning ? t("detail.pipelineRunning") : t("detail.pipelineIdle")}
                </span>
                {pipelineProgress?.started_at && (
                  <span style={{ fontSize: 11, color: color.textMuted }}>
                    {pipelineProgress.events_found > 0 && `${pipelineProgress.events_found} ${t("detail.events")} · `}
                    {new Date(pipelineProgress.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Module Health */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: color.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {t("detail.systemHealth")}
          </div>
          <div className="flex flex-col gap-1">
            {Object.entries(modules).filter(([k]) => !k.startsWith("rss:")).map(([key, mod]) => (
              <div
                key={key}
                className="flex items-center justify-between"
                style={{
                  padding: "6px 8px",
                  background: color.surface2,
                  borderRadius: radius.inner,
                  border: `1px solid ${color.hairline}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: STATUS_DOT[mod.status] ?? STATUS_DOT.ok,
                  }} />
                  <span style={{ fontSize: 12, color: color.textPrimary }}>
                    {MODULE_LABELS[key] ?? key}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: color.textMuted }}>
                  {mod.age_min < 60 ? `${mod.age_min}m` : `${Math.round(mod.age_min / 60)}h`}
                </span>
              </div>
            ))}
          </div>
          {globalStatus !== "ok" && (
            <div style={{ fontSize: 11, color: globalStatus === "failed" ? color.neg : color.warn, marginTop: 6 }}>
              {globalStatus === "failed" ? t("detail.systemFailed") : t("detail.systemDegraded")}
            </div>
          )}
        </div>

        {/* Data Overview */}
        {healthData && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: color.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("detail.data")}
            </div>
            <div className="flex gap-2">
              <StatChip label={t("settings.status.events")} value={healthData.event_count} />
              <StatChip label={t("settings.status.members")} value={healthData.member_count} />
              <StatChip label={t("settings.status.sources")} value={healthData.source_count} />
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRunning}
          style={{
            width: "100%",
            padding: "8px 0",
            borderRadius: radius.inner,
            border: `1px solid ${isRunning ? STATUS_DOT.running : refreshing ? color.pos : color.hairline}`,
            background: isRunning ? "rgba(255,159,67,0.08)" : refreshing ? "rgba(63,185,80,0.08)" : "transparent",
            color: isRunning ? STATUS_DOT.running : refreshing ? color.pos : color.textSecondary,
            fontSize: 12,
            fontWeight: 500,
            cursor: isRunning || refreshing ? "default" : "pointer",
            fontFamily,
            transition: "all 0.2s",
          }}
        >
          {isRunning ? t("detail.pipelineRunning") : refreshing ? "✓ Triggered" : t("detail.refreshNow")}
        </button>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      flex: 1,
      padding: "6px 8px",
      background: color.surface2,
      borderRadius: radius.inner,
      border: `1px solid ${color.hairline}`,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: color.textPrimary, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 10, color: color.textMuted }}>{label}</div>
    </div>
  );
}

const MODULE_LABELS: Record<string, string> = {
  pipeline: "Pipeline",
  rss: "RSS",
  base_model: "Base Model",
  pro_model: "Pro Model",
  tavily: "Tavily",
};
