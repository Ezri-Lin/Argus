import { color } from "@/design/tokens";

export type SentimentStyle = {
  fill: string;
  border: string;
  text: string;
};

/** Returns true if the current theme is light. */
export function isLight(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-theme") === "light";
}

/**
 * Sentiment → visual encoding.
 * INV-T1: border color carries sentiment. Fill is intentionally low saturation
 * so the colored outline stays readable without turning the wall into confetti.
 *
 * Light mode needs ~3x higher fill alpha since white backgrounds absorb color.
 */
export function sentimentStyle(sentiment: number, previousSentiment?: number): SentimentStyle {
  const abs = Math.abs(sentiment);
  const lm = isLight();
  const m = lm ? 3 : 1; // light mode multiplier for fill alpha

  if (sentiment > 0.15) {
    const opacity = Math.min(lm ? 0.55 : 0.24, (0.08 + abs * 0.18) * m);
    return {
      fill: `rgba(63,185,80,${opacity.toFixed(2)})`,
      border: color.treemapPosBorder,
      text: color.treemapPosBorder,
    };
  }

  if (sentiment < -0.15) {
    const opacity = Math.min(lm ? 0.50 : 0.24, (0.08 + abs * 0.18) * m);
    return {
      fill: `rgba(248,81,73,${opacity.toFixed(2)})`,
      border: color.treemapNegBorder,
      text: color.treemapNegBorder,
    };
  }

  // Neutral: use previous sentiment color if available, else faded blue
  if (previousSentiment != null && Math.abs(previousSentiment) > 0.15) {
    const prevAbs = Math.abs(previousSentiment);
    const opacity = Math.min(lm ? 0.40 : 0.16, (0.05 + prevAbs * 0.12) * m);
    if (previousSentiment > 0.15) {
      return {
        fill: `rgba(63,185,80,${opacity.toFixed(2)})`,
        border: `rgba(70,212,154,${(0.3 + prevAbs * 0.2).toFixed(2)})`,
        text: `rgba(70,212,154,${(0.5 + prevAbs * 0.2).toFixed(2)})`,
      };
    }
    return {
      fill: `rgba(248,81,73,${opacity.toFixed(2)})`,
      border: `rgba(255,107,107,${(0.3 + prevAbs * 0.2).toFixed(2)})`,
      text: `rgba(255,107,107,${(0.5 + prevAbs * 0.2).toFixed(2)})`,
    };
  }

  // Default neutral: faded blue
  const neutralAlpha = lm ? 0.18 : 0.06;
  return {
    fill: `rgba(100,140,200,${neutralAlpha.toFixed(2)})`,
    border: "rgba(100,140,200,0.35)",
    text: "rgba(100,140,200,0.6)",
  };
}
