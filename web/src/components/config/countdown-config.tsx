import { color, radius } from "@/design/tokens";
import { smallInput, btnPrimary, btnSecondary, btnGhost } from "./config-styles";

type CountdownTarget = { id: string; title: string; target: string; source?: string; keyword?: string };

type Props = {
  targets: CountdownTarget[];
  setTargets: React.Dispatch<React.SetStateAction<CountdownTarget[]>>;
  editingTargetIdx: number | null;
  setEditingTargetIdx: (v: number | null) => void;
  editTargetTitle: string;
  setEditTargetTitle: (v: string) => void;
  editTargetDate: string;
  setEditTargetDate: (v: string) => void;
  keyword: string;
  setKeyword: (v: string) => void;
  suggesting: boolean;
  suggestions: Array<{ date: string; label: string }>;
  setSuggestions: React.Dispatch<React.SetStateAction<Array<{ date: string; label: string }>>>;
  error: string;
  setError: (v: string) => void;
  selectedSuggestions: Set<number>;
  setSelectedSuggestions: React.Dispatch<React.SetStateAction<Set<number>>>;
  onSuggest: () => void;
  targetsLabel: string;
  titleLabel: string;
  datePlaceholder: string;
  emptyTargetsLabel: string;
  aiSuggestLabel: string;
  keywordPlaceholder: string;
  aiRecommendLabel: string;
  addSelectedLabel: string;
  saveLabel: string;
  cancelLabel: string;
  editTitle: string;
};

export function CountdownConfig({
  targets, setTargets,
  editingTargetIdx, setEditingTargetIdx,
  editTargetTitle, setEditTargetTitle,
  editTargetDate, setEditTargetDate,
  keyword, setKeyword,
  suggesting, suggestions, setSuggestions,
  error, setError,
  selectedSuggestions, setSelectedSuggestions,
  onSuggest,
  targetsLabel, titleLabel, datePlaceholder, emptyTargetsLabel,
  aiSuggestLabel, keywordPlaceholder, aiRecommendLabel, addSelectedLabel,
  saveLabel, cancelLabel, editTitle,
}: Props) {
  return (
    <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      {/* Existing targets */}
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>{targetsLabel}</label>
      {targets.length > 0 ? (
        <div className="flex flex-col gap-1 mb-2">
          {targets.map((ct, i) => (
            editingTargetIdx === i ? (
              <div key={ct.id} style={{ fontSize: 11 }}>
                <div className="flex gap-1 mb-1">
                  <input value={editTargetTitle} onChange={(e) => setEditTargetTitle(e.target.value)} placeholder={titleLabel} style={{ ...smallInput, flex: 1, padding: "2px 6px" }} />
                  <input value={editTargetDate} onChange={(e) => setEditTargetDate(e.target.value)} placeholder={datePlaceholder} style={{ ...smallInput, width: 100, padding: "2px 6px" }} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => {
                    const newDate = editTargetDate.trim();
                    if (!newDate || isNaN(new Date(newDate).getTime())) return;
                    setTargets((prev) => prev.map((item, j) => j === i ? { ...item, title: editTargetTitle, target: newDate } : item));
                    setEditingTargetIdx(null);
                  }} style={{ ...btnPrimary, padding: "2px 8px", fontSize: 10 }}>{saveLabel}</button>
                  <button onClick={() => setEditingTargetIdx(null)} style={{ ...btnGhost, padding: "2px 8px", fontSize: 10 }}>{cancelLabel}</button>
                </div>
              </div>
            ) : (
              <div key={ct.id} className="flex items-center gap-1" style={{ fontSize: 11 }}>
                <span className="flex-1 truncate" style={{ color: color.textPrimary }}>{ct.title || ct.target}</span>
                {ct.keyword && (
                  <span style={{ fontSize: 9, color: color.accent, background: `${color.accent}18`, padding: "1px 5px", borderRadius: 999, flexShrink: 0 }}>auto</span>
                )}
                <span style={{ color: color.textMuted, fontSize: 10, flexShrink: 0 }}>{ct.target.split("T")[0]}</span>
                <button onClick={() => { setEditingTargetIdx(i); setEditTargetTitle(ct.title); setEditTargetDate(ct.target); }} title={editTitle} style={{ ...btnGhost, padding: "0 3px", fontSize: 9, color: color.textMuted }}>✎</button>
                <button
                  onClick={() => setTargets((prev) => prev.filter((_, j) => j !== i))}
                  style={{ ...btnGhost, padding: "0 4px", border: "none", color: color.neg, fontSize: 12 }}
                >
                  x
                </button>
              </div>
            )
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: color.textMuted, marginBottom: 8 }}>{emptyTargetsLabel}</div>
      )}
      {/* Manual add */}
      <div className="flex gap-1 mb-2">
        <input
          placeholder={datePlaceholder}
          style={{ ...smallInput, flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const input = e.target as HTMLInputElement;
              const val = input.value.trim();
              if (val && !isNaN(new Date(val).getTime())) {
                setTargets((prev) => [...prev, { id: `manual-${Date.now()}`, title: "", target: val, source: "manual" }]);
                input.value = "";
              }
            }
          }}
        />
      </div>
      {/* AI suggest */}
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>{aiSuggestLabel}</label>
      <div className="flex gap-1 mb-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={keywordPlaceholder}
          style={{ ...smallInput, flex: 1 }}
        />
        <button
          onClick={onSuggest}
          disabled={suggesting}
          style={{ ...btnSecondary, opacity: suggesting ? 0.6 : 1 }}
        >
          {suggesting ? "..." : aiRecommendLabel}
        </button>
      </div>
      {error && (
        <div style={{ padding: "4px 8px", fontSize: 11, color: color.neg, background: `${color.neg}10`, borderRadius: radius.inner, marginTop: 4 }}>
          {error}
        </div>
      )}
      {suggestions.length > 0 && (
        <>
          <div className="flex flex-col gap-1">
            {suggestions.map((s, i) => (
              <label
                key={i}
                className="flex items-center gap-2"
                style={{ padding: "4px 8px", fontSize: 12, color: color.textPrimary, border: `1px solid ${color.hairline}`, borderRadius: radius.inner, cursor: "pointer", background: selectedSuggestions.has(i) ? `${color.accent}18` : "transparent" }}
              >
                <input
                  type="checkbox"
                  checked={selectedSuggestions.has(i)}
                  onChange={() => {
                    setSelectedSuggestions((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    });
                  }}
                />
                <span className="flex-1">{s.label}</span>
                <span style={{ fontSize: 10, color: color.textMuted }}>{s.date.split("T")[0]}</span>
              </label>
            ))}
          </div>
          <button
            onClick={() => {
              const toAdd = [...selectedSuggestions].map((i) => suggestions[i]).filter(Boolean);
              if (toAdd.length === 0) return;
              const kw = keyword.trim();
              setTargets((prev) => [
                ...prev,
                ...toAdd.map((s) => ({ id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: s.label, target: s.date, source: "ai", keyword: kw || undefined })),
              ]);
              setSuggestions([]);
              setSelectedSuggestions(new Set());
            }}
            style={{ ...btnPrimary, marginTop: 6, width: "100%", padding: "6px 0", fontSize: 11 }}
          >
            {addSelectedLabel} ({selectedSuggestions.size})
          </button>
        </>
      )}
    </div>
  );
}
