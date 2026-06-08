import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/use-i18n";
import { color, radius } from "@/design/tokens";
import type { DomainItem, MemberItem } from "@/dashboard/api";
import { createMember, fetchWidgetMembers, saveWidgetConfig, type WidgetMemberConfig } from "@/dashboard/api";

// ── Style constants ──

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  color: color.textPrimary,
  background: color.surface2,
  border: `1px solid ${color.hairline}`,
  borderRadius: radius.inner,
  outline: "none",
} as const;

const smallInput = { ...inputStyle, padding: "4px 8px", fontSize: 12 } as const;

const btnBase = {
  padding: "8px 16px",
  fontSize: 12,
  fontWeight: 650,
  borderRadius: 999,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "opacity 0.15s",
} as const;

const btnPrimary = {
  ...btnBase,
  color: color.bg,
  background: color.accent,
  border: "none",
} as const;

const btnGhost = {
  ...btnBase,
  padding: "4px 10px",
  fontSize: 11,
  color: color.textMuted,
  background: "transparent",
  border: `1px dashed ${color.hairline}`,
  borderRadius: 6,
} as const;

const btnSegment = {
  ...btnBase,
  padding: "4px 10px",
  fontSize: 12,
  borderRadius: 6,
  background: "transparent",
  border: `1px solid ${color.hairline}`,
} as const;

const btnSegmentActive = {
  ...btnSegment,
  color: color.textPrimary,
  background: color.surface2,
  borderColor: color.textSecondary,
} as const;

const TIER_LABELS: Record<string, string> = {
  primary: "P",
  secondary: "S",
  ai_candidate: "AI",
};

const TIER_COLORS: Record<string, string> = {
  primary: color.accent,
  secondary: color.textMuted,
  ai_candidate: color.textMuted,
};

// ── Types ──

interface DraftMember {
  memberId: number;
  name: string;
  tier: "primary" | "secondary" | "ai_candidate";
  enabled: boolean;
}

// ── Treemap Config: domain selector + member draft ──

export function TreemapConfig({
  widgetId,
  domains,
  members,
  selectedDomain,
  onSelectDomain,
  onAddDomain,
  onDeleteDomain,
  onEditDomain,
}: {
  widgetId: string | null;
  domains: DomainItem[];
  members: MemberItem[];
  selectedDomain: string;
  onSelectDomain: (key: string) => void;
  onAddDomain: (key: string, label: string) => void;
  onDeleteDomain: (key: string) => void;
  onEditDomain: (key: string, patch: Partial<DomainItem>) => void;
}) {
  const { t } = useI18n();
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [dk, setDk] = useState("");
  const [dl, setDl] = useState("");
  const [mn, setMn] = useState("");
  const [ma, setMa] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editDomainLabel, setEditDomainLabel] = useState("");

  // Domain semantic fields
  const [showDomainFields, setShowDomainFields] = useState(false);
  const [editSearchIntent, setEditSearchIntent] = useState("");
  const [editIncludeTerms, setEditIncludeTerms] = useState("");
  const [editExcludeTerms, setEditExcludeTerms] = useState("");

  // Draft state: members selected for this widget
  const [draft, setDraft] = useState<DraftMember[]>([]);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Widget-level update intervals
  const [primaryInterval, setPrimaryInterval] = useState(90);
  const [secondaryInterval, setSecondaryInterval] = useState(90);

  const domain = domains.find((d) => d.key === selectedDomain);

  // Load existing widget members from registry on mount
  useEffect(() => {
    if (!widgetId) { setDraftLoaded(true); return; }
    fetchWidgetMembers(widgetId).then((rows) => {
      if (rows) {
        const memberMap = new Map(members.map((m) => [m.id, m.name]));
        setDraft(
          rows
            .filter((r) => r.enabled)
            .map((r) => ({
              memberId: r.member_id,
              name: memberMap.get(r.member_id) ?? `#${r.member_id}`,
              tier: r.tier as DraftMember["tier"],
              enabled: true,
            }))
        );
      }
      setDraftLoaded(true);
    });
  }, [widgetId]);

  // Available members: global pool not yet in draft
  const draftIds = useMemo(() => new Set(draft.map((d) => d.memberId)), [draft]);
  const available = useMemo(
    () => members.filter((m) => !draftIds.has(m.id)),
    [members, draftIds],
  );

  // Draft operations (no API calls)
  function addToDraft(memberId: number, name: string, tier: DraftMember["tier"] = "secondary") {
    setDraft((prev) => [...prev, { memberId, name, tier, enabled: true }]);
  }

  function removeFromDraft(memberId: number) {
    setDraft((prev) => prev.filter((d) => d.memberId !== memberId));
  }

  function updateDraftTier(memberId: number, tier: DraftMember["tier"]) {
    setDraft((prev) => prev.map((d) => (d.memberId === memberId ? { ...d, tier } : d)));
  }

  // Add member: create in global pool if needed, then add to draft
  async function handleAddMember() {
    if (!mn.trim() || addingMember) return;
    setAddingMember(true);
    try {
      const aliases = ma.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await createMember({ name: mn.trim(), aliases });
      if (res?.id) {
        addToDraft(res.id, mn.trim());
        setMn("");
        setMa("");
      }
    } finally {
      setAddingMember(false);
    }
  }

  // Save: batch write draft to widget_member_registry
  async function handleSave(widgetId: string) {
    const payload: WidgetMemberConfig[] = draft.map((d, i) => ({
      member_id: d.memberId,
      tier: d.tier,
      enabled: d.enabled,
      display_order: i,
    }));
    await saveWidgetConfig(widgetId, {
      group: selectedDomain,
      members: payload,
      primary_interval_minutes: primaryInterval,
      secondary_interval_minutes: secondaryInterval,
    });
  }

  // Expose handleSave via ref-like pattern: store on window for parent to call
  // (Alternatively, parent can call saveWidgetConfig directly with draft data)
  // For now, we return handleSave from the component via a callback prop pattern.

  return (
    <div>
      {/* Domain selector */}
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>{t("config.treemap.domains")}</label>
      <div className="flex gap-1 mb-2" style={{ flexWrap: "wrap" }}>
        {domains.map((d) => (
          editingDomain === d.key ? (
            <div key={d.key} className="flex flex-col gap-1" style={{ padding: 4, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
              <div className="flex items-center gap-1">
                <input
                  value={editDomainLabel}
                  onChange={(e) => setEditDomainLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { onEditDomain(d.key, { label_zh: editDomainLabel }); setEditingDomain(null); }
                    if (e.key === "Escape") setEditingDomain(null);
                  }}
                  style={{ ...smallInput, width: 80, padding: "2px 6px" }}
                  autoFocus
                />
                <button onClick={() => { onEditDomain(d.key, { label_zh: editDomainLabel }); setEditingDomain(null); }} style={{ ...btnGhost, padding: "2px 4px", fontSize: 10, color: color.pos }}>✓</button>
                <button onClick={() => setEditingDomain(null)} style={{ ...btnGhost, padding: "2px 4px", fontSize: 10 }}>✕</button>
              </div>
              {showDomainFields && (
                <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
                  <input value={editSearchIntent} onChange={(e) => setEditSearchIntent(e.target.value)} placeholder="search intent" style={{ ...smallInput, padding: "2px 6px" }} />
                  <input value={editIncludeTerms} onChange={(e) => setEditIncludeTerms(e.target.value)} placeholder="include terms (comma)" style={{ ...smallInput, padding: "2px 6px" }} />
                  <input value={editExcludeTerms} onChange={(e) => setEditExcludeTerms(e.target.value)} placeholder="exclude terms (comma)" style={{ ...smallInput, padding: "2px 6px" }} />
                </div>
              )}
            </div>
          ) : (
            <div key={d.key} className="flex items-center gap-0.5">
              <button
                onClick={() => onSelectDomain(d.key)}
                style={d.key === selectedDomain ? btnSegmentActive : { ...btnSegment, color: color.textMuted }}
              >
                {d.label_zh || d.key}
              </button>
              <button
                onClick={() => {
                  setEditingDomain(d.key);
                  setEditDomainLabel(d.label_zh || d.key);
                  setEditSearchIntent((d as Record<string, unknown>).search_intent as string || "");
                  setEditIncludeTerms(((d as Record<string, unknown>).include_terms as string[] || []).join(", "));
                  setEditExcludeTerms(((d as Record<string, unknown>).exclude_terms as string[] || []).join(", "));
                  setShowDomainFields(false);
                }}
                title={t("config.common.edit")}
                style={{ ...btnGhost, padding: "1px 3px", fontSize: 9, color: color.textMuted }}
              >✎</button>
              <button
                onClick={() => onDeleteDomain(d.key)}
                title={t("config.common.delete")}
                style={{ ...btnGhost, padding: "1px 3px", fontSize: 9, color: color.neg }}
              >✕</button>
            </div>
          )
        ))}
        <button onClick={() => setShowAddDomain(!showAddDomain)} style={btnGhost}>+</button>
      </div>

      {showAddDomain && (
        <div className="flex gap-1 mb-2">
          <input value={dk} onChange={(e) => setDk(e.target.value)} placeholder="key" style={{ ...smallInput, width: 80 }} />
          <input value={dl} onChange={(e) => setDl(e.target.value)} placeholder={t("config.common.name")} style={{ ...smallInput, flex: 1 }} />
          <button onClick={() => { if (dk) { onAddDomain(dk, dl); setDk(""); setDl(""); setShowAddDomain(false); } }} style={btnPrimary}>{t("config.common.add")}</button>
        </div>
      )}

      {/* Widget members (draft) */}
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>
        {t("config.treemap.members")} ({domain?.label_zh || selectedDomain})
      </label>
      <div className="flex flex-col gap-1 mb-2">
        {!draftLoaded && <div style={{ fontSize: 11, color: color.textMuted }}>Loading...</div>}
        {draftLoaded && draft.length === 0 && <div style={{ fontSize: 11, color: color.textMuted }}>{t("config.treemap.emptyMembers")}</div>}
        {draft.map((d) => (
          <div key={d.memberId} className="flex items-center gap-1" style={{ padding: "4px 8px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
            <span style={{ fontSize: 12, color: color.textPrimary, flex: 1 }}>{d.name}</span>
            {/* Tier selector */}
            <div className="flex gap-0.5">
              {(["primary", "secondary", "ai_candidate"] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => updateDraftTier(d.memberId, tier)}
                  style={{
                    padding: "1px 5px",
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 4,
                    border: `1px solid ${d.tier === tier ? TIER_COLORS[tier] : color.hairline}`,
                    background: d.tier === tier ? TIER_COLORS[tier] + "22" : "transparent",
                    color: d.tier === tier ? TIER_COLORS[tier] : color.textMuted,
                    cursor: "pointer",
                  }}
                >
                  {TIER_LABELS[tier]}
                </button>
              ))}
            </div>
            <button onClick={() => removeFromDraft(d.memberId)} style={{ ...btnGhost, padding: "2px 6px", border: "none", color: color.neg }}>✕</button>
          </div>
        ))}
      </div>

      {/* Add member from global pool or create new */}
      <div className="flex gap-1 mb-1">
        <input value={mn} onChange={(e) => setMn(e.target.value)} placeholder={t("config.common.name")} style={{ ...smallInput, flex: 1 }} />
        <input value={ma} onChange={(e) => setMa(e.target.value)} placeholder={t("config.common.aliases")} style={{ ...smallInput, flex: 1 }} />
        <button
          onClick={handleAddMember}
          disabled={addingMember || !mn.trim()}
          style={{ ...btnPrimary, padding: "4px 10px", fontSize: 11, opacity: addingMember ? 0.6 : 1 }}
        >
          {addingMember ? "..." : "+"}
        </button>
      </div>

      {/* Quick-add from existing members */}
      {available.length > 0 && (
        <div style={{ fontSize: 10, color: color.textMuted, marginTop: 4 }}>
          <span>{t("config.treemap.quickAdd")}: </span>
          {available.slice(0, 20).map((m) => (
            <button
              key={m.id}
              onClick={() => addToDraft(m.id, m.name)}
              style={{
                ...btnGhost,
                padding: "1px 5px",
                fontSize: 10,
                display: "inline-block",
                margin: "1px 2px",
              }}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Update frequency */}
      <div className="flex gap-2 mt-2">
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: color.textMuted, display: "block", marginBottom: 2 }}>
            {t("config.treemap.primaryInterval")}
          </label>
          <input
            type="number"
            min={1}
            value={primaryInterval}
            onChange={(e) => setPrimaryInterval(Math.max(1, parseInt(e.target.value) || 90))}
            style={{ ...smallInput, padding: "3px 6px" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: color.textMuted, display: "block", marginBottom: 2 }}>
            {t("config.treemap.secondaryInterval")}
          </label>
          <input
            type="number"
            min={1}
            value={secondaryInterval}
            onChange={(e) => setSecondaryInterval(Math.max(1, parseInt(e.target.value) || 90))}
            style={{ ...smallInput, padding: "3px 6px" }}
          />
        </div>
      </div>

      {/* Save draft handler — expose via hidden function */}
      <DraftSaveHandler onSave={handleSave} />
    </div>
  );
}

// Helper component to expose draft save to parent
function DraftSaveHandler({ onSave }: { onSave: (widgetId: string) => Promise<void> }) {
  // Store the save function on a global ref for the parent ConfigPanel to call
  // This is a pragmatic approach; a cleaner version would use a ref callback
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__treemapDraftSave = onSave;
    return () => { delete (window as unknown as Record<string, unknown>).__treemapDraftSave; };
  }, [onSave]);
  return null;
}
