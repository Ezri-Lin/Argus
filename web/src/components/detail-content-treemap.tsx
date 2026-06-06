import { color, radius } from "@/design/tokens";
import { sentimentStyle } from "@/lib/treemap-style";
import { useI18n } from "@/lib/use-i18n";
import { formatLocalShort } from "@/lib/format-time";
import type { TreemapItem, RelatedNews } from "@/dashboard/mock-data";

function isRelatedNews(r: string | RelatedNews): r is RelatedNews {
  return typeof r === "object" && r !== null && "title" in r;
}

/** Visual indicator for impact weight — higher = more prominent */
function impactBadge(impactWeight?: number) {
  if (impactWeight == null || impactWeight < 30) return null;
  const level = impactWeight >= 70 ? "high" : impactWeight >= 50 ? "med" : "low";
  const label = level === "high" ? "HIGH IMPACT" : level === "med" ? "IMPACT" : null;
  if (!label) return null;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, borderRadius: 3, padding: "1px 5px",
      color: level === "high" ? color.warn : color.textSecondary,
      background: level === "high" ? `${color.warn}18` : color.surface2,
      border: `1px solid ${level === "high" ? `${color.warn}30` : color.hairline}`,
    }}>
      {label}
    </span>
  );
}

export function DetailContentTreemap({ item, source }: { item: TreemapItem; source?: string }) {
  const { t } = useI18n();
  const s = sentimentStyle(item.sentiment, item.previousSentiment);
  const related = item.related ?? [];

  // Use headline from item, or fall back to first related title
  const headline = item.headline
    || (related.length > 0 && isRelatedNews(related[0]) ? related[0].title : undefined);
  const topKind = related.length > 0 && isRelatedNews(related[0])
    ? related[0].kind
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: color.textPrimary, margin: 0 }}>
            {item.name}
          </h2>
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
            {item.confidence === "watch" ? "WATCH" : "CONFIRMED"}
          </span>
        </div>
        {source && (
          <div style={{ fontSize: 11, color: color.textMuted }}>{source}</div>
        )}
      </div>

      {/* One-sentence summary */}
      {headline && (
        <div style={{ fontSize: 14, fontWeight: 600, color: color.textPrimary, lineHeight: 1.5 }}>
          {headline}
        </div>
      )}

      {/* Badges: kind + importance */}
      <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
        {topKind && (
          <span style={{ fontSize: 10, color: color.textSecondary, background: color.surface2, border: `1px solid ${color.hairline}`, borderRadius: 4, padding: "2px 6px" }}>
            {topKind}
          </span>
        )}
        <span style={{ fontSize: 10, color: color.textMuted, background: color.surface2, border: `1px solid ${color.hairline}`, borderRadius: 4, padding: "2px 6px" }}>
          {item.metric}
        </span>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Value" value={String(item.value)} />
        <MetricCard
          label="Sentiment"
          value={item.sentiment > 0 ? `+${item.sentiment.toFixed(2)}` : item.sentiment.toFixed(2)}
          color={s.text}
        />
        <MetricCard label="Heat" value={item.heat.toFixed(2)} />
        <MetricCard label="Confidence" value={item.confidence === "watch" ? t("detail.treemap.confidence.watch") : t("detail.treemap.confidence.confirmed")} />
      </div>

      {/* Sentiment bar */}
      <div>
        <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 6 }}>Sentiment</div>
        <div style={{ height: 6, borderRadius: 3, background: color.surface2, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.abs(item.sentiment) * 100}%`,
              background: item.sentiment > 0 ? color.pos : item.sentiment < 0 ? color.neg : color.neu,
              borderRadius: 3,
              marginLeft: item.sentiment < 0 ? "auto" : undefined,
            }}
          />
        </div>
      </div>

      {/* Related news */}
      <div>
        <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 8 }}>
          {t("detail.relatedNews")} ({related.length})
        </div>
        {related.length === 0 ? (
          <div style={{ fontSize: 12, color: color.textMuted, padding: "12px 0", textAlign: "center" }}>
            {t("detail.noRelatedNews")}
          </div>
        ) : (
          <div>
          <div className="flex flex-col gap-0">
            {related.map((rel, i) => {
              const rich = isRelatedNews(rel);
              const title = rich ? rel.title : rel;
              const isHighImpact = rich && typeof rel.impactWeight === "number" && rel.impactWeight >= 50;
              return (
                <div key={i} style={isHighImpact ? { background: `${color.warn}06`, borderRadius: 4, margin: "0 -4px", padding: "0 4px" } : undefined}>
                  {i > 0 && <div style={{ height: 1, background: color.hairline }} />}
                  <div style={{ padding: "8px 0" }}>
                    {/* Title row */}
                    <div style={{ fontSize: 12, color: color.textPrimary, lineHeight: 1.4, fontWeight: isHighImpact ? 600 : 400 }}>
                      {rich && rel.url ? (
                        <a
                          href={rel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: color.textPrimary, textDecoration: "none" }}
                        >
                          {title}
                        </a>
                      ) : title}
                    </div>
                    {/* Note */}
                    {rich && rel.note && (
                      <div style={{ fontSize: 11, color: color.textSecondary, lineHeight: 1.3, marginTop: 2 }}>
                        {rel.note}
                      </div>
                    )}
                    {/* Meta row */}
                    {rich && (
                      <div className="flex items-center gap-2" style={{ marginTop: 4, flexWrap: "wrap" }}>
                        {rel.kind && (
                          <span style={{ fontSize: 9, color: color.textSecondary, background: color.surface2, border: `1px solid ${color.hairline}`, borderRadius: 3, padding: "1px 4px" }}>
                            {rel.kind}
                          </span>
                        )}
                        {impactBadge(rel.impactWeight)}
                        {rel.outlet && (
                          <span style={{ fontSize: 10, color: color.textMuted }}>{rel.outlet}</span>
                        )}
                        {rel.time && (
                          <span style={{ fontSize: 10, color: color.textMuted }}>{formatLocalShort(rel.time)}</span>
                        )}
                        {typeof rel.importance === "number" && rel.importance > 0.3 && (() => {
                          const pct = rel.importance * 100;
                          const impColor = pct >= 70 ? color.pos : pct >= 50 ? color.warn : color.neg;
                          const impBg = pct >= 70 ? `${color.pos}18` : pct >= 50 ? `${color.warn}18` : `${color.neg}18`;
                          return (
                            <span style={{
                              fontSize: 9, fontWeight: 600, borderRadius: 3, padding: "1px 4px",
                              color: impColor, background: impBg,
                            }}>
                              {pct.toFixed(0)}%
                            </span>
                          );
                        })()}
                        {rel.url && (
                          <a
                            href={rel.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 9, fontWeight: 600,
                              color: color.bg,
                              background: color.accent,
                              borderRadius: radius.pill,
                              padding: "2px 8px",
                              textDecoration: "none",
                            }}
                          >
                            {t("detail.readOriginal")}
                          </a>
                        )}
                      </div>
                    )}
                    {/* Supporting sources */}
                    {rich && rel.sources && rel.sources.length > 0 && (
                      <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: `2px solid ${color.hairline}` }}>
                        {rel.sources.map((src, si) => (
                          <div key={si} style={{ fontSize: 10, color: color.textMuted, lineHeight: 1.4 }}>
                            {src.startsWith("http") ? (
                              <a href={src} target="_blank" rel="noopener noreferrer" style={{ color: color.textMuted, textDecoration: "none" }}>
                                {new URL(src).hostname.replace("www.", "")}
                              </a>
                            ) : src}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color: valueColor }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        background: color.surface2,
        borderRadius: radius.inner,
        border: `1px solid ${color.hairline}`,
      }}
    >
      <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: valueColor ?? color.textPrimary }}>{value}</div>
    </div>
  );
}
