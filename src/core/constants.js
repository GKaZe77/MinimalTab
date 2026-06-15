export const VERSION = "5.0.0";
export const STORAGE_KEY = "ct_config_v5";
export const OLD_KEYS = ["ct_config_v4", "mt_config_v2"];

export const SEARCH_ENGINES = {
  brave:      { name: "Brave",      url: "https://search.brave.com/search?q={q}" },
  google:     { name: "Google",     url: "https://www.google.com/search?q={q}" },
  duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q={q}" },
  bing:       { name: "Bing",       url: "https://www.bing.com/search?q={q}" },
  kagi:       { name: "Kagi",       url: "https://kagi.com/search?q={q}" },
  custom:     { name: "Custom",     url: "" }
};

export const AI_ENGINES = {
  perplexity: { name: "Perplexity", url: "https://www.perplexity.ai/search?q={q}" },
  chatgpt:    { name: "ChatGPT",    url: "https://chatgpt.com/?q={q}" },
  claude:     { name: "Claude",     url: "https://claude.ai/new?q={q}" },
  gemini:     { name: "Gemini",     url: "https://gemini.google.com/app?q={q}" },
  custom:     { name: "Custom",     url: "" }
};

// URL templates for search shortcuts (non-engine targets)
export const SHORTCUT_URLS = {
  youtube: "https://www.youtube.com/results?search_query={q}",
  github:  "https://github.com/search?q={q}",
  reddit:  "https://www.reddit.com/search/?q={q}"
};

export const STYLE_PRESETS = {
  glass:   { name: "Glass",   bg: "#1a1a2e", accent: "#a78bfa" },
  minimal: { name: "Minimal", bg: "#111111", accent: "#e5e5e5" },
  neon:    { name: "Neon",    bg: "#0a0e27", accent: "#00ffff" },
  pastel:  { name: "Pastel",  bg: "#fdf2f8", accent: "#f9a8d4" },
  forest:  { name: "Forest",  bg: "#0f172a", accent: "#4ade80" },
  oled:    { name: "OLED",    bg: "#000000", accent: "#00d9ff" }
};

export const WEATHER_CODES = {
  0:  { label: "Clear",         icon: "☀️" },
  1:  { label: "Mainly Clear",  icon: "🌤️" },
  2:  { label: "Partly Cloudy", icon: "⛅" },
  3:  { label: "Overcast",      icon: "☁️" },
  45: { label: "Foggy",         icon: "🌫️" },
  48: { label: "Foggy",         icon: "🌫️" },
  51: { label: "Light Drizzle", icon: "🌦️" },
  53: { label: "Drizzle",       icon: "🌦️" },
  55: { label: "Heavy Drizzle", icon: "🌧️" },
  61: { label: "Light Rain",    icon: "🌧️" },
  63: { label: "Rain",          icon: "🌧️" },
  65: { label: "Heavy Rain",    icon: "⛈️" },
  71: { label: "Light Snow",    icon: "🌨️" },
  73: { label: "Snow",          icon: "❄️" },
  75: { label: "Heavy Snow",    icon: "❄️" },
  80: { label: "Showers",       icon: "🌦️" },
  81: { label: "Heavy Showers", icon: "⛈️" },
  95: { label: "Thunderstorm",  icon: "⚡" },
  96: { label: "Thunderstorm",  icon: "⛈️" }
};
