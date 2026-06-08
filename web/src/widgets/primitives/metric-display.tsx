import { useMemo, useRef, type ReactNode } from "react";
import { color, fontFamily, fontSize, radius } from "@/design/tokens";
import { clamp, estEm, pickMetricMode, fitPrimaryLine, compactNumber, type MetricMode } from "@/design/scale";
import { useMeasuredSize } from "@/design/use-measured-size";

type MetricKind = "amount" | "score" | "count" | "percent" | "plain";

type AtLeastOneLabel =
  | { title: string; label?: string }
  | { title?: string; label: string };

type MetricDisplayProps = AtLeastOneLabel & {
  value: string;
  unit?: string;
  delta?: string;
  trend?: "up" | "down" | "flat" | "none";
  caption?: string;
  accent?: ReactNode;
  onClick?: () => void;
  kind?: MetricKind;
};

// Per-mode value sizing
const VALUE_HEIGHT_RATIO: Record<MetricMode, number> = {
  micro: 0.82, compact: 0.72, wide: 0.68, tall: 0.42, hero: 0.38, regular: 0.58,
};
const VALUE_MIN: Record<MetricMode, number> = {
  micro: 18, compact: 22, wide: 24, tall: 24, hero: 28, regular: 24,
};
const VALUE_MAX: Record<MetricMode, number> = {
  micro: 30, compact: 38, wide: 44, tall: 48, hero: 64, regular: 52,
};

export function MetricDisplay({
  title, label, value, unit, delta, trend = "none",
  caption, accent, onClick, kind = "plain",
}: MetricDisplayProps) {
  const { ref, size } = useMeasuredSize<HTMLDivElement>();
  const lastMode = useRef<MetricMode>("regular");

  const fit = useMemo(() => {
    const w = Math.max(1, size.w);
    const h = Math.max(1, size.h);
    const mode = pickMetricMode(w, h);

    const padX = clamp(Math.min(w, h) * 0.07, 6, 14);
    const padY = clamp(Math.min(w, h) * 0.07, 6, 14);
    const contentW = Math.max(1, w - padX * 2);
    const contentH = Math.max(1, h - padY * 2);

    // Content degradation
    const showLabel = mode !== "micro";
    const showCaption = Boolean(caption) && mode !== "micro" && mode !== "compact";
    const showDelta = Boolean(delta) && mode !== "micro";
    const showAccent = Boolean(accent) && mode !== "micro" && mode !== "wide";
    const compactVal = mode === "micro" || mode === "compact";

    // Reserve space for secondary content
    const labelH = showLabel ? clamp(h * 0.13, 14, 22) : 0;
    const deltaH = showDelta ? clamp(h * 0.13, 16, 24) : 0;
    const captionH = showCaption ? 18 : 0;
    const accentH = showAccent ? clamp(h * 0.22, 28, 48) : 0;
    const valueAvailH = Math.max(20, contentH - labelH - deltaH - captionH - accentH);

    // Primary line: value + unit only (NOT delta)
    const numericVal = parseFloat(value.replace(/[^0-9.-]/g, ""));
    const displayValue = compactVal && Number.isFinite(numericVal) && kind !== "score" && kind !== "percent"
      ? compactNumber(numericVal)
      : value;
    const valueEm = estEm(displayValue);
    const unitEm = unit ? estEm(unit) : 0;

    const valueSize = fitPrimaryLine({
      width: contentW, height: valueAvailH,
      valueEm, unitEm, unitRatio: 0.42,
      min: VALUE_MIN[mode], max: VALUE_MAX[mode],
      heightRatio: VALUE_HEIGHT_RATIO[mode],
    });

    // Delta as independent chip
    const deltaFont = clamp(valueSize * 0.26, 10, 13);

    const stacked = mode === "tall" || (mode === "compact" && Boolean(delta));
    lastMode.current = mode;

    return {
      mode, stacked, padX, padY, valueSize,
      unitSize: clamp(valueSize * 0.42, 11, 18),
      deltaFont,
      labelSize: clamp(Math.min(w / 15, h / 8), 10, 13),
      showLabel, showCaption, showDelta, showAccent,
      displayValue,
    };
  }, [accent, caption, delta, kind, size.h, size.w, unit, value]);

  const deltaBg = trend === "up" ? color.posBg : trend === "down" ? color.negBg : "transparent";
  const deltaFg = trend === "up" ? color.posFg : trend === "down" ? color.negFg : color.textSecondary;

  return (
    <div
      ref={ref}
      className="flex h-full min-h-0 flex-col"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : undefined, padding: `${fit.padY}px ${fit.padX}px` }}
    >
      {fit.showLabel && (title || label) && (
        <div style={{ flexShrink: 0, marginBottom: 4 }}>
          {title && (
            <div style={{
              color: color.textMuted, fontFamily, fontSize: fontSize.metricTitle,
              fontWeight: 560, lineHeight: 1.15, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{title}</div>
          )}
          {label && (
            <div style={{
              color: color.textPrimary, fontFamily, fontSize: fit.labelSize,
              fontWeight: 560, lineHeight: 1.2, marginTop: title ? 2 : 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{label}</div>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className={fit.stacked ? "flex flex-col items-center" : "flex items-baseline justify-center"}
          style={{ gap: fit.stacked ? 4 : 6, maxWidth: "100%", minWidth: 0 }}
        >
          <div className="flex items-baseline justify-center" style={{ gap: 3, minWidth: 0 }}>
            <span style={{
              color: color.textPrimary, fontFamily, fontSize: fit.valueSize,
              fontWeight: 720, fontVariantNumeric: "tabular-nums",
              lineHeight: 0.95, maxWidth: "100%", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{fit.displayValue}</span>
            {unit && (
              <span style={{
                color: color.textSecondary, fontFamily, fontSize: fit.unitSize,
                fontWeight: 600, lineHeight: 1, whiteSpace: "nowrap",
              }}>{unit}</span>
            )}
          </div>

          {fit.showDelta && delta && (
            <span style={{
              alignSelf: fit.stacked ? "center" : "baseline",
              background: deltaBg, borderRadius: radius.pill,
              color: deltaFg, fontFamily, fontSize: fit.deltaFont,
              fontWeight: 650, fontVariantNumeric: "tabular-nums",
              lineHeight: 1.15, padding: "2px 7px", whiteSpace: "nowrap",
            }}>{delta}</span>
          )}
        </div>
      </div>

      {fit.showAccent && accent && (
        <div style={{ flexShrink: 0, height: clamp(size.h * 0.22, 28, 48) }}>{accent}</div>
      )}

      {fit.showCaption && caption && (
        <div style={{
          color: color.textMuted, fontFamily, flexShrink: 0,
          fontSize: 11, lineHeight: "18px", overflow: "hidden",
          textAlign: "center", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{caption}</div>
      )}
    </div>
  );
}
