import { WEATHER_CODES } from "../core/constants.js?v=2026-06-14-3";

let _cache = null;
let _cacheTime = 0;
const CACHE_MS = 15 * 60_000;

export function clearWeatherCache() { _cache = null; _cacheTime = 0; }

export async function fetchWeather(wCfg) {
  if (_cache && Date.now() - _cacheTime < CACHE_MS) return _cache;

  const coords = await getCoords(wCfg.location);
  if (!coords) return null;

  const params = new URLSearchParams({
    latitude:   coords.lat,
    longitude:  coords.lon,
    current_weather: true,
    current:    "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m",
    daily:      "weathercode,temperature_2m_max,temperature_2m_min",
    timezone:   "auto",
    forecast_days: 4
  });

  const data = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`).then(r => {
    if (!r.ok) throw new Error(`Weather API error: ${r.status}`);
    return r.json();
  });

  if (!data.current_weather) return null;

  const code   = data.current_weather.weathercode;
  const info   = WEATHER_CODES[code] || WEATHER_CODES[0];
  const tempC  = data.current_weather.temperature;
  const isFahr = wCfg.units === "fahrenheit";
  const temp   = isFahr ? `${(tempC * 9 / 5 + 32).toFixed(0)}°F` : `${tempC.toFixed(0)}°C`;

  _cache = { code, info, temp, tempC, isFahr, coords, raw: data };
  _cacheTime = Date.now();
  return _cache;
}

async function getCoords(location) {
  if (location && location !== "auto") {
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      ).then(r => r.json());
      if (r.results?.length) {
        const hit = r.results[0];
        return { lat: hit.latitude, lon: hit.longitude, name: hit.name };
      }
    } catch {}
  }
  // Geolocation fallback
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({ lat: 37.7749, lon: -122.4194, name: "San Francisco" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Your location" }),
      ()  => resolve({ lat: 37.7749, lon: -122.4194, name: "San Francisco" }),
      { timeout: 6000 }
    );
  });
}
