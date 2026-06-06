import { describe, expect, it } from "vitest";
import { sentimentStyle } from "./treemap-style";
import { color } from "@/design/tokens";

describe("sentimentStyle", () => {
  it("maps positive sentiment to green fill and sentiment border", () => {
    const s = sentimentStyle(0.4);
    expect(s.border).toBe(color.treemapPosBorder);
    expect(s.text).toBe(color.treemapPosBorder);
    expect(s.fill).toMatch(/^rgba\(63,185,80,/);
  });

  it("maps negative sentiment to red fill and sentiment border", () => {
    const s = sentimentStyle(-0.4);
    expect(s.border).toBe(color.treemapNegBorder);
    expect(s.text).toBe(color.treemapNegBorder);
    expect(s.fill).toMatch(/^rgba\(248,81,73,/);
  });

  it("maps neutral sentiment to neutral fill and border", () => {
    const s = sentimentStyle(0.05);
    expect(s).toEqual({
      fill: "rgba(255,255,255,0.05)",
      border: color.treemapNeuBorder,
      text: color.treemapNeuBorder,
    });
  });
});
