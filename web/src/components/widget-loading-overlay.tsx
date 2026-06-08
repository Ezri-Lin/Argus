/** Inline loading overlay shown on widgets during first data load. */

import { useDashboardStore } from "@/dashboard/dashboard-store";
import { color } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";

export function WidgetLoadingOverlay({ domain }: { domain?: string }) {
  const { t } = useI18n();
  const progress = useDashboardStore((s) => s.pipelineProgress);

  if (!progress?.running) return null;

  const done = progress.members_done ?? 0;
  const total = progress.members_total ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const members = (progress.members ?? []).filter(
    (m) => !domain || m.domain === domain,
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: `${color.surface}e6`,
        backdropFilter: "blur(4px)",
        borderRadius: "inherit",
        padding: 16,
      }}
    >
      <div style={{ fontSize: 13, color: color.textSecondary, fontWeight: 500 }}>
        {t("widget.loading.firstLoad")}
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "80%",
          maxWidth: 200,
          height: 4,
          borderRadius: 2,
          background: color.surface2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 2,
            background: color.accent,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <div style={{ fontSize: 11, color: color.textMuted }}>
        {t("widget.loading.membersProcessed").replace("{done}", String(done)).replace("{total}", String(total))}
      </div>

      {/* Compact member status */}
      {members.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            justifyContent: "center",
            maxWidth: "90%",
          }}
        >
          {members.map((m) => (
            <span
              key={m.name}
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: m.status === "done" ? color.posBg : m.status === "running" ? color.accentSoft : color.surface2,
                color: m.status === "done" ? color.pos : m.status === "running" ? color.accent : color.textMuted,
              }}
            >
              {m.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
