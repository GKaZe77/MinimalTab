// Lightweight typed event bus for intra-app communication.
const listeners = new Map();

export const bus = {
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => bus.off(event, fn);
  },
  off(event, fn) {
    listeners.get(event)?.delete(fn);
  },
  emit(event, data) {
    listeners.get(event)?.forEach(fn => {
      try { fn(data); } catch (e) { console.error(`[bus] ${event}`, e); }
    });
  }
};

// Named events used across the app
export const EV = {
  CONFIG_SAVED:      "config:saved",
  CONFIG_RELOADED:   "config:reloaded",
  DASH_SHOW:         "dash:show",
  DASH_HIDE:         "dash:hide",
  SETTINGS_OPEN:     "settings:open",
  SETTINGS_CLOSE:    "settings:close",
  TOAST:             "toast",
  LINKS_CHANGED:     "links:changed",
  WIDGETS_CHANGED:   "widgets:changed",
  WEATHER_UPDATED:   "weather:updated",
  RSS_UPDATED:       "rss:updated",
  SPOTIFY_UPDATED:   "spotify:updated",
  ONBOARDING_DONE:   "onboarding:done"
};
