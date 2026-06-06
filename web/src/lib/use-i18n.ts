import { useCallback } from "react";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { t, type Lang, type I18nKey } from "./i18n";

export function useI18n() {
  const lang = (useDashboardStore((s) => s.settings.language) || "zh") as Lang;
  const tt = useCallback((key: I18nKey) => t(key, lang), [lang]);
  return { lang, t: tt };
}
