/** Type definitions for the Argus dashboard API client. */

export type ApiLogoFields = {
  logoUrl?: string;
  logo_url?: string;
  logoKey?: string;
  logo_key?: string;
  logoText?: string;
  logo_text?: string;
  logoAlt?: string;
  logo_alt?: string;
};

export type ApiTreemapData = {
  name: string;
  generated: string;
  children: Array<{
    name: string;
    key?: string;
    size?: number;
    weight?: number;
    sentiment?: number;
    children: Array<ApiLogoFields & {
      name: string;
      size: number;
      sentiment: number;
      previousSentiment?: number;
      headline: string;
      metric: string;
      url?: string;
      heat?: number;
      freshness?: number;
      influence?: number;
      baselineInfluence?: number;
      impactWeight?: number;
      impactPersistenceDays?: number;
      confidence?: string;
      status?: string;
      related?: Array<{
        title: string;
        url?: string;
        outlet?: string;
        time?: string;
        importance?: number;
        impactWeight?: number;
        impactPersistenceDays?: number;
        kind?: string;
        note?: string;
      }>;
    }>;
  }>;
};

export type ApiFeedItem = ApiLogoFields & {
  id: number;
  title: string;
  url: string;
  time: string;
  source: string;
  outlet: string;
  sentiment: number;
  importance: number;
  summary: string;
  kind?: string;
  status?: string;
  first_seen?: string;
  last_seen?: string;
};

export type ApiResponse = {
  treemap: ApiTreemapData;
  feed: ApiFeedItem[];
  signals: unknown[];
};

export type HealthModule = {
  status: "ok" | "degraded" | "failed";
  last_ok: string | null;
  last_error: string | null;
  age_hours: number;
  consecutive_failures: number;
};

export type HealthResponse = {
  status: "ok" | "degraded" | "failed";
  modules: Record<string, HealthModule>;
  event_count: number;
  member_count: number;
  source_count: number;
  snapshot_generated: string | null;
};

export type SettingsResponse = Record<string, string>;

export type ModelItem = {
  id: number;
  label: string;
  base_url: string;
  model: string;
  web_search: number;
  has_api_key?: boolean;
  masked_api_key?: string;
};

export type ModelsResponse = {
  models: ModelItem[];
  roles: Record<string, number>;
};

export type DomainItem = {
  key: string;
  label: string;
  weight: number;
};

export type MemberItem = ApiLogoFields & {
  id: number;
  name: string;
  label: string;
  aliases: string[];
  symbol: string;
  domains: string[];
};

export type SourceItem = {
  id: number;
  name: string;
  type: string;
  url: string;
  weight: number;
};

export type AiSearchResult = {
  ok: boolean;
  summary?: string;
  events?: Array<{ title: string; sentiment: number; importance: number }>;
  sources?: Array<{ title: string; url: string; snippet: string }>;
  error?: string;
};

export type AiDatesResult = {
  ok: boolean;
  dates?: Array<{ date: string; label: string; confidence: string }>;
  error?: string;
};

export type AiVideoResult = {
  ok: boolean;
  sources?: Array<{ url: string; label: string; type: "hls" | "video" | "mp4" | "iframe" | "dash" }>;
  error?: string;
};

export type AiStatResult = {
  ok: boolean;
  value?: unknown;
  error?: string;
};

export type MemberProgress = {
  name: string;
  domain: string;
  status: "pending" | "running" | "done" | "failed";
  events: number;
  log: string;
};

export type PipelineProgress = {
  running: boolean;
  step: string;
  members_done: number;
  members_total: number;
  rss_sources_done: number;
  rss_sources_total: number;
  events_found: number;
  started_at: string;
  members: MemberProgress[];
};

export type LibraryStream = {
  id?: string;
  name: string;
  url: string;
  type?: string;
  domain?: string[];
};

export type LibraryFeed = {
  id?: string;
  name: string;
  url: string;
  domain?: string[];
};

export type LibraryDoc = {
  streams: LibraryStream[];
  feeds: LibraryFeed[];
};

export type SearchProvider = {
  name: string;
  profile: "discovery" | "deep" | "both";
  enabled: number;
  priority: number;
  daily_cap: number;
  timeout_sec: number;
  config_json: string;
  created_at: string;
  updated_at: string;
};

export type SearchLog = {
  id: number;
  ts: string;
  member_id: string | null;
  profile: string;
  provider: string;
  query: string;
  results_count: number;
  latency_ms: number;
  fallback_used: number;
  fallback_reason: string | null;
  trigger_reason: string;
  cost_estimate_usd: number;
};

export type SearchStats = {
  today: Array<{
    provider: string;
    calls: number;
    results: number;
    avg_latency: number;
    total_cost: number;
  }>;
};

// M3: Budget & Pipeline Status

export interface BudgetEntry {
  used: number;
  limit: number;
  remaining: number;
}

export interface BudgetStatus {
  daily_ai_calls: BudgetEntry;
  daily_llm_tokens: BudgetEntry;
  per_call_token_limit: BudgetEntry;
  daily_deep_search_calls: BudgetEntry;
  daily_tavily_budget_usd: BudgetEntry;
  max_base_articles_per_run: BudgetEntry;
  max_base_articles_per_member: BudgetEntry;
  max_digest_generation_per_run: BudgetEntry;
}

export interface LastRunSummary {
  status: string;
  module?: string;
  last_ok?: string;
  last_error?: string;
  updated_at?: string;
}

export interface ProviderHealthItem {
  provider: string;
  status: "healthy" | "unavailable" | "degraded" | "disabled" | "unknown";
  latency_ms?: number;
  error?: string;
}

export type NotificationItem = {
  id: number;
  type: "pipeline_ok" | "pipeline_failed" | "info";
  title: string;
  detail: string | null;
  created_at: string;
  read: number;
};

export type NotificationsResponse = {
  items: NotificationItem[];
  unread: number;
};
