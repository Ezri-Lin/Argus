import { useState, useEffect } from "react";
import { color, radius } from "@/design/tokens";
import { useI18n } from "@/lib/use-i18n";
import { fetchAuthConfig, updateAuthConfig } from "@/dashboard/api";
import { SectionLabel, inputStyle } from "./settings-ui";
import { useAuth } from "@/lib/auth-context";

export function AuthTab() {
  const { t } = useI18n();
  const { apiKey, logout } = useAuth();
  const [authEnabled, setAuthEnabled] = useState(false);
  const [currentKey, setCurrentKey] = useState("");
  const [newKey, setNewKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAuthConfig().then((r) => { if (r) setAuthEnabled(r.auth_enabled); });
  }, []);

  const handleSave = async () => {
    setMsg(null);
    if (newKey && newKey !== confirmKey) {
      setMsg({ type: "err", text: t("auth.tab.mismatch") });
      return;
    }
    setSaving(true);
    const res = await updateAuthConfig(currentKey, newKey);
    setSaving(false);
    if (res?.ok) {
      setAuthEnabled(res.auth_enabled ?? false);
      setCurrentKey("");
      setNewKey("");
      setConfirmKey("");
      setMsg({ type: "ok", text: t("auth.tab.saved") });
      // If key was changed, update localStorage and re-login
      if (newKey) {
        localStorage.setItem("argus.api_key", newKey);
        window.dispatchEvent(new Event("argus:auth-updated"));
      } else {
        logout();
      }
    } else {
      setMsg({ type: "err", text: res?.error || t("auth.tab.failed") });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <section>
        <SectionLabel>{t("auth.tab.status")}</SectionLabel>
        <div style={{ padding: "10px 12px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 13, color: color.textPrimary }}>
                {authEnabled ? t("auth.tab.enabled") : t("auth.tab.disabled")}
              </div>
              <div style={{ fontSize: 10, color: color.textMuted, marginTop: 2 }}>
                {authEnabled ? t("auth.tab.enabledDesc") : t("auth.tab.disabledDesc")}
              </div>
            </div>
            <span style={{
              padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: authEnabled ? color.posBg : color.surfaceElev,
              color: authEnabled ? color.posFg : color.textMuted,
            }}>
              {authEnabled ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>{authEnabled ? t("auth.tab.changeKey") : t("auth.tab.setKey")}</SectionLabel>

        {authEnabled && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>
              {t("auth.tab.currentKey")}
            </label>
            <input
              type="password"
              value={currentKey}
              onChange={(e) => { setCurrentKey(e.target.value); setMsg(null); }}
              placeholder={t("auth.tab.currentKeyPlaceholder")}
              style={inputStyle}
            />
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>
            {t("auth.tab.newKey")}
          </label>
          <input
            type="password"
            value={newKey}
            onChange={(e) => { setNewKey(e.target.value); setMsg(null); }}
            placeholder={authEnabled ? t("auth.tab.newKeyPlaceholder") : t("auth.tab.setKeyPlaceholder")}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>
            {t("auth.tab.confirmKey")}
          </label>
          <input
            type="password"
            value={confirmKey}
            onChange={(e) => { setConfirmKey(e.target.value); setMsg(null); }}
            placeholder={t("auth.tab.confirmKeyPlaceholder")}
            style={inputStyle}
          />
        </div>

        {msg && (
          <div style={{ marginBottom: 10, fontSize: 12, color: msg.type === "ok" ? color.pos : color.neg }}>
            {msg.text}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || (!newKey && !authEnabled)}
          style={{
            width: "100%", padding: "8px 0", fontSize: 13, fontWeight: 650,
            color: color.bg, background: saving ? color.textMuted : color.accent,
            border: "none", borderRadius: radius.inner,
            cursor: saving || (!newKey && !authEnabled) ? "default" : "pointer",
            opacity: saving || (!newKey && !authEnabled) ? 0.5 : 1,
          }}
        >
          {saving ? t("auth.tab.saving") : newKey ? t("auth.tab.saveKey") : t("auth.tab.disable")}
        </button>

        <div style={{ marginTop: 8, fontSize: 10, color: color.textMuted }}>
          {t("auth.tab.hint")}
        </div>
      </section>
    </div>
  );
}
