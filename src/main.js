// CustomTab v5 — main entry point
import { initStorage, detectOldKeys, saveConfig } from "./core/storage.js?v=2026-06-15-1";
import { state } from "./core/config.js?v=2026-06-15-1";
import { bus, EV } from "./core/events.js?v=2026-06-15-1";
import { applyAppearance, applyBackground } from "./features/appearance.js?v=2026-06-15-1";
import { initFocusView, updateFocusWeather } from "./ui/focus-view.js?v=2026-06-15-1";
import { setupFocusHandlers, applyLayoutAttrs } from "./ui/app-shell.js?v=2026-06-15-1";
import { setupSearch } from "./features/search.js?v=2026-06-15-1";
import { renderBlocks, setSearchSetupFn } from "./layout/blocks.js?v=2026-06-15-1";
import { initDesignMode } from "./layout/design-mode.js?v=2026-06-15-1";
import { setupContextMenu } from "./ui/context-menu.js?v=2026-06-15-1";
import { initQuickOpen } from "./ui/quick-open.js?v=2026-06-15-1";
import { initSettings } from "./ui/settings-modal.js?v=2026-06-15-4";
import { checkOnboarding } from "./ui/onboarding.js?v=2026-06-15-1";
import { showToast } from "./ui/toast.js?v=2026-06-15-1";
import { handleSpotifyCallback } from "./integrations/spotify.js?v=2026-06-15-1";
import { fetchWeather, clearWeatherCache } from "./integrations/weather.js?v=2026-06-15-1";
console.info("[CustomTab] main build 2026-06-15-4 loaded");

async function boot() {
  // 1. Load config (must be first)
  initStorage();

  // 2. Apply appearance before first paint
  applyAppearance();
  applyBackground();
  applyLayoutAttrs();

  // 3. Focus view: clock + greeting
  initFocusView();

  // 4. Dashboard interactivity
  // Wire setupSearch into the block system so it re-runs after each renderBlocks()
  setSearchSetupFn(setupSearch);
  setupFocusHandlers();
  renderBlocks();    // renders search form + links + widgets into #blocks-container
  setupSearch();     // attaches events to freshly rendered #search-form
  setupContextMenu();
  initQuickOpen();
  initSettings();
  initDesignMode(setupSearch);

  // Favorites button — open all starred links (top-bar shortcut)
  document.getElementById("favs-btn")?.addEventListener("click", () => {
    const seen = new Set();
    const favs = (state.cfg.links.folders || [])
      .flatMap(f => (f.links || []).filter(l => l.favorite))
      .filter(l => { if (seen.has(l.url)) return false; seen.add(l.url); return true; });
    if (!favs.length) { showToast("No favorite links set."); return; }
    favs.forEach(l => window.open(l.url, "_blank", "noopener,noreferrer"));
  });

  // 5. Multi-tab sync: when another tab saves, re-render everything
  bus.on(EV.CONFIG_RELOADED, () => {
    applyAppearance();
    applyBackground();
    applyLayoutAttrs();
    renderBlocks();
    requestAnimationFrame(setupSearch);
  });

  // 6. Weather integration
  bus.on("weather:refresh", async () => {
    clearWeatherCache();
    const cfg = state.cfg;
    if (cfg.widgets.weather?.enabled && cfg.privacy.allowWeatherApi) {
      const wx = await fetchWeather(cfg.widgets.weather).catch(() => null);
      if (wx) { bus.emit(EV.WEATHER_UPDATED, wx); bus.emit(EV.WIDGETS_CHANGED); }
    }
  });

  // 7. Check for Spotify OAuth callback (?code=)
  const spotifyHandled = await handleSpotifyCallback();
  if (spotifyHandled) {
    state.cfg.widgets.spotify.enabled = true;
    saveConfig();
    showToast("Spotify connected!");
    renderBlocks();
    requestAnimationFrame(setupSearch);
  }

  // 8. Check old key migration notice
  const oldKeys = detectOldKeys();
  if (oldKeys.length && !state.cfg.onboarding.completed) {
    showMigrationNotice();
  }

  // 9. Initial weather load (if enabled + privacy allows)
  const wxCfg = state.cfg.widgets.weather;
  if (wxCfg?.enabled && state.cfg.privacy.allowWeatherApi) {
    fetchWeather(wxCfg).then(wx => {
      if (wx) bus.emit(EV.WEATHER_UPDATED, wx);
    }).catch(() => {});
  }

  // 10. Onboarding check (last so everything is ready)
  checkOnboarding();
}

function showMigrationNotice() {
  const notice = document.getElementById("migration-notice");
  if (!notice) return;
  notice.removeAttribute("hidden");
  notice.querySelector("[data-dismiss]")?.addEventListener("click", () => notice.setAttribute("hidden", ""));
  notice.querySelector("[data-settings]")?.addEventListener("click", () => { notice.setAttribute("hidden", ""); bus.emit(EV.SETTINGS_OPEN, "backup"); });
}

boot().catch(e => console.error("[CustomTab] Boot failed:", e));
