import type { I18nKey } from "./i18n";

export type NewsKindCode = "official" | "secondary" | "speculative" | "unknown";

const KIND_ALIASES: Record<string, NewsKindCode> = {
  "官方一手": "official",
  official: "official",

  "转载": "secondary",
  repost: "secondary",
  secondary: "secondary",
  coverage: "secondary",

  "预告吹水": "speculative",
  hype: "speculative",
  rumor: "speculative",
  speculative: "speculative",
};

/** Normalize legacy Chinese kind values and English aliases to canonical enum. */
export function normalizeKind(kind?: string): NewsKindCode {
  if (!kind) return "unknown";
  return KIND_ALIASES[kind] ?? "unknown";
}

/** Translate a kind label for display. */
export function getKindLabel(kind: string | undefined, t: (key: I18nKey) => string): string {
  const code = normalizeKind(kind);
  return t(`news.kind.${code}` as I18nKey);
}
