import { useState, useCallback } from "react";
import { color, radius } from "@/design/tokens";
import type { FollowRule, VideoSource } from "@/widgets/embed/video-source-label";
import { aiParseRss } from "@/dashboard/api";
import { smallInput, btnSecondary } from "./config-styles";

export function followRuleIdentity(rule: FollowRule): string {
  switch (rule.mode) {
    case "manual": return "manual";
    case "live":
      return JSON.stringify({
        mode: "live",
        keyword: rule.keyword.trim(),
        tags: [...rule.tags].map((t) => t.trim()).filter(Boolean).sort(),
        quality: rule.quality ?? "auto",
        liveKind: rule.liveKind ?? "event_live",
        discoveryProviders: [...(rule.discoveryProviders ?? [])].sort(),
      });
    case "creator":
      return JSON.stringify({
        mode: "creator",
        keyword: rule.keyword.trim(),
        feedUrl: rule.feedUrl ?? "",
      });
    case "topic":
      return JSON.stringify({
        mode: "topic",
        keyword: rule.keyword.trim(),
        tags: [...rule.tags].map((t) => t.trim()).filter(Boolean).sort(),
        platform: rule.platform ?? "auto",
      });
  }
}

export function normalizeEmbedConfig(config: Record<string, unknown>): {
  followRule: FollowRule;
  sources: VideoSource[];
} {
  let followRule: FollowRule;
  if (config.followRule) {
    followRule = config.followRule as FollowRule;
  } else if (Array.isArray(config.topics) && config.topics.length > 0) {
    const first = config.topics[0] as Record<string, unknown>;
    const tags = (first.selectedTags ?? first.tags ?? []) as string[];
    followRule = first.contentType === "live"
      ? { mode: "live", keyword: first.keyword as string, tags }
      : { mode: "topic", keyword: first.keyword as string, tags };
  } else {
    followRule = { mode: "manual" };
  }

  let sources = (config.sources as VideoSource[]) ?? [];
  const followMode = followRule.mode === "manual" ? undefined : followRule.mode;
  sources = sources.map((s) =>
    s.origin === "topic" ? { ...s, origin: "follow" as const, followMode } : s
  );

  return { followRule, sources };
}

type Props = {
  followRule: FollowRule;
  setFollowRule: (rule: FollowRule) => void;
};

const MODES = [
  { value: "manual" as const, label: "Manual" },
  { value: "live" as const, label: "Live" },
  { value: "creator" as const, label: "Creator" },
  { value: "topic" as const, label: "Topic" },
];

export function SourceModeSelector({ followRule, setFollowRule }: Props) {
  return (
    <div style={{ marginTop: 12 }}>
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>
        Source Mode
      </label>

      <div className="flex gap-1.5" style={{ marginBottom: 10 }}>
        {MODES.map((m) => {
          const active = followRule.mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => {
                if (active) return;
                const next: FollowRule =
                  m.value === "manual" ? { mode: "manual" }
                  : m.value === "live" ? { mode: "live", keyword: "", tags: [] }
                  : m.value === "creator" ? { mode: "creator", keyword: "" }
                  : { mode: "topic", keyword: "", tags: [] };
                setFollowRule(next);
              }}
              style={{
                padding: "5px 12px", fontSize: 11, borderRadius: 999, cursor: "pointer",
                color: active ? color.bg : color.textSecondary,
                background: active ? color.accent : "transparent",
                border: `1px solid ${active ? color.accent : color.hairline}`,
                fontWeight: active ? 650 : 400,
                transition: "all 0.15s",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {followRule.mode === "live" && (
        <LiveFields rule={followRule} onChange={setFollowRule} />
      )}
      {followRule.mode === "creator" && (
        <CreatorFields rule={followRule} onChange={setFollowRule} />
      )}
      {followRule.mode === "topic" && (
        <TopicFields rule={followRule} onChange={setFollowRule} />
      )}
    </div>
  );
}

// ── Live mode ──

function LiveFields({ rule, onChange }: { rule: Extract<FollowRule, { mode: "live" }>; onChange: (r: FollowRule) => void }) {
  const [tagDraft, setTagDraft] = useState("");

  const commitTag = () => {
    const t = tagDraft.trim();
    if (!t) return;
    if (rule.tags.includes(t)) {
      setTagDraft("");
      return;
    }
    onChange({ ...rule, tags: [...rule.tags, t] });
    setTagDraft("");
  };

  const removeTag = (tag: string) => {
    onChange({ ...rule, tags: rule.tags.filter((t) => t !== tag) });
  };

  return (
    <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      {/* Subject */}
      <label style={{ fontSize: 10, color: color.textMuted, marginBottom: 3, display: "block" }}>Subject</label>
      <input
        value={rule.keyword}
        onChange={(e) => onChange({ ...rule, keyword: e.target.value })}
        placeholder="e.g. World Cup, IPTV news"
        style={{ ...smallInput, width: "100%" }}
      />

      {/* Quality + liveKind */}
      <div className="flex gap-2" style={{ marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: color.textMuted, marginBottom: 3, display: "block" }}>Quality</label>
          <select
            value={rule.quality ?? "auto"}
            onChange={(e) => onChange({ ...rule, quality: e.target.value as "auto" | "1080p" | "4k" })}
            style={{ ...smallInput, width: "100%" }}
          >
            <option value="auto">Auto</option>
            <option value="1080p">1080p</option>
            <option value="4k">4K</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: color.textMuted, marginBottom: 3, display: "block" }}>Type</label>
          <select
            value={rule.liveKind ?? "event_live"}
            onChange={(e) => onChange({ ...rule, liveKind: e.target.value as "stable_channel" | "event_live" })}
            style={{ ...smallInput, width: "100%" }}
          >
            <option value="event_live">Event / Match</option>
            <option value="stable_channel">Stable Channel</option>
          </select>
        </div>
      </div>

      {/* Keywords */}
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 10, color: color.textMuted, marginBottom: 3, display: "block" }}>
          Keywords <span style={{ color: color.textMuted, fontWeight: 400 }}>(joined with subject at search time)</span>
        </label>
        <div className="flex items-center gap-1.5">
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTag(); } }}
            placeholder="e.g. Argentina, Fox Sports, free stream"
            style={{ ...smallInput, flex: 1 }}
          />
          <button
            type="button"
            onClick={commitTag}
            disabled={!tagDraft.trim()}
            style={{ ...btnSecondary, padding: "4px 10px", opacity: tagDraft.trim() ? 1 : 0.5 }}
            title="Add keyword"
          >
            +
          </button>
        </div>
        {rule.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
            {rule.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 4px 3px 9px", fontSize: 11, borderRadius: 999,
                  background: color.surfaceElev, color: color.textPrimary,
                  border: `1px solid ${color.hairline}`,
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${tag}`}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: color.textMuted, padding: 0, margin: 0,
                    width: 14, height: 14, borderRadius: "50%",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, lineHeight: 1,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = color.neg; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = color.textMuted; }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Creator mode (feed/RSS) ──

function CreatorFields({ rule, onChange }: { rule: Extract<FollowRule, { mode: "creator" }>; onChange: (r: FollowRule) => void }) {
  const [rssUrl, setRssUrl] = useState(rule.feedUrl ?? "");
  const [fetching, setFetching] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [latestEntry, setLatestEntry] = useState<{ title: string; url: string; published: string; channelName: string } | null>(null);

  const handleFetch = useCallback(async () => {
    const url = rssUrl.trim();
    if (!url) return;
    setFetching(true);
    setFeedback(null);
    setLatestEntry(null);
    try {
      const res = await aiParseRss(url);
      if (res?.ok && res.entry) {
        setLatestEntry(res.entry);
        setFeedback({ type: "ok", msg: res.entry.channelName ? `Channel: ${res.entry.channelName}` : "Feed loaded" });
        onChange({
          ...rule,
          keyword: res.entry.channelName || url,
          feedUrl: url,
        });
      } else {
        setFeedback({ type: "err", msg: res?.error || "Feed unreachable" });
      }
    } catch {
      setFeedback({ type: "err", msg: "Request failed" });
    } finally {
      setFetching(false);
    }
  }, [rssUrl, rule, onChange]);

  return (
    <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      <div className="flex items-center gap-2">
        <input
          value={rssUrl}
          onChange={(e) => setRssUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleFetch(); }}
          placeholder="RSS/RSSHub feed URL"
          style={{ ...smallInput, flex: 1 }}
        />
        <button onClick={handleFetch} disabled={fetching || !rssUrl.trim()} style={{ ...btnSecondary, opacity: fetching ? 0.6 : 1 }}>
          {fetching ? "..." : "Fetch"}
        </button>
      </div>
      {feedback && (
        <div style={{ marginTop: 6, fontSize: 10, color: feedback.type === "ok" ? color.pos : color.neg }}>
          {feedback.msg}
        </div>
      )}
      {latestEntry && (
        <div style={{ marginTop: 8, padding: "6px 8px", background: color.surfaceElev, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: color.textPrimary }}>{latestEntry.title}</div>
          {latestEntry.published && (
            <div style={{ fontSize: 10, color: color.textMuted, marginTop: 2 }}>{latestEntry.published}</div>
          )}
          <div style={{ fontSize: 10, color: color.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {latestEntry.url}
          </div>
        </div>
      )}
      {!rule.feedUrl && !feedback && (
        <div style={{ marginTop: 6, fontSize: 10, color: "#f59e0b" }}>
          Enter a feed/RSS/RSSHub URL to enable creator follow
        </div>
      )}
    </div>
  );
}

// ── Topic mode ──

function TopicFields({ rule, onChange }: { rule: Extract<FollowRule, { mode: "topic" }>; onChange: (r: FollowRule) => void }) {
  const [tagDraft, setTagDraft] = useState("");

  const commitTag = () => {
    const t = tagDraft.trim();
    if (!t) return;
    if (rule.tags.includes(t)) {
      setTagDraft("");
      return;
    }
    onChange({ ...rule, tags: [...rule.tags, t] });
    setTagDraft("");
  };

  const removeTag = (tag: string) => {
    onChange({ ...rule, tags: rule.tags.filter((t) => t !== tag) });
  };

  return (
    <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      {/* Subject */}
      <label style={{ fontSize: 10, color: color.textMuted, marginBottom: 3, display: "block" }}>Subject</label>
      <input
        value={rule.keyword}
        onChange={(e) => onChange({ ...rule, keyword: e.target.value })}
        placeholder="e.g. AI news, cooking recipes"
        style={{ ...smallInput, width: "100%" }}
      />

      {/* Platform */}
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 10, color: color.textMuted, marginBottom: 3, display: "block" }}>Platform</label>
        <select
          value={rule.platform ?? "auto"}
          onChange={(e) => onChange({ ...rule, platform: e.target.value as "auto" | "youtube" | "bilibili" })}
          style={{ ...smallInput, width: "100%" }}
        >
          <option value="auto">Auto (YouTube + Bilibili)</option>
          <option value="youtube">YouTube only</option>
          <option value="bilibili">Bilibili only</option>
        </select>
      </div>

      {/* Keywords */}
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 10, color: color.textMuted, marginBottom: 3, display: "block" }}>
          Keywords <span style={{ color: color.textMuted, fontWeight: 400 }}>(joined with subject at search time)</span>
        </label>
        <div className="flex items-center gap-1.5">
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTag(); } }}
            placeholder="e.g. tutorial, 2026, beginner"
            style={{ ...smallInput, flex: 1 }}
          />
          <button
            type="button"
            onClick={commitTag}
            disabled={!tagDraft.trim()}
            style={{ ...btnSecondary, padding: "4px 10px", opacity: tagDraft.trim() ? 1 : 0.5 }}
            title="Add keyword"
          >
            +
          </button>
        </div>
        {rule.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
            {rule.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 4px 3px 9px", fontSize: 11, borderRadius: 999,
                  background: color.surfaceElev, color: color.textPrimary,
                  border: `1px solid ${color.hairline}`,
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${tag}`}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: color.textMuted, padding: 0, margin: 0,
                    width: 14, height: 14, borderRadius: "50%",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, lineHeight: 1,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = color.neg; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = color.textMuted; }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
