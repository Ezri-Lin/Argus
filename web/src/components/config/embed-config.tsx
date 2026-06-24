import { color, radius } from "@/design/tokens";
import type { VideoSource, FollowRule } from "@/widgets/embed/video-source-label";
import type { LibraryDoc } from "@/dashboard/api";
import { SourceModeSelector } from "./source-mode-selector";
import { inputStyle, smallInput, btnGhost, btnPrimary, btnSecondary } from "./config-styles";

type Props = {
  sources: VideoSource[];
  addSource: () => void;
  removeSource: (i: number) => void;
  updateStreamField: (i: number, field: "url" | "label", v: string) => void;
  addFromLibrary: (s: { url: string; name: string; type?: string }) => void;
  library: LibraryDoc | null;
  embedUrl: string;
  setEmbedUrl: (v: string) => void;
  embedParsing: boolean;
  parseEmbedUrl: () => void;
  embedCandidates: VideoSource[];
  selectedEmbedCandidate: number;
  setSelectedEmbedCandidate: (i: number) => void;
  addSelectedEmbedCandidate: () => void;
  pickFromLibraryLabel: string;
  placeholderLabel: string;
  followRule?: FollowRule;
  setFollowRule?: (rule: FollowRule) => void;
  onResolveFollow?: () => void;
  followResolving?: boolean;
  followResolveMsg?: { type: "ok" | "err"; msg: string } | null;
};

export function EmbedConfig({
  sources, addSource, removeSource, updateStreamField,
  addFromLibrary, library,
  embedUrl, setEmbedUrl, embedParsing, parseEmbedUrl,
  embedCandidates, selectedEmbedCandidate, setSelectedEmbedCandidate,
  addSelectedEmbedCandidate,
  pickFromLibraryLabel, placeholderLabel,
  followRule, setFollowRule, onResolveFollow, followResolving, followResolveMsg,
}: Props) {
  const isManual = !followRule || followRule.mode === "manual";

  return (
    <>
      {/* Source Mode Selector */}
      {followRule && setFollowRule && (
        <SourceModeSelector followRule={followRule} setFollowRule={setFollowRule} />
      )}

      {/* Resolve follow sources immediately */}
      {followRule && followRule.mode !== "manual" && onResolveFollow && (
        <button
          onClick={onResolveFollow}
          disabled={followResolving || (followRule.mode === "creator" ? !followRule.feedUrl?.trim() : !followRule.keyword.trim())}
          style={{
            ...btnPrimary, width: "100%", padding: "7px 0", marginTop: 8,
            opacity: followResolving ? 0.6 : 1,
          }}
        >
          {followResolving
            ? followRule.mode === "creator" ? "Fetching latest..." : "Finding sources..."
            : followRule.mode === "creator" ? "Fetch latest now" : "Find sources now"}
        </button>
      )}
      {followResolveMsg && (
        <div style={{ marginTop: 6, fontSize: 11, color: followResolveMsg.type === "ok" ? color.pos : color.neg }}>
          {followResolveMsg.msg}
        </div>
      )}

      {/* Manual mode: URL parse + library */}
      {isManual && (
        <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
          <div className="flex items-center gap-2">
            <input
              value={embedUrl}
              onChange={(e) => {
                setEmbedUrl(e.target.value);
              }}
              placeholder={placeholderLabel}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  await parseEmbedUrl();
                }
              }}
              style={{ ...smallInput, flex: 1 }}
            />
            <button
              onClick={parseEmbedUrl}
              disabled={embedParsing || !embedUrl.trim()}
              style={{ ...btnSecondary, opacity: embedParsing ? 0.6 : 1 }}
            >
              {embedParsing ? "Parsing..." : "Parse"}
            </button>
          </div>
          {embedCandidates.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: color.textMuted, textTransform: "uppercase", letterSpacing: 0 }}>
                  Parsed sources
                </span>
                <span style={{ fontSize: 10, color: color.textMuted }}>
                  Choose one
                </span>
              </div>
              <div className="flex flex-col gap-1.5" style={{ maxHeight: 132, overflowY: "auto", paddingRight: 2 }}>
                {embedCandidates.map((candidate, i) => {
                  const selected = i === selectedEmbedCandidate;
                  return (
                    <button
                      key={`${candidate.url}-${i}`}
                      type="button"
                      onClick={() => setSelectedEmbedCandidate(i)}
                      title={candidate.fullLabel ?? candidate.label}
                      aria-pressed={selected}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "7px 8px",
                        textAlign: "left",
                        color: selected ? color.textPrimary : color.textSecondary,
                        background: selected ? color.surfaceElev : "transparent",
                        border: `1px solid ${selected ? color.textMuted : color.hairline}`,
                        borderRadius: radius.inner,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 12, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {candidate.label}
                        </span>
                        <span style={{ display: "block", marginTop: 2, fontSize: 10, color: color.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {candidate.url}
                        </span>
                      </span>
                      <span style={{ padding: "2px 6px", borderRadius: 999, background: color.bg, border: `1px solid ${color.hairline}`, color: color.textMuted, fontSize: 10, textTransform: "uppercase" }}>
                        {candidate.type ?? "src"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={addSelectedEmbedCandidate}
                style={{ ...btnPrimary, marginTop: 8, width: "100%", padding: "7px 0" }}
              >
                Add selected
              </button>
            </div>
          )}
          {library && library.streams.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>{pickFromLibraryLabel}</label>
              <div className="flex flex-col gap-1" style={{ maxHeight: 120, overflowY: "auto" }}>
                {library.streams.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => addFromLibrary({ url: s.url, name: s.name, type: s.type })}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "5px 8px", fontSize: 12, textAlign: "left",
                      color: color.textPrimary, background: "transparent",
                      border: `1px solid ${color.hairline}`, borderRadius: radius.inner, cursor: "pointer",
                    }}
                  >
                    <span className="flex-1 truncate">{s.name}</span>
                    {s.type && <span style={{ fontSize: 9, color: color.textMuted, textTransform: "uppercase" }}>{s.type}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sources list — always visible */}
      <div>
        <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>Sources</label>
        <div className="flex flex-col gap-2">
          {sources.map((s, i) => (
            <div key={i} style={{ padding: 8, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
              <div className="flex items-center gap-1 mb-1.5">
                {/* Health dot */}
                <span style={{
                  width: 6, height: 6, borderRadius: 999, flexShrink: 0,
                  background: !s.health || s.health === "ok" ? color.pos : s.health === "stale" ? "#f59e0b" : "#ef4444",
                }} />
                <input value={s.label} onChange={(e) => updateStreamField(i, "label", e.target.value)} placeholder="Label" title={s.fullLabel ?? s.label} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12, flex: 1 }} />
                {s.type && (
                  <span style={{ padding: "2px 6px", borderRadius: 999, background: color.surfaceElev, border: `1px solid ${color.hairline}`, color: color.textMuted, fontSize: 10, textTransform: "uppercase", flexShrink: 0 }}>
                    {s.type}
                  </span>
                )}
                <button onClick={() => removeSource(i)} style={{ ...btnGhost, padding: "2px 6px", border: "none", color: color.neg }}>✕</button>
              </div>
              <input value={s.url} onChange={(e) => updateStreamField(i, "url", e.target.value)} placeholder="https://..." style={{ ...inputStyle, padding: "4px 6px", fontSize: 12, color: color.textSecondary }} />
            </div>
          ))}
        </div>
        <button onClick={addSource} style={{ ...btnGhost, width: "100%", padding: "6px 0", color: color.textSecondary }}>+ Add source</button>
      </div>
    </>
  );
}
