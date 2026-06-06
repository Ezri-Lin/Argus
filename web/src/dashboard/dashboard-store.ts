import { create } from "zustand";
import type { DashboardDoc, DashboardWidget, LayoutItem, WidgetType } from "./dashboard-types";
import type { TreemapItem, SignalItem, FeedItem, WatchlistItem } from "./mock-data";
import { defaultDashboard } from "./default-dashboard";
import { WIDGET_PRESETS, COLS } from "@/design/grid";
import type { ApiResponse, HealthResponse, PipelineProgress } from "./api";

export type SelectedItem = {
  type: "treemap" | "feed" | "signal" | "watchlist" | "stat";
  data: TreemapItem | SignalItem | FeedItem | WatchlistItem | Record<string, unknown>;
  source?: string;
  width?: number;
};

const STORAGE_KEY = "argus.dashboard.v1";
const READ_KEY = "argus.read_items";

// ── Read-state (localStorage, max 500) ──

function _loadReadSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markRead(key: string): void {
  const set = _loadReadSet();
  if (set.has(key)) return;
  set.add(key);
  // Evict oldest if over limit
  if (set.size > 500) {
    const arr = [...set];
    arr.splice(0, arr.length - 500);
    localStorage.setItem(READ_KEY, JSON.stringify(arr));
  } else {
    localStorage.setItem(READ_KEY, JSON.stringify([...set]));
  }
}

export function isItemRead(key: string): boolean {
  return _loadReadSet().has(key);
}

export function readKeyFor(item: { url?: string; title?: string }): string {
  return item.url || item.title || "";
}

function loadFromLocalStorage(): DashboardDoc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardDoc;
      if (parsed.widgets?.length && parsed.layout?.lg?.length) {
        if (!parsed.layout.sm?.length) {
          parsed.layout.sm = defaultDashboard.layout.sm;
        }
        return parsed;
      }
    }
  } catch {
    // corrupted storage
  }
  return null;
}

function saveToLocalStorage(doc: DashboardDoc): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // quota exceeded
  }
}

// Write-through: save to both localStorage and API
function persistDashboard(doc: DashboardDoc): void {
  saveToLocalStorage(doc);
  import("./api").then(({ saveLayout }) => saveLayout(doc)).catch(() => {});
}

type DashboardState = {
  doc: DashboardDoc;
  setLayout: (breakpoint: string, layout: LayoutItem[]) => void;
  addWidget: (type: WidgetType, title: string, config?: Record<string, unknown>) => void;
  removeWidget: (id: string) => void;
  updateWidgetConfig: (id: string, configPatch: Record<string, unknown>) => void;
  minimizeWidget: (id: string) => void;
  restoreWidget: (id: string) => void;
  autoLayout: () => void;
  resetDashboard: () => void;
  selectedItem: SelectedItem | null;
  selectItem: (item: SelectedItem | null) => void;
  apiData: ApiResponse | null;
  healthData: HealthResponse | null;
  settings: Record<string, string>;
  refreshData: () => Promise<void>;
  pipelineProgress: PipelineProgress | null;
  setPipelineProgress: (p: PipelineProgress | null) => void;
  editMode: boolean;
  toggleEditMode: () => void;
};

let idCounter = Date.now();
function nextId(type: string): string {
  return `${type}-${++idCounter}`;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  doc: loadFromLocalStorage() ?? defaultDashboard,

  setLayout: (breakpoint, layout) => {
    const doc = { ...get().doc, layout: { ...get().doc.layout, [breakpoint]: layout } };
    persistDashboard(doc);
    set({ doc });
  },

  addWidget: (type, title, config = {}) => {
    const id = nextId(type);
    const preset = WIDGET_PRESETS[type] ?? { w: 3, h: 2 };
    const widget: DashboardWidget = {
      id,
      type,
      title,
      status: "ok",
      updatedAt: "now",
      config,
    };

    const lg = [...get().doc.layout.lg];
    let x = 0;
    let y = 0;
    outer: for (let row = 0; row < 100; row++) {
      for (let col = 0; col <= 12 - preset.w; col++) {
        const overlaps = lg.some(
          (l) =>
            col < l.x + l.w &&
            col + preset.w > l.x &&
            row < l.y + l.h &&
            row + preset.h > l.y,
        );
        if (!overlaps) {
          x = col;
          y = row;
          break outer;
        }
      }
    }

    const newLayout: LayoutItem = { i: id, x, y, w: preset.w, h: preset.h, minW: preset.minW, minH: preset.minH };
    const doc: DashboardDoc = {
      widgets: [...get().doc.widgets, widget],
      layout: {
        lg: [...lg, newLayout],
        md: [...get().doc.layout.md, newLayout],
        sm: [...get().doc.layout.sm, { ...newLayout, x: 0, w: 4 }],
      },
    };
    persistDashboard(doc);
    set({ doc });
  },

  removeWidget: (id) => {
    const doc: DashboardDoc = {
      widgets: get().doc.widgets.filter((w) => w.id !== id),
      layout: {
        lg: get().doc.layout.lg.filter((l) => l.i !== id),
        md: get().doc.layout.md.filter((l) => l.i !== id),
        sm: get().doc.layout.sm.filter((l) => l.i !== id),
      },
    };
    persistDashboard(doc);
    set({ doc });
  },

  updateWidgetConfig: (id, configPatch) => {
    const { _title, ...configOnly } = configPatch;
    const widgets = get().doc.widgets.map((w) =>
      w.id === id
        ? {
            ...w,
            title: typeof _title === "string" ? _title : w.title,
            config: { ...w.config, ...configOnly },
          }
        : w,
    );
    const doc = { ...get().doc, widgets };
    persistDashboard(doc);
    set({ doc });
  },

  minimizeWidget: (id) => {
    const widgets = get().doc.widgets.map((w) =>
      w.id === id ? { ...w, minimized: true } : w,
    );
    // Remove from all layouts
    const doc: DashboardDoc = {
      widgets,
      layout: {
        lg: get().doc.layout.lg.filter((l) => l.i !== id),
        md: get().doc.layout.md.filter((l) => l.i !== id),
        sm: get().doc.layout.sm.filter((l) => l.i !== id),
      },
    };
    persistDashboard(doc);
    set({ doc });
  },

  restoreWidget: (id) => {
    const widgets = get().doc.widgets.map((w) =>
      w.id === id ? { ...w, minimized: false } : w,
    );
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;
    const preset = WIDGET_PRESETS[widget.type] ?? { w: 3, h: 2 };

    // Find first open position
    const lg = [...get().doc.layout.lg];
    let x = 0, y = 0;
    outer: for (let row = 0; row < 200; row++) {
      for (let col = 0; col <= COLS.lg - preset.w; col++) {
        const overlaps = lg.some((l) => col < l.x + l.w && col + preset.w > l.x && row < l.y + l.h && row + preset.h > l.y);
        if (!overlaps) { x = col; y = row; break outer; }
      }
    }

    const newLayout: LayoutItem = { i: id, x, y, w: preset.w, h: preset.h, minW: preset.minW, minH: preset.minH };
    const doc: DashboardDoc = {
      widgets,
      layout: {
        lg: [...lg, newLayout],
        md: [...get().doc.layout.md, newLayout],
        sm: [...get().doc.layout.sm, { ...newLayout, x: 0, w: 4 }],
      },
    };
    persistDashboard(doc);
    set({ doc });
  },

  autoLayout: () => {
    const { doc } = get();
    const cols = COLS.lg;

    // Get visible widgets with their current layout
    const visibleIds = doc.widgets.filter((w) => !w.minimized).map((w) => w.id);
    const currentLayouts = doc.layout.lg.filter((l) => visibleIds.includes(l.i));

    // Sort: by y first, then x
    const sorted = [...currentLayouts].sort((a, b) => a.y - b.y || a.x - b.x);

    // Greedy row-packing with micro-adjustment
    const newLg: LayoutItem[] = [];
    let curX = 0;
    let curY = 0;
    let rowMaxH = 0;

    for (const item of sorted) {
      let w = item.w;

      // If this widget doesn't fit in current row, try to stretch previous widgets to fill
      if (curX + w > cols && curX > 0) {
        // Fill remaining space in current row by stretching the last widget
        const remainder = cols - curX;
        if (remainder > 0 && newLg.length > 0) {
          // Find widgets on this row and distribute extra space
          const rowStart = newLg.findIndex((l) => l.y === curY);
          if (rowStart >= 0) {
            const rowItems = newLg.slice(rowStart);
            // Stretch the widest widget by remainder (micro-adjustment, max +2)
            const stretch = Math.min(remainder, 2);
            rowItems[rowItems.length - 1].w += stretch;
          }
        }
        curX = 0;
        curY += rowMaxH;
        rowMaxH = 0;
      }

      // Micro-adjust: if widget almost fills the row (within 1-2 cols), stretch it
      if (curX + w < cols && curX + w >= cols - 2) {
        w = cols - curX;
      }

      newLg.push({ ...item, x: curX, y: curY, w });
      curX += w;
      rowMaxH = Math.max(rowMaxH, item.h);
    }

    // Generate md and sm from lg
    const newMd = newLg.map((l) => {
      const scale = COLS.md / COLS.lg;
      return { ...l, x: Math.round(l.x * scale), w: Math.min(l.w, COLS.md) };
    });
    const newSm = newLg.map((l) => ({ ...l, x: 0, w: COLS.sm }));

    const newDoc: DashboardDoc = {
      ...doc,
      layout: { lg: newLg, md: newMd, sm: newSm },
    };
    persistDashboard(newDoc);
    set({ doc: newDoc });
  },

  resetDashboard: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ doc: defaultDashboard });
  },

  selectedItem: null,
  selectItem: (item) => {
    // Mark feed/signal items as read on click
    if (item && (item.type === "feed" || item.type === "signal")) {
      const key = readKeyFor(item.data as Record<string, unknown>);
      if (key) markRead(key);
    }
    set({ selectedItem: item });
  },

  apiData: null,
  healthData: null,
  settings: {},
  pipelineProgress: null,
  refreshData: async () => {
    try {
      const { fetchData, fetchHealth, fetchSettings, fetchPipelineProgress } = await import("./api");
      const [data, health, settings, progress] = await Promise.all([fetchData(), fetchHealth(), fetchSettings(), fetchPipelineProgress()]);
      console.log("[refreshData] data:", data ? "OK" : "NULL", "feed:", data?.feed?.length, "treemap groups:", data?.treemap?.children?.length);
      if (data) {
        set({ apiData: data });
      }
      if (health) set({ healthData: health });
      if (settings) set({ settings });
      if (progress) set({ pipelineProgress: progress });
    } catch (err) {
      console.error("[refreshData] FAILED:", err);
    }
  },
  setPipelineProgress: (p) => set({ pipelineProgress: p }),
  editMode: false,
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
}));

// Load layout from API on init (one-shot)
setTimeout(() => {
  import("./api").then(({ fetchLayout }) => fetchLayout()).then((apiDoc) => {
    if (apiDoc && typeof apiDoc === "object" && "widgets" in apiDoc) {
      const doc = apiDoc as DashboardDoc;
      if (doc.widgets?.length && doc.layout?.lg?.length) {
        if (!doc.layout.sm?.length) {
          doc.layout.sm = defaultDashboard.layout.sm;
        }
        saveToLocalStorage(doc);
        useDashboardStore.setState({ doc });
      }
    }
  }).catch(() => {});
}, 0);
