import { useState, useEffect, useMemo } from "react";
import { WidgetFrame } from "@/components/widget-frame";
import { color, fontFamily, fontSize } from "@/design/tokens";
import { clamp } from "@/design/scale";
import { useMeasuredSize } from "@/design/use-measured-size";
import { useI18n } from "@/lib/use-i18n";
import type { DashboardWidget } from "@/dashboard/dashboard-types";

export type CountdownTarget = {
  id: string;
  title: string;
  target: string;   // ISO date string
  source?: string;   // "manual" | "ai"
  prompt?: string;   // original AI prompt if source=ai
  keyword?: string;  // keyword for daily auto-refresh
};

function getTimeLeft(target: Date) {
  const now = Date.now();
  const diff = target.getTime() - now;
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Browser's local timezone abbreviation (e.g. "CST", "EST"). */
function localTzAbbr(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" }).formatToParts(new Date());
    return parts.find(p => p.type === "timeZoneName")?.value || zone;
  } catch { return "UTC"; }
}

/** Migrate old single-target config to targets array. */
function resolveTargets(config: Record<string, unknown>): CountdownTarget[] {
  // New format: config.targets[]
  if (Array.isArray(config.targets) && config.targets.length > 0) {
    return config.targets as CountdownTarget[];
  }
  // Legacy format: config.target (single string)
  const legacy = config.target as string | undefined;
  if (legacy) {
    return [{ id: "legacy", title: "", target: legacy, source: "manual" }];
  }
  return [];
}

export function CountdownWidget({ widget, onConfig, onDetail, onDelete, onMinimize }: { widget: DashboardWidget; onConfig?: () => void; onDetail?: () => void; onDelete?: () => void; onMinimize?: () => void }) {
  const { t } = useI18n();
  const configLabel = (widget.config.label as string | undefined)?.trim();
  const configuredTitle = widget.title.trim();
  const title = configLabel ? configuredTitle || undefined : undefined;
  const label = configLabel || configuredTitle || t("countdown.defaultLabel");
  const { ref, size } = useMeasuredSize<HTMLDivElement>();

  const targets = useMemo(() => resolveTargets(widget.config), [widget.config]);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Find the next upcoming target
  const now = Date.now();
  const upcoming = targets
    .map((t) => ({ ...t, date: new Date(t.target) }))
    .filter((t) => !isNaN(t.date.getTime()) && t.date.getTime() > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const current = upcoming[0] ?? null;

  if (targets.length === 0) {
    return (
      <WidgetFrame widget={widget} onConfig={onConfig} onDetail={onDetail} onDelete={onDelete} onMinimize={onMinimize}>
        <div className="flex h-full flex-col items-center justify-center gap-2" style={{ color: color.textMuted }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color.textMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ fontSize: fontSize.label }}>{t("countdown.setTargetDate")}</span>
        </div>
      </WidgetFrame>
    );
  }

  const timeLeft = current ? getTimeLeft(current.date) : null;

  // Color shift: normal → amber (24h) → red (1h)
  let valueColor: string = color.textPrimary;
  if (timeLeft) {
    if (timeLeft.totalSeconds < 3600) valueColor = color.neg;
    else if (timeLeft.totalSeconds < 86400) valueColor = color.warn;
  }

  const valueSize = clamp(Math.min(size.w / 6.65, size.h / 2.05), 36, 64);
  const colonSize = clamp(valueSize * 0.95, 32, 58);
  const unitSize = clamp(size.w / 27, 11, 13);
  const segmentWidth = clamp(valueSize, 36, 64);
  const groupGap = clamp(size.w / 96, 1, 4);

  const displayLabel = current?.title || label;
  const remainingCount = upcoming.length - (current ? 1 : 0);

  return (
    <WidgetFrame widget={widget} onConfig={onConfig} onDetail={onDetail} onDelete={onDelete} onMinimize={onMinimize} contentOwnsHeader>
      <div ref={ref} className="flex h-full min-h-0 flex-col">
        <div style={{ minHeight: clamp(size.h * 0.2, 32, 42), flexShrink: 0 }}>
          {title && (
            <div style={{ fontFamily, fontSize: clamp(size.w / 28, 11, 13), fontWeight: 620, color: color.textMuted, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </div>
          )}
          <div style={{ fontFamily, fontSize: clamp(size.w / 19, 14, 17), fontWeight: 650, color: color.textPrimary, lineHeight: 1.15, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayLabel}
          </div>
          {remainingCount > 0 && (
            <div style={{ fontSize: 10, color: color.textMuted, marginTop: 2 }}>
              {t("countdown.more").replace("{count}", String(remainingCount))}
            </div>
          )}
        </div>

        {timeLeft ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="flex items-start justify-center" style={{ gap: groupGap }}>
              {[
                [timeLeft.days.toString().padStart(2, "0"), t("countdown.unit.days")],
                [pad(timeLeft.hours), t("countdown.unit.hours")],
                [pad(timeLeft.minutes), t("countdown.unit.minutes")],
                [pad(timeLeft.seconds), t("countdown.unit.seconds")],
              ].map(([value, unit], i) => (
                <div key={unit} className="flex items-start" style={{ gap: groupGap }}>
                  {i > 0 && (
                    <span style={{ color: color.textMuted, fontFamily, fontSize: colonSize, fontWeight: 760, lineHeight: 0.92, marginTop: 0 }}>
                      :
                    </span>
                  )}
                  <div style={{ textAlign: "center", minWidth: segmentWidth }}>
                    <div style={{ color: valueColor, fontFamily, fontSize: valueSize, fontWeight: 790, fontVariantNumeric: "tabular-nums", lineHeight: 0.9 }}>
                      {value}
                    </div>
                    <div style={{ color: color.textMuted, fontFamily, fontSize: unitSize, fontWeight: 650, lineHeight: 1.05, marginTop: 8 }}>
                      {unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center" style={{ fontSize: fontSize.display, fontWeight: 700, color: color.textMuted }}>
            {t("countdown.allDone")}
          </div>
        )}

        {current && (
          <div style={{ fontFamily, fontSize: 11, color: color.textMuted, lineHeight: "18px", textAlign: "center", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            {" "}
            {current.date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            {" "}
            <span style={{ fontSize: 10, opacity: 0.7 }}>{localTzAbbr()}</span>
          </div>
        )}
      </div>
    </WidgetFrame>
  );
}
