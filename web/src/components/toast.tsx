import { useEffect } from "react";
import { color, radius, fontFamily } from "@/design/tokens";

export type ToastType = "success" | "error" | "info";

type ToastProps = {
  message: string;
  type: ToastType;
  onDismiss: () => void;
  duration?: number;
};

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: "rgba(63,185,80,0.12)", border: "var(--color-pos)", icon: "✓" },
  error: { bg: "rgba(248,81,73,0.12)", border: "var(--color-neg)", icon: "✕" },
  info: { bg: "rgba(139,148,158,0.12)", border: "var(--color-accent)", icon: "ℹ" },
};

export function Toast({ message, type, onDismiss, duration = 4500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  const s = TYPE_STYLES[type];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: radius.inner,
        background: color.surface,
        border: `1px solid ${s.border}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        fontFamily,
        animation: "fade-in 0.2s ease-out",
        maxWidth: 340,
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: "50%",
        background: s.bg, border: `1px solid ${s.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: s.border, flexShrink: 0,
      }}>
        {s.icon}
      </span>
      <span style={{ fontSize: 13, color: color.textPrimary, lineHeight: 1.3 }}>
        {message}
      </span>
      <button
        onClick={onDismiss}
        style={{
          marginLeft: 4, width: 18, height: 18, display: "flex",
          alignItems: "center", justifyContent: "center",
          borderRadius: 4, border: "none", background: "transparent",
          color: color.textMuted, fontSize: 12, cursor: "pointer", flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
