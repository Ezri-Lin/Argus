import { useState, useEffect } from "react";
import { color, radius } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";
import {
  fetchSearchProviders, updateSearchProvider, testSearchProvider, fetchSearchLogs,
  type SearchProvider as SearchProviderType, type SearchLog,
} from "@/dashboard/api";
import { SectionLabel, inputStyle } from "./settings-ui";

export function SearchTab({ settings, markChanged }: {
  settings: Record<string, string>;
  markChanged: (k: string, v: string) => void;
}) {
  const { t } = useI18n();
  const [providers, setProviders] = useState<SearchProviderType[]>([]);
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [searchMode, setSearchMode] = useState<"auto" | "fallback" | "fixed">("auto");

  const loadProviders = () => fetchSearchProviders().then((p) => { if (p) setProviders(p); });
  const loadLogs = () => fetchSearchLogs(20).then((r) => { if (r) setLogs(r.logs); });

  useEffect(() => { loadProviders(); loadLogs(); }, []);

  useEffect(() => {
    const mode = settings["search.mode"];
    if (mode === "auto" || mode === "fallback" || mode === "fixed") {
      setSearchMode(mode);
    }
  }, [settings]);

  const handleSearchModeChange = (mode: "auto" | "fallback" | "fixed") => {
    setSearchMode(mode);
    markChanged("search.mode", mode);
  };

  const handleToggle = async (name: string, current: number) => {
    await updateSearchProvider(name, { enabled: current ? 0 : 1 });
    loadProviders();
  };

  const handleFieldChange = async (name: string, field: string, value: number) => {
    await updateSearchProvider(name, { [field]: value });
    loadProviders();
  };

  const handleTest = async (name: string) => {
    setTesting(name);
    setTestResult((r) => ({ ...r, [name]: { ok: false, msg: t("search.testing") } }));
    const res = await testSearchProvider(name);
    setTesting(null);
    if (res) {
      setTestResult((r) => ({
        ...r,
        [name]: { ok: res.ok, msg: res.ok ? `${t("search.testOk")} (${res.latency_ms}ms)` : (res.error || t("search.testFail")) },
      }));
    } else {
      setTestResult((r) => ({ ...r, [name]: { ok: false, msg: t("search.testFail") } }));
    }
  };

  // Group providers by profile
  const discoveryProviders = providers.filter((p) => p.profile === "discovery" || p.profile === "both");
  const deepProviders = providers.filter((p) => p.profile === "deep" || p.profile === "both");

  const profileBadge = (profile: string) => {
    const colors: Record<string, string> = { discovery: "#3b82f6", deep: "#f59e0b", both: "#8b5cf6" };
    return (
      <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 999, background: colors[profile] || color.textMuted, color: "#fff", marginLeft: 6, verticalAlign: "middle" }}>
        {profile}
      </span>
    );
  };

  const renderProviderCard = (p: SearchProviderType) => (
    <div key={p.name} style={{ padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: color.textPrimary, textTransform: "capitalize" }}>
          {p.name}{profileBadge(p.profile)}
        </span>
        <button
          onClick={() => handleToggle(p.name, p.enabled)}
          style={{
            padding: "3px 10px", fontSize: 11, fontWeight: 500, borderRadius: 999,
            border: `1px solid ${p.enabled ? color.accent : color.hairline}`,
            background: p.enabled ? color.accentSoft : "transparent",
            color: p.enabled ? color.accent : color.textMuted,
            cursor: "pointer",
          }}
        >
          {p.enabled ? t("search.enabled") : t("settings.search.off")}
        </button>
      </div>
      <div className="flex items-center gap-3" style={{ fontSize: 11, color: color.textSecondary }}>
        <label className="flex items-center gap-1">
          {t("search.priority")}
          <input type="number" value={p.priority} onChange={(e) => handleFieldChange(p.name, "priority", parseInt(e.target.value) || 99)} style={{ ...inputStyle, width: 50, padding: "2px 6px", fontSize: 11 }} />
        </label>
        <label className="flex items-center gap-1">
          {t("search.dailyCap")}
          <input type="number" value={p.daily_cap} onChange={(e) => handleFieldChange(p.name, "daily_cap", parseInt(e.target.value) || 100)} style={{ ...inputStyle, width: 60, padding: "2px 6px", fontSize: 11 }} />
        </label>
        <label className="flex items-center gap-1">
          {t("search.timeout")}
          <input type="number" value={p.timeout_sec} onChange={(e) => handleFieldChange(p.name, "timeout_sec", parseInt(e.target.value) || 8)} style={{ ...inputStyle, width: 50, padding: "2px 6px", fontSize: 11 }} />
        </label>
        <button
          onClick={() => handleTest(p.name)}
          disabled={testing === p.name}
          style={{ padding: "2px 8px", fontSize: 11, borderRadius: radius.inner, border: `1px solid ${color.hairline}`, background: "transparent", color: color.textSecondary, cursor: "pointer" }}
        >
          {testing === p.name ? t("search.testing") : t("search.test")}
        </button>
      </div>
      {testResult[p.name] && (
        <div style={{ fontSize: 10, color: testResult[p.name].ok ? "#4ade80" : "#f87171", marginTop: 4 }}>
          {testResult[p.name].msg}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Search mode */}
      <section style={{ marginBottom: 4 }}>
        <SectionLabel>{t("settings.search.mode")}</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          {(["auto", "fallback", "fixed"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleSearchModeChange(mode)}
              style={{
                padding: "6px 16px",
                borderRadius: radius.inner,
                border: searchMode === mode ? `2px solid ${color.accent}` : `1px solid ${color.hairline}`,
                background: searchMode === mode ? color.accentSoft : "transparent",
                color: searchMode === mode ? color.accent : color.textMuted,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: searchMode === mode ? 600 : 400,
              }}
            >
              {mode === "auto" ? t("settings.search.auto") : mode === "fallback" ? t("settings.search.fallback") : t("settings.search.fixed")}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: color.textMuted, margin: 0 }}>
          {searchMode === "auto"
            ? t("settings.search.modeAutoDesc")
            : searchMode === "fallback"
            ? t("settings.search.modeFallbackDesc")
            : t("settings.search.modeFixedDesc")}
        </p>
      </section>

      {/* Discovery providers */}
      <section>
        <SectionLabel>Discovery {t("search.provider")}</SectionLabel>
        <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 6 }}>{t("settings.search.discoveryDesc")}</div>
        <div className="flex flex-col gap-2">
          {discoveryProviders.length === 0 && (
            <div style={{ fontSize: 12, color: color.textMuted, padding: 12 }}>{t("search.noProviders")}</div>
          )}
          {discoveryProviders.map(renderProviderCard)}
        </div>
      </section>

      {/* Deep search providers */}
      <section>
        <SectionLabel>Deep Search {t("search.provider")}</SectionLabel>
        <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 6 }}>{t("settings.search.deepSearchDesc")}</div>
        <div className="flex flex-col gap-2">
          {deepProviders.length === 0 && (
            <div style={{ fontSize: 12, color: color.textMuted, padding: 12 }}>{t("search.noProviders")}</div>
          )}
          {deepProviders.map(renderProviderCard)}
        </div>
      </section>

      {/* Search logs */}
      <section>
        <SectionLabel>{t("search.logs")}</SectionLabel>
        {logs.length === 0 ? (
          <div style={{ fontSize: 12, color: color.textMuted, padding: 12 }}>{t("search.noLogs")}</div>
        ) : (
          <div style={{ fontSize: 11, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: color.textMuted, textAlign: "left" }}>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>{t("search.time")}</th>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>{t("search.provider")}</th>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>{t("settings.search.profile")}</th>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>{t("search.results")}</th>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>{t("search.latency")}</th>
                  <th style={{ padding: "4px 6px", fontWeight: 500 }}>{t("search.fallback")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderTop: `1px solid ${color.hairline}` }}>
                    <td style={{ padding: "4px 6px", color: color.textSecondary }}>{log.ts?.slice(5, 16)}</td>
                    <td style={{ padding: "4px 6px", color: color.textPrimary, textTransform: "capitalize" }}>{log.provider}</td>
                    <td style={{ padding: "4px 6px", color: color.textSecondary }}>{log.profile}</td>
                    <td style={{ padding: "4px 6px", color: color.textPrimary }}>{log.results_count}</td>
                    <td style={{ padding: "4px 6px", color: color.textSecondary }}>{log.latency_ms ? `${log.latency_ms}ms` : "-"}</td>
                    <td style={{ padding: "4px 6px", color: log.fallback_used ? "#fbbf24" : color.textMuted }}>{log.fallback_used ? "Y" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
