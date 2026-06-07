import { color } from "@/design/tokens";
import { btnGhost, inputStyle } from "./config-styles";
import { COMMON_TIMEZONES, type ClockEntry } from "./config-fields";

type Props = {
  clocks: ClockEntry[];
  addClock: () => void;
  removeClock: (i: number) => void;
  updateClock: (i: number, field: keyof ClockEntry, v: string) => void;
};

export function ClockConfig({ clocks, addClock, removeClock, updateClock }: Props) {
  return (
    <div>
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 6, display: "block" }}>Clocks</label>
      <div className="flex flex-col gap-2">
        {clocks.map((c, i) => (
          <div key={i} style={{ padding: 8, background: color.surface2, borderRadius: 8, border: `1px solid ${color.hairline}` }}>
            <div className="flex items-center gap-1 mb-1.5">
              <input value={c.label} onChange={(e) => updateClock(i, "label", e.target.value)} placeholder="Label" style={{ ...inputStyle, padding: "4px 6px", fontSize: 12, flex: 1 }} />
              <button onClick={() => removeClock(i)} style={{ ...btnGhost, padding: "2px 6px", border: "none", color: color.neg }}>✕</button>
            </div>
            <select value={c.tz} onChange={(e) => updateClock(i, "tz", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }}>
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <button onClick={addClock} style={{ ...btnGhost, marginTop: 8, width: "100%", padding: "6px 0", color: color.textSecondary }}>+ Add clock</button>
    </div>
  );
}
