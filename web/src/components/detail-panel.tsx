import { useEffect, useCallback } from "react";
import { color, shadow } from "@/design/tokens";
import type { SelectedItem } from "@/dashboard/dashboard-store";
import { DetailContentTreemap } from "./detail-content-treemap";
import { DetailContentSignal, DetailContentFeed } from "./detail-content-feed";
import { DetailContentWatchlist } from "./detail-content-watchlist";
import { DetailContentStat } from "./detail-content-stat";
import type { TreemapItem, SignalItem, FeedItem, WatchlistItem } from "@/dashboard/mock-data";
import { useI18n } from "@/lib/use-i18n";

type DetailPanelProps = {
  item: SelectedItem | null;
  onClose: () => void;
};

export function DetailPanel({ item, onClose }: DetailPanelProps) {
  const { t } = useI18n();
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (item) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [item, handleKeyDown]);

  if (!item) return null;

  const panelWidth = item.width ?? 420;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ animation: "fade-in 0.2s ease-out" }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: panelWidth,
          background: color.surface,
          borderLeft: `1px solid ${color.hairline}`,
          boxShadow: `-4px 0 24px rgba(0,0,0,0.40)`,
          animation: "slide-in-right 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "16px 20px", borderBottom: `1px solid ${color.hairline}`, flexShrink: 0 }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: color.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {t("detail.panelTitle")}
          </span>
          <button
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              color: color.textMuted,
              fontSize: 14,
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
          {item.type === "treemap" && (
            <DetailContentTreemap item={item.data as TreemapItem} source={item.source} />
          )}
          {item.type === "signal" && (
            <DetailContentSignal item={item.data as SignalItem} />
          )}
          {item.type === "feed" && (
            <DetailContentFeed item={item.data as FeedItem} source={item.source} />
          )}
          {item.type === "watchlist" && (
            <DetailContentWatchlist item={item.data as WatchlistItem} />
          )}
          {item.type === "stat" && (
            <DetailContentStat config={item.data as Record<string, unknown>} />
          )}
        </div>
      </div>
    </>
  );
}
