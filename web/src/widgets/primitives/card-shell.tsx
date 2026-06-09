import type { ReactNode } from "react";
import { radius } from "@/design/tokens";

export function CardShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["h-full w-full overflow-hidden", className].filter(Boolean).join(" ")}
      style={{
        borderRadius: radius.card,
        border: "none",
        background: "var(--color-card)",
        boxShadow: "none",
      }}
    >
      {children}
    </div>
  );
}
