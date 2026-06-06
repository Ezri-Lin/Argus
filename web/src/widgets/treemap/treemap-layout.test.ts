import { describe, expect, it } from "vitest";
import { layoutTreemap } from "./treemap-layout";
import type { TreemapItem } from "@/dashboard/mock-data";

function item(name: string, value: number): TreemapItem {
  return {
    name,
    value,
    sentiment: 0,
    metric: "quiet",
    heat: 0,
    confidence: "confirmed",
  };
}

describe("layoutTreemap", () => {
  it("orders visible members by influence value descending before layout", () => {
    const cells = layoutTreemap(
      [item("Low", 10), item("High", 80), item("Middle", 40)],
      360,
      180,
    );

    expect(cells.map((cell) => cell.item.name)).toEqual(["High", "Middle", "Low"]);
  });

  it("keeps minimum-floor members visible and filters refuted items", () => {
    const cells = layoutTreemap(
      [
        item("Quiet", 10),
        { ...item("Refuted", 100), refuted: true },
        item("Active", 30),
      ],
      240,
      160,
    );

    expect(cells.map((cell) => cell.item.name)).toEqual(["Active", "Quiet"]);
    expect(cells.every((cell) => cell.w > 0 && cell.h > 0)).toBe(true);
  });
});
