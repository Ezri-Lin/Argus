import { useState } from "react";
import { color } from "@/design/tokens";
import { AddWidgetMenu } from "./add-widget-menu";
import { SettingsPanel } from "./settings-panel";
import { useDashboardStore } from "@/dashboard/dashboard-store";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/use-i18n";
import type { WidgetType } from "@/dashboard/dashboard-types";
import type { DomainPreset } from "@/dashboard/domain-presets";

export function TopBar({ onStartCreate, onPresetSelect }: { onStartCreate?: (type: WidgetType, defaults: Record<string, unknown>) => void; onPresetSelect?: (preset: DomainPreset) => void }) {
  const autoLayout = useDashboardStore((s) => s.autoLayout);
  const editMode = useDashboardStore((s) => s.editMode);
  const toggleEditMode = useDashboardStore((s) => s.toggleEditMode);
  const { theme, toggle: toggleTheme } = useTheme();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 items-center justify-between px-5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-semibold tracking-normal text-[var(--text-primary)]">
            Argus
          </h1>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            AMBIENT
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Edit mode controls — only visible when editing */}
          {editMode && (
            <>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  title={t("topbar.addWidget")}
                  style={{
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    border: `1px solid ${color.hairline}`,
                    background: "transparent",
                    color: color.textSecondary,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
                {menuOpen && (
                  <AddWidgetMenu
                    onSelect={(type, defaults) => {
                      onStartCreate?.(type, defaults);
                      setMenuOpen(false);
                    }}
                    onPresetSelect={(preset) => {
                      onPresetSelect?.(preset);
                      setMenuOpen(false);
                    }}
                    onClose={() => setMenuOpen(false)}
                  />
                )}
              </div>
              <button
                onClick={autoLayout}
                title={t("topbar.autoLayout")}
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  border: `1px solid ${color.hairline}`,
                  background: "transparent",
                  cursor: "pointer",
                  color: color.textSecondary,
                  fontSize: 13,
                }}
              >
                ⊞
              </button>
            </>
          )}

          {/* Always-visible: edit toggle + settings */}
          <button
            onClick={toggleEditMode}
            title={editMode ? t("topbar.exitEdit") : t("topbar.edit")}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: `1px solid ${editMode ? color.accentSoft : color.hairline}`,
              background: editMode ? color.accentSoft : "transparent",
              cursor: "pointer",
              color: editMode ? color.textPrimary : color.textSecondary,
              fontSize: 13,
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            ✎
          </button>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? t("topbar.switchToLight") : t("topbar.switchToDark")}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: `1px solid ${color.hairline}`,
              background: "transparent",
              cursor: "pointer",
              color: color.textSecondary,
              fontSize: 13,
            }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            title={t("topbar.settings")}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: `1px solid ${color.hairline}`,
              background: "transparent",
              cursor: "pointer",
              color: color.textSecondary,
              fontSize: 13,
            }}
          >
            ⚙
          </button>
        </div>
      </header>

      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}
    </>
  );
}
