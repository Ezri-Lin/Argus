import { useState } from "react";
import { useI18n } from "@/lib/use-i18n";
import { color, radius } from "@/design/tokens";
import type { DomainItem, MemberItem } from "@/dashboard/api";

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

// ── Treemap Config: domain selector + member CRUD ──

export function TreemapConfig({ domains, members, selectedDomain, onSelectDomain, onAddDomain, onDeleteDomain, onEditDomain, onAddMember, onDeleteMember, onEditMember, onScoreMember }: {
  domains: DomainItem[];
  members: MemberItem[];
  selectedDomain: string;
  onSelectDomain: (key: string) => void;
  onAddDomain: (key: string, label: string) => void;
  onDeleteDomain: (key: string) => void;
  onEditDomain: (key: string, patch: Partial<DomainItem>) => void;
  onAddMember: (name: string, aliases: string, domain: string) => Promise<void>;
  onDeleteMember: (id: number) => void;
  onEditMember: (id: number, patch: Record<string, unknown>) => void;
  onScoreMember: (id: number) => Promise<void>;
}) {
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [dk, setDk] = useState("");
  const [dl, setDl] = useState("");
  const [mn, setMn] = useState("");
  const [ma, setMa] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [scoringMemberId, setScoringMemberId] = useState<number | null>(null);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editDomainLabel, setEditDomainLabel] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberAliases, setEditMemberAliases] = useState("");
  const { t } = useI18n();

  const domainMembers = members.filter((m) => m.domains.includes(selectedDomain));
  const domain = domains.find((d) => d.key === selectedDomain);

  return (
    <div>
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>{t("config.treemap.domains")}</label>
      <div className="flex gap-1 mb-2" style={{ flexWrap: "wrap" }}>
        {domains.map((d) => (
          editingDomain === d.key ? (
            <div key={d.key} className="flex items-center gap-1">
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
          ) : (
            <div key={d.key} className="flex items-center gap-0.5">
              <button
                onClick={() => onSelectDomain(d.key)}
                style={d.key === selectedDomain ? btnSegmentActive : { ...btnSegment, color: color.textMuted }}
              >
                {d.label_zh || d.key}
              </button>
              <button
                onClick={() => { setEditingDomain(d.key); setEditDomainLabel(d.label_zh || d.key); }}
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

      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>
        {t("config.treemap.members")} ({domain?.label_zh || selectedDomain})
      </label>
      <div className="flex flex-col gap-1 mb-2">
        {domainMembers.map((m) => (
          editingMemberId === m.id ? (
            <div key={m.id} style={{ padding: "4px 8px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
              <div className="flex gap-1 mb-1">
                <input value={editMemberName} onChange={(e) => setEditMemberName(e.target.value)} placeholder={t("config.common.name")} style={{ ...smallInput, flex: 1, padding: "2px 6px" }} />
                <input value={editMemberAliases} onChange={(e) => setEditMemberAliases(e.target.value)} placeholder={t("config.common.aliases")} style={{ ...smallInput, flex: 1, padding: "2px 6px" }} />
              </div>
              <div className="flex gap-1">
                <button onClick={() => {
                  const aliases = editMemberAliases.split(",").map((s) => s.trim()).filter(Boolean);
                  onEditMember(m.id, { name: editMemberName, aliases });
                  setEditingMemberId(null);
                }} style={{ ...btnPrimary, padding: "2px 8px", fontSize: 10 }}>{t("config.common.save")}</button>
                <button onClick={() => setEditingMemberId(null)} style={{ ...btnGhost, padding: "2px 8px", fontSize: 10 }}>{t("config.common.cancel")}</button>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex items-center gap-1" style={{ padding: "4px 8px", background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
              <span style={{ fontSize: 12, color: color.textPrimary, flex: 1 }}>{m.name}</span>
              {m.aliases.length > 0 && <span style={{ fontSize: 10, color: color.textMuted }}>{m.aliases.join(", ")}</span>}
              <button
                onClick={() => { setEditingMemberId(m.id); setEditMemberName(m.name); setEditMemberAliases(m.aliases.join(", ")); }}
                title={t("config.common.edit")}
                style={{ ...btnGhost, padding: "2px 4px", fontSize: 9, color: color.textMuted }}
              >✎</button>
              <button
                onClick={async () => {
                  if (scoringMemberId !== null) return;
                  setScoringMemberId(m.id);
                  try { await onScoreMember(m.id); } finally { setScoringMemberId(null); }
                }}
                disabled={scoringMemberId !== null}
                title="Rescore"
                style={{ minWidth: 22, height: 18, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: scoringMemberId === m.id ? color.textPrimary : color.textMuted, fontSize: 10, fontWeight: 700, cursor: scoringMemberId !== null ? "default" : "pointer" }}
              >
                {scoringMemberId === m.id ? "..." : "AI"}
              </button>
              <button onClick={() => onDeleteMember(m.id)} style={{ ...btnGhost, padding: "2px 6px", border: "none", color: color.neg }}>✕</button>
            </div>
          )
        ))}
        {domainMembers.length === 0 && <div style={{ fontSize: 11, color: color.textMuted }}>{t("config.treemap.emptyMembers")}</div>}
      </div>

      <div className="flex gap-1">
        <input value={mn} onChange={(e) => setMn(e.target.value)} placeholder={t("config.common.name")} style={{ ...smallInput, flex: 1 }} />
        <input value={ma} onChange={(e) => setMa(e.target.value)} placeholder={t("config.common.aliases")} style={{ ...smallInput, flex: 1 }} />
        <button
          onClick={async () => {
            if (!mn || addingMember) return;
            setAddingMember(true);
            try { await onAddMember(mn, ma, selectedDomain); setMn(""); setMa(""); } finally { setAddingMember(false); }
          }}
          disabled={addingMember || !mn.trim()}
          style={{ ...btnPrimary, padding: "4px 10px", fontSize: 11, opacity: addingMember ? 0.6 : 1 }}
        >
          {addingMember ? "AI" : "+"}
        </button>
      </div>
    </div>
  );
}
