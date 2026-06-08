import { useMemo, type ReactNode } from "react";
import { color, fontFamily, fontSize } from "@/design/tokens";
import { clamp, estEm, pickMetricMode, fitPrimaryLine, type MetricMode } from "@/design/scale";
import { useMeasuredSize } from "@/design/use-measured-size";

type WeatherMetricProps = {
  location: string;
  temperature: number;
  unit?: "C" | "F";
  condition?: string;
  icon?: ReactNode;
  windText?: string;
  humidityText?: string;
  title?: string;
  onClick?: () => void;
};

const VALUE_HEIGHT_RATIO: Record<MetricMode, number> = {
  micro: 0.82, compact: 0.72, wide: 0.65, tall: 0.42, hero: 0.38, regular: 0.58,
};
const VALUE_MIN: Record<MetricMode, number> = {
  micro: 20, compact: 26, wide: 28, tall: 28, hero: 34, regular: 28,
};
const VALUE_MAX: Record<MetricMode, number> = {
  micro: 32, compact: 40, wide: 48, tall: 52, hero: 64, regular: 56,
};

export function WeatherMetric({
  location, temperature, unit = "C", condition, icon,
  windText, humidityText, title, onClick,
}: WeatherMetricProps) {
  const { ref, size } = useMeasuredSize<HTMLDivElement>();

  const fit = useMemo(() => {
    const w = Math.max(1, size.w);
    const h = Math.max(1, size.h);
    const mode = pickMetricMode(w, h);

    const padX = clamp(Math.min(w, h) * 0.07, 6, 14);
    const padY = clamp(Math.min(w, h) * 0.07, 6, 14);
    const contentW = Math.max(1, w - padX * 2);
    const contentH = Math.max(1, h - padY * 2);

    const showIcon = mode !== "micro";
    const showLabel = mode !== "micro";
    const showMeta = mode !== "micro" && mode !== "compact";

    const iconH = showIcon ? clamp(h * 0.2, 24, 40) : 0;
    const labelH = showLabel ? clamp(h * 0.12, 14, 20) : 0;
    const metaH = showMeta ? 18 : 0;
    const valueAvailH = Math.max(20, contentH - iconH - labelH - metaH);

    const tempStr = `${Math.round(temperature)}`;
    const unitStr = `°${unit}`;
    const valueEm = estEm(tempStr);
    const unitEm = estEm(unitStr);

    const valueSize = fitPrimaryLine({
      width: contentW, height: valueAvailH,
      valueEm, unitEm, unitRatio: 0.42,
      min: VALUE_MIN[mode], max: VALUE_MAX[mode],
      heightRatio: VALUE_HEIGHT_RATIO[mode],
    });

    return {
      mode, padX, padY, valueSize,
      unitSize: clamp(valueSize * 0.42, 11, 18),
      labelSize: clamp(Math.min(w / 15, h / 8), 10, 13),
      showIcon, showLabel, showMeta,
    };
  }, [size.h, size.w, temperature, unit]);

  const meta = [condition, windText, humidityText].filter(Boolean).join(" · ");

  return (
    <div
      ref={ref}
      className="flex h-full min-h-0 flex-col items-center justify-center"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : undefined, padding: `${fit.padY}px ${fit.padX}px` }}
    >
      {fit.showIcon && icon && (
        <div style={{ flexShrink: 0, marginBottom: 2, color: color.textSecondary }}>{icon}</div>
      )}
      {fit.showLabel && (title || location) && (
        <div style={{ flexShrink: 0, textAlign: "center", marginBottom: 2 }}>
          {title && (
            <div style={{
              color: color.textMuted, fontFamily, fontSize: fontSize.metricTitle,
              fontWeight: 560, lineHeight: 1.15, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{title}</div>
          )}
          <div style={{
            color: color.textPrimary, fontFamily, fontSize: fit.labelSize,
            fontWeight: 560, lineHeight: 1.2, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{location}</div>
        </div>
      )}
      <div className="flex items-baseline justify-center" style={{ gap: 3 }}>
        <span style={{
          color: color.textPrimary, fontFamily, fontSize: fit.valueSize,
          fontWeight: 720, fontVariantNumeric: "tabular-nums", lineHeight: 0.95,
        }}>{Math.round(temperature)}</span>
        <span style={{
          color: color.textSecondary, fontFamily, fontSize: fit.unitSize,
          fontWeight: 600, lineHeight: 1,
        }}>°{unit}</span>
      </div>
      {fit.showMeta && meta && (
        <div style={{
          color: color.textMuted, fontFamily, flexShrink: 0,
          fontSize: 11, lineHeight: "18px", overflow: "hidden",
          textAlign: "center", textOverflow: "ellipsis", whiteSpace: "nowrap",
          marginTop: 4,
        }}>{meta}</div>
      )}
    </div>
  );
}
