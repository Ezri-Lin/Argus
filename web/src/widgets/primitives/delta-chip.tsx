import type { ReactNode } from "react";
import { color, radius } from "@/design/tokens";

type DeltaDirection = "up" | "down" | "flat";

const ARROW: Record<DeltaDirection, string> = {
  up: "\u25B2",
  down: "\u25BC",
  flat: "\u2022",
};

export function DeltaChip({
  direction,
  children,
}: {
  direction: DeltaDirection;
  children: ReactNode;
}) {
  const bg = direction === "up" ? color.posBg : direction === "down" ? color.negBg : "transparent";
  const fg = direction === "up" ? color.posFg : direction === "down" ? color.negFg : color.textSecondary;
  const borderColor = direction === "up" ? color.pos : direction === "down" ? color.neg : color.hairline;

  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        borderRadius: radius.pill,
        border: `1px solid ${borderColor}`,
        background: bg,
        color: fg,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        padding: "3px 8px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span>{ARROW[direction]}</span>
      <span>{children}</span>
    </span>
  );
}
