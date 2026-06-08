/** API client for Argus backend. */

/// <reference types="vite/client" />

export type {
  ApiLogoFields,
  ApiTreemapData,
  ApiFeedItem,
  ApiResponse,
  HealthModule,
  HealthResponse,
  SettingsResponse,
  ModelItem,
  ModelsResponse,
  DomainItem,
  MemberItem,
  SourceItem,
  AiSearchResult,
  AiDatesResult,
  AiVideoResult,
  AiStatResult,
  MemberProgress,
  PipelineProgress,
  LibraryStream,
  LibraryFeed,
  LibraryDoc,
  SearchProvider,
  SearchLog,
  SearchStats,
  BudgetEntry,
  BudgetStatus,
  LastRunSummary,
  ProviderHealthItem,
} from "./api-types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

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

export async function createMember(member: { name: string; label_zh?: string; symbol?: string; aliases?: string[] }): Promise<{ id: number } | null> {
  return apiFetch("/members", jsonBody("POST", member));
}

// ── Widget config (widget_member_registry) ──

export interface WidgetMemberConfig {
  member_id: number;
  tier: "primary" | "secondary" | "ai_candidate";
  enabled: boolean;
  display_order?: number;
}

export async function saveWidgetConfig(widgetId: string, body: {
  group: string;
  members: WidgetMemberConfig[];
  primary_interval_minutes?: number;
  secondary_interval_minutes?: number;
}): Promise<{ ok: boolean; new_members: number } | null> {
  return apiFetch(`/widgets/${widgetId}/treemap-config`, jsonBody("PUT", body));
}

export async function fetchWidgetMembers(widgetId: string): Promise<Array<{
  widget_id: string;
  domain_key: string;
  member_id: number;
  tier: string;
  enabled: boolean;
  display_order: number | null;
  data_state: string;
}> | null> {
  return apiFetch(`/widgets/${widgetId}/members`);
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

// ── Budget & Pipeline Status (M3) ──

export async function fetchBudgetStatus(): Promise<BudgetStatus | null> {
  return apiFetch<BudgetStatus>("/budget-status");
}

export async function fetchLastRunSummary(): Promise<LastRunSummary | null> {
  return apiFetch<LastRunSummary>("/pipeline/last-run");
}

// ── Domain Presets ──

import type { DomainPreset } from "./domain-presets";

export async function applyDomainPreset(preset: DomainPreset): Promise<{
  domainKey: string;
  widgetMembers: WidgetMemberConfig[];
} | null> {
  try {
    await apiFetch("/domains", jsonBody("POST", {
      key: preset.domain.key,
      label_zh: preset.domain.label_zh,
      label_en: preset.domain.label_en,
      weight: preset.domain.weight,
      description: preset.domain.description ?? "",
      search_intent: preset.domain.search_intent ?? "",
      include_terms: preset.domain.include_terms ?? [],
      exclude_terms: preset.domain.exclude_terms ?? [],
    }));
    const widgetMembers: WidgetMemberConfig[] = [];
    for (const m of preset.members) {
      const res = await apiFetch<{ id: number }>("/members", jsonBody("POST", {
        name: m.name,
        label_zh: m.label_zh,
        symbol: m.symbol,
        aliases: m.aliases,
      }));
      if (res?.id) {
        widgetMembers.push({
          member_id: res.id,
          tier: m.tier ?? "secondary",
          enabled: true,
        });
      }
    }
    return { domainKey: preset.domain.key, widgetMembers };
  } catch {
    return null;
  }
}

export async function triggerDomainPipeline(domain: string): Promise<{ ok: boolean } | null> {
  return apiFetch("/pipeline/trigger-domain", jsonBody("POST", { domain }));
}
