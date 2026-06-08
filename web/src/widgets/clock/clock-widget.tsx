import { useState, useEffect } from "react";
import { WidgetFrame } from "@/components/widget-frame";
import { color, fontFamily } from "@/design/tokens";
import { clamp } from "@/design/scale";
import { useMeasuredSize } from "@/design/use-measured-size";
import type { DashboardWidget } from "@/dashboard/dashboard-types";
import { useI18n } from "@/lib/use-i18n";

type ClockEntry = { label: string; tz: string };

const DEFAULT_CLOCKS: ClockEntry[] = [
  { label: "Cupertino", tz: "America/Los_Angeles" },
  { label: "New York", tz: "America/New_York" },
  { label: "London", tz: "Europe/London" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
];

function resolveClocks(config: Record<string, unknown>): ClockEntry[] {
  if (Array.isArray(config.clocks) && config.clocks.length > 0) {
    const configured = config.clocks as ClockEntry[];
    const legacyLocalUtc = configured.every((c) => ["Local", "UTC"].includes(c.label));
    return legacyLocalUtc ? DEFAULT_CLOCKS : configured;
  }
  return DEFAULT_CLOCKS;
}

function formatTime(tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function formatMeta(tz: string): string {
  const offset = getOffset(tz);
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());
  return offset === "Local" ? date : `${offset}  ${date}`;
}

function getOffset(tz: string): string {
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz === localTz) return "Local";

  const now = new Date();
  const localStr = now.toLocaleString("en-US", { timeZone: localTz });
  const targetStr = now.toLocaleString("en-US", { timeZone: tz });
  const diff = (new Date(targetStr).getTime() - new Date(localStr).getTime()) / 3600000;
  const sign = diff >= 0 ? "+" : "";
  const h = Math.floor(Math.abs(diff));
  const m = Math.round((Math.abs(diff) - h) * 60);
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h${m.toString().padStart(2, "0")}m`;
}

export function ClockWidget({ widget, onConfig, onDetail, onDelete, onMinimize }: { widget: DashboardWidget; onConfig?: () => void; onDetail?: () => void; onDelete?: () => void; onMinimize?: () => void }) {
  const [, setTick] = useState(0);
  const { t } = useI18n();
  const clocks = resolveClocks(widget.config);
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localLabel = (widget.config.localLabel as string) ?? "Shanghai";
  const rows = [...clocks, { label: localLabel, tz: localTz, local: true }];
  const { ref, size } = useMeasuredSize<HTMLDivElement>();
  const rowH = Math.max(26, (size.h - 22) / rows.length);
  const titleSize = clamp(size.w / 19, 14, 17);
  const metaTopSize = clamp(size.w / 34, 10, 12);
  const citySize = clamp(rowH * 0.35, 12, 15);
  const metaSize = clamp(rowH * 0.25, 8.5, 11);
  const timeSize = clamp(Math.min(rowH * 0.58, size.w / 6.3), 20, 29);

  useEffect(() => {
    const schedule = () => {
      const msToNextMinute = 60000 - (Date.now() % 60000);
      return window.setTimeout(() => {
        setTick((t) => t + 1);
        timeout = schedule();
      }, msToNextMinute);
    };

    let timeout = schedule();
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <WidgetFrame widget={widget} onConfig={onConfig} onDetail={onDetail} onDelete={onDelete} onMinimize={onMinimize} contentOwnsHeader>
      <div ref={ref} className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex items-center justify-between" style={{ flexShrink: 0, height: 18, marginBottom: 4 }}>
          <div style={{ fontFamily, fontSize: titleSize, fontWeight: 680, color: color.textPrimary, lineHeight: 1 }}>
            {t("clock.title")}
          </div>
          <div style={{ fontFamily, fontSize: metaTopSize, fontWeight: 560, color: color.textMuted, lineHeight: 1 }}>
            {t("clock.now")}
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-hidden"
          style={{ display: "grid", gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}
        >
          {rows.map((c, i) => (
            <div
              key={`${c.label}-${c.tz}`}
              className="flex min-h-0 items-center justify-between"
              style={{
                opacity: "local" in c ? 0.55 : 1,
                borderTop: i > 0 ? `1px solid ${color.hairline}` : "none",
                paddingTop: i > 0 ? 1 : 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily, fontSize: citySize, fontWeight: 680, color: color.textPrimary, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.label}
                </div>
                <div style={{ fontFamily, fontSize: metaSize, color: color.textMuted, lineHeight: 1, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {formatMeta(c.tz)}
                </div>
              </div>
              <div style={{ fontFamily, fontSize: timeSize, fontWeight: 760, color: color.textPrimary, fontVariantNumeric: "tabular-nums", lineHeight: 1, marginLeft: 12 }}>
                {formatTime(c.tz)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </WidgetFrame>
  );
}
