import { useMemo, type ReactNode } from "react";
import { color, fontFamily } from "@/design/tokens";
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
  micro: 0.84, compact: 0.74, wide: 0.68, tall: 0.46, hero: 0.42, regular: 0.62,
};
const VALUE_MIN: Record<MetricMode, number> = {
  micro: 22, compact: 28, wide: 30, tall: 30, hero: 38, regular: 30,
};
const VALUE_MAX: Record<MetricMode, number> = {
  micro: 34, compact: 42, wide: 50, tall: 56, hero: 68, regular: 58,
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

    // Aggressive hiding — weather meta takes significant space
    const showIcon = mode !== "micro";
    const showLabel = mode !== "micro";
    const showCondition = mode !== "micro" && mode !== "compact";
    const showWindHumidity = w >= 132 && h >= 126
      && mode !== "micro" && mode !== "compact";

    const iconH = showIcon ? clamp(h * 0.16, 20, 36) : 0;
    const labelH = showLabel ? clamp(h * 0.1, 12, 18) : 0;
    const conditionH = showCondition ? 16 : 0;
    const metaH = showWindHumidity ? 16 : 0;
    const valueAvailH = Math.max(24, contentH - iconH - labelH - conditionH - metaH);

    const tempStr = `${Math.round(temperature)}`;
    const unitStr = `\u00B0${unit}`;
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
      iconSize: clamp(valueSize * 0.52, 18, 28),
      labelSize: clamp(Math.min(w / 15, h / 8), 10, 13),
      showIcon, showLabel, showCondition, showWindHumidity,
    };
  }, [size.h, size.w, temperature, unit]);

  const metaParts = [windText, humidityText].filter(Boolean);
  const meta = metaParts.length > 0 ? metaParts.join(" \u00B7 ") : null;

  return (
    <div
      ref={ref}
      className="flex h-full min-h-0 flex-col items-center"
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : undefined,
        padding: `${fit.padY}px ${fit.padX}px`,
        justifyContent: "flex-start",
      }}
    >
      {fit.showIcon && icon && (
        <div style={{
          flexShrink: 0, marginBottom: 2, color: color.textSecondary,
          fontSize: fit.iconSize, lineHeight: 1,
        }}>{icon}</div>
      )}
      {fit.showLabel && (title || location) && (
        <div style={{ flexShrink: 0, textAlign: "center", marginBottom: 2 }}>
          {title && (
            <div style={{
              color: color.textMuted, fontFamily, fontSize: 10,
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
        }}>{`\u00B0${unit}`}</span>
      </div>
      {fit.showCondition && condition && (
        <div style={{
          color: color.textMuted, fontFamily, flexShrink: 0,
          fontSize: 11, lineHeight: "16px", overflow: "hidden",
          textAlign: "center", textOverflow: "ellipsis", whiteSpace: "nowrap",
          marginTop: 2,
        }}>{condition}</div>
      )}
      {fit.showWindHumidity && meta && (
        <div style={{
          color: color.textMuted, fontFamily, flexShrink: 0,
          fontSize: 10, lineHeight: "16px", overflow: "hidden",
          textAlign: "center", textOverflow: "ellipsis", whiteSpace: "nowrap",
          marginTop: 1,
        }}>{meta}</div>
      )}
    </div>
  );
}
