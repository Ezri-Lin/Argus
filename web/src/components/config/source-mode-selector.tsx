import { useState, useCallback } from "react";
import { color, radius } from "@/design/tokens";
import type { FollowRule, VideoSource } from "@/widgets/embed/video-source-label";
import { aiDiscoverTopics, aiSearchCreators } from "@/dashboard/api";
import { inputStyle, smallInput, btnPrimary, btnSecondary, btnGhost } from "./config-styles";

export function followRuleIdentity(rule: FollowRule): string {
  switch (rule.mode) {
    case "manual": return "manual";
    case "live":
      return JSON.stringify({
        mode: "live",
        keyword: rule.keyword.trim(),
        tags: [...rule.tags].map((t) => t.trim()).filter(Boolean).sort(),
        platform: rule.platform ?? "auto",
        quality: rule.quality ?? "auto",
      });
    case "creator":
      return JSON.stringify({
        mode: "creator",
        keyword: rule.keyword.trim(),
        channelId: rule.channelId,
        channelUrl: rule.channelUrl,
        platform: rule.platform ?? "auto",
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

      {/* Radio buttons */}
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

      {/* Mode-specific fields */}
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

  const handleDiscover = useCallback(async () => {
    const kw = rule.keyword.trim();
    if (!kw) return;
    setDiscovering(true);
    setSuggested([]);
    try {
      const res = await aiDiscoverTopics(kw, "live");
      if (res?.ok && res.tags) {
        setSuggested(res.tags);
      }
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
          placeholder="e.g. World Cup"
          style={{ ...smallInput, flex: 1 }}
        />
        <button onClick={handleDiscover} disabled={discovering || !rule.keyword.trim()} style={{ ...btnSecondary, opacity: discovering ? 0.6 : 1 }}>
          {discovering ? "..." : "Discover"}
        </button>
      </div>
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

// ── Creator mode ──

type Channel = { id: string; name: string; url: string; thumbnail: string; platform: string };

function CreatorFields({ rule, onChange }: { rule: Extract<FollowRule, { mode: "creator" }>; onChange: (r: FollowRule) => void }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const handleSearch = useCallback(async () => {
    const kw = rule.keyword.trim();
    if (!kw) return;
    setSearching(true);
    setChannels([]);
    setSelectedIdx(-1);
    try {
      const res = await aiSearchCreators(kw);
      if (res?.ok && res.channels) {
        setChannels(res.channels);
      }
    } finally {
      setSearching(false);
    }
  }, [rule.keyword]);

  const selectChannel = (idx: number) => {
    const ch = channels[idx];
    if (!ch) return;
    setSelectedIdx(idx);
    onChange({
      ...rule,
      channelId: ch.id,
      channelUrl: ch.url,
      channelName: ch.name,
      platform: ch.platform as "auto" | "youtube" | "bilibili" | undefined,
    });
  };

  const hasChannel = !!(rule.channelId || rule.channelUrl);

  return (
    <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      <div className="flex items-center gap-2">
        <input
          value={rule.keyword}
          onChange={(e) => onChange({ ...rule, keyword: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          placeholder="e.g. Linus Tech Tips"
          style={{ ...smallInput, flex: 1 }}
        />
        <button onClick={handleSearch} disabled={searching || !rule.keyword.trim()} style={{ ...btnSecondary, opacity: searching ? 0.6 : 1 }}>
          {searching ? "..." : "Search"}
        </button>
      </div>

      {!hasChannel && (
        <div style={{ marginTop: 6, fontSize: 10, color: "#f59e0b" }}>
          Select a channel to enable follow
        </div>
      )}

      {hasChannel && (
        <div style={{ marginTop: 8, padding: "6px 8px", background: color.surfaceElev, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: color.textPrimary }}>{rule.channelName}</div>
          <div style={{ fontSize: 10, color: color.textMuted, marginTop: 2 }}>{rule.channelUrl}</div>
        </div>
      )}

      {channels.length > 0 && (
        <div className="flex flex-col gap-1.5" style={{ marginTop: 10, maxHeight: 150, overflowY: "auto" }}>
          {channels.map((ch, i) => {
            const sel = i === selectedIdx;
            return (
              <button
                key={`${ch.id}-${i}`}
                onClick={() => selectChannel(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "6px 8px", fontSize: 12, textAlign: "left",
                  color: sel ? color.textPrimary : color.textSecondary,
                  background: sel ? color.surfaceElev : "transparent",
                  border: `1px solid ${sel ? color.textMuted : color.hairline}`,
                  borderRadius: radius.inner, cursor: "pointer",
                }}
              >
                {ch.thumbnail && (
                  <img src={ch.thumbnail} alt="" style={{ width: 24, height: 24, borderRadius: 999, objectFit: "cover" }} />
                )}
                <span className="flex-1 truncate" style={{ fontWeight: sel ? 600 : 400 }}>{ch.name}</span>
                <span style={{ fontSize: 9, color: color.textMuted, textTransform: "uppercase" }}>{ch.platform}</span>
              </button>
            );
          })}
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

  const handleDiscover = useCallback(async () => {
    const kw = rule.keyword.trim();
    if (!kw) return;
    setDiscovering(true);
    setSuggested([]);
    try {
      const res = await aiDiscoverTopics(kw, "video");
      if (res?.ok && res.tags) {
        setSuggested(res.tags);
      }
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
          placeholder="e.g. cooking recipes"
          style={{ ...smallInput, flex: 1 }}
        />
        <button onClick={handleDiscover} disabled={discovering || !rule.keyword.trim()} style={{ ...btnSecondary, opacity: discovering ? 0.6 : 1 }}>
          {discovering ? "..." : "Discover"}
        </button>
      </div>
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
