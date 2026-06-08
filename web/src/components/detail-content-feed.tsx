import { color, radius } from "@/design/tokens";
import { sentimentStyle } from "@/lib/treemap-style";
import { EntityLogo } from "@/widgets/primitives/entity-logo";
import { useI18n } from "@/lib/use-i18n";
import { getCategoryLabel } from "@/lib/category-label";
import { getKindLabel } from "@/lib/kind-label";
import type { SignalItem, FeedItem } from "@/dashboard/mock-data";

export function DetailContentSignal({ item }: { item: SignalItem }) {
  const { t } = useI18n();
  const s = sentimentStyle(item.sentiment);

  return (
    <div className="flex flex-col gap-4">
      {/* Category + time */}
      <div className="flex items-center gap-2">
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
          size={24}
        />
        <span
          style={{
            fontSize: 10,
            color: s.text,
            background: s.fill,
            border: `1px solid ${s.border}`,
            borderRadius: 4,
            padding: "2px 6px",
            fontWeight: 600,
          }}
        >
          {getCategoryLabel(item.category, t)}
        </span>
        <span style={{ fontSize: 11, color: color.textMuted }}>{item.time}</span>
      </div>

      {/* Badges: importance + confidence + kind */}
      <div className="flex items-center gap-2 flex-wrap">
        {typeof item.importance === "number" && (
          <span style={{
            fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "2px 6px",
            color: item.importance > 0.7 ? color.warn : color.textMuted,
            background: item.importance > 0.7 ? `${color.warn}18` : color.surface2,
            border: `1px solid ${item.importance > 0.7 ? `${color.warn}40` : color.hairline}`,
          }}>
            {t("detail.importance")} {(item.importance * 100).toFixed(0)}%
          </span>
        )}
        {item.status && (
          <span style={{
            fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "2px 6px",
            color: item.status === "confirmed" ? color.pos : item.status === "refuted" ? color.neg : color.textMuted,
            background: item.status === "confirmed" ? `${color.pos}18` : item.status === "refuted" ? `${color.neg}18` : color.surface2,
            border: `1px solid ${item.status === "confirmed" ? `${color.pos}40` : item.status === "refuted" ? `${color.neg}40` : color.hairline}`,
          }}>
            {item.status === "confirmed" ? t("detail.status.confirmed") : item.status === "refuted" ? t("detail.status.refuted") : t("detail.status.observing")}
          </span>
        )}
        {item.kind && (
          <span style={{
            fontSize: 10, borderRadius: 4, padding: "2px 6px",
            color: color.textMuted, background: color.surface2,
            border: `1px solid ${color.hairline}`,
          }}>
            {getKindLabel(item.kind, t)}
          </span>
        )}
      </div>

      {/* Headline */}
      <h2 style={{ fontSize: 17, fontWeight: 700, color: color.textPrimary, margin: 0, lineHeight: 1.35 }}>
        {item.headline}
      </h2>

      {/* Summary */}
      <div style={{ fontSize: 13, color: color.textSecondary, lineHeight: 1.5 }}>
        {item.summary}
      </div>

      {/* Full body */}
      {item.body && (
        <>
          <div style={{ height: 1, background: color.hairline }} />
          <div style={{ fontSize: 13, color: color.textSecondary, lineHeight: 1.6 }}>
            {item.body}
          </div>
        </>
      )}

      {/* Read original */}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 600,
            color: color.bg,
            background: color.accent,
            borderRadius: 999,
            textDecoration: "none",
            marginTop: 4,
          }}
        >
          {t("detail.readOriginal")}
          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4" />
            <path d="M7 3h6v6" />
            <path d="M13 3L7 9" />
          </svg>
        </a>
      )}

      {/* Sentiment indicator */}
      <div
        style={{
          padding: "8px 10px",
          background: color.surface2,
          borderRadius: 6,
          border: `1px solid ${color.hairline}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 11, color: color.textMuted }}>{t("detail.sentiment")}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: s.text }}>
          {item.sentiment > 0 ? "+" : ""}
          {item.sentiment.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function DetailContentFeed({ item, source }: { item: FeedItem; source?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      {/* Source badge */}
      <div className="flex items-center gap-2">
        <EntityLogo
          entity={{
            name: source ?? item.source,
            logoUrl: item.logoUrl,
            logoKey: item.logoKey,
            logoText: item.logoText ?? item.favicon,
            logoAlt: item.logoAlt,
            sourceUrl: item.url,
          }}
          fallback={item.favicon}
          size={24}
        />
        <span
          style={{
            fontSize: 10,
            color: color.textSecondary,
            background: color.surface2,
            border: `1px solid ${color.hairline}`,
            borderRadius: 4,
            padding: "2px 6px",
            fontWeight: 600,
          }}
        >
          {source ?? item.source}
        </span>
        <span style={{ fontSize: 11, color: color.textMuted }}>{item.time}</span>
      </div>

      {/* Title */}
      <h2 style={{ fontSize: 20, fontWeight: 700, color: color.textPrimary, margin: 0, lineHeight: 1.4 }}>
        {item.title}
      </h2>

      {/* Full body */}
      {item.body && (
        <>
          <div style={{ height: 1, background: color.hairline }} />
          <div style={{ fontSize: 15, color: color.textSecondary, lineHeight: 1.7 }}>
            {item.body}
          </div>
        </>
      )}

      {/* Read original link */}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 600,
            color: color.bg,
            background: color.accent,
            borderRadius: 999,
            textDecoration: "none",
            marginTop: 4,
          }}
        >
          {t("detail.readOriginal")}
          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4" />
            <path d="M7 3h6v6" />
            <path d="M13 3L7 9" />
          </svg>
        </a>
      )}
    </div>
  );
}
