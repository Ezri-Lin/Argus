import { beforeEach, describe, expect, it, vi } from "vitest";

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe("dashboard store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("persists title edits outside widget config", async () => {
    const { useDashboardStore } = await import("./dashboard-store");
    const widgetId = useDashboardStore.getState().doc.widgets[0].id;

    useDashboardStore.getState().updateWidgetConfig(widgetId, {
      _title: "Renamed Widget",
      group: "geo",
    });

    const widget = useDashboardStore.getState().doc.widgets.find((item) => item.id === widgetId);
    expect(widget?.title).toBe("Renamed Widget");
    expect(widget?.config.group).toBe("geo");
    expect(widget?.config._title).toBeUndefined();
  });
});
