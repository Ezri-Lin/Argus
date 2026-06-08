import { color, radius } from "@/design/tokens";
import {
  cellVisualStyle,
  sentimentStyle,
  glowFilter,
  cellTextTier,
} from "./treemap-style";
import { isLight } from "@/lib/treemap-style";
import { clamp, estEm } from "@/design/scale";
import type { PositionedCell } from "./treemap-layout";

const TICKERS: Record<string, string> = {
  NVIDIA: "NVDA",
  TSMC: "TSMC",
  OpenAI: "OAI",
  Microsoft: "MSFT",
  Apple: "AAPL",
  ASML: "ASML",
  Anthropic: "ANTH",
  Broadcom: "AVGO",
  "Samsung HBM": "005930",
  "Meta AI": "META",
  Arm: "ARM",
  Cloudflare: "NET",
  "S&P 500": "SPX",
  "Nasdaq 100": "NDX",
  Gold: "XAU",
  "US 10Y": "10Y",
  "USD Index": "DXY",
  "Oil WTI": "WTI",
  Copper: "HG",
  "China ADR": "ADR",
  "Taiwan Strait": "TW",
  "Red Sea": "RED",
  "EU AI Act": "EU AI",
  "Japan Rates": "JPY",
  "India Capex": "IND",
  "US-China Trade": "US-CN",
  "Middle East Energy": "MENA",
  "Korea Chips": "KR",
  "Mexico Nearshoring": "MX",
  "EU Industrial": "EU",
  "LATAM Lithium": "LITH",
  "ASEAN FX": "ASEAN",
};

function compactLabel(name: string): string {
  return TICKERS[name] ?? name.split(/\s+/).map((p) => p[0]).join("").slice(0, 5).toUpperCase();
}

export function treemapDisplayLabel(
  name: string,
  tier: "full" | "medium" | "name" | "none",
  maxW: number,
): string {
  if (tier === "none") return "";
  const minFont = tier === "full" ? 16 : tier === "medium" ? 13 : 9;
  const original = name.trim();
  const fontThatFits = (maxW / Math.max(1, estEm(original))) * 0.82;
  if (fontThatFits >= minFont) return original;
  return compactLabel(name);
}

export function fitTextSize(text: string, desired: number, maxW: number, min: number, max: number): number {
  const em = Math.max(1, estEm(text));
  return Math.max(min, Math.min(max, desired, (maxW / em) * 0.82));
}

function metricTag(
  metric: string,
  metricSize: number,
  cx: number,
  y: number,
  maxW: number,
  s: ReturnType<typeof sentimentStyle>,
) {
  const text = metric.toUpperCase();
  const minSize = 7;
  const pad = Math.max(6, metricSize * 0.75);
  const singleH = Math.max(14, metricSize * 1.4);
  const vPad = 3;

  // Shrink font to fit one line; only wrap as last resort
  let fs = metricSize;
  let textW = fs * estEm(text);
  while (textW + pad * 2 > maxW && fs > minSize) {
    fs -= 0.5;
    textW = fs * estEm(text);
  }
  const fitsOneLine = textW + pad * 2 <= maxW;

  const tagH = fitsOneLine ? singleH + vPad * 2 : singleH * 2 + vPad * 2 + 4;
  const tagW = fitsOneLine
    ? textW + pad * 2
    : Math.min(maxW, Math.max(...text.split(/\s+/).map(w => fs * estEm(w))) + pad * 2);

  // Center at cx
  const tagX = cx - tagW / 2;

  return (
    <foreignObject x={tagX} y={y} width={tagW} height={tagH}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isLight() ? "rgba(255,255,255,0.72)" : "rgba(7,8,9,0.36)",
          borderRadius: 999,
          padding: `${vPad}px ${pad}px`,
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontSize: fs,
            fontWeight: 700,
            color: s.text,
            fontFamily: "inherit",
            textAlign: "center",
            lineHeight: 1.15,
            whiteSpace: fitsOneLine ? "nowrap" : "normal",
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
        >
          {text}
        </span>
      </div>
    </foreignObject>
  );
}

export function TreemapCellSVG({
  cell,
  isHovered,
}: {
  cell: PositionedCell;
  isHovered: boolean;
}) {
  const s = cellVisualStyle(cell.item.sentiment, cell.item.freshness ?? cell.item.heat, cell.item.previousSentiment);
  const tier = cellTextTier(cell.w, cell.h);
  const isHydrating = cell.item.dataState === "hydrating";
  const tooltip = isHydrating
    ? `${cell.item.name} · 补充数据中...`
    : `${cell.item.name} · ${cell.item.metric} · value ${cell.item.value}`;
  const sideSafe = clamp(Math.min(cell.w, cell.h) * 0.1, cell.w < 40 ? 4 : 9, 16);
  const topSafe = clamp(Math.min(cell.w, cell.h) * 0.08, cell.h < 30 ? 4 : 8, 14);
  const labelMaxW = Math.max(18, cell.w - sideSafe * 2);
  const displayName = treemapDisplayLabel(cell.item.name, tier, labelMaxW);
  const nameSize = tier === "full"
    ? fitTextSize(displayName, Math.min(cell.w * 0.24, cell.h * 0.34), labelMaxW, 16, 44)
    : tier === "medium"
      ? fitTextSize(displayName, Math.min(cell.w * 0.22, cell.h * 0.36), labelMaxW, 13, 30)
      : fitTextSize(displayName, Math.min(cell.w * 0.24, cell.h * 0.55), labelMaxW, 9, 22);
  const metricSize = tier === "full"
    ? clamp(Math.min(cell.w * 0.065, cell.h * 0.16), 10, 16)
    : clamp(Math.min(cell.w * 0.055, cell.h * 0.15), 8, 12);
  const valueSize = clamp(Math.min(cell.w * 0.055, cell.h * 0.12), 9, 15);
  const singleTagH = Math.max(14, metricSize * 1.4);
  const metricPad = Math.max(6, metricSize * 0.75);
  const metricVPad = 3;
  // Text-based tag width: shrink font to fit one line if possible
  let tagFontSize = metricSize;
  let metricTextW = tagFontSize * estEm(cell.item.metric.toUpperCase());
  while (metricTextW + metricPad * 2 > labelMaxW && tagFontSize > 7) {
    tagFontSize -= 0.5;
    metricTextW = tagFontSize * estEm(cell.item.metric.toUpperCase());
  }
  const tagFitsOneLine = metricTextW + metricPad * 2 <= labelMaxW;
  const tagH = tagFitsOneLine ? singleTagH + metricVPad * 2 : singleTagH * 2 + metricVPad * 2 + 4;
  const centerX = cell.x + cell.w / 2;
  const valueText = `${cell.item.value}`;
  return (
    <>
      <rect
        x={cell.x}
        y={cell.y}
        width={cell.w}
        height={cell.h}
        rx={radius.inner}
        fill={isHovered ? s.fill.replace(/[\d.]+\)$/, (m) => `${Math.min(parseFloat(m) * 2.5, 0.45)})`) : s.fill}
        stroke={isHovered ? s.text : s.border}
        strokeWidth={isHovered ? 2.5 : 1.5}
        strokeDasharray={
          cell.item.dataState === "hydrating" ? "3 3" : cell.item.confidence === "watch" ? "5 4" : undefined
        }
        filter={glowFilter(cell.item.heat)}
        style={{ transition: "stroke-width 0.15s, fill 0.15s" }}
      >
        <title>{tooltip}</title>
      </rect>
      {/* Hydrating shimmer overlay */}
      {cell.item.dataState === "hydrating" && (
        <rect
          x={cell.x + 2}
          y={cell.y + 2}
          width={Math.max(0, cell.w - 4)}
          height={Math.max(0, cell.h - 4)}
          rx={radius.inner - 1}
          fill="url(#shimmer)"
          opacity={0.15}
          pointerEvents="none"
        />
      )}
      {tier !== "none" && (
        <>
          {/* Full: name + metric + value (large cells) */}
          {tier === "full" ? (
            (() => {
              const valueBaseline = cell.y + topSafe + valueSize;
              const gap = clamp(nameSize * 0.18, 7, 10);
              const groupH = nameSize * 0.78 + gap + tagH;
              const groupCenter = cell.y + cell.h * 0.50;
              const minTop = cell.y + topSafe + valueSize + 5;
              const maxTop = Math.max(minTop, cell.y + cell.h - topSafe - groupH);
              const groupTop = clamp(groupCenter - groupH / 2, minTop, maxTop);
              const nameBaseline = groupTop + nameSize * 0.78;
              const tagY = nameBaseline + gap;
              return (
                <>
                  <text
                    x={cell.x + cell.w - sideSafe}
                    y={valueBaseline}
                    textAnchor="end"
                    style={{ fontSize: valueSize, fill: color.textMuted, fontFamily: "inherit", fontWeight: 650 }}
                  >
                    {valueText}
                  </text>
                  <text
                    x={centerX}
                    y={nameBaseline}
                    textAnchor="middle"
                    style={{
                      fontSize: nameSize,
                      fontWeight: 820,
                      fill: color.textPrimary,
                      fontFamily: "inherit",
                      letterSpacing: 0,
                    }}
                  >
                    {displayName}
                  </text>
                  {metricTag(isHydrating ? "补充数据中" : cell.item.metric, metricSize, centerX, tagY, labelMaxW, s)}
                </>
              );
            })()
          ) : tier === "medium" ? (
            (() => {
              const gap = clamp(nameSize * 0.20, 6, 10);
              const groupH = nameSize * 0.78 + gap + tagH;
              const groupCenter = cell.y + cell.h * 0.48;
              const minTop = cell.y + topSafe;
              const maxTop = Math.max(minTop, cell.y + cell.h - topSafe - groupH);
              const groupTop = clamp(groupCenter - groupH / 2, minTop, maxTop);
              const nameBaseline = groupTop + nameSize * 0.78;
              const tagY = nameBaseline + gap;
              return (
                <>
                  <text
                    x={centerX}
                    y={nameBaseline}
                    textAnchor="middle"
                    style={{
                      fontSize: nameSize,
                      fontWeight: 800,
                      fill: color.textPrimary,
                      fontFamily: "inherit",
                      letterSpacing: 0,
                    }}
                  >
                    {displayName}
                  </text>
                  {metricTag(isHydrating ? "补充数据中" : cell.item.metric, metricSize, centerX, tagY, labelMaxW, s)}
                </>
              );
            })()
          ) : (
            /* Name only (small cells) */
            <text
              x={centerX}
              y={cell.y + cell.h / 2 + nameSize * 0.35}
              textAnchor="middle"
              style={{ fontSize: nameSize, fontWeight: 820, fill: color.textPrimary, fontFamily: "inherit", letterSpacing: 0 }}
            >
              <title>{tooltip}</title>
              {displayName}
            </text>
          )}
        </>
      )}
    </>
  );
}
