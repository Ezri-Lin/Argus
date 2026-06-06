/** Hook to calculate widget freshness from health data. */

import { useMemo } from "react";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { t, type Lang } from "./i18n";
import type { Freshness } from "@/components/widget-frame";

function minutesSince(isoDate: string | null): number {
  if (!isoDate) return Infinity;
  try {
    return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60);
  } catch {
    return Infinity;
  }
}

function formatAge(isoDate: string | null, lang: Lang): string {
  if (!isoDate) return t("freshness.noData", lang);
  const mins = minutesSince(isoDate);
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
  const settings = useDashboardStore((s) => s.settings);
  const lang = (settings.language || "zh") as Lang;

  return useMemo(() => {
    if (!healthData?.modules) {
      return { freshness: "ok" as Freshness, staleAge: "" };
    }

    // Global health status (computed by backend from per-module states)
    const globalStatus = healthData.status;
    const pipeline = healthData.modules.pipeline;
    const lastOk = pipeline?.last_ok;

    // 1. Backend says failed → crack effect immediately
    if (globalStatus === "failed") {
      return { freshness: "failed" as Freshness, staleAge: formatAge(lastOk, lang) };
    }

    // 2. Backend says degraded → grayscale
    if (globalStatus === "degraded") {
      return { freshness: "degraded" as Freshness, staleAge: formatAge(lastOk, lang) };
    }

    // 3. Pipeline status is ok — check staleness against configured threshold
    const staleThresholdMin = parseInt(settings.stale_threshold_min || "90", 10);
    const ageMin = minutesSince(lastOk);

    if (ageMin > staleThresholdMin * 2) {
      return { freshness: "failed" as Freshness, staleAge: formatAge(lastOk, lang) };
    }
    if (ageMin > staleThresholdMin) {
      return { freshness: "degraded" as Freshness, staleAge: formatAge(lastOk, lang) };
    }

    return { freshness: "ok" as Freshness, staleAge: "" };
  }, [healthData, settings, lang]);
}
