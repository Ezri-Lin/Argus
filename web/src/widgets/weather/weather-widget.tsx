import { useState, useEffect, useCallback, type ReactNode } from "react";
import { WidgetFrame } from "@/components/widget-frame";
import { color, fontSize } from "@/design/tokens";
import { MetricDisplay } from "@/widgets/primitives/metric-display";
import type { DashboardWidget } from "@/dashboard/dashboard-types";
import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain,
  CloudSnow, CloudLightning, Snowflake, Wind, Cloudy,
} from "lucide-react";

type WeatherData = {
  temperature: number;
  weathercode: number;
  windspeed: number;
  humidity?: number;
};

/** WMO code → lucide icon component */
const WMO_ICONS: Record<number, ReactNode> = {
  0: <Sun size={28} />,
  1: <Sun size={28} />,
  2: <CloudSun size={28} />,
  3: <Cloud size={28} />,
  45: <CloudFog size={28} />,
  48: <CloudFog size={28} />,
  51: <CloudDrizzle size={28} />,
  53: <CloudDrizzle size={28} />,
  55: <CloudRain size={28} />,
  61: <CloudRain size={28} />,
  63: <CloudRain size={28} />,
  65: <CloudRain size={28} />,
  71: <CloudSnow size={28} />,
  73: <Snowflake size={28} />,
  75: <CloudSnow size={28} />,
  80: <CloudDrizzle size={28} />,
  81: <CloudRain size={28} />,
  82: <CloudLightning size={28} />,
  95: <CloudLightning size={28} />,
  96: <CloudLightning size={28} />,
  99: <CloudLightning size={28} />,
};

const WMO_DESC: Record<number, string> = {
  0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Light showers", 81: "Showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "T-storm w/ hail", 99: "T-storm w/ heavy hail",
};

export function WeatherWidget({ widget, onConfig, onDetail, onDelete, onMinimize }: { widget: DashboardWidget; onConfig?: () => void; onDetail?: () => void; onDelete?: () => void; onMinimize?: () => void }) {
  const lat = widget.config.lat as number | undefined;
  const lon = widget.config.lon as number | undefined;
  const location = (widget.config.location as string) ?? "";
  const unit = (widget.config.unit as string) ?? "C";
  const fallbackWeather: WeatherData = {
    temperature: Number(widget.config.temperature ?? 18),
    weathercode: Number(widget.config.weathercode ?? 0),
    windspeed: Number(widget.config.windspeed ?? 1),
    humidity: Number(widget.config.humidity ?? 62),
  };

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    if (lat == null || lon == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&windspeed_unit=${unit === "F" ? "mph" : "kmh"}&temperature_unit=${unit === "F" ? "fahrenheit" : "celsius"}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWeather(data.current_weather);
    } catch {
      setError("Could not load weather");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, unit]);

  useEffect(() => {
    fetchWeather();
    const id = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchWeather]);

  if (lat == null || lon == null || !location) {
    return (
      <WidgetFrame widget={widget} onConfig={onConfig} onDetail={onDetail} onDelete={onDelete} onMinimize={onMinimize}>
        <div className="flex h-full flex-col items-center justify-center gap-2" style={{ color: color.textMuted }}>
          <Cloud size={28} strokeWidth={1.5} />
          <span style={{ fontSize: fontSize.label }}>Configure location to see weather</span>
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame widget={widget} onConfig={onConfig} onDetail={onDetail} onDelete={onDelete} onMinimize={onMinimize} contentOwnsHeader>
      {(() => {
        const current = weather ?? fallbackWeather;
        const city = location.split(",")[0] || location;
        const desc = WMO_DESC[current.weathercode] ?? (error ? "Weather unavailable" : loading ? "Updating" : "Unknown");
        const windUnit = unit === "F" ? "mph" : "km/h";
        const configuredLabel = typeof widget.config.label === "string" ? widget.config.label.trim() : "";
        const configuredTitle = widget.title.trim();
        const title = configuredLabel ? configuredTitle || undefined : undefined;
        const label = configuredLabel || city;
        return (
          <MetricDisplay
            title={title}
            label={label}
            value={String(Math.round(current.temperature))}
            unit={`°${unit}`}
            caption={`${desc} · 风 ${Math.round(current.windspeed)} ${windUnit} · 湿度 ${Math.round(current.humidity ?? fallbackWeather.humidity ?? 0)}%`}
          />
        );
      })()}
    </WidgetFrame>
  );
}
