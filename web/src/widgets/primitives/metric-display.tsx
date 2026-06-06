import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { color, fontFamily, fontSize, radius } from "@/design/tokens";
import { clamp, estEm } from "@/design/scale";
import { useMeasuredSize } from "@/design/use-measured-size";

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
};

const HEAD_H = 32;
const CAPTION_H = 18;
const ACCENT_H = 34;

export function MetricDisplay({
  title,
  label,
  value,
  unit,
  delta,
  trend = "none",
  caption,
  accent,
  onClick,
}: MetricDisplayProps) {
  const { ref, size } = useMeasuredSize<HTMLDivElement>();
  const lastStacked = useRef(false);
  const wasStacked = lastStacked.current;

  const fit = useMemo(() => {
    const w = Math.max(1, size.w);
    const h = Math.max(1, size.h);
    const valueEm = Math.max(1, estEm(value));
    const unitEm = unit ? estEm(unit) * 0.34 : 0;
    const deltaEm = delta ? estEm(delta) * 0.28 + 0.7 : 0;
    const freeH = Math.max(24, h - HEAD_H - (caption ? CAPTION_H : 0) - (accent ? ACCENT_H : 0));
    const oneLineEm = valueEm + unitEm + deltaEm + 0.6;
    const fsHorizontal = Math.min((w - 18) / oneLineEm, freeH * 0.82);
    const stackThreshold = wasStacked ? 26 : 20;
    const stacked = Boolean((unit || delta) && fsHorizontal < stackThreshold);
    const fsStacked = Math.min((w - 18) / valueEm, freeH * 0.72);
    const valueSize = clamp(stacked ? fsStacked : fsHorizontal, 14, 100);

    return {
      stacked,
      valueSize,
      unitSize: clamp(valueSize * 0.34, 9, 28),
      deltaSize: clamp(valueSize * 0.28, 9, 18),
      labelSize: clamp(w / 14, fontSize.metricLabel, 18),
    };
  }, [accent, caption, delta, size.h, size.w, unit, value, wasStacked]);

  useEffect(() => {
    lastStacked.current = fit.stacked;
  }, [fit.stacked]);

  const deltaBg =
    trend === "up" ? color.posBg :
    trend === "down" ? color.negBg :
    "transparent";
  const deltaFg =
    trend === "up" ? color.posFg :
    trend === "down" ? color.negFg :
    color.textSecondary;

  return (
    <div
      ref={ref}
      className="flex h-full min-h-0 flex-col"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      <div style={{ minHeight: HEAD_H, flexShrink: 0 }}>
        {title && (
          <div
            style={{
              color: color.textMuted,
              fontFamily,
              fontSize: fontSize.metricTitle,
              fontWeight: 560,
              letterSpacing: 0,
              lineHeight: 1.15,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        )}
        {label && (
          <div
            style={{
              color: color.textPrimary,
              fontFamily,
              fontSize: fit.labelSize,
              fontWeight: 560,
              letterSpacing: 0,
              lineHeight: 1.2,
              marginTop: title ? 3 : 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className={fit.stacked ? "flex flex-col items-center" : "flex items-baseline justify-center"}
            style={{ gap: fit.stacked ? 4 : 6, maxWidth: "100%", minWidth: 0 }}
          >
            <div className="flex items-baseline justify-center" style={{ gap: 3, minWidth: 0 }}>
              <span
                style={{
                  color: color.textPrimary,
                  fontFamily,
                  fontSize: fit.valueSize,
                  fontWeight: 720,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 0.95,
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {value}
              </span>
              {unit && (
                <span
                  style={{
                    color: color.textSecondary,
                    fontFamily,
                    fontSize: fit.unitSize,
                    fontWeight: 600,
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {unit}
                </span>
              )}
            </div>
            {delta && (
              <span
                style={{
                  alignSelf: fit.stacked ? "center" : "baseline",
                  background: deltaBg,
                  borderRadius: radius.pill,
                  color: deltaFg,
                  fontFamily,
                  fontSize: fit.deltaSize,
                  fontWeight: 650,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.15,
                  padding: "2px 7px",
                  whiteSpace: "nowrap",
                }}
              >
                {delta}
              </span>
            )}
          </div>
        </div>

        {accent && (
          <div style={{ height: ACCENT_H, flexShrink: 0 }}>
            {accent}
          </div>
        )}
      </div>

      {caption && (
        <div
          style={{
            color: color.textMuted,
            fontFamily,
            flexShrink: 0,
            fontSize: 11,
            lineHeight: `${CAPTION_H}px`,
            overflow: "hidden",
            textAlign: "center",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
