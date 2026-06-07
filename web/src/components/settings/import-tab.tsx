import { useState, useEffect, useRef, useCallback } from "react";
import { color, radius } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";
import {
  fetchSourcesLibrary, importSourcesLibrary,
  type LibraryDoc,
} from "@/dashboard/api";
import { SectionLabel, StatCard } from "./settings-ui";

export function ImportTab() {
  const { t } = useI18n();
  const [lib, setLib] = useState<LibraryDoc | null>(null);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSourcesLibrary().then((d) => { if (d) setLib(d); });
  }, []);

  const sCount = lib?.streams?.length ?? 0;
  const fCount = lib?.feeds?.length ?? 0;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImporting(true);
    setMsg("");

    const streams: LibraryDoc["streams"] = [];
    const feeds: LibraryDoc["feeds"] = [];

    for (const file of Array.from(files)) {
      const text = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

      if (ext === "json") {
        parseJsonFile(text, streams, feeds);
      } else {
        parseTextFile(text, streams, feeds);
      }
    }

    if (streams.length === 0 && feeds.length === 0) {
      setMsg(t("settings.import.noValidUrl"));
      setImporting(false);
      return;
    }

    const doc: LibraryDoc = { streams, feeds };
    const res = await importSourcesLibrary(doc);
    if (res?.ok) {
      setMsg(`+${res.added_streams} ${t("settings.import.streams")}, +${res.added_feeds} ${t("settings.import.rss")}`);
      const fresh = await fetchSourcesLibrary();
      if (fresh) setLib(fresh);
    } else {
      setMsg(t("settings.import.failed"));
    }
    setImporting(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  // Drag & drop
  const [dragging, setDragging] = useState(false);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Current stats */}
      <section>
        <SectionLabel>{t("settings.import.libraryOverview")}</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label={t("settings.import.streams")} value={sCount} />
          <StatCard label={t("settings.import.rssSources")} value={fCount} />
        </div>
      </section>

      {/* Drop zone */}
      <section>
        <SectionLabel>{t("settings.import.dropZone")}</SectionLabel>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            padding: "24px 16px",
            border: `2px dashed ${dragging ? color.textSecondary : color.hairline}`,
            borderRadius: radius.inner,
            background: dragging ? color.surfaceElev : color.surface2,
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <div style={{ fontSize: 13, color: color.textPrimary, marginBottom: 4 }}>
            {importing ? t("settings.import.importing") : t("settings.import.dropHint")}
          </div>
          <div style={{ fontSize: 11, color: color.textMuted }}>
            {t("settings.import.supportedFormats")}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.md,.txt,.xml"
          multiple
          onChange={handleFileInput}
          style={{ display: "none" }}
        />
        {msg && (
          <div style={{ fontSize: 12, color: msg.startsWith("+") ? color.pos : color.neg, marginTop: 8 }}>
            {msg}
          </div>
        )}
      </section>

      {/* Explanation */}
      <section>
        <SectionLabel>{t("settings.import.formatHelp")}</SectionLabel>
        <div style={{ fontSize: 11, color: color.textMuted, lineHeight: 1.6 }}>
          <div style={{ marginBottom: 6 }}>
            <strong style={{ color: color.textSecondary }}>{t("settings.import.jsonFormat")}</strong> -- {t("settings.import.jsonFormatDesc")}
          </div>
          <pre style={{ fontSize: 10, color: color.textMuted, background: color.surface2, padding: 8, borderRadius: radius.inner, overflow: "auto", marginBottom: 10 }}>
{`{"streams": [{"name": "...", "url": "..."}],
 "feeds":   [{"name": "...", "url": "..."}]}`}
          </pre>
          <div style={{ marginBottom: 6 }}>
            <strong style={{ color: color.textSecondary }}>MD / TXT</strong> -- {t("settings.import.mdFormatDesc")}
          </div>
          <div style={{ paddingLeft: 8 }}>
            <div>Contains <code>.m3u8</code> / <code>.mpd</code> / <code>.mp4</code> -- video stream</div>
            <div>Contains <code>.xml</code> / <code>.rss</code> / <code>/feed</code> -- RSS source</div>
            <div>{t("settings.import.defaultClassification")}</div>
          </div>
        </div>
      </section>

      {/* Current library contents */}
      {lib && (sCount > 0 || fCount > 0) && (
        <section>
          <SectionLabel>{t("settings.import.importedContent")}</SectionLabel>
          {sCount > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 4 }}>{t("settings.import.streams")} ({sCount})</div>
              <div className="flex flex-col gap-1" style={{ maxHeight: 120, overflowY: "auto" }}>
                {lib.streams.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
                    <span style={{ fontSize: 12, color: color.textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                    {s.type && <span style={{ fontSize: 9, color: color.textMuted, textTransform: "uppercase", flexShrink: 0 }}>{s.type}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {fCount > 0 && (
            <div>
              <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 4 }}>{t("settings.import.rssSources")} ({fCount})</div>
              <div className="flex flex-col gap-1" style={{ maxHeight: 120, overflowY: "auto" }}>
                {lib.feeds.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
                    <span style={{ fontSize: 12, color: color.textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <span style={{ fontSize: 9, color: color.textMuted, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.url}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ── Import helpers ──

/** Parse JSON file containing streams/feeds arrays */
function parseJsonFile(text: string, streams: LibraryDoc["streams"], feeds: LibraryDoc["feeds"]) {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data.streams)) {
      for (const s of data.streams) {
        if (s.url) streams.push({ name: s.name || s.label || new URL(s.url).hostname, url: s.url, type: s.type, domain: s.domain });
      }
    }
    if (Array.isArray(data.feeds)) {
      for (const f of data.feeds) {
        if (f.url) feeds.push({ name: f.name || f.label || new URL(f.url).hostname, url: f.url, domain: f.domain });
      }
    }
    // Also handle bare array of URLs
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "string") {
      for (const url of data) classifyUrl(url, streams, feeds);
    }
  } catch {
    // Not valid JSON, try as text
    parseTextFile(text, streams, feeds);
  }
}

/** Extract URLs from markdown/text and classify them */
function parseTextFile(text: string, streams: LibraryDoc["streams"], feeds: LibraryDoc["feeds"]) {
  const urlRegex = /https?:\/\/[^\s\)\]>"',;]+/gi;
  const matches = text.match(urlRegex) ?? [];
  for (const url of matches) {
    classifyUrl(url, streams, feeds);
  }
}

/** Classify a URL as stream or feed based on extension/path */
function classifyUrl(url: string, streams: LibraryDoc["streams"], feeds: LibraryDoc["feeds"]) {
  const lower = url.toLowerCase();
  const name = safeHostname(url);

  if (/\.(xml|rss)(\?|$)/i.test(lower) || /\/feed[s]?(\?|$|\/)/i.test(lower) || /\/rss(\?|$|\/)/i.test(lower)) {
    feeds.push({ name, url });
  } else if (/\.(m3u8|mpd|mp4|webm|ogg)(\?|$)/i.test(lower)) {
    const type = /\.m3u8/i.test(lower) ? "hls" : /\.mpd/i.test(lower) ? "dash" : "video";
    streams.push({ name, url, type });
  } else {
    streams.push({ name, url });
  }
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url.slice(0, 30); }
}
