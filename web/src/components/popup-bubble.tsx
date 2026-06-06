import { type ReactNode } from "react";
import { color, radius, shadowElev } from "@/design/tokens";

type PopupBubbleProps = {
  x: number;
  y: number;
  anchor?: "top" | "bottom";
  children: ReactNode;
};

export function PopupBubble({ x, y, anchor = "top", children }: PopupBubbleProps) {
  const baseTransform = anchor === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)";
  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{
        left: x,
        top: y,
        ["--popup-transform" as string]: baseTransform,
        transform: `${baseTransform} scale(1)`,
        animation: "popup-bounce 0.25s ease-out forwards",
      }}
    >
      <div
        style={{
          background: color.surface2,
          border: `1px solid ${color.hairline}`,
          borderRadius: radius.inner,
          padding: "8px 12px",
          fontSize: 12,
          color: color.textPrimary,
          boxShadow: shadowElev,
          maxWidth: 280,
          whiteSpace: "normal",
          lineHeight: 1.4,
        }}
      >
        {children}
      </div>
      {/* Arrow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          ...(anchor === "top"
            ? { bottom: -4, transform: "translateX(-50%)" }
            : { top: -4, transform: "translateX(-50%)" }),
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          ...(anchor === "top"
            ? { borderTop: `5px solid ${color.hairline}` }
            : { borderBottom: `5px solid ${color.hairline}` }),
        }}
      />
    </div>
  );
}
