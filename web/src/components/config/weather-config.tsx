import { color } from "@/design/tokens";
import { btnPrimary, inputStyle } from "./config-styles";

type Props = {
  weatherLocation: string;
  setWeatherLocation: (v: string) => void;
  weatherSearching: boolean;
  searchLocation: () => void;
  lat: string;
  lon: string;
};

export function WeatherConfig({ weatherLocation, setWeatherLocation, weatherSearching, searchLocation, lat, lon }: Props) {
  return (
    <div>
      <label style={{ fontSize: 11, color: color.textMuted, marginBottom: 4, display: "block" }}>Location</label>
      <div className="flex gap-1.5">
        <input
          value={weatherLocation}
          onChange={(e) => setWeatherLocation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchLocation()}
          placeholder="City name (e.g. Tokyo)"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={searchLocation}
          disabled={weatherSearching}
          style={{ ...btnPrimary, padding: "8px 12px" }}
        >
          {weatherSearching ? "..." : "Find"}
        </button>
      </div>
      {lat && lon && (
        <div style={{ fontSize: 10, color: color.textMuted, marginTop: 4 }}>
          📍 {lat}, {lon}
        </div>
      )}
    </div>
  );
}
