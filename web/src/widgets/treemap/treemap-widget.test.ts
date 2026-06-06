import { describe, expect, it } from "vitest";
import { apiTreemapToGroups, treemapDisplayLabel } from "./treemap-widget";

describe("apiTreemapToGroups", () => {
  it("indexes API domains by stable domain key for fixed dashboard widgets", () => {
    const groups = apiTreemapToGroups({
      name: "watchlist",
      generated: "2026-06-06",
      children: [
        {
          name: "科技 Tech",
          key: "tech",
          weight: 1,
          children: [
            {
              name: "OpenAI",
              size: 75,
              sentiment: 0.4,
              headline: "New model",
              metric: "model",
              freshness: 0.9,
              confidence: "confirmed",
            },
          ],
        },
      ],
    });

    expect(groups.tech.title).toBe("科技 Tech");
    expect(groups.tech.items[0]).toMatchObject({
      name: "OpenAI",
      value: 75,
      heat: 0.9,
    });
  });
});

describe("treemapDisplayLabel", () => {
  it("uses the original member name when it fits", () => {
    expect(treemapDisplayLabel("Cloudflare", "full", 520)).toBe("Cloudflare");
    expect(treemapDisplayLabel("Anthropic", "medium", 260)).toBe("Anthropic");
  });

  it("falls back to compact ticker labels only when the original name does not fit", () => {
    expect(treemapDisplayLabel("Cloudflare", "name", 28)).toBe("NET");
    expect(treemapDisplayLabel("Microsoft", "name", 30)).toBe("MSFT");
  });
});
