import { Sun } from "lucide-react";
import { color, fontFamily } from "@/design/tokens";
import { CardShell } from "./card-shell";

type WeatherCardProps = {
  location: string;
  temperature: number;
  condition: string;
  unit?: "C" | "F";
  icon?: React.ReactNode;
  title?: string;
  onClick?: () => void;
};

export function WeatherCard({
  location,
  temperature,
  condition,
  unit = "C",
  icon,
  title,
  onClick,
}: WeatherCardProps) {
  return (
    <CardShell>
      <div
        className="flex h-full flex-col items-center justify-center text-center"
        style={{ padding: 16, cursor: onClick ? "pointer" : undefined }}
        onClick={onClick}
      >
        {icon ?? <Sun size={32} style={{ color: color.textMuted }} />}

        {title && (
          <div style={{
            fontFamily, fontSize: 10, fontWeight: 560,
            color: color.textMuted, marginTop: 8,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{title}</div>
        )}
        <div style={{
          fontFamily, fontSize: 12, fontWeight: 700,
          color: color.textSecondary, marginTop: 2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{location}</div>

        <div className="flex items-baseline" style={{ gap: 3, marginTop: 8 }}>
          <span style={{
            fontFamily, fontSize: 46, fontWeight: 760,
            color: color.textPrimary,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1, letterSpacing: "-0.06em",
          }}>{Math.round(temperature)}</span>
          <span style={{
            fontFamily, fontSize: 17, fontWeight: 600,
            color: color.textMuted, lineHeight: 1,
          }}>&deg;{unit}</span>
        </div>

        <div style={{
          fontFamily, fontSize: 13, fontWeight: 500,
          color: color.textMuted, marginTop: 8,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{condition}</div>
      </div>
    </CardShell>
  );
}
