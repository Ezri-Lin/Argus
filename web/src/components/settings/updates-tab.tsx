import { useState, useMemo, useCallback } from "react";
import { color, radius, fontFamily } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { triggerPipeline } from "@/dashboard/api";
import { SectionLabel } from "./settings-ui";
import type { MemberProgress } from "@/dashboard/api-types";

export type UpdatesTabProps = {
  onPipelineTriggered?: () => void;
};

type DomainGroup = {
  domain: string;
  members: MemberProgress[];
  done: number;
  running: number;
  failed: number;
  total: number;
  events: number;
};

function groupByDomain(members: MemberProgress[]): DomainGroup[] {
  const map = new Map<string, MemberProgress[]>();
  for (const m of members) {
    const key = m.domain || "other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries()).map(([domain, list]) => ({
    domain,
    members: list,
    done: list.filter((m) => m.status === "done").length,
    running: list.filter((m) => m.status === "running").length,
    failed: list.filter((m) => m.status === "failed").length,
    total: list.length,
    events: list.reduce((sum, m) => sum + m.events, 0),
  }));
}

const STATUS_ICON: Record<string, string> = {
  pending: "⏸",
  running: "⏳",
  done: "✅",
  failed: "❌",
};

function DomainCircle({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 10;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - pct);
  const allDone = done === total && total > 0;

  return (
    <svg width={24} height={24} style={{ flexShrink: 0 }}>
      <circle cx={12} cy={12} r={r} fill="none" stroke={color.surface} strokeWidth={2.5} />
      <circle
        cx={12} cy={12} r={r} fill="none"
        stroke={allDone ? color.pos : color.accent}
        strokeWidth={2.5}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
        style={{ transition: "stroke-dashoffset 0.3s, stroke 0.3s" }}
      />
      <text x={12} y={12} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 8, fontWeight: 600, fill: color.textPrimary, fontFamily }}>
        {done}
      </text>
    </svg>
  );
}

function DomainRow({ group }: { group: DomainGroup }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();

  const allDone = group.done === group.total && group.total > 0;
  const isRunning = group.running > 0;
  const hasFailed = group.failed > 0;

  const statusDotColor = hasFailed ? color.neg : isRunning ? color.accent : allDone ? color.pos : color.textMuted;

  return (
    <div style={{
      borderRadius: radius.inner,
      border: `1px solid ${color.hairline}`,
      overflow: "hidden",
    }}>
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", background: color.surface2, border: "none",
          cursor: "pointer", fontFamily, textAlign: "left",
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: statusDotColor, flexShrink: 0,
          animation: isRunning ? "pulse 1.5s ease-in-out infinite" : undefined,
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: color.textPrimary, flex: 1, textTransform: "capitalize" }}>
          {group.domain}
        </span>
        <DomainCircle done={group.done} total={group.total} />
        <span style={{
          fontSize: 10, color: color.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0,
        }}>
          {group.done}/{group.total}
        </span>
        <span style={{
          fontSize: 10, color: color.textMuted, marginLeft: 2, flexShrink: 0,
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.15s",
        }}>
          ▶
        </span>
      </button>

      {/* Expanded member list */}
      {expanded && (
        <div style={{ padding: "4px 10px 8px" }}>
          {group.members.map((m, i) => (
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
                {STATUS_ICON[m.status] ?? "⏸"}
              </span>
              <span style={{
                fontSize: 11, color: color.textPrimary, flex: 1, minWidth: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {m.name}
              </span>
              <span style={{ fontSize: 10, color: color.textMuted, flexShrink: 0 }}>
                {m.status === "done" && m.events > 0 && `${m.events} ${t("detail.events")}`}
                {m.status === "done" && m.events === 0 && (
                  <span style={{ opacity: 0.6 }}>{t("updates.noNewEvents")}</span>
                )}
                {m.status === "failed" && <span style={{ color: color.neg }}>{m.log}</span>}
                {m.status === "running" && <span style={{ color: color.accent }}>…</span>}
                {m.status === "pending" && <span style={{ opacity: 0.5 }}>{t("detail.waiting")}</span>}
              </span>
            </div>
          ))}
          {group.events > 0 && (
            <div style={{
              fontSize: 10, color: color.textMuted, marginTop: 4, paddingTop: 4,
              borderTop: `1px solid ${color.hairline}`, textAlign: "right",
            }}>
              {t("updates.memberUpdated")} {group.events} {t("detail.events")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function UpdatesTab({ onPipelineTriggered }: UpdatesTabProps) {
  const { t } = useI18n();
  const pipelineProgress = useDashboardStore((s) => s.pipelineProgress);

  const [triggering, setTriggering] = useState(false);

  const isRunning = pipelineProgress?.running ?? false;
  const members = pipelineProgress?.members ?? [];
  const doneCount = pipelineProgress?.members_done ?? 0;
  const totalCount = pipelineProgress?.members_total ?? members.length;
  const pct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

  const domainGroups = useMemo(() => groupByDomain(members), [members]);

  const handleRefresh = useCallback(async () => {
    if (isRunning || triggering) return;
    setTriggering(true);
    const result = await triggerPipeline();
    if (result?.ok) {
      onPipelineTriggered?.();
    }
    // Reset triggering after a short delay if pipeline didn't start
    setTimeout(() => {
      const p = useDashboardStore.getState().pipelineProgress;
      if (!p?.running) setTriggering(false);
    }, 3000);
  }, [isRunning, triggering, onPipelineTriggered]);

  // Clear triggering when pipeline starts running
  if (isRunning && triggering) setTriggering(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={isRunning || triggering}
        style={{
          width: "100%", padding: "10px 0",
          borderRadius: radius.inner,
          border: `1px solid ${isRunning ? color.accent : triggering ? color.pos : color.hairline}`,
          background: isRunning ? "rgba(139,148,158,0.08)" : triggering ? "rgba(63,185,80,0.08)" : "transparent",
          color: isRunning ? color.accent : triggering ? color.pos : color.textSecondary,
          fontSize: 13, fontWeight: 550, fontFamily, cursor: isRunning || triggering ? "default" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {isRunning ? t("updates.refreshing") : triggering ? t("detail.triggered") : t("updates.refreshNow")}
      </button>

      {/* Overall progress */}
      {members.length > 0 && (
        <section>
          <SectionLabel>
            {t("updates.overallProgress")}
            <span style={{ fontSize: 11, fontWeight: 400, color: color.textMuted, marginLeft: 8 }}>
              {pct}% ({doneCount}/{totalCount})
            </span>
          </SectionLabel>

          {/* Progress bar */}
          <div style={{
            height: 6, borderRadius: 3, background: color.surface,
            marginBottom: 8, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 3, transition: "width 0.3s",
              width: `${pct}%`,
              background: isRunning ? color.accent : color.pos,
            }} />
          </div>

          {/* RSS phase */}
          {pipelineProgress?.step === "rss" && (
            <div style={{ fontSize: 11, color: color.textSecondary, marginBottom: 8 }}>
              {t("updates.rssPhase")}
              {pipelineProgress.rss_sources_total > 0 && (
                <span style={{ color: color.textMuted }}>
                  {" "}({pipelineProgress.rss_sources_done}/{pipelineProgress.rss_sources_total})
                </span>
              )}
            </div>
          )}

          {/* Snapshot phase */}
          {pipelineProgress?.step === "snapshot" && (
            <div style={{ fontSize: 11, color: color.textSecondary, marginBottom: 8 }}>
              {t("updates.snapshotPhase")}
            </div>
          )}
        </section>
      )}

      {/* Domain progress */}
      {domainGroups.length > 0 && (
        <section>
          <SectionLabel>{t("updates.domainProgress")}</SectionLabel>
          <div className="flex flex-col gap-1">
            {domainGroups.map((g) => (
              <DomainRow key={g.domain} group={g} />
            ))}
          </div>
        </section>
      )}

      {/* Events found */}
      {pipelineProgress && pipelineProgress.events_found > 0 && (
        <div style={{
          fontSize: 12, color: color.textMuted, textAlign: "center",
          padding: "6px 0",
        }}>
          {t("updates.eventsFound")}: {pipelineProgress.events_found}
        </div>
      )}

      {/* Empty state */}
      {members.length === 0 && !isRunning && (
        <div style={{
          fontSize: 12, color: color.textMuted, textAlign: "center",
          padding: "24px 0",
        }}>
          {t("detail.pipelineIdle")}
        </div>
      )}
    </div>
  );
}
