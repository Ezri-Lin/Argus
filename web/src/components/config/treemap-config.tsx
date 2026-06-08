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

const dividerStyle = {
  border: "none",
  borderTop: `1px solid ${color.hairline}`,
  margin: "8px 0",
} as const;

// ── Tier config ──

type TierKey = "primary" | "secondary" | "ai_candidate";

interface TierDef {
  key: TierKey;
  label: string;
  color: string;
  showInterval: boolean;
}

const TIERS: TierDef[] = [
  { key: "primary", label: "主力", color: color.accent, showInterval: true },
  { key: "secondary", label: "观察", color: color.textSecondary, showInterval: true },
  { key: "ai_candidate", label: "推荐", color: color.textMuted, showInterval: false },
];

// ── Types ──

interface DraftMember {
  memberId: number;
  name: string;
  tier: TierKey;
  enabled: boolean;
}

// ── Member row (draggable, editable) ──

function MemberRow({
  member,
  tierDef,
  onRemove,
  onUpdate,
  onDragStart,
}: {
  member: DraftMember;
  tierDef: TierDef;
  onRemove: () => void;
  onUpdate: (patch: { label?: string; aliases?: string }) => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(member.name);
  const [editAliases, setEditAliases] = useState("");

  function handleSave() {
    onUpdate({ label: editLabel, aliases: editAliases });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1" style={{ padding: "4px 6px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${tierDef.color}` }}>
        <input
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          style={{ ...smallInput, flex: 1, padding: "2px 6px", fontSize: 11 }}
          autoFocus
        />
        <input
          value={editAliases}
          onChange={(e) => setEditAliases(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          placeholder="别名"
          style={{ ...smallInput, flex: 1, padding: "2px 6px", fontSize: 11 }}
        />
        <button onClick={handleSave} style={{ padding: "0 4px", border: "none", background: "transparent", color: color.pos, fontSize: 11, cursor: "pointer" }}>✓</button>
        <button onClick={() => setEditing(false)} style={{ padding: "0 4px", border: "none", background: "transparent", color: color.textMuted, fontSize: 11, cursor: "pointer" }}>✕</button>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-1.5"
      style={{
        padding: "4px 8px",
        background: color.surface2,
        borderRadius: radius.inner,
        border: `1px solid ${color.hairline}`,
        cursor: "grab",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = tierDef.color)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = color.hairline)}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: tierDef.color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: color.textPrimary, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {member.name}
      </span>
      <button
        onClick={() => setEditing(true)}
        style={{ padding: "0 3px", border: "none", background: "transparent", color: color.textMuted, fontSize: 10, cursor: "pointer", flexShrink: 0 }}
      >✎</button>
      <button
        onClick={onRemove}
        style={{ padding: "0 4px", border: "none", background: "transparent", color: color.neg, fontSize: 10, cursor: "pointer", flexShrink: 0 }}
      >✕</button>
    </div>
  );
}

// ── Tier section ──

function TierSection({
  tierDef,
  members,
  interval,
  onIntervalChange,
  candidateHint,
  onDrop,
  onRemove,
  onMoveTier,
  onDragStartMember,
  addName,
  addAlias,
  adding,
  onAddNameChange,
  onAddAliasChange,
  onAdd,
}: {
  tierDef: TierDef;
  members: DraftMember[];
  interval?: number;
  onIntervalChange?: (v: number) => void;
  candidateHint?: string;
  onDrop: (tier: TierKey) => void;
  onRemove: (memberId: number) => void;
  onUpdateMember: (memberId: number, patch: { label?: string; aliases?: string }) => void;
  onDragStartMember: (memberId: number, e: React.DragEvent) => void;
  addName: string;
  addAlias: string;
  adding: boolean;
  onAddNameChange: (v: string) => void;
  onAddAliasChange: (v: string) => void;
  onAdd: () => void;
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
        padding: "8px",
        background: dragOver ? tierDef.color + "0A" : "transparent",
        borderRadius: radius.inner,
        border: `1px dashed ${dragOver ? tierDef.color : "transparent"}`,
        transition: "all 0.15s",
      }}
    >
      {/* Header: dot + label + count + interval */}
      <div className="flex items-center gap-1.5" style={{ marginBottom: 6, paddingLeft: 2 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: tierDef.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: color.textPrimary }}>{tierDef.label}</span>
        <span style={{ fontSize: 10, color: color.textMuted }}>{members.length}</span>
        {tierDef.showInterval && interval != null && onIntervalChange && (
          <span className="flex items-center gap-1" style={{ marginLeft: "auto" }}>
            <input
              type="number"
              min={1}
              value={interval}
              onChange={(e) => onIntervalChange(Math.max(1, parseInt(e.target.value) || 90))}
              style={{ ...smallInput, padding: "2px 4px", width: 40, fontSize: 10, textAlign: "right" }}
            />
            <span style={{ fontSize: 10, color: color.textMuted }}>m</span>
          </span>
        )}
      </div>

      {/* Candidate hint */}
      {tierDef.key === "ai_candidate" && candidateHint && (
        <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 6, paddingLeft: 2, lineHeight: 1.4 }}>
          {candidateHint}
        </div>
      )}

      {/* Member list */}
      <div className="flex flex-col gap-0.5" style={{ marginBottom: 6 }}>
        {members.length === 0 && (
          <div style={{ fontSize: 10, color: color.textMuted, padding: "4px 2px", textAlign: "center" }}>
            拖拽成员到此处
          </div>
        )}
        {members.map((m) => (
          <MemberRow
            key={m.memberId}
            member={m}
            tierDef={tierDef}
            onRemove={() => onRemove(m.memberId)}
            onUpdate={(patch) => onUpdateMember(m.memberId, patch)}
            onDragStart={(e) => onDragStartMember(m.memberId, e)}
          />
        ))}
      </div>

      {/* Manual add (name + alias) — only for primary/secondary */}
      {tierDef.showInterval && (
        <div className="flex gap-1">
          <input
            value={addName}
            onChange={(e) => onAddNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
            placeholder="名称"
            style={{ ...smallInput, flex: 1, padding: "3px 6px", fontSize: 11 }}
          />
          <input
            value={addAlias}
            onChange={(e) => onAddAliasChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
            placeholder="别名"
            style={{ ...smallInput, flex: 1, padding: "3px 6px", fontSize: 11 }}
          />
          <button
            onClick={onAdd}
            disabled={adding || !addName.trim()}
            style={{ ...btnPrimary, padding: "3px 8px", fontSize: 11, opacity: adding ? 0.6 : 1 }}
          >
            {adding ? "..." : "+"}
          </button>
        </div>
      )}

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
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editDomainLabel, setEditDomainLabel] = useState("");

  // Per-tier add form state
  const [addName, setAddName] = useState<Record<TierKey, string>>({ primary: "", secondary: "", ai_candidate: "" });
  const [addAlias, setAddAlias] = useState<Record<TierKey, string>>({ primary: "", secondary: "", ai_candidate: "" });
  const [adding, setAdding] = useState(false);

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
    () => {
      const unassigned = members.filter((m) => !draftIds.has(m.id));
      // Prioritize members belonging to the current domain
      const inDomain = unassigned.filter((m) => m.domains.includes(selectedDomain));
      const others = unassigned.filter((m) => !m.domains.includes(selectedDomain));
      return [...inDomain, ...others];
    },
    [members, draftIds, selectedDomain],
  );

  const byTier = useMemo(() => {
    const map: Record<TierKey, DraftMember[]> = { primary: [], secondary: [], ai_candidate: [] };
    for (const m of draft) map[m.tier].push(m);
    return map;
  }, [draft]);

  function addToDraft(memberId: number, name: string, tier: TierKey) {
    setDraft((prev) => [...prev, { memberId, name, tier, enabled: true }]);
  }

  function removeFromDraft(memberId: number) {
    setDraft((prev) => prev.filter((d) => d.memberId !== memberId));
  }

  function moveMember(memberId: number, newTier: TierKey) {
    setDraft((prev) => prev.map((d) => (d.memberId === memberId ? { ...d, tier: newTier } : d)));
  }

  function updateMember(memberId: number, patch: { label?: string; aliases?: string }) {
    if (patch.label) {
      setDraft((prev) => prev.map((d) => (d.memberId === memberId ? { ...d, name: patch.label! } : d)));
    }
    // TODO: persist alias changes to backend when API supports it
  }

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

  async function handleAddMember(tier: TierKey) {
    const name = addName[tier].trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const aliases = addAlias[tier].split(",").map((s) => s.trim()).filter(Boolean);
      const res = await createMember({ name, aliases });
      if (res?.id) {
        addToDraft(res.id, name, tier);
        setAddName((prev) => ({ ...prev, [tier]: "" }));
        setAddAlias((prev) => ({ ...prev, [tier]: "" }));
      }
    } finally {
      setAdding(false);
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

  return (
    <div>
      {/* Domain selector */}
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>{t("config.treemap.domains")}</label>
      <div className="flex gap-1 mb-2" style={{ flexWrap: "wrap" }}>
        {domains.map((d) => (
          editingDomain === d.key ? (
            <div key={d.key} className="flex items-center gap-1" style={{ padding: 4, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
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

      {/* Tier sections with dividers */}
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 8, display: "block" }}>
        {t("config.treemap.members")} ({domain?.label || selectedDomain})
      </label>

      {!draftLoaded && <div style={{ fontSize: 11, color: color.textMuted }}>Loading...</div>}

      {draftLoaded && TIERS.map((tierDef, i) => (
        <div key={tierDef.key}>
          {i > 0 && <hr style={dividerStyle} />}
          <TierSection
            tierDef={tierDef}
            members={byTier[tierDef.key]}
            interval={tierDef.key === "primary" ? primaryInterval : tierDef.key === "secondary" ? secondaryInterval : undefined}
            onIntervalChange={tierDef.key === "primary" ? setPrimaryInterval : tierDef.key === "secondary" ? setSecondaryInterval : undefined}
            candidateHint={tierDef.key === "ai_candidate" ? t("config.treemap.candidateHint") : undefined}
            onDrop={handleDrop}
            onRemove={removeFromDraft}
            onUpdateMember={updateMember}
            onDragStartMember={handleDragStart}
            addName={addName[tierDef.key]}
            addAlias={addAlias[tierDef.key]}
            adding={adding}
            onAddNameChange={(v) => setAddName((prev) => ({ ...prev, [tierDef.key]: v }))}
            onAddAliasChange={(v) => setAddAlias((prev) => ({ ...prev, [tierDef.key]: v }))}
            onAdd={() => handleAddMember(tierDef.key)}
          />
        </div>
      ))}

      {/* Quick-add (domain-first, click → primary) */}
      {available.length > 0 && (
        <>
          <hr style={dividerStyle} />
          <div style={{ fontSize: 10, color: color.textMuted, marginBottom: 4 }}>快速添加</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {available.map((m) => (
              <button
                key={m.id}
                onClick={() => addToDraft(m.id, m.name, "primary")}
                style={{
                  ...btnGhost,
                  padding: "1px 6px",
                  fontSize: 10,
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
        </>
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
