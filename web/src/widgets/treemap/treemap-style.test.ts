import { describe, expect, it } from "vitest";
import { cellVisualStyle } from "./treemap-style";

describe("cellVisualStyle", () => {
  it("keeps stale positive members green but makes them quieter", () => {
    const fresh = cellVisualStyle(0.6, 1);
    const quiet = cellVisualStyle(0.6, 0);

    expect(quiet.border).toMatch(/^rgba\(70,212,154,/);
    expect(quiet.fill).toMatch(/^rgba\(63,185,80,/);
    expect(quiet.fill).not.toBe(fresh.fill);
  });

  it("keeps stale negative members red but makes them quieter", () => {
    const quiet = cellVisualStyle(-0.6, 0);

    expect(quiet.border).toMatch(/^rgba\(255,107,107,/);
    expect(quiet.fill).toMatch(/^rgba\(248,81,73,/);
  });
});
