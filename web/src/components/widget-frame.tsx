import { type ReactNode, useState } from "react";
import { color, fontFamily, fontSize, radius, shadow, shadowElev } from "@/design/tokens";
import type { DashboardWidget } from "@/dashboard/dashboard-types";
import { CrackOverlay } from "./crack-overlay";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { useI18n } from "@/lib/use-i18n";

export type Freshness = "ok" | "degraded" | "failed";

type WidgetFrameProps = {
  widget: DashboardWidget;
  children: ReactNode;
  freshness?: Freshness;
  staleAge?: string;
  onConfig?: () => void;
  onDetail?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onExpand?: () => void;
  onMinimize?: () => void;
  contentOwnsHeader?: boolean;
};

export function WidgetFrame({
  widget,
  children,
  freshness = "ok",
  staleAge,
  onConfig,
  onDetail,
  onDuplicate,
  onDelete,
  onExpand,
  onMinimize,
  contentOwnsHeader = false,
}: WidgetFrameProps) {
  const [hovered, setHovered] = useState(false);
  const editMode = useDashboardStore((s) => s.editMode);
  const { t } = useI18n();

  const stateClass =
    freshness === "degraded" ? "widget-degraded" :
    freshness === "failed" ? "widget-failed" : "";

  return (
    <div
      className={`flex h-full flex-col ${stateClass}`}
      style={{
        borderRadius: radius.card,
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="widget-border-glow flex h-full flex-col"
        style={{
          borderRadius: radius.card - 1,
          background: color.surface,
          boxShadow: hovered
            ? `${shadowElev}, inset 0 1px 0 ${color.hairline}`
            : `${shadow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
          border: freshness === "failed"
            ? "1px dashed rgba(163,38,31,0.35)"
            : freshness === "degraded"
              ? `1px dashed ${color.hairline}`
              : `1px solid ${color.hairline}`,
          borderLeftWidth: 3,
          borderLeftColor: freshness === "failed"
            ? "rgba(163,38,31,0.5)"
            : freshness === "degraded"
              ? "rgba(210,153,34,0.4)"
              : color.hairline,
          borderLeftStyle: "solid",
          transition: "box-shadow 0.3s, border 0.3s",
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Inset top highlight — glass edge */}
        <div
          style={{
            height: 1,
            background: freshness === "failed"
              ? "linear-gradient(90deg, transparent, rgba(163,38,31,0.15) 20%, rgba(163,38,31,0.15) 80%, transparent)"
              : `linear-gradient(90deg, transparent, ${color.hairline} 20%, ${color.hairline} 80%, transparent)`,
            flexShrink: 0,
          }}
        />

        {contentOwnsHeader ? (
          <div
            className="drag-handle"
            style={{ position: "absolute", inset: "1px 0 auto", height: 26, cursor: "grab", zIndex: 2 }}
          />
        ) : (
          <div
            className="drag-handle flex items-center"
            style={{
              padding: "10px 14px 6px",
              flexShrink: 0,
              cursor: "grab",
              gap: 8,
              background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)",
              borderBottom: `1px solid ${color.hairline}`,
            }}
          >
            <h3
              style={{
                fontSize: fontSize.title,
                fontFamily,
                fontWeight: 560,
                color: color.textPrimary,
                letterSpacing: 0,
                lineHeight: 1.15,
                margin: 0,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {widget.title}
            </h3>
            <span
              style={{
                fontSize: fontSize.label,
                fontFamily,
                color: freshness === "failed" ? color.neg : color.textMuted,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 520,
                letterSpacing: 0,
                marginLeft: "auto",
                flexShrink: 0,
              }}
            >
              {staleAge ?? widget.updatedAt}
            </span>
          </div>
        )}

        {/* Hover controls — absolute, top-right corner */}
        {hovered && (
          <div className="flex items-center gap-0.5" style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
            {editMode ? (
              <>
                {onConfig && (
                  <ControlButton onClick={onConfig} title={t("widget.configure")} icon="⚙" />
                )}
                {onDuplicate && (
                  <ControlButton onClick={onDuplicate} title={t("widget.duplicate")} icon="⧉" />
                )}
                {onExpand && (
                  <ControlButton onClick={onExpand} title={t("widget.expand")} icon="⤢" />
                )}
                {onMinimize && (
                  <ControlButton onClick={onMinimize} title={t("widget.minimize")} icon="−" />
                )}
                {onDelete && (
                  <ControlButton onClick={onDelete} title={t("widget.delete")} icon="✕" danger />
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Content area */}
        <div
          className="widget-content flex-1 min-h-0 overflow-hidden"
          style={{ padding: contentOwnsHeader ? "10px 10px 10px" : "0 14px 14px" }}
        >
          {children}
        </div>

        {/* Crack overlay for failed state */}
        {freshness === "failed" && <CrackOverlay />}
      </div>
    </div>
  );
}

function ControlButton({
  onClick,
  title,
  icon,
  danger = false,
}: {
  onClick: () => void;
  title: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      style={{
        width: 24,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.inner,
        border: "none",
        background: color.surface2,
        color: danger ? color.neg : color.textSecondary,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {icon}
    </button>
  );
}
