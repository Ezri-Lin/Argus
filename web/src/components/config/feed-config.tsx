import { useState } from "react";
import { useI18n } from "@/lib/use-i18n";
import { color, radius } from "@/design/tokens";
import type { SourceItem, MemberItem, LibraryDoc } from "@/dashboard/api";

// ── Style constants ──

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  color: color.textPrimary,
  background: color.surface2,
  border: `1px solid ${color.hairline}`,
  borderRadius: radius.inner,
  outline: "none",
} as const;

const smallInput = { ...inputStyle, padding: "4px 8px", fontSize: 12 } as const;

const btnBase = {
  padding: "8px 16px",
  fontSize: 12,
  fontWeight: 650,
  borderRadius: 999,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "opacity 0.15s",
} as const;

const btnPrimary = {
  ...btnBase,
  color: color.bg,
  background: color.accent,
  border: "none",
} as const;

const btnGhost = {
  ...btnBase,
  padding: "4px 10px",
  fontSize: 11,
  color: color.textMuted,
  background: "transparent",
  border: `1px dashed ${color.hairline}`,
  borderRadius: 6,
} as const;

const btnSegment = {
  ...btnBase,
  padding: "4px 10px",
  fontSize: 12,
  borderRadius: 6,
  background: "transparent",
  border: `1px solid ${color.hairline}`,
} as const;

const btnSegmentActive = {
  ...btnSegment,
  color: color.textPrimary,
  background: color.surface2,
  borderColor: color.textSecondary,
} as const;

// ── Feed Config: sources + keywords + filter prompt ──

export function FeedConfig({ variant, sources, members, keywords, filterPrompt, library, onChangeVariant, onChangeKeywords, onChangeFilterPrompt, onAddSource, onDeleteSource, onEditSource }: {
  variant: string;
  sources: SourceItem[];
  members: MemberItem[];
  keywords: string;
  filterPrompt: string;
  library: LibraryDoc | null;
  onChangeVariant: (v: string) => void;
  onChangeKeywords: (kw: string) => void;
  onChangeFilterPrompt: (fp: string) => void;
  onAddSource: (name: string, url: string) => void;
  onDeleteSource: (id: number) => void;
  onEditSource: (id: number, patch: { name?: string; url?: string }) => void;
}) {
  const [sn, setSn] = useState("");
  const [su, setSu] = useState("");
  const [kw, setKw] = useState(keywords);
  const [fp, setFp] = useState(filterPrompt);
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [editSourceName, setEditSourceName] = useState("");
  const [editSourceUrl, setEditSourceUrl] = useState("");
  const { t } = useI18n();

  return (
    <div>
      {/* Variant selector */}
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>{t("config.feed.mode")}</label>
      <div className="flex gap-1 mb-3">
        {[["signals", t("config.feed.variant.signals")], ["rss", t("config.feed.variant.rss")]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => onChangeVariant(v)}
            style={v === variant ? btnSegmentActive : { ...btnSegment, color: color.textMuted }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Signals mode: keywords */}
      {variant === "signals" && (
        <div>
          <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>{t("config.feed.keywords")}</label>
          <textarea
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onBlur={() => onChangeKeywords(kw)}
            placeholder={"NVIDIA GPU\nOpenAI GPT\nApple WWDC"}
            rows={4}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
          <div style={{ fontSize: 10, color: color.textMuted, marginTop: 4 }}>
            {t("config.feed.keywordsHelp")}
          </div>
        </div>
      )}

      {/* RSS mode: source selection + filter prompt */}
      {variant === "rss" && (
        <div>
          <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>{t("config.feed.rssSources")}</label>
          <div className="flex flex-col gap-1 mb-2">
            {sources.map((s) => (
              editingSourceId === s.id ? (
                <div key={s.id} style={{ padding: "4px 8px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
                  <div className="flex gap-1 mb-1">
                    <input value={editSourceName} onChange={(e) => setEditSourceName(e.target.value)} placeholder={t("config.common.name")} style={{ ...smallInput, width: 80, padding: "2px 6px" }} />
                    <input value={editSourceUrl} onChange={(e) => setEditSourceUrl(e.target.value)} placeholder="URL" style={{ ...smallInput, flex: 1, padding: "2px 6px" }} />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { onEditSource(s.id, { name: editSourceName, url: editSourceUrl }); setEditingSourceId(null); }} style={{ ...btnPrimary, padding: "2px 8px", fontSize: 10 }}>{t("config.common.save")}</button>
                    <button onClick={() => setEditingSourceId(null)} style={{ ...btnGhost, padding: "2px 8px", fontSize: 10 }}>{t("config.common.cancel")}</button>
                  </div>
                </div>
              ) : (
                <div key={s.id} className="flex items-center gap-1" style={{ padding: "4px 8px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
                  <span style={{ fontSize: 12, color: color.textPrimary, flex: 1 }}>{s.name}</span>
                  <span style={{ fontSize: 10, color: color.textMuted, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.url}</span>
                  <button onClick={() => { setEditingSourceId(s.id); setEditSourceName(s.name); setEditSourceUrl(s.url); }} title={t("config.common.edit")} style={{ ...btnGhost, padding: "2px 4px", fontSize: 9, color: color.textMuted }}>✎</button>
                  <button onClick={() => onDeleteSource(s.id)} style={{ ...btnGhost, padding: "2px 6px", border: "none", color: color.neg }}>✕</button>
                </div>
              )
            ))}
          </div>
          <div className="flex gap-1 mb-3">
            <input value={sn} onChange={(e) => setSn(e.target.value)} placeholder={t("config.common.name")} style={{ ...smallInput, width: 80 }} />
            <input value={su} onChange={(e) => setSu(e.target.value)} placeholder="URL" style={{ ...smallInput, flex: 1 }} />
            <button onClick={() => { if (sn && su) { onAddSource(sn, su); setSn(""); setSu(""); } }} style={{ ...btnPrimary, padding: "4px 10px", fontSize: 11 }}>+</button>
          </div>
          {library && library.feeds.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>{t("config.common.pickFromLibrary")}</label>
              <div className="flex flex-col gap-1" style={{ maxHeight: 100, overflowY: "auto" }}>
                {library.feeds.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => onAddSource(f.name, f.url)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "5px 8px", fontSize: 12, textAlign: "left",
                      color: color.textPrimary, background: "transparent",
                      border: `1px solid ${color.hairline}`, borderRadius: radius.inner, cursor: "pointer",
                    }}
                  >
                    <span className="flex-1 truncate">{f.name}</span>
                    <span style={{ fontSize: 9, color: color.textMuted, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.url}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>{t("config.feed.filterPrompt")}</label>
          <textarea
            value={fp}
            onChange={(e) => setFp(e.target.value)}
            onBlur={() => onChangeFilterPrompt(fp)}
            placeholder={t("config.feed.filterPromptPlaceholder")}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
          <div style={{ fontSize: 10, color: color.textMuted, marginTop: 4 }}>
            {t("config.feed.filterPromptHelp")}
          </div>
        </div>
      )}
    </div>
  );
}
