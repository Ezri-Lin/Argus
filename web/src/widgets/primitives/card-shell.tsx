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
        border: "1px solid var(--color-hairline)",
        background: "var(--color-card)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {children}
    </div>
  );
}
