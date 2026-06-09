import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { DashboardCanvas } from "@/components/dashboard-canvas";
import { TopBar } from "@/components/top-bar";
import { ConfigPanel } from "@/components/config-panel";
import { DetailPanel } from "@/components/detail-panel";
import { DetailOverlay } from "@/components/detail-overlay";
import { MinimizedBar } from "@/components/minimized-bar";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import type { DashboardWidget, WidgetType } from "@/dashboard/dashboard-types";

export default function App() {
  const [configTarget, setConfigTarget] = useState<DashboardWidget | null>(null);
  const [detailTarget, setDetailTarget] = useState<DashboardWidget | null>(null);
  const [creatingType, setCreatingType] = useState<WidgetType | null>(null);
  const [createDefaults, setCreateDefaults] = useState<Record<string, unknown>>({});
  const widgets = useDashboardStore((s) => s.doc.widgets);
  const selectedItem = useDashboardStore((s) => s.selectedItem);
  const selectItem = useDashboardStore((s) => s.selectItem);
  const refreshData = useDashboardStore((s) => s.refreshData);
  const refreshMin = useDashboardStore((s) => {
    const v = Number(s.settings.refresh_min);
    return Number.isFinite(v) && v > 0 ? Math.max(v, 0.5) : 30;
  });

  // Pipeline progress polling
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setPipelineProgress = useDashboardStore((s) => s.setPipelineProgress);

  const stopProgressPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startProgressPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const { fetchPipelineProgress } = await import("./dashboard/api");
        const progress = await fetchPipelineProgress();
        if (progress) {
          setPipelineProgress(progress);
          if (!progress.running) {
            stopProgressPolling();
            refreshData();
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
  }, [setPipelineProgress, refreshData, stopProgressPolling]);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  // Poll API for data on mount, then every refreshMin (pauses when tab hidden)
  useEffect(() => {
    refreshData().then(async () => {
      // Auto-start polling if pipeline is already running
      const progress = useDashboardStore.getState().pipelineProgress;
      if (progress?.running) {
        startProgressPolling();
        return;
      }
      // Auto-trigger pipeline if data is stale (degraded/failed) and last run was long ago
      const health = useDashboardStore.getState().healthData;
      if (health && health.status !== "ok") {
        const pipelineMod = health.modules?.pipeline;
        const lastOkAgeHours = pipelineMod?.age_hours ?? Infinity;
        if (lastOkAgeHours * 60 > refreshMin) {
          const { triggerPipeline } = await import("./dashboard/api");
          triggerPipeline().then(() => startProgressPolling()).catch(() => {});
        }
      }
    });
    const intervalMs = refreshMin * 60_000;
    const timer = setInterval(() => {
      if (!document.hidden) refreshData();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [refreshData, refreshMin, startProgressPolling]);

  // Refresh immediately when tab becomes visible
  useEffect(() => {
    const handler = () => { if (!document.hidden) refreshData(); };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refreshData]);

  const handleOpenConfig = (id: string) => {
    const widget = widgets.find((w) => w.id === id);
    if (widget) setConfigTarget(widget);
  };

  const handleOpenDetail = (id: string) => {
    const widget = widgets.find((w) => w.id === id);
    if (widget) setDetailTarget(widget);
  };

  const handleDetailRefresh = useCallback(async () => {
    const { triggerPipeline } = await import("./dashboard/api");
    triggerPipeline().then(() => startProgressPolling()).catch(() => {});
  }, [startProgressPolling]);

  const handleDeleteWidget = (id: string) => {
    useDashboardStore.getState().removeWidget(id);
  };

  const handleMinimizeWidget = (id: string) => {
    useDashboardStore.getState().minimizeWidget(id);
  };

  const handleRestoreWidget = (id: string) => {
    useDashboardStore.getState().restoreWidget(id);
  };

  const minimizedWidgets = useMemo(() => widgets.filter((w) => w.minimized), [widgets]);

  const handleStartCreate = useCallback((type: WidgetType, defaults: Record<string, unknown>) => {
    setCreatingType(type);
    setCreateDefaults(defaults);
  }, []);

  const handleCreated = useCallback((id: string) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-widget-id="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLElement).style.outline = "2px solid var(--accent-raw)";
        (el as HTMLElement).style.outlineOffset = "2px";
        setTimeout(() => {
          (el as HTMLElement).style.outline = "";
          (el as HTMLElement).style.outlineOffset = "";
        }, 1500);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <TopBar onStartCreate={handleStartCreate} />
      <MinimizedBar widgets={minimizedWidgets} onRestore={handleRestoreWidget} />
      <DashboardCanvas onConfigWidget={handleOpenConfig} onDetailWidget={handleOpenDetail} onDeleteWidget={handleDeleteWidget} onMinimizeWidget={handleMinimizeWidget} />
      {configTarget && (
        <ConfigPanel
          widget={configTarget}
          onPipelineTriggered={startProgressPolling}
          onClose={() => setConfigTarget(null)}
        />
      )}
      {creatingType && (
        <ConfigPanel
          createType={creatingType}
          createDefaults={createDefaults}
          onCreated={handleCreated}
          onClose={() => setCreatingType(null)}
        />
      )}
      <DetailPanel
        item={selectedItem}
        onClose={() => selectItem(null)}
      />
      {detailTarget && (
        <DetailOverlay
          widgetTitle={detailTarget.title}
          widgetType={detailTarget.type}
          onClose={() => { setDetailTarget(null); stopProgressPolling(); }}
          onRefresh={handleDetailRefresh}
        />
      )}
    </div>
  );
}
