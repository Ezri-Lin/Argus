import { areaFontSize } from "@/design/scale";
import { color } from "@/design/tokens";
import { sentimentStyle, isLight } from "@/lib/treemap-style";
export { areaFontSize };

function alphaColor(rgb: string, alpha: number): string {
  return `rgba(${rgb},${alpha.toFixed(2)})`;
}

export function cellVisualStyle(sentiment: number, freshness: number, previousSentiment?: number) {
  const fresh = Math.max(0, Math.min(1, freshness));
  if (fresh >= 0.8) return sentimentStyle(sentiment, previousSentiment);

  const lm = isLight();
  const m = lm ? 3 : 1;
  const borderAlpha = 0.46 + fresh * 0.42;
  if (sentiment > 0.15) {
    return {
      fill: alphaColor("63,185,80", Math.min(lm ? 0.50 : 0.175, (0.055 + fresh * 0.12) * m)),
      border: alphaColor("70,212,154", borderAlpha),
      text: alphaColor("70,212,154", 0.7 + fresh * 0.25),
    };
  }
  if (sentiment < -0.15) {
    return {
      fill: alphaColor("248,81,73", Math.min(lm ? 0.45 : 0.175, (0.055 + fresh * 0.12) * m)),
      border: alphaColor("255,107,107", borderAlpha),
      text: alphaColor("255,107,107", 0.7 + fresh * 0.25),
    };
  }
  // Neutral: use previous sentiment color if available, else faded blue
  if (previousSentiment != null && Math.abs(previousSentiment) > 0.15) {
    const prevAbs = Math.abs(previousSentiment);
    if (previousSentiment > 0.15) {
      return {
        fill: alphaColor("63,185,80", Math.min(lm ? 0.35 : 0.10, (0.04 + fresh * 0.06) * m)),
        border: alphaColor("70,212,154", 0.3 + fresh * 0.2),
        text: alphaColor("70,212,154", 0.5 + fresh * 0.2),
      };
    }
    return {
      fill: alphaColor("248,81,73", Math.min(lm ? 0.35 : 0.10, (0.04 + fresh * 0.06) * m)),
      border: alphaColor("255,107,107", 0.3 + fresh * 0.2),
      text: alphaColor("255,107,107", 0.5 + fresh * 0.2),
    };
  }
  // Default neutral: faded blue
  return {
    fill: alphaColor("100,140,200", lm ? 0.15 : 0.04 + fresh * 0.06),
    border: alphaColor("100,140,200", 0.3 + fresh * 0.25),
    text: alphaColor("100,140,200", 0.5 + fresh * 0.2),
  };
}

export function glowFilter(heat: number): string | undefined {
  if (heat <= 0.8) return undefined;
  const alpha = Math.min(0.34, (heat - 0.8) * 1.7);
  return `drop-shadow(0 0 10px rgba(${color.heatGlow},${alpha.toFixed(2)}))`;
}

export function cellBorder(confidence: "confirmed" | "watch", sentimentBorder: string): string {
  if (confidence === "watch") {
    return `1.5px dashed ${sentimentBorder}`;
  }
  return `1.5px solid ${sentimentBorder}`;
}

/**
 * Area-based text tier — tied to actual cell pixel dimensions.
 * Resize-safe: recalculation is driven by ResizeObserver, not fixed breakpoints.
 *
 *   area >= 4000  →  "full"   (name + metric + value)
 *   area >= 1200  →  "medium" (name + metric)
 *   area >= 200   →  "name"   (name only)
 *   else          →  "none"
 */
export function cellTextTier(w: number, h: number): "full" | "medium" | "name" | "none" {
  const area = w * h;
  if (area >= 4000 && w >= 60 && h >= 50) return "full";
  if (area >= 1200 && w >= 44 && h >= 32) return "medium";
  if (area >= 200 && w >= 24 && h >= 14) return "name";
  return "none";
}

export { sentimentStyle };
