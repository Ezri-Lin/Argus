import { useState, useEffect, useCallback } from "react";
import { WidgetFrame } from "@/components/widget-frame";
import { color, radius } from "@/design/tokens";
import type { DashboardWidget } from "@/dashboard/dashboard-types";
import { shortVideoSourceLabel, type VideoSource } from "./video-source-label";
import { VideoPlayer, Fallback } from "./video-player";
import { useI18n } from "@/lib/use-i18n";

type PlaybackMode = "video" | "iframe" | "unsupported";

function resolveSources(config: Record<string, unknown>): VideoSource[] {
  if (Array.isArray(config.sources) && config.sources.length > 0) {
    return config.sources as VideoSource[];
  }
  const src = config.src as string | undefined;
  if (src) return [{ url: src, label: "Source" }];
  return [];
}

function sourceTypeFromUrl(url: string): VideoSource["type"] {
  if (/\.m3u8(\?|$)/i.test(url)) return "hls";
  if (/\.mpd(\?|$)/i.test(url)) return "dash";
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return "video";
  return undefined;
}

function resolvePlaybackMode(source: VideoSource | undefined, configuredMode: string): PlaybackMode {
  if (!source) return "unsupported";
  const type = source.type ?? sourceTypeFromUrl(source.url);
  if (type === "dash") return "unsupported";
  if (type === "iframe") return "iframe";
  if (type === "hls" || type === "mp4" || type === "video") return "video";
  return configuredMode === "video" ? "video" : "iframe";
}

export function EmbedWidget({ widget, onConfig, onDetail, onDelete, onMinimize }: { widget: DashboardWidget; onConfig?: () => void; onDetail?: () => void; onDelete?: () => void; onMinimize?: () => void }) {
  const { t } = useI18n();
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const sources = resolveSources(widget.config);
  const mode = (widget.config.mode as string) ?? "iframe";
  const current = sources[activeIndex];
  const playbackMode = resolvePlaybackMode(current, mode);

  const handleReady = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => {
    setLoaded(false);
    if (activeIndex < sources.length - 1) {
      setActiveIndex(activeIndex + 1);
      setErrored(false);
      return;
    }
    setErrored(true);
  }, [activeIndex, sources.length]);

  // Clamp activeIndex if sources shrink
  useEffect(() => {
    if (activeIndex >= sources.length && sources.length > 0) {
      setActiveIndex(sources.length - 1);
    }
  }, [sources.length, activeIndex]);

  return (
    <WidgetFrame widget={widget} onConfig={onConfig} onDetail={onDetail} onDelete={onDelete} onMinimize={onMinimize}>
      <div className="flex h-full flex-col" style={{ borderRadius: radius.inner, overflow: "hidden", background: color.surface2, position: "relative" }}>
        {/* Tab bar — only when multiple sources */}
        {sources.length > 1 && (
          <div
            className="flex items-center"
            style={{ gap: 1, padding: "6px 10px 0", flexShrink: 0, overflowX: "auto", whiteSpace: "nowrap" }}
          >
            {sources.map((s, i) => (
              <span
                key={i}
                onClick={() => { setActiveIndex(i); setErrored(false); setLoaded(false); }}
                title={s.fullLabel ?? s.label}
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: i === activeIndex ? color.textPrimary : color.textMuted,
                  background: i === activeIndex ? color.surface2 : "transparent",
                  flexShrink: 0,
                  maxWidth: 86,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transition: "color 0.15s, background 0.15s",
                }}
              >
                {shortVideoSourceLabel(s, i)}
              </span>
            ))}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          {!current || errored ? (
            <Fallback src={current?.url ?? ""} />
          ) : playbackMode === "unsupported" ? (
            <Fallback src={current.url} reason={t("embed.unsupportedStream")} />
          ) : playbackMode === "video" ? (
            <VideoPlayer
              key={current.url}
              src={current.url}
              widgetId={widget.id}
              onReady={handleReady}
              onError={handleError}
            />
          ) : (
            <iframe
              key={current.url}
              src={current.url}
              sandbox="allow-scripts allow-same-origin allow-popups"
              allow="autoplay; encrypted-media"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: radius.inner,
                opacity: loaded ? 1 : 0,
                transition: "opacity 0.2s",
              }}
              onLoad={() => setLoaded(true)}
              onError={() => setErrored(true)}
            />
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}
