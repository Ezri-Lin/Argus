import { type ReactNode, useState, useMemo } from "react";
import { WidgetFrame } from "@/components/widget-frame";
import { PopupBubble } from "@/components/popup-bubble";
import { color } from "@/design/tokens";
import { signals, feeds, type SignalItem, type FeedItem } from "@/dashboard/mock-data";
import { EntityLogo } from "@/widgets/primitives/entity-logo";
import { sentimentStyle } from "@/lib/treemap-style";
import type { DashboardWidget } from "@/dashboard/dashboard-types";
import { useDashboardStore, isItemRead } from "@/dashboard/dashboard-store";
import type { ApiFeedItem } from "@/dashboard/api";
import { formatLocalShort } from "@/lib/format-time";
import { useI18n } from "@/lib/use-i18n";
import { useFreshness } from "@/lib/use-freshness";

// ── Decay scoring ──

const TAU_MIN = 24;   // hours — importance 0
const TAU_MAX = 168;  // hours — importance 1
const DECAY_THRESHOLD = 0.08;

function decayScore(item: ApiFeedItem): number {
  const confidence = item.status === "confirmed" ? 0.9
    : item.status === "refuted" ? 0.1 : 0.5;
  const ageHours = (Date.now() - new Date(item.time).getTime()) / 3_600_000;
  if (ageHours < 0) return confidence * item.importance; // future item
  const tau = TAU_MIN + (TAU_MAX - TAU_MIN) * item.importance;
  const decay = Math.exp(-ageHours / tau);
  return confidence * item.importance * decay;
}

/** Sentiment gradient bar — fades from full color to 20-30% opacity at 60%, then disappears. */
function SentimentBar({ color: c }: { color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 2,
        borderRadius: 1,
        background: `linear-gradient(to bottom, ${c} 0%, ${c} 50%, rgba(0,0,0,0) 60%)`,
        pointerEvents: "none",
      }}
    />
  );
}

const CATEGORY_MAP: Record<string, SignalItem["category"]> = {
  "Hacker News": "Tech",
  TechCrunch: "Tech",
};

function apiFeedToSignals(items: ApiFeedItem[]): SignalItem[] {
  return items.slice(0, 15).map((item) => ({
    category: CATEGORY_MAP[item.source] ?? "Tech",
    source: item.source,
    headline: item.title,
    summary: item.summary || item.title,
    sentiment: item.sentiment,
    time: item.time,
    body: item.summary,
    url: item.url,
    importance: item.importance,
    kind: item.kind,
    status: item.status,
    logoUrl: item.logoUrl ?? item.logo_url,
    logoKey: item.logoKey ?? item.logo_key,
    logoText: item.logoText ?? item.logo_text ?? item.source.charAt(0).toUpperCase(),
    logoAlt: item.logoAlt ?? item.logo_alt,
  }));
}

export function FeedListWidget({ widget, onConfig, onDetail, onDelete, onMinimize }: { widget: DashboardWidget; onConfig?: () => void; onDetail?: () => void; onDelete?: () => void; onMinimize?: () => void }) {
  const { freshness, staleAge } = useFreshness();
  const variant = (widget.config.variant as string) ?? "signals";

  return (
    <WidgetFrame widget={widget} freshness={freshness} staleAge={staleAge} onConfig={onConfig} onDetail={onDetail} onDelete={onDelete} onMinimize={onMinimize}>
      <div className="flex h-full flex-col overflow-hidden">
        {variant === "rss" ? <RssView /> : <SignalsView />}
      </div>
    </WidgetFrame>
  );
}

function SignalsView() {
  const { t } = useI18n();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [showFolded, setShowFolded] = useState(false);
  const selectItem = useDashboardStore((s) => s.selectItem);
  const apiData = useDashboardStore((s) => s.apiData);

  const { main, folded } = useMemo(() => {
    if (!apiData?.feed?.length) {
      const fallback = signals.map((s, i) => ({ ...s, _score: 1, _key: `mock-${i}` }));
      return { main: fallback, folded: [] as typeof fallback };
    }
    const scored = apiData.feed
      .map((item) => ({
        ...apiFeedToSignals([item])[0],
        _score: decayScore(item),
        _key: item.url || item.title,
      }))
      .filter((item) => !isItemRead(item._key))
      .sort((a, b) => b._score - a._score);
    return {
      main: scored.filter((s) => s._score >= DECAY_THRESHOLD),
      folded: scored.filter((s) => s._score < DECAY_THRESHOLD),
    };
  }, [apiData]);

  function renderItem(item: (typeof main)[number], i: number, key: string) {
    const s = sentimentStyle(item.sentiment);
    const isHovered = hoveredKey === key;
    return (
      <div
        key={key}
        style={{
          position: "relative",
          borderRadius: 6,
          padding: "0 6px 0 8px",
          marginRight: -6,
          background: isHovered ? color.hairline : "transparent",
          transition: "background 0.15s",
        }}
      >
        <SentimentBar color={s.text} />
        {i > 0 && <div style={{ height: 1, background: color.hairline }} />}
        <div
          className="flex items-start gap-2"
          style={{ padding: "8px 0", cursor: "pointer" }}
          onMouseEnter={() => setHoveredKey(key)}
          onMouseLeave={() => setHoveredKey(null)}
          onClick={() => selectItem({ type: "signal", data: item })}
        >
          <EntityLogo
            entity={{
              name: item.source ?? item.category,
              logoUrl: item.logoUrl,
              logoKey: item.logoKey,
              logoText: item.logoText ?? item.source ?? item.category,
              logoAlt: item.logoAlt,
              sourceUrl: item.url,
            }}
            fallback={item.source ?? item.category}
            size={22}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 10, color: color.textMuted, border: `1px solid ${color.hairline}`, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                {item.category}
              </span>
              <span style={{ fontSize: 11, color: color.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {formatLocalShort(item.time)}
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: color.textPrimary, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
              {item.headline}
            </div>
            <div style={{ fontSize: 11, color: color.textSecondary, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
              {item.summary}
            </div>
          </div>
        </div>
        {isHovered && (
          <PopupBubble x={200} y={0} anchor="bottom">
            <div style={{ fontSize: 12, color: color.textSecondary, maxWidth: 250 }}>{item.summary}</div>
          </PopupBubble>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden argus-scroll" style={{ margin: "0 -14px", padding: "0 14px 10px" }}>
      {main.map((item, i) => renderItem(item, i, item._key))}
      {folded.length > 0 && (
        <>
          <button
            onClick={() => setShowFolded(!showFolded)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              fontSize: 11,
              color: color.textMuted,
              background: "transparent",
              border: "none",
              padding: "8px 6px",
              cursor: "pointer",
              marginLeft: -6,
            }}
          >
            {showFolded ? t("feed.collapse") : `${t("feed.older")} (${folded.length})`}
          </button>
          {showFolded && folded.map((item, i) => renderItem(item, i, item._key))}
        </>
      )}
    </div>
  );
}

function RssView() {
  const { t } = useI18n();
  const apiData = useDashboardStore((s) => s.apiData);
  const [activeTab, setActiveTab] = useState("");
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [showFolded, setShowFolded] = useState(false);
  const selectItem = useDashboardStore((s) => s.selectItem);

  const rssGroups = useMemo(() => {
    if (!apiData?.feed?.length) return feeds;
    // Sort by decay score, filter read
    const sorted = [...apiData.feed]
      .map((item) => ({ item, score: decayScore(item) }))
      .filter(({ item }) => !isItemRead(item.url || item.title))
      .sort((a, b) => b.score - a.score);
    const bySource = new Map<string, FeedItem[]>();
    for (const { item } of sorted) {
      const group = bySource.get(item.source) ?? [];
      group.push({
        title: item.title,
        favicon: item.source.charAt(0).toUpperCase(),
        time: item.time,
        url: item.url,
        body: item.summary,
        source: item.source,
        sentiment: item.sentiment,
        logoUrl: item.logoUrl ?? item.logo_url,
        logoKey: item.logoKey ?? item.logo_key,
        logoText: item.logoText ?? item.logo_text ?? item.source.charAt(0).toUpperCase(),
        logoAlt: item.logoAlt ?? item.logo_alt,
      });
      bySource.set(item.source, group);
    }
    return Array.from(bySource.entries()).map(([label, items], i) => ({
      id: `api-${i}`,
      label,
      items,
    }));
  }, [apiData]);

  // Reset active tab when groups change
  const effectiveTab = activeTab && rssGroups.some((g) => g.id === activeTab)
    ? activeTab
    : rssGroups[0]?.id ?? "";
  const group = rssGroups.find((g) => g.id === effectiveTab) ?? rssGroups[0];

  // Split items into main + folded by score
  const { mainItems, foldedItems } = useMemo(() => {
    if (!apiData?.feed?.length || !group) return { mainItems: group?.items ?? [], foldedItems: [] as FeedItem[] };
    const scores = new Map<string, number>();
    for (const item of apiData.feed) {
      scores.set(item.url || item.title, decayScore(item));
    }
    const main: FeedItem[] = [];
    const folded: FeedItem[] = [];
    for (const fi of group.items) {
      const key = fi.url || fi.title;
      const score = scores.get(key) ?? 1;
      if (score >= DECAY_THRESHOLD) main.push(fi);
      else folded.push(fi);
    }
    return { mainItems: main, foldedItems: folded };
  }, [apiData, group]);

  function renderItem(item: FeedItem, i: number, key: string) {
    const isHovered = hoveredKey === key;
    const s = item.sentiment != null ? sentimentStyle(item.sentiment) : null;
    return (
      <div
        key={key}
        style={{
          position: "relative",
          borderRadius: 6,
          padding: "0 6px 0 8px",
          marginRight: -6,
          background: isHovered ? color.hairline : "transparent",
          transition: "background 0.15s",
        }}
      >
        {s && <SentimentBar color={s.text} />}
        {i > 0 && <div style={{ height: 1, background: color.hairline }} />}
        <div
          className="flex items-center gap-3"
          style={{ padding: "7px 0", cursor: "pointer" }}
          onMouseEnter={() => setHoveredKey(key)}
          onMouseLeave={() => setHoveredKey(null)}
          onClick={() => selectItem({ type: "feed", data: item, source: group?.label })}
        >
          <EntityLogo
            entity={{
              name: item.source,
              logoUrl: item.logoUrl,
              logoKey: item.logoKey,
              logoText: item.logoText ?? item.favicon,
              logoAlt: item.logoAlt,
              sourceUrl: item.url,
            }}
            fallback={item.favicon}
            size={24}
          />
          <div className="flex-1 min-w-0" style={{ fontSize: 13, color: color.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.title}
          </div>
          <span style={{ fontSize: 11, color: color.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
            {formatLocalShort(item.time)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex gap-1" style={{ marginBottom: 8, flexShrink: 0 }}>
        {rssGroups.map((g) => (
          <span
            key={g.id}
            onClick={() => { setActiveTab(g.id); setShowFolded(false); }}
            style={{
              fontSize: 11,
              color: g.id === effectiveTab ? color.textPrimary : color.textMuted,
              background: g.id === effectiveTab ? color.surface2 : "transparent",
              borderRadius: 6,
              padding: "3px 10px",
              cursor: "pointer",
            }}
          >
            {g.label}
          </span>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden argus-scroll" style={{ margin: "0 -14px", padding: "0 14px 10px" }}>
        {mainItems.map((item, i) => renderItem(item, i, item.url || item.title))}
        {foldedItems.length > 0 && (
          <>
            <button
              onClick={() => setShowFolded(!showFolded)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                fontSize: 11,
                color: color.textMuted,
                background: "transparent",
                border: "none",
                padding: "8px 6px",
                cursor: "pointer",
                marginLeft: -6,
              }}
            >
              {showFolded ? "收起" : `更早 (${foldedItems.length})`}
            </button>
            {showFolded && foldedItems.map((item, i) => renderItem(item, i, item.url || item.title))}
          </>
        )}
      </div>
    </div>
  );
}
