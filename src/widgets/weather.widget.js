import { bus, EV } from "../core/events.js?v=2026-06-14-3";
import { esc } from "../core/dom.js?v=2026-06-14-3";
import { fetchWeather } from "../integrations/weather.js?v=2026-06-14-3";
import { WEATHER_CODES } from "../core/constants.js?v=2026-06-14-3";
import { state } from "../core/config.js?v=2026-06-14-3";

export const WeatherWidget = {
  id: "weather",
  name: "Weather",
  description: "Current weather and forecast via Open-Meteo",
  defaultSize: "medium",

  render(container, { widgetCfg }) {
    container.innerHTML = `
      <div class="tile-label">Weather</div>
      <div class="wx-main"><span class="wx-icon">⏳</span><span style="color:var(--muted);font-size:.85rem">Loading…</span></div>
    `;

    if (!state.cfg.privacy.allowWeatherApi) {
      container.innerHTML = `
        <div class="tile-label">Weather</div>
        <div class="widget-error">Weather is disabled in Privacy settings.<br>Enable "Allow Weather API" to use this widget.</div>
      `;
      return;
    }

    fetchWeather(widgetCfg).then(wx => {
      if (!wx) {
        container.innerHTML = `<div class="tile-label">Weather</div><div class="widget-error">Unable to load weather. Check your location setting or try again later.</div>`;
        return;
      }
      renderWeatherContent(container, wx, widgetCfg);
      bus.emit(EV.WEATHER_UPDATED, wx);
    }).catch(() => {
      container.innerHTML = `<div class="tile-label">Weather</div><div class="widget-error">Weather fetch failed.</div>`;
    });
  }
};

function renderWeatherContent(container, wx, wCfg) {
  const daily = wx.raw?.daily;
  let fcHTML = "";
  if (wCfg.showForecast && daily?.time) {
    fcHTML = `<div class="wx-fc">`;
    for (let i = 1; i < Math.min(4, daily.time.length); i++) {
      const day = new Date(daily.time[i] + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
      const fc  = WEATHER_CODES[daily.weathercode?.[i]] || WEATHER_CODES[0];
      const maxC = daily.temperature_2m_max?.[i] ?? 0;
      const max  = wx.isFahr ? `${(maxC * 9/5 + 32).toFixed(0)}°` : `${maxC.toFixed(0)}°`;
      fcHTML += `<div class="wx-fc-day"><div class="wx-fc-name">${esc(day)}</div><div class="wx-fc-icon">${fc?.icon||"?"}</div><div>${max}</div></div>`;
    }
    fcHTML += `</div>`;
  }

  container.innerHTML = `
    <div class="tile-label">Weather
      <div class="tile-label-actions">
        <button class="tile-action-btn" id="wx-refresh" aria-label="Refresh weather" title="Refresh">↺</button>
      </div>
    </div>
    <div class="wx-main">
      <span class="wx-icon">${wx.info?.icon || "?"}</span>
      <div>
        <div class="wx-temp">${esc(wx.temp)}</div>
        <div class="wx-desc">${esc(wx.info?.label || "")}</div>
        <div class="wx-loc">${esc(wx.coords?.name || "")}</div>
      </div>
    </div>
    ${fcHTML}
  `;

  container.querySelector("#wx-refresh")?.addEventListener("click", () => {
    import("../integrations/weather.js?v=2026-06-14-3").then(m => { m.clearWeatherCache(); bus.emit("weather:refresh"); });
  });
}
