import { useCallback } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";

import { useDashboardStore } from "@/dashboard/dashboard-store";
import { COLS, ROW_HEIGHT, MARGIN, CONTAINER_PADDING, BREAKPOINTS } from "@/design/grid";
import { WidgetSlot } from "@/dashboard/widget-registry";
import type { LayoutItem } from "@/dashboard/dashboard-types";

export function DashboardCanvas({ onConfigWidget, onDetailWidget, onDeleteWidget, onMinimizeWidget }: {
  onConfigWidget?: (id: string) => void;
  onDetailWidget?: (id: string) => void;
  onDeleteWidget?: (id: string) => void;
  onMinimizeWidget?: (id: string) => void;
}) {
  const { width, containerRef, mounted } = useContainerWidth();
  const doc = useDashboardStore((s) => s.doc);
  const setLayout = useDashboardStore((s) => s.setLayout);
  const editMode = useDashboardStore((s) => s.editMode);

  // Filter out minimized widgets from the grid
  const visibleWidgets = doc.widgets.filter((w) => !w.minimized);

  const handleLayoutChange = useCallback(
    (_current: unknown, all: Record<string, unknown>) => {
      if (!editMode) return;
      for (const [bp, items] of Object.entries(all)) {
        if (Array.isArray(items)) {
          setLayout(bp, items as LayoutItem[]);
        }
      }
    },
    [setLayout, editMode],
  );

  return (
    <div ref={containerRef} className="flex-1 px-4 pb-4">
      {mounted && (
        <ResponsiveGridLayout
          width={width}
          className="min-h-[calc(100vh-80px)]"
          breakpoints={BREAKPOINTS as Record<string, number>}
          cols={COLS as Record<string, number>}
          layouts={doc.layout as never}
          rowHeight={ROW_HEIGHT}
          margin={MARGIN}
          containerPadding={CONTAINER_PADDING}
          dragConfig={{ enabled: editMode, threshold: 2, handle: ".drag-handle" }}
          resizeConfig={{ enabled: editMode, handles: ["nw", "ne", "sw", "se", "n", "e", "s", "w"] }}
          onLayoutChange={handleLayoutChange as never}
        >
          {visibleWidgets.map((widget) => (
            <div key={widget.id} data-widget-id={widget.id} className="group/widget">
              <WidgetSlot
                widget={widget}
                onConfig={onConfigWidget ? () => onConfigWidget(widget.id) : undefined}
                onDetail={onDetailWidget ? () => onDetailWidget(widget.id) : undefined}
                onDelete={onDeleteWidget ? () => onDeleteWidget(widget.id) : undefined}
                onMinimize={onMinimizeWidget ? () => onMinimizeWidget(widget.id) : undefined}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
