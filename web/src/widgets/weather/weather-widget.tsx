import { useState, useEffect, useCallback, type ReactNode } from "react";
import { WidgetFrame } from "@/components/widget-frame";
import { color, fontSize } from "@/design/tokens";
import { WeatherMetric } from "@/widgets/primitives/weather-metric";
import type { DashboardWidget } from "@/dashboard/dashboard-types";
import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain,
  CloudSnow, CloudLightning, Snowflake, Wind, Cloudy,
} from "lucide-react";
import { useI18n } from "@/lib/use-i18n";
import type { I18nKey } from "@/lib/i18n";

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

const WMO_I18N_KEYS: Record<number, I18nKey> = {
  0: "weather.clear", 1: "weather.mainlyClear", 2: "weather.partlyCloudy", 3: "weather.overcast",
  45: "weather.fog", 48: "weather.rimeFog",
  51: "weather.lightDrizzle", 53: "weather.drizzle", 55: "weather.denseDrizzle",
  61: "weather.lightRain", 63: "weather.rain", 65: "weather.heavyRain",
  71: "weather.lightSnow", 73: "weather.snow", 75: "weather.heavySnow",
  80: "weather.lightShowers", 81: "weather.showers", 82: "weather.violentShowers",
  95: "weather.thunderstorm", 96: "weather.tstormHail", 99: "weather.tstormHeavyHail",
};

function getWmoDesc(code: number, t: (key: I18nKey) => string): string {
  return t(WMO_I18N_KEYS[code]) || "Unknown";
}

export function WeatherWidget({ widget, onConfig, onDetail, onDelete, onMinimize }: { widget: DashboardWidget; onConfig?: () => void; onDetail?: () => void; onDelete?: () => void; onMinimize?: () => void }) {
  const { t } = useI18n();
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
      if (!res.ok) throw new Error(t("weather.fetchFailed"));
      const data = await res.json();
      setWeather(data.current_weather);
    } catch {
      setError(t("weather.loadError"));
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
          <span style={{ fontSize: fontSize.label }}>{t("weather.configureLocation")}</span>
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame widget={widget} onConfig={onConfig} onDetail={onDetail} onDelete={onDelete} onMinimize={onMinimize} contentOwnsHeader>
      {(() => {
        const current = weather ?? fallbackWeather;
        const city = location.split(",")[0] || location;
        const desc = getWmoDesc(current.weathercode, t) ?? (error ? t("weather.unavailable") : loading ? t("weather.updating") : t("weather.unknown"));
        const windUnit = unit === "F" ? "mph" : "km/h";
        const configuredLabel = typeof widget.config.label === "string" ? widget.config.label.trim() : "";
        const configuredTitle = widget.title.trim();
        const title = configuredLabel ? configuredTitle || undefined : undefined;
        const label = configuredLabel || city;
        return (
          <WeatherMetric
            title={title}
            location={label}
            temperature={current.temperature}
            unit={unit as "C" | "F"}
            icon={WMO_ICONS[current.weathercode]}
            condition={desc}
            windText={`${t("weather.wind")} ${Math.round(current.windspeed)} ${windUnit}`}
            humidityText={`${t("weather.humidity")} ${Math.round(current.humidity ?? fallbackWeather.humidity ?? 0)}%`}
          />
        );
      })()}
    </WidgetFrame>
  );
}
