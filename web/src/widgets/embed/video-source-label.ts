export type VideoSourceType = "hls" | "video" | "mp4" | "iframe" | "dash";

export type VideoSource = {
  url: string;
  label: string;
  type?: VideoSourceType;
  fullLabel?: string;
};

function sourceTypeFromUrl(url: string): VideoSourceType | undefined {
  if (/\.m3u8(\?|$)/i.test(url)) return "hls";
  if (/\.mpd(\?|$)/i.test(url)) return "dash";
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return "video";
  if (/youtube\.com\/embed|player\.bilibili\.com/i.test(url)) return "iframe";
  return undefined;
}

function resolutionFromLabel(label: string): string {
  return label.match(/\b(\d{3,4}p)\b/i)?.[1] ?? "";
}

function videoFormat(url: string, label: string): string {
  const haystack = `${url} ${label}`.toLowerCase();
  if (haystack.includes("webm")) return "WebM";
  if (haystack.includes("mp4") || haystack.includes("video%2fmp4")) return "MP4";
  return "Video";
}

function iframeLabel(url: string): string {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
  if (host.includes("bilibili.com")) return "B站";
  if (host.includes("twitch.tv")) return "Twitch";
  return "Embed";
}

function isAlreadyCompact(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  if (/[\u4e00-\u9fff]/.test(trimmed)) return trimmed.length <= 3;
  return trimmed.split(/\s+/).length <= 2 && trimmed.length <= 14;
}

export function shortVideoSourceLabel(source: Pick<VideoSource, "url" | "label" | "type">, index = 0): string {
  const type = source.type ?? sourceTypeFromUrl(source.url);
  const res = resolutionFromLabel(source.label);

  if (type === "hls") return res ? `HLS ${res}` : "HLS";
  if (type === "dash") return "DASH";
  if (type === "iframe") return iframeLabel(source.url);
  if (type === "mp4" || type === "video") {
    const fmt = videoFormat(source.url, source.label);
    return res ? `${fmt} ${res}` : fmt;
  }

  if (isAlreadyCompact(source.label)) return source.label.trim();
  return `Src ${index + 1}`;
}

export function normalizeParsedVideoSource(source: Pick<VideoSource, "url" | "label" | "type">, index = 0): VideoSource {
  const fullLabel = source.label?.trim() || `Source ${index + 1}`;
  const candidate = { url: source.url.trim(), label: fullLabel, type: source.type };
  return {
    ...candidate,
    label: shortVideoSourceLabel(candidate, index),
    fullLabel,
  };
}

export function appendVideoSource(sources: VideoSource[], source: VideoSource): VideoSource[] {
  const url = source.url.trim();
  if (!url || sources.some((s) => s.url.trim() === url)) return sources;
  return [...sources, { ...source, url }];
}
