/** Hook to calculate widget freshness from health data. */

import { useMemo } from "react";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { t, type Lang } from "./i18n";
import type { Freshness } from "@/components/widget-frame";

function formatAge(isoDate: string | null, lang: Lang): string {
  if (!isoDate) return t("freshness.noData", lang);
  const mins = (Date.now() - new Date(isoDate).getTime()) / (1000 * 60);
  if (lang === "zh") {
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${Math.round(mins)}分钟前`;
    if (mins < 1440) return `${Math.round(mins / 60)}小时前`;
    return `${Math.round(mins / 1440)}天前`;
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export function useFreshness(): {
  freshness: Freshness;
  staleAge: string;
} {
  const healthData = useDashboardStore((s) => s.healthData);
  const pipelineProgress = useDashboardStore((s) => s.pipelineProgress);
  const settings = useDashboardStore((s) => s.settings);
  const lang = (settings.language || "zh") as Lang;

  return useMemo(() => {
    if (!healthData?.modules) {
      return { freshness: "ok" as Freshness, staleAge: "" };
    }

    // Pipeline is running — always show ok, don't degrade mid-update
    if (pipelineProgress?.running) {
      return {
        freshness: "ok" as Freshness,
        staleAge: t("freshness.updating", lang) || "更新中...",
      };
    }

    // Trust the backend's global status (computed from consecutive_failures + time fallback)
    const globalStatus = healthData.status;
    const pipeline = healthData.modules.pipeline;
    const lastOk = pipeline?.last_ok;

    if (globalStatus === "failed") {
      return { freshness: "failed" as Freshness, staleAge: formatAge(lastOk, lang) };
    }
    if (globalStatus === "degraded") {
      const failures = pipeline?.consecutive_failures ?? 0;
      const label = failures > 0
        ? `${t("freshness.failures", lang) || "连续失败"} ${failures}`
        : formatAge(lastOk, lang);
      return { freshness: "degraded" as Freshness, staleAge: label };
    }

    return { freshness: "ok" as Freshness, staleAge: "" };
  }, [healthData, pipelineProgress, settings, lang]);
}
