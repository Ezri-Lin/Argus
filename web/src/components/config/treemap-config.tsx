import { useState, useEffect, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/use-i18n";
import { color, radius } from "@/design/tokens";
import type { DomainItem, MemberItem } from "@/dashboard/api";
import { createMember, fetchWidgetMembers, saveWidgetConfig, type WidgetMemberConfig } from "@/dashboard/api";
import type { I18nKey } from "@/lib/i18n";

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

// ── Tier config ──

type TierKey = "primary" | "secondary" | "ai_candidate";

interface TierDef {
  key: TierKey;
  labelKey: I18nKey;
  color: string;
  showInterval: boolean;
}

const TIERS: TierDef[] = [
  { key: "primary", labelKey: "config.treemap.tierPrimary", color: color.accent, showInterval: true },
  { key: "secondary", labelKey: "config.treemap.tierSecondary", color: color.textSecondary, showInterval: true },
  { key: "ai_candidate", labelKey: "config.treemap.tierCandidate", color: color.textMuted, showInterval: false },
];

// ── Types ──

interface DraftMember {
  memberId: number;
  name: string;
  tier: TierKey;
  enabled: boolean;
}

// ── Member card (draggable) ──

function MemberCard({
  member,
  interval,
  tierDef,
  onRemove,
  onDragStart,
}: {
  member: DraftMember;
  interval?: number;
  tierDef: TierDef;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-1"
      style={{
        padding: "5px 8px",
        background: color.surface2,
        borderRadius: radius.inner,
        border: `1px solid ${color.hairline}`,
        cursor: "grab",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = tierDef.color)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = color.hairline)}
    >
      <span style={{ fontSize: 11, color: tierDef.color, flexShrink: 0, width: 4, height: 4, borderRadius: "50%", background: tierDef.color }} />
      <span style={{ fontSize: 12, color: color.textPrimary, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {member.name}
      </span>
      {tierDef.showInterval && interval != null && (
        <span style={{ fontSize: 10, color: color.textMuted, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          {interval}m
        </span>
      )}
      <button
        onClick={onRemove}
        style={{ ...btnGhost, padding: "0 4px", border: "none", color: color.neg, fontSize: 10, flexShrink: 0 }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Tier column (drop target) ──

function TierColumn({
  tierDef,
  members,
  interval,
  candidateHint,
  onDrop,
  onRemove,
  onDragStartMember,
}: {
  tierDef: TierDef;
  members: DraftMember[];
  interval?: number;
  candidateHint?: string;
  onDrop: (tier: TierKey) => void;
  onRemove: (memberId: number) => void;
  onDragStartMember: (memberId: number, e: React.DragEvent) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onDrop(tierDef.key);
  }, [onDrop, tierDef.key]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        flex: 1,
        minWidth: 0,
        padding: "8px 6px",
        background: dragOver ? tierDef.color + "0A" : "transparent",
        borderRadius: radius.inner,
        border: `1px dashed ${dragOver ? tierDef.color : "transparent"}`,
        transition: "all 0.15s",
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 6, paddingLeft: 2 }}>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: tierDef.color }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: color.textPrimary }}>
            {tierDef.labelKey ? (tierDef.labelKey.includes("tierPrimary") ? "主力" : tierDef.labelKey.includes("tierSecondary") ? "观察" : "推荐") : tierDef.key}
          </span>
          <span style={{ fontSize: 10, color: color.textMuted }}>{members.length}</span>
        </div>
        {tierDef.showInterval && interval != null && (
          <span style={{ fontSize: 10, color: color.textMuted, fontVariantNumeric: "tabular-nums" }}>
            {interval}m
          </span>
        )}
      </div>

      {/* Candidate hint */}
      {tierDef.key === "ai_candidate" && candidateHint && (
        <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 6, paddingLeft: 2, lineHeight: 1.4 }}>
          {candidateHint}
        </div>
      )}

      {/* Member cards */}
      <div className="flex flex-col gap-0.5">
        {members.length === 0 && (
          <div style={{ fontSize: 10, color: color.textMuted, padding: "8px 2px", textAlign: "center" }}>
            拖拽成员到此处
          </div>
        )}
        {members.map((m) => (
          <MemberCard
            key={m.memberId}
            member={m}
            interval={tierDef.showInterval ? interval : undefined}
            tierDef={tierDef}
            onRemove={() => onRemove(m.memberId)}
            onDragStart={(e) => onDragStartMember(m.memberId, e)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ──

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
  const [showDomainFields, setShowDomainFields] = useState(false);
  const [editSearchIntent, setEditSearchIntent] = useState("");
  const [editIncludeTerms, setEditIncludeTerms] = useState("");
  const [editExcludeTerms, setEditExcludeTerms] = useState("");

  const [draft, setDraft] = useState<DraftMember[]>([]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [primaryInterval, setPrimaryInterval] = useState(90);
  const [secondaryInterval, setSecondaryInterval] = useState(90);
  const [dragMemberId, setDragMemberId] = useState<number | null>(null);

  const domain = domains.find((d) => d.key === selectedDomain);

  // Load existing widget members
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
              tier: r.tier as TierKey,
              enabled: true,
            }))
        );
      }
      setDraftLoaded(true);
    });
  }, [widgetId]);

  const draftIds = useMemo(() => new Set(draft.map((d) => d.memberId)), [draft]);
  const available = useMemo(
    () => members.filter((m) => !draftIds.has(m.id)),
    [members, draftIds],
  );

  // Group draft by tier
  const byTier = useMemo(() => {
    const map: Record<TierKey, DraftMember[]> = { primary: [], secondary: [], ai_candidate: [] };
    for (const m of draft) map[m.tier].push(m);
    return map;
  }, [draft]);

  function addToDraft(memberId: number, name: string, tier: TierKey = "secondary") {
    setDraft((prev) => [...prev, { memberId, name, tier, enabled: true }]);
  }

  function removeFromDraft(memberId: number) {
    setDraft((prev) => prev.filter((d) => d.memberId !== memberId));
  }

  function moveMember(memberId: number, newTier: TierKey) {
    setDraft((prev) => prev.map((d) => (d.memberId === memberId ? { ...d, tier: newTier } : d)));
  }

  // Drag-and-drop handlers
  const handleDragStart = useCallback((memberId: number, e: React.DragEvent) => {
    setDragMemberId(memberId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(memberId));
  }, []);

  const handleDrop = useCallback((targetTier: TierKey) => {
    if (dragMemberId != null) {
      moveMember(dragMemberId, targetTier);
      setDragMemberId(null);
    }
  }, [dragMemberId]);

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

  // Translate tier labels using the i18n function
  function tierLabel(key: TierKey): string {
    const map: Record<TierKey, I18nKey> = {
      primary: "config.treemap.tierPrimary",
      secondary: "config.treemap.tierSecondary",
      ai_candidate: "config.treemap.tierCandidate",
    };
    return t(map[key]);
  }

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
                    if (e.key === "Enter") { onEditDomain(d.key, { label: editDomainLabel }); setEditingDomain(null); }
                    if (e.key === "Escape") setEditingDomain(null);
                  }}
                  style={{ ...smallInput, width: 80, padding: "2px 6px" }}
                  autoFocus
                />
                <button onClick={() => { onEditDomain(d.key, { label: editDomainLabel }); setEditingDomain(null); }} style={{ ...btnGhost, padding: "2px 4px", fontSize: 10, color: color.pos }}>✓</button>
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
                {d.label || d.key}
              </button>
              <button
                onClick={() => {
                  setEditingDomain(d.key);
                  setEditDomainLabel(d.label || d.key);
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

      {/* Three-tier columns */}
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 8, display: "block" }}>
        {t("config.treemap.members")} ({domain?.label || selectedDomain})
      </label>

      {!draftLoaded && <div style={{ fontSize: 11, color: color.textMuted }}>Loading...</div>}

      {draftLoaded && (
        <div className="flex gap-1" style={{ marginBottom: 12 }}>
          {TIERS.map((tierDef) => (
            <TierColumn
              key={tierDef.key}
              tierDef={{ ...tierDef, labelKey: tierDef.labelKey }}
              members={byTier[tierDef.key]}
              interval={tierDef.key === "primary" ? primaryInterval : tierDef.key === "secondary" ? secondaryInterval : undefined}
              candidateHint={tierDef.key === "ai_candidate" ? t("config.treemap.candidateHint") : undefined}
              onDrop={handleDrop}
              onRemove={removeFromDraft}
              onDragStartMember={handleDragStart}
            />
          ))}
        </div>
      )}

      {/* Interval controls */}
      <div className="flex gap-2" style={{ marginBottom: 12 }}>
        <div className="flex items-center gap-1.5" style={{ flex: 1 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: color.accent }} />
          <label style={{ fontSize: 10, color: color.textMuted }}>{t("config.treemap.interval")}</label>
          <input
            type="number"
            min={1}
            value={primaryInterval}
            onChange={(e) => setPrimaryInterval(Math.max(1, parseInt(e.target.value) || 90))}
            style={{ ...smallInput, padding: "2px 6px", width: 56 }}
          />
          <span style={{ fontSize: 10, color: color.textMuted }}>min</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ flex: 1 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: color.textSecondary }} />
          <label style={{ fontSize: 10, color: color.textMuted }}>{t("config.treemap.interval")}</label>
          <input
            type="number"
            min={1}
            value={secondaryInterval}
            onChange={(e) => setSecondaryInterval(Math.max(1, parseInt(e.target.value) || 90))}
            style={{ ...smallInput, padding: "2px 6px", width: 56 }}
          />
          <span style={{ fontSize: 10, color: color.textMuted }}>min</span>
        </div>
      </div>

      {/* Add member */}
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

      <DraftSaveHandler onSave={handleSave} />
    </div>
  );
}

function DraftSaveHandler({ onSave }: { onSave: (widgetId: string) => Promise<void> }) {
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__treemapDraftSave = onSave;
    return () => { delete (window as unknown as Record<string, unknown>).__treemapDraftSave; };
  }, [onSave]);
  return null;
}
