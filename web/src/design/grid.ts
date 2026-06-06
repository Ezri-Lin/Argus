/**
 * react-grid-layout constants for Argus dashboard canvas.
 * SSOT — no magic numbers in components.
 */

/** Column count per breakpoint */
export const COLS = { lg: 12, md: 8, sm: 4 } as const;

/** Row height in px */
export const ROW_HEIGHT = 80;

/** Gap between widgets in px */
export const MARGIN: [number, number] = [14, 14];

/** Container padding in px */
export const CONTAINER_PADDING: [number, number] = [16, 16];

/** Breakpoint widths in px (descending) */
export const BREAKPOINTS = { lg: 1200, md: 800, sm: 0 } as const;

/** Default widget size presets (w × h in grid units, with min constraints) */
export const WIDGET_PRESETS: Record<string, { w: number; h: number; minW: number; minH: number }> = {
  treemap: { w: 4, h: 3, minW: 3, minH: 2 },
  feed: { w: 3, h: 3, minW: 2, minH: 2 },
  timeseries: { w: 3, h: 2, minW: 2, minH: 2 },
  embed: { w: 4, h: 3, minW: 3, minH: 2 },
  stat: { w: 2, h: 2, minW: 1, minH: 1 },
  clock: { w: 3, h: 2, minW: 2, minH: 2 },
  weather: { w: 2, h: 2, minW: 2, minH: 2 },
  countdown: { w: 2, h: 2, minW: 2, minH: 2 },
} as const;

/** react-grid-layout responsive props base config */
export const RGL_BASE = {
  cols: COLS,
  rowHeight: ROW_HEIGHT,
  margin: MARGIN,
  containerPadding: CONTAINER_PADDING,
  breakpoints: BREAKPOINTS,
  compactType: null,
  preventCollision: true,
  isDraggable: true,
  isResizable: true,
  resizeHandles: ["se", "e", "s"],
};
