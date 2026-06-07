import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { WidgetFrame } from "@/components/widget-frame";
import { color } from "@/design/tokens";
import { treemaps, type TreemapGroup, type TreemapItem } from "@/dashboard/mock-data";
import { layoutTreemap, type PositionedCell } from "./treemap-layout";
import type { DashboardWidget } from "@/dashboard/dashboard-types";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import type { ApiTreemapData } from "@/dashboard/api";
import { useFreshness } from "@/lib/use-freshness";
import { TreemapCellSVG } from "./treemap-cell";
import { TreemapTooltip } from "./treemap-tooltip";

export { treemapDisplayLabel, fitTextSize } from "./treemap-cell";

export function apiTreemapToGroups(api: ApiTreemapData): Record<string, TreemapGroup> {
  const groups: Record<string, TreemapGroup> = {};
  for (const src of api.children) {
    groups[src.key ?? src.name] = {
      title: src.name,
      items: src.children.map((c): TreemapItem => ({
        name: c.name,
        value: c.size,
        sentiment: c.sentiment,
        previousSentiment: c.previousSentiment,
        metric: c.metric,
        heat: c.freshness ?? c.heat ?? Math.min(c.size / 100, 1),
        freshness: c.freshness ?? c.heat,
        influence: c.influence,
        baselineInfluence: c.baselineInfluence,
        impactWeight: c.impactWeight,
        impactPersistenceDays: c.impactPersistenceDays,
        confidence: (c.confidence as "confirmed" | "watch") ?? "confirmed",
        headline: c.headline,
        logoUrl: c.logoUrl ?? c.logo_url,
        logoKey: c.logoKey ?? c.logo_key,
        logoText: c.logoText ?? c.logo_text,
        logoAlt: c.logoAlt ?? c.logo_alt,
        related: c.related,
      })),
    };
  }
  return groups;
}

export function TreemapWidget({ widget, onConfig, onDetail, onDelete, onMinimize }: { widget: DashboardWidget; onConfig?: () => void; onDetail?: () => void; onDelete?: () => void; onMinimize?: () => void }) {
  const { freshness, staleAge } = useFreshness();
  const apiData = useDashboardStore((s) => s.apiData);
  const apiGroups = useMemo(
    () => (apiData?.treemap?.children?.length ? apiTreemapToGroups(apiData.treemap) : null),
    [apiData],
  );
  const groups = apiGroups ?? treemaps;
  const group = groups[(widget.config.group as string) ?? "tech"] ?? groups[Object.keys(groups)[0]] ?? treemaps.tech;
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<PositionedCell | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const selectItem = useDashboardStore((s) => s.selectItem);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const obs = new ResizeObserver((entries) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { width, height } = entries[0].contentRect;
        setSize({ w: width, h: height });
      });
    });
    obs.observe(el);
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, []);

  const cells = layoutTreemap(group.items, size.w, size.h);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleContainerMouseLeave = useCallback(() => {
    setHovered(null);
    setMousePos(null);
  }, []);

  return (
    <WidgetFrame widget={widget} freshness={freshness} staleAge={staleAge} onConfig={onConfig} onDetail={onDetail} onDelete={onDelete} onMinimize={onMinimize}>
      <div
        ref={containerRef}
        className="relative h-full w-full"
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleContainerMouseLeave}
      >
        <svg
          width={size.w}
          height={size.h}
          style={{ display: "block", overflow: "hidden" }}
        >
          {/* Crosshair lines */}
          {mousePos && (
            <>
              <line
                x1={mousePos.x}
                y1={0}
                x2={mousePos.x}
                y2={size.h}
                stroke={color.hairline}
                strokeWidth={1}
                strokeDasharray="4 3"
                pointerEvents="none"
              />
              <line
                x1={0}
                y1={mousePos.y}
                x2={size.w}
                y2={mousePos.y}
                stroke={color.hairline}
                strokeWidth={1}
                strokeDasharray="4 3"
                pointerEvents="none"
              />
            </>
          )}
          {cells.map((cell) => (
            <g
              key={cell.item.name}
              onMouseEnter={() => setHovered(cell)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => selectItem({ type: "treemap", data: cell.item, source: group.title })}
              style={{ cursor: "pointer" }}
            >
              <TreemapCellSVG
                cell={cell}
                isHovered={hovered?.item.name === cell.item.name}
              />
            </g>
          ))}
        </svg>

        {hovered && <TreemapTooltip cell={hovered} />}
      </div>
    </WidgetFrame>
  );
}
