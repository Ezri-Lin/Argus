import { describe, expect, it } from "vitest";
import { appendVideoSource, normalizeParsedVideoSource, shortVideoSourceLabel } from "./video-source-label";

describe("shortVideoSourceLabel", () => {
  it("prefers compact typed labels over long video titles", () => {
    expect(shortVideoSourceLabel({
      url: "https://rr.googlevideo.com/videoplayback?mime=video%2Fmp4",
      label: "ASMR SLEEP MASSAGE | Most People Fall Asleep Watching This ASMR Massage (360p)",
      type: "video",
    })).toBe("MP4 360p");

    expect(shortVideoSourceLabel({
      url: "https://example.com/live/master.m3u8",
      label: "Stingray Live Feed (720p)",
      type: "hls",
    })).toBe("HLS 720p");
  });

  it("uses platform names for iframe fallbacks", () => {
    expect(shortVideoSourceLabel({
      url: "https://www.youtube.com/embed/S6M7lyaPEtw",
      label: "Embed fallback",
      type: "iframe",
    })).toBe("YouTube");

    expect(shortVideoSourceLabel({
      url: "https://player.bilibili.com/player.html?bvid=BV1xx411c7mD",
      label: "Embed fallback",
      type: "iframe",
    })).toBe("B站");
  });

  it("falls back without leaking long labels into tabs", () => {
    expect(shortVideoSourceLabel({
      url: "https://example.com/watch/123",
      label: "An extremely long source label that should never fit in a tab",
    }, 1)).toBe("Src 2");
  });
});

describe("parsed video source helpers", () => {
  it("normalizes parser candidates into short labels", () => {
    expect(normalizeParsedVideoSource({
      url: "https://rr.googlevideo.com/videoplayback?mime=video%2Fmp4",
      label: "A very long YouTube title that should stay in the tooltip (360p)",
      type: "video",
    })).toEqual({
      url: "https://rr.googlevideo.com/videoplayback?mime=video%2Fmp4",
      label: "MP4 360p",
      fullLabel: "A very long YouTube title that should stay in the tooltip (360p)",
      type: "video",
    });
  });

  it("appends only the selected candidate and preserves existing sources", () => {
    const existing = [{ url: "https://example.com/live.m3u8", label: "Live", type: "hls" as const }];
    const selected = normalizeParsedVideoSource({
      url: "https://www.youtube.com/embed/S6M7lyaPEtw",
      label: "Embed fallback",
      type: "iframe",
    }, 1);

    expect(appendVideoSource(existing, selected)).toEqual([
      existing[0],
      { url: "https://www.youtube.com/embed/S6M7lyaPEtw", label: "YouTube", fullLabel: "Embed fallback", type: "iframe" },
    ]);
  });

  it("does not duplicate a source url", () => {
    const existing = [{ url: "https://www.youtube.com/embed/S6M7lyaPEtw", label: "YouTube", type: "iframe" as const }];
    const duplicate = normalizeParsedVideoSource({
      url: "https://www.youtube.com/embed/S6M7lyaPEtw",
      label: "Embed fallback",
      type: "iframe",
    });

    expect(appendVideoSource(existing, duplicate)).toBe(existing);
  });
});
