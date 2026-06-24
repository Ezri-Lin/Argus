import { useState, useCallback } from "react";
import { color, radius } from "@/design/tokens";
import type { FollowRule, VideoSource } from "@/widgets/embed/video-source-label";
import { aiDiscoverTopics, aiParseRss } from "@/dashboard/api";
import { smallInput, btnPrimary, btnSecondary } from "./config-styles";

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
  const [suggested, setSuggested] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(rule.tags));
  const [discovering, setDiscovering] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const handleDiscover = useCallback(async () => {
    const kw = rule.keyword.trim();
    if (!kw) return;
    setDiscovering(true);
    setSuggested([]);
    setFeedback(null);
    try {
      const res = await aiDiscoverTopics(kw, "live");
      if (res?.ok && res.tags && res.tags.length > 0) {
        setSuggested(res.tags);
        setFeedback({ type: "ok", msg: `Found ${res.tags.length} topics` });
      } else {
        setFeedback({ type: "err", msg: res?.error || "No topics found" });
      }
    } catch {
      setFeedback({ type: "err", msg: "Request failed" });
    } finally {
      setDiscovering(false);
    }
  }, [rule.keyword]);

  const toggleTag = (tag: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const applyTags = () => {
    onChange({ ...rule, tags: [...selected] });
  };

  return (
    <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      <div className="flex items-center gap-2">
        <input
          value={rule.keyword}
          onChange={(e) => onChange({ ...rule, keyword: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") handleDiscover(); }}
          placeholder="e.g. World Cup, IPTV news"
          style={{ ...smallInput, flex: 1 }}
        />
        <button onClick={handleDiscover} disabled={discovering || !rule.keyword.trim()} style={{ ...btnSecondary, opacity: discovering ? 0.6 : 1 }}>
          {discovering ? "..." : "Discover"}
        </button>
      </div>

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

      {feedback && (
        <div style={{ marginTop: 6, fontSize: 10, color: feedback.type === "ok" ? color.pos : color.neg }}>
          {feedback.msg}
        </div>
      )}
      {suggested.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 6 }}>Select topics to follow:</div>
          <div className="flex flex-wrap gap-1.5">
            {suggested.map((tag) => {
              const sel = selected.has(tag);
              return (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  padding: "4px 10px", fontSize: 11, borderRadius: 999, cursor: "pointer",
                  color: sel ? color.bg : color.textSecondary,
                  background: sel ? color.accent : "transparent",
                  border: `1px solid ${sel ? color.accent : color.hairline}`,
                  transition: "all 0.15s",
                }}>
                  {tag}
                </button>
              );
            })}
          </div>
          <button onClick={applyTags} disabled={selected.size === 0} style={{ ...btnPrimary, marginTop: 8, width: "100%", padding: "7px 0", opacity: selected.size === 0 ? 0.5 : 1 }}>
            Apply ({selected.size} selected)
          </button>
        </div>
      )}
      {rule.tags.length > 0 && (
        <div className="flex flex-wrap gap-1" style={{ marginTop: 8 }}>
          {rule.tags.map((tag) => (
            <span key={tag} style={{
              padding: "2px 8px", fontSize: 10, borderRadius: 999,
              background: color.surfaceElev, color: color.textMuted,
              border: `1px solid ${color.hairline}`,
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
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
  const [suggested, setSuggested] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(rule.tags));
  const [discovering, setDiscovering] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const handleDiscover = useCallback(async () => {
    const kw = rule.keyword.trim();
    if (!kw) return;
    setDiscovering(true);
    setSuggested([]);
    setFeedback(null);
    try {
      const res = await aiDiscoverTopics(kw, "video");
      if (res?.ok && res.tags && res.tags.length > 0) {
        setSuggested(res.tags);
        setFeedback({ type: "ok", msg: `Found ${res.tags.length} topics` });
      } else {
        setFeedback({ type: "err", msg: res?.error || "No topics found" });
      }
    } catch {
      setFeedback({ type: "err", msg: "Request failed" });
    } finally {
      setDiscovering(false);
    }
  }, [rule.keyword]);

  const toggleTag = (tag: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const applyTags = () => {
    onChange({ ...rule, tags: [...selected] });
  };

  return (
    <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      <div className="flex items-center gap-2">
        <input
          value={rule.keyword}
          onChange={(e) => onChange({ ...rule, keyword: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") handleDiscover(); }}
          placeholder="e.g. AI news, cooking recipes"
          style={{ ...smallInput, flex: 1 }}
        />
        <button onClick={handleDiscover} disabled={discovering || !rule.keyword.trim()} style={{ ...btnSecondary, opacity: discovering ? 0.6 : 1 }}>
          {discovering ? "..." : "Discover"}
        </button>
      </div>

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

      {feedback && (
        <div style={{ marginTop: 6, fontSize: 10, color: feedback.type === "ok" ? color.pos : color.neg }}>
          {feedback.msg}
        </div>
      )}
      {suggested.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 6 }}>Select topics to follow:</div>
          <div className="flex flex-wrap gap-1.5">
            {suggested.map((tag) => {
              const sel = selected.has(tag);
              return (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  padding: "4px 10px", fontSize: 11, borderRadius: 999, cursor: "pointer",
                  color: sel ? color.bg : color.textSecondary,
                  background: sel ? color.accent : "transparent",
                  border: `1px solid ${sel ? color.accent : color.hairline}`,
                  transition: "all 0.15s",
                }}>
                  {tag}
                </button>
              );
            })}
          </div>
          <button onClick={applyTags} disabled={selected.size === 0} style={{ ...btnPrimary, marginTop: 8, width: "100%", padding: "7px 0", opacity: selected.size === 0 ? 0.5 : 1 }}>
            Apply ({selected.size} selected)
          </button>
        </div>
      )}
      {rule.tags.length > 0 && (
        <div className="flex flex-wrap gap-1" style={{ marginTop: 8 }}>
          {rule.tags.map((tag) => (
            <span key={tag} style={{
              padding: "2px 8px", fontSize: 10, borderRadius: 999,
              background: color.surfaceElev, color: color.textMuted,
              border: `1px solid ${color.hairline}`,
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
