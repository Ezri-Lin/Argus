import type { DashboardDoc } from "./dashboard-types";
import { defaultDashboard } from "./default-dashboard";

export const STORAGE_KEY = "argus.dashboard.v1";
export const READ_KEY = "argus.read_items";

// ── Read-state (localStorage, max 500) ──

function _loadReadSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function markRead(key: string): void {
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

export function loadFromLocalStorage(): DashboardDoc | null {
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

export function saveToLocalStorage(doc: DashboardDoc): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // quota exceeded
  }
}

// Write-through: save to both localStorage and API
export function persistDashboard(doc: DashboardDoc): void {
  saveToLocalStorage(doc);
  import("./api").then(({ saveLayout }) => saveLayout(doc)).catch(() => {});
}
