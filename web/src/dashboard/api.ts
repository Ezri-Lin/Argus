/** API client for Argus backend. */

/// <reference types="vite/client" />

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

// ── Types ──

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
  age_min: number;
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
};

export type ModelsResponse = {
  models: ModelItem[];
  roles: Record<string, number>;
};

export type DomainItem = {
  key: string;
  label_zh: string;
  label_en: string;
  weight: number;
};

export type MemberItem = ApiLogoFields & {
  id: number;
  name: string;
  label_zh: string;
  label_en: string;
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

// ── Fetch helpers ──

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, init);
    if (!res.ok) {
      console.warn("[apiFetch] not ok:", url, res.status);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error("[apiFetch] error:", path, err);
    return null;
  }
}

function jsonBody(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ── Core endpoints ──

export const fetchData = () => apiFetch<ApiResponse>(`/data?_t=${Date.now()}`);
export const fetchLayout = () => apiFetch<unknown>("/layout");
export const fetchHealth = () => apiFetch<HealthResponse>("/health");
export const fetchSettings = () => apiFetch<SettingsResponse>("/settings");
export const fetchModels = () => apiFetch<ModelsResponse>("/models");
export const fetchDomains = () => apiFetch<DomainItem[]>("/domains");
export const fetchMembers = () => apiFetch<MemberItem[]>("/members");
export const fetchSources = () => apiFetch<SourceItem[]>("/sources");

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

export const fetchPipelineProgress = () => apiFetch<PipelineProgress>("/pipeline/progress");

export async function saveLayout(doc: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/layout`, jsonBody("PUT", doc));
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveSettings(settings: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/settings`, jsonBody("PUT", { settings }));
    return res.ok;
  } catch {
    return false;
  }
}

// ── Models CRUD ──

export async function createModel(model: { label: string; base_url: string; api_key: string; model: string }): Promise<{ id: number } | null> {
  return apiFetch("/models", jsonBody("POST", model));
}

export async function updateModels(updates: Array<{ id: number; [k: string]: unknown }>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/models`, jsonBody("PUT", updates));
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteModel(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/models/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function assignModelRole(role: string, modelId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/models/roles`, jsonBody("PUT", { role, model_id: modelId }));
    return res.ok;
  } catch {
    return false;
  }
}

export async function testModel(id: number): Promise<{ ok: boolean; response?: string; error?: string } | null> {
  return apiFetch(`/models/${id}/test`, { method: "POST" });
}

// ── Domains CRUD ──

export async function createDomain(domain: { key: string; label_zh: string; label_en: string; weight: number }): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/domains`, jsonBody("POST", domain));
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateDomain(key: string, patch: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/domains/${key}`, jsonBody("PUT", patch));
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteDomain(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/domains/${key}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Members CRUD ──

export async function createMember(member: { name: string; label_zh?: string; symbol?: string; aliases?: string[]; domains?: string[] }): Promise<{ id: number; baseline?: { baseline: number; confidence: number; rationale: string } } | null> {
  return apiFetch("/members", jsonBody("POST", member));
}

export async function rescoreMemberBaseline(id: number): Promise<{ ok: boolean; baseline?: { baseline: number; confidence: number; rationale: string; modelRole?: string } } | null> {
  return apiFetch(`/members/${id}/baseline`, { method: "POST" });
}

export async function updateMember(id: number, patch: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/members/${id}`, jsonBody("PUT", patch));
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteMember(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/members/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Sources CRUD ──

export async function createSource(source: { name: string; url: string; weight?: number }): Promise<{ id: number } | null> {
  return apiFetch("/sources", jsonBody("POST", source));
}

export async function updateSource(id: number, patch: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/sources/${id}`, jsonBody("PUT", patch));
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteSource(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/sources/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

// ── AI endpoints ──

export async function aiSearch(query: string, domain?: string): Promise<AiSearchResult | null> {
  return apiFetch("/ai/search", jsonBody("POST", { query, domain: domain || "" }));
}

export async function aiSuggestDates(keyword: string): Promise<AiDatesResult | null> {
  return apiFetch("/ai/suggest-dates", jsonBody("POST", { keyword }));
}

export async function aiParseVideo(url: string): Promise<AiVideoResult | null> {
  return apiFetch("/ai/parse-video", jsonBody("POST", { url }));
}

export async function aiStatApi(url: string, jsonPath: string): Promise<AiStatResult | null> {
  return apiFetch("/ai/stat-api", jsonBody("POST", { url, json_path: jsonPath }));
}

// ── Pipeline trigger ──

export async function triggerPipeline(): Promise<{ ok: boolean; message?: string; error?: string } | null> {
  return apiFetch("/pipeline/trigger", { method: "POST" });
}

// ── Sources Library ──

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

export async function fetchSourcesLibrary(): Promise<LibraryDoc | null> {
  return apiFetch("/sources-library");
}

export async function putSourcesLibrary(doc: LibraryDoc): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/sources-library`, jsonBody("PUT", doc));
    return res.ok;
  } catch {
    return false;
  }
}

export async function importSourcesLibrary(doc: LibraryDoc): Promise<{ ok: boolean; added_streams: number; added_feeds: number } | null> {
  return apiFetch("/sources-library/import", jsonBody("POST", doc));
}

// ── Search providers ──

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

export const fetchSearchProviders = () => apiFetch<SearchProvider[]>("/search/providers");

export async function updateSearchProvider(name: string, patch: Partial<SearchProvider>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/search/providers/${name}`, jsonBody("PUT", patch));
    return res.ok;
  } catch {
    return false;
  }
}

export const testSearchProvider = (name: string) =>
  apiFetch<{ ok: boolean; results_count: number; latency_ms: number; error?: string }>(
    `/search/providers/${name}/test`,
    { method: "POST" },
  );

export const fetchSearchLogs = (limit = 20, provider = "") =>
  apiFetch<{ logs: SearchLog[]; total: number }>(
    `/search/search-logs?limit=${limit}${provider ? `&provider=${provider}` : ""}`,
  );

export const fetchSearchStats = () => apiFetch<SearchStats>("/search/stats");
