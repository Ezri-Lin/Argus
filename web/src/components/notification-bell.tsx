import { useState, useRef, useEffect } from "react";
import { color } from "@/design/tokens";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { useI18n } from "@/lib/use-i18n";

function formatTime(iso: string, lang: string): string {
  const mins = (Date.now() - new Date(iso).getTime()) / (1000 * 60);
  if (lang === "zh") {
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${Math.round(mins)}分钟前`;
    if (mins < 1440) return `${Math.round(mins / 60)}小时前`;
    return `${Math.round(mins / 1440)}天前`;
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const lang = useDashboardStore((s) => s.settings.language || "zh");

  const notifications = useDashboardStore((s) => s.notifications);
  const unreadCount = useDashboardStore((s) => s.unreadCount);
  const markAllRead = useDashboardStore((s) => s.markAllNotificationsRead);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  const handleMarkAllRead = () => {
    markAllRead();
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        title={t("notifications.title")}
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          border: `1px solid ${open ? color.accentSoft : color.hairline}`,
          background: open ? color.accentSoft : "transparent",
          cursor: "pointer",
          color: open ? color.textPrimary : color.textSecondary,
          fontSize: 14,
          position: "relative",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              background: color.neg,
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            width: 340,
            maxHeight: 420,
            borderRadius: 10,
            background: color.surface,
            border: `1px solid ${color.hairline}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            overflow: "hidden",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom: `1px solid ${color.hairline}`,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: color.textPrimary }}>
              {t("notifications.title")}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  border: "none",
                  background: "none",
                  color: color.accent,
                  fontSize: 11,
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }} className="argus-scroll">
            {notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: color.textMuted, fontSize: 12 }}>
                {t("notifications.empty")}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "10px 14px",
                    borderBottom: `1px solid ${color.hairline}`,
                    opacity: n.read ? 0.6 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13 }}>
                      {n.type === "pipeline_ok" ? "✅" : n.type === "pipeline_failed" ? "❌" : "ℹ️"}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 560, color: color.textPrimary, flex: 1 }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: 10, color: color.textMuted, flexShrink: 0 }}>
                      {formatTime(n.created_at, lang)}
                    </span>
                  </div>
                  {n.detail && (
                    <div style={{ fontSize: 11, color: color.textMuted, paddingLeft: 22, lineHeight: 1.4 }}>
                      {n.detail}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
