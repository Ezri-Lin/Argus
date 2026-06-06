import { useState } from "react";
import { color, fontFamily, radius } from "@/design/tokens";

export type EntityLogoSource = {
  name?: string;
  ticker?: string;
  symbol?: string;
  logoUrl?: string;
  logo_url?: string;
  logoKey?: string;
  logo_key?: string;
  logoAlt?: string;
  logo_alt?: string;
  logoText?: string;
  logo_text?: string;
  /** Explicit article/source URL — used to extract domain for favicon fallback. */
  sourceUrl?: string;
};

export type ResolvedEntityLogo = {
  url?: string;
  alt: string;
  text: string;
  key?: string;
};

function cleanText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function initialsFrom(value: string): string {
  const compact = value.trim().replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, " ");
  const parts = compact.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts.map((part) => part[0]).join("").slice(0, 4).toUpperCase();
  return compact.replace(/\s+/g, "").slice(0, 4).toUpperCase();
}

// ── Favicon fallback ──

const LOGO_DOMAINS: Record<string, string> = {
  // ── Watchlist tickers ──
  BILI: "bilibili.com", "0700": "tencent.com", TSLA: "tesla.com",
  MSFT: "microsoft.com", AAPL: "apple.com", NVDA: "nvidia.com",
  "9988": "alibaba.com", GOOG: "google.com", AMZN: "amazon.com",
  META: "meta.com", AMD: "amd.com", TSM: "tsmc.com",
  ASML: "asml.com", AVGO: "broadcom.com", INTC: "intel.com",
  // ── Watchlist logoKeys ──
  bilibili: "bilibili.com", tencent: "tencent.com", tesla: "tesla.com",
  microsoft: "microsoft.com", apple: "apple.com", nvidia: "nvidia.com",
  alibaba: "alibaba.com", google: "google.com", amazon: "amazon.com",
  // ── Treemap members (name → domain) ──
  Anthropic: "anthropic.com", OpenAI: "openai.com",
  "Meta AI": "meta.com", Cloudflare: "cloudflare.com",
  Arm: "arm.com", ASML: "asml.com", Broadcom: "broadcom.com",
  "Samsung HBM": "samsung.com", TSMC: "tsmc.com",
  Apple: "apple.com", NVIDIA: "nvidia.com",
  Gemini: "gemini.google.com", Copilot: "copilot.microsoft.com",
  DeepSeek: "deepseek.com", Qwen: "qwen.ai", Grok: "x.ai",
  Z: "z.com", BTC: "bitcoin.org", ETH: "ethereum.org",
  "S&P 500": "spx.com", "Nasdaq 100": "nasdaq.com",
  Gold: "gold.org",
  // ── Feed / news sources ──
  "Hacker News": "news.ycombinator.com", TechCrunch: "techcrunch.com",
  Reuters: "reuters.com", Bloomberg: "bloomberg.com",
  CNBC: "cnbc.com", "The Verge": "theverge.com",
  "Ars Technica": "arstechnica.com", "BBC News": "bbc.com",
  "Financial Times": "ft.com", "Wall Street Journal": "wsj.com",
  "Wall Street Journal": "wsj.com",
  CoinDesk: "coindesk.com", CoinTelegraph: "cointelegraph.com",
  "Nikkei Asia": "asia.nikkei.com", "Seeking Alpha": "seekingalpha.com",
  "The Information": "theinformation.com", "Semafor": "semafor.com",
};

function domainFromUrl(url: string): string | undefined {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return undefined; }
}

function faviconUrl(domain: string): string {
  return `https://icon.horse/icon/${encodeURIComponent(domain)}`;
}

function faviconFallback(entity: EntityLogoSource): string | undefined {
  // 1. Try extracting domain from sourceUrl (feed articles)
  const srcUrl = cleanText(entity.sourceUrl);
  if (srcUrl) {
    const d = domainFromUrl(srcUrl);
    if (d) return faviconUrl(d);
  }
  // 2. Try logoKey / ticker / name → known domain mapping
  const key = cleanText(entity.logoKey) ?? cleanText(entity.logo_key)
    ?? cleanText(entity.ticker) ?? cleanText(entity.symbol) ?? cleanText(entity.name);
  if (key) {
    const domain = LOGO_DOMAINS[key] ?? LOGO_DOMAINS[key.toUpperCase()];
    if (domain) return faviconUrl(domain);
  }
  return undefined;
}

export function resolveEntityLogo(entity: EntityLogoSource, fallback?: string): ResolvedEntityLogo {
  const name = cleanText(entity.name) ?? cleanText(entity.ticker) ?? cleanText(entity.symbol) ?? cleanText(fallback) ?? "ARG";
  const text =
    cleanText(entity.logoText) ??
    cleanText(entity.logo_text) ??
    cleanText(entity.ticker) ??
    cleanText(entity.symbol) ??
    initialsFrom(name);

  const explicitUrl = cleanText(entity.logoUrl) ?? cleanText(entity.logo_url);

  return {
    url: explicitUrl ?? faviconFallback(entity),
    key: cleanText(entity.logoKey) ?? cleanText(entity.logo_key),
    alt: cleanText(entity.logoAlt) ?? cleanText(entity.logo_alt) ?? `${name} logo`,
    text: initialsFrom(text),
  };
}

export function EntityLogo({
  entity,
  fallback,
  size = 24,
}: {
  entity: EntityLogoSource;
  fallback?: string;
  size?: number;
}) {
  const logo = resolveEntityLogo(entity, fallback);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logo.url && !failed);

  return (
    <span
      aria-label={logo.alt}
      title={logo.alt}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: Math.min(radius.inner, size * 0.32),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: showImage ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.07)",
        border: `1px solid ${color.hairline}`,
        color: color.textSecondary,
        fontFamily,
        fontSize: Math.max(8, size * 0.36),
        fontWeight: 760,
        lineHeight: 1,
      }}
    >
      {showImage ? (
        <img
          src={logo.url}
          alt=""
          decoding="async"
          onError={() => setFailed(true)}
          style={{ width: "78%", height: "78%", objectFit: "contain", display: "block" }}
        />
      ) : (
        logo.text
      )}
    </span>
  );
}
