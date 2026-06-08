import type { I18nKey } from "./i18n";

const CATEGORY_I18N: Record<string, I18nKey> = {
  Tech: "feed.category.tech",
  Markets: "feed.category.markets",
  Geo: "feed.category.geo",
  AI: "feed.category.ai",
};

/** Translate a signal category label. Returns the original if no key exists. */
export function getCategoryLabel(category: string, t: (key: I18nKey) => string): string {
  return CATEGORY_I18N[category] ? t(CATEGORY_I18N[category]) : category;
}
