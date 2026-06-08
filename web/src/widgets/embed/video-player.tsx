import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import Hls from "hls.js";
import { color, radius } from "@/design/tokens";
import { claimActiveVideo, releaseActiveVideo, onActiveVideoChange } from "@/lib/active-video";
import { translateSubtitles } from "@/dashboard/api";

/** A single subtitle cue with timing. */
export type SubtitleCue = {
  startTime: number;
  endTime: number;
  text: string;
};

/** A detected subtitle track. */
export type SubtitleTrack = {
  id: number;
  label: string;       // e.g. "English", "中文"
  lang: string;        // BCP-47 code, e.g. "en", "zh"
  cues: SubtitleCue[];
};

function isHlsStream(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url);
}

/** Rewrite URL to go through backend proxy (strips Origin header for CDNs) */
function proxyUrl(url: string): string {
  if (url.startsWith("/ai/") || url.startsWith("http://localhost") || url.startsWith("http://127.")) return url;
  return `/ai/stream-proxy?url=${encodeURIComponent(url)}`;
}

export const VideoPlayer = memo(function VideoPlayer({ src, widgetId, onReady, onError }: { src: string; widgetId: string; onReady: () => void; onError: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Subtitle state
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeTrackIdx, setActiveTrackIdx] = useState<number>(-1); // -1 = off
  const [currentCueText, setCurrentCueText] = useState("");

  // Translation state
  const [translateLang, setTranslateLang] = useState<string>("");
  const [translatedCues, setTranslatedCues] = useState<Map<number, string>>(new Map());
  const [translating, setTranslating] = useState(false);

  // Exclusive playback: pause when another video becomes active
  useEffect(() => {
    return onActiveVideoChange((activeId) => {
      if (activeId !== widgetId && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setPlaying(false);
      }
    });
  }, [widgetId]);

  // Release on unmount
  useEffect(() => {
    return () => { releaseActiveVideo(widgetId); };
  }, [widgetId]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      claimActiveVideo(widgetId);
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [widgetId]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    v.volume = val;
    if (val > 0 && v.muted) {
      v.muted = false;
      setMuted(false);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      c.requestFullscreen();
    }
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * duration;
  }, [duration]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      setProgress(v.duration ? v.currentTime / v.duration : 0);
    };
    const onLoadedMeta = () => {
      setDuration(v.duration);
      onReadyRef.current();
    };
    const onEnded = () => setPlaying(false);

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("loadedmetadata", onLoadedMeta);
    v.addEventListener("ended", onEnded);

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onLoadedMeta);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  // Track current subtitle cue based on video time
  useEffect(() => {
    if (activeTrackIdx < 0 || activeTrackIdx >= subtitleTracks.length) {
      setCurrentCueText("");
      return;
    }
    const cues = subtitleTracks[activeTrackIdx].cues;
    const t = currentTime;
    const active = cues.find(c => t >= c.startTime && t <= c.endTime);
    if (active) {
      // Show translated text if available, otherwise original
      const cueIdx = cues.indexOf(active);
      const translated = translatedCues.get(cueIdx);
      setCurrentCueText(translated ?? active.text);
    } else {
      setCurrentCueText("");
    }
  }, [currentTime, activeTrackIdx, subtitleTracks, translatedCues]);

  // HLS loading — hls.js for non-Safari, native for Safari
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    setSubtitleTracks([]);
    setActiveTrackIdx(-1);
    setCurrentCueText("");

    if (isHlsStream(src)) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableCEA708Captions: true,
          renderTextTracksNatively: false,
        });
        hls.loadSource(proxyUrl(src));
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          claimActiveVideo(widgetId);
          v.play().catch(() => {});
          // Detect subtitle tracks from manifest
          const subs = hls.subtitleTracks ?? [];
          if (subs.length > 0) {
            const tracks: SubtitleTrack[] = subs.map((s: { id: number; name?: string; lang?: string }, i: number) => ({
              id: s.id,
              label: s.name || s.lang || `Track ${i + 1}`,
              lang: s.lang || "",
              cues: [],
            }));
            setSubtitleTracks(tracks);
          }
        });
        // Collect cues when a subtitle track is loaded
        hls.on(Hls.Events.SUBTITLE_TRACK_LOADED, (_e, data) => {
          const trackId = data.id;
          // Cues are extracted from v.textTracks below, fragments not needed here
          void data.details?.fragments;
          // Extract cues from the track element after hls.js renders them
          setTimeout(() => {
            const tracks = v.textTracks;
            for (let ti = 0; ti < tracks.length; ti++) {
              const tt = tracks[ti];
              const cues: SubtitleCue[] = [];
              if (tt.cues) {
                for (let ci = 0; ci < tt.cues.length; ci++) {
                  const c = tt.cues[ci] as VTTCue;
                  cues.push({ startTime: c.startTime, endTime: c.endTime, text: c.text });
                }
              }
              if (cues.length > 0) {
                setSubtitleTracks(prev => prev.map(st =>
                  st.id === trackId ? { ...st, cues } : st
                ));
              }
            }
          }, 500);
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) onErrorRef.current();
        });
        return () => { hls.destroy(); };
      }
      // Safari native HLS
      v.src = proxyUrl(src);
      v.addEventListener("canplay", () => { claimActiveVideo(widgetId); v.play().catch(() => {}); }, { once: true });
    } else {
      // Direct mp4 etc. — also proxy to strip Origin header
      v.src = proxyUrl(src);
    }
  }, [src, widgetId]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  const formatTime = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={togglePlay}
      style={{ cursor: "pointer" }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: radius.inner,
          display: "block",
        }}
        onError={onError}
      />

      {/* Center play/pause overlay */}
      {!playing && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.6)",
              border: "2px solid rgba(255,255,255,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="white">
              <polygon points="6,3 20,12 6,21" />
            </svg>
          </div>
        </div>
      )}

      {/* Subtitle overlay */}
      {activeTrackIdx >= 0 && currentCueText && (
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{
            bottom: 52,
            padding: "0 16px",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.4,
              padding: "4px 10px",
              borderRadius: 4,
              maxWidth: "85%",
              textAlign: "center",
              whiteSpace: "pre-wrap",
            }}
          >
            {currentCueText}
          </span>
        </div>
      )}

      {/* Bottom controls bar */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
          padding: "24px 10px 8px",
          opacity: showControls ? 1 : 0,
          transition: "opacity 0.2s",
          pointerEvents: showControls ? "auto" : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          onClick={handleSeek}
          style={{
            width: "100%",
            height: 4,
            background: color.hairline,
            borderRadius: 2,
            cursor: "pointer",
            marginBottom: 6,
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              background: color.accent,
              borderRadius: 2,
              transition: "width 0.1s linear",
            }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            style={{
              background: "none",
              border: "none",
              color: color.white,
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            {playing ? (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="white">
                <rect x="5" y="3" width="5" height="18" rx="1" />
                <rect x="14" y="3" width="5" height="18" rx="1" />
              </svg>
            ) : (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="white">
                <polygon points="6,3 20,12 6,21" />
              </svg>
            )}
          </button>

          {/* Time */}
          <span style={{ fontSize: 11, color: color.white, fontVariantNumeric: "tabular-nums" }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume group */}
          <div
            className="flex items-center gap-1.5"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              onClick={toggleMute}
              style={{
                background: "none",
                border: "none",
                color: color.white,
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              {muted ? (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
            {showVolumeSlider && (
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="volume-slider"
                style={{ width: 60, height: 4, cursor: "pointer" }}
              />
            )}
          </div>

          {/* CC subtitle button — only shown when tracks exist */}
          {subtitleTracks.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTrackIdx(prev => prev >= 0 ? -1 : 0)}
                style={{
                  background: activeTrackIdx >= 0 ? "rgba(255,255,255,0.25)" : "none",
                  border: "none",
                  color: color.white,
                  cursor: "pointer",
                  padding: "1px 4px",
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  display: "flex",
                  alignItems: "center",
                }}
                title={activeTrackIdx >= 0 ? "Turn off subtitles" : "Turn on subtitles"}
              >
                CC
              </button>
              {activeTrackIdx >= 0 && subtitleTracks.length > 1 && (
                <select
                  value={activeTrackIdx}
                  onChange={(e) => setActiveTrackIdx(Number(e.target.value))}
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    color: color.white,
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 3,
                    fontSize: 10,
                    padding: "1px 3px",
                    cursor: "pointer",
                  }}
                >
                  {subtitleTracks.map((st, i) => (
                    <option key={i} value={i}>{st.label}</option>
                  ))}
                </select>
              )}
              {/* Translate button — when CC is on */}
              {activeTrackIdx >= 0 && (
                <select
                  value={translateLang}
                  onChange={async (e) => {
                    const lang = e.target.value;
                    setTranslateLang(lang);
                    if (!lang) {
                      setTranslatedCues(new Map());
                      return;
                    }
                    // Trigger translation
                    const track = subtitleTracks[activeTrackIdx];
                    if (!track?.cues.length) return;
                    setTranslating(true);
                    try {
                      const res = await translateSubtitles(track.cues, lang);
                      if (res?.ok && res.cues) {
                        const map = new Map<number, string>();
                        res.cues.forEach((c, i) => {
                          if (c.translated) map.set(i, c.translated);
                        });
                        setTranslatedCues(map);
                      }
                    } catch { /* ignore */ }
                    setTranslating(false);
                  }}
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    color: translateLang ? color.accent : color.white,
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 3,
                    fontSize: 10,
                    padding: "1px 3px",
                    cursor: "pointer",
                    opacity: translating ? 0.6 : 1,
                  }}
                  title="Translate subtitles"
                >
                  <option value="">Translate...</option>
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              )}
            </div>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: "none",
              border: "none",
              color: color.white,
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

export function Fallback({ src, reason = "Source unavailable" }: { src: string; reason?: string }) {
  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{ color: color.textSecondary, textAlign: "center", padding: 20 }}
    >
      <svg
        width={32}
        height={32}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color.textMuted}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
      <span style={{ fontSize: 13 }}>{reason}</span>
      <span style={{ fontSize: 11, color: color.textMuted, maxWidth: 240, wordBreak: "break-all" }}>
        {src ? src.slice(0, 60) + (src.length > 60 ? "..." : "") : "No source configured"}
      </span>
    </div>
  );
}
