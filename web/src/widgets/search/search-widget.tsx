import { useState, useEffect } from "react";
import { WidgetFrame } from "@/components/widget-frame";
import { color, radius } from "@/design/tokens";
import type { DashboardWidget } from "@/dashboard/dashboard-types";
import { useFreshness } from "@/lib/use-freshness";
import { aiSearch, type AiSearchResult } from "@/dashboard/api";

export function SearchWidget({ widget, onConfig, onDetail, onDelete, onMinimize }: { widget: DashboardWidget; onConfig?: () => void; onDetail?: () => void; onDelete?: () => void; onMinimize?: () => void }) {
  const { freshness, staleAge } = useFreshness();
  const query = (widget.config.query as string) ?? "";
  const domain = (widget.config.domain as string) ?? "";
  const [result, setResult] = useState<AiSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const res = await aiSearch(query, domain);
    setResult(res);
    setLoading(false);
  };

  useEffect(() => {
    if (query.trim()) runSearch();
  }, [widget.config.query, widget.config.domain]);

  return (
    <WidgetFrame widget={widget} freshness={freshness} staleAge={staleAge} onConfig={onConfig} onDetail={onDetail} onDelete={onDelete} onMinimize={onMinimize}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${color.hairline}` }}>
          <span style={{ fontSize: 12, color: color.textSecondary, flex: 1 }}>
            {query || "No query"}
            {domain && <span style={{ color: color.textMuted }}> · {domain}</span>}
          </span>
          <button
            onClick={runSearch}
            disabled={loading || !query.trim()}
            style={{ padding: "3px 10px", fontSize: 11, fontWeight: 650, color: color.bg, background: loading ? color.textMuted : color.accent, border: "none", borderRadius: 999, cursor: "pointer" }}
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden argus-scroll px-3 py-2">
          {!query && (
            <div style={{ fontSize: 12, color: color.textMuted, textAlign: "center", marginTop: 40 }}>
              Configure a search query in widget settings
            </div>
          )}
          {loading && (
            <div style={{ fontSize: 12, color: color.textMuted, textAlign: "center", marginTop: 40 }}>
              Searching...
            </div>
          )}
          {!loading && result && !result.ok && (
            <div style={{ fontSize: 12, color: color.neg, textAlign: "center", marginTop: 40 }}>
              {result.error || "Search failed"}
            </div>
          )}
          {!loading && result?.ok && (
            <div className="flex flex-col gap-3">
              {/* Summary */}
              {result.summary && (
                <div style={{ fontSize: 13, color: color.textPrimary, lineHeight: 1.5 }}>
                  {result.summary}
                </div>
              )}

              {/* Events */}
              {result.events && result.events.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Key Events</div>
                  <div className="flex flex-col gap-1">
                    {result.events.map((e, i) => (
                      <div key={i} style={{ padding: "6px 8px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
                        <div style={{ fontSize: 12, color: color.textPrimary }}>{e.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span style={{ fontSize: 10, color: e.sentiment > 0 ? color.pos : e.sentiment < 0 ? color.neg : color.textMuted }}>
                            {e.sentiment > 0 ? "+" : ""}{(e.sentiment * 100).toFixed(0)}%
                          </span>
                          <span style={{ fontSize: 10, color: color.textMuted }}>
                            imp: {(e.importance * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {result.sources && result.sources.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Sources</div>
                  <div className="flex flex-col gap-1">
                    {result.sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: color.textPrimary, textDecoration: "none", padding: "2px 0" }}>
                        {s.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}
