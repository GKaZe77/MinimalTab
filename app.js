// ============================================================================
// CustomTab — app.js  v4.0.0
// Privacy-first · Local-only · No tracking · No accounts
// ============================================================================

const VERSION = "4.0.0";
const STORAGE_KEY = "ct_config_v4";
const OLD_KEY = "mt_config_v2";

/* ── Weather codes (Open-Meteo) ── */
const WEATHER_CODES = {
  0: { label: "Clear", icon: "☀️", short: "Clear" },
  1: { label: "Mainly Clear", icon: "🌤️", short: "Clear" },
  2: { label: "Partly Cloudy", icon: "⛅", short: "Partly cloudy" },
  3: { label: "Overcast", icon: "☁️", short: "Cloudy" },
  45: { label: "Foggy", icon: "🌫️", short: "Fog" },
  48: { label: "Foggy", icon: "🌫️", short: "Fog" },
  51: { label: "Light Drizzle", icon: "🌦️", short: "Drizzle" },
  53: { label: "Drizzle", icon: "🌦️", short: "Drizzle" },
  55: { label: "Heavy Drizzle", icon: "🌧️", short: "Drizzle" },
  61: { label: "Light Rain", icon: "🌧️", short: "Rain" },
  63: { label: "Rain", icon: "🌧️", short: "Rain" },
  65: { label: "Heavy Rain", icon: "⛈️", short: "Heavy rain" },
  71: { label: "Light Snow", icon: "🌨️", short: "Snow" },
  73: { label: "Snow", icon: "❄️", short: "Snow" },
  75: { label: "Heavy Snow", icon: "❄️", short: "Heavy snow" },
  80: { label: "Rain Showers", icon: "🌦️", short: "Showers" },
  81: { label: "Heavy Showers", icon: "⛈️", short: "Showers" },
  95: { label: "Thunderstorm", icon: "⚡", short: "Storm" },
  96: { label: "Thunderstorm", icon: "⛈️", short: "Storm" }
};

/* ── Search engines ── */
const SEARCH_ENGINES = {
  brave:     { name: "Brave",     url: "https://search.brave.com/search?q={q}" },
  google:    { name: "Google",    url: "https://www.google.com/search?q={q}" },
  duckduckgo:{ name: "DuckDuckGo",url: "https://duckduckgo.com/?q={q}" },
  bing:      { name: "Bing",      url: "https://www.bing.com/search?q={q}" },
  kagi:      { name: "Kagi",      url: "https://kagi.com/search?q={q}" },
  custom:    { name: "Custom",    url: "" }
};

const AI_ENGINES = {
  perplexity:{ name: "Perplexity", url: "https://www.perplexity.ai/search?q={q}" },
  chatgpt:   { name: "ChatGPT",   url: "https://chatgpt.com/?q={q}" },
  claude:    { name: "Claude",    url: "https://claude.ai/new?q={q}" },
  gemini:    { name: "Gemini",    url: "https://gemini.google.com/app?q={q}" },
  custom:    { name: "Custom",    url: "" }
};

/* ── Style preset definitions ── */
const STYLE_PRESETS = {
  glass:   { name: "Glass",   bg: "#1a1a2e", accent: "#a78bfa", style: "glass" },
  minimal: { name: "Minimal", bg: "#111111", accent: "#e5e5e5", style: "minimal" },
  neon:    { name: "Neon",    bg: "#0a0e27", accent: "#00ffff", style: "neon" },
  pastel:  { name: "Pastel",  bg: "#fdf2f8", accent: "#f9a8d4", style: "pastel" },
  forest:  { name: "Forest",  bg: "#0f172a", accent: "#4ade80", style: "forest" },
  oled:    { name: "OLED",    bg: "#000000", accent: "#00d9ff", style: "oled" }
};

/* ── Default configuration ── */
const DEFAULT_CONFIG = {
  version: VERSION,
  appearance: {
    mode:            "system",   // system | light | dark
    style:           "glass",    // glass | minimal | neon | pastel | forest | oled
    accent:          "#a78bfa",
    backgroundType:  "solid",    // solid | gradient | image
    backgroundValue: ""
  },
  focus: {
    defaultOnLoad:  true,
    revealOnMove:   true,
    revealOnKey:    true,
    revealOnClick:  true,
    returnAfter:    60            // seconds; 0 = never
  },
  search: {
    engine:         "brave",
    customUrl:      "",
    openIn:         "_blank",
    aiEngine:       "perplexity",
    aiCustomUrl:    "",
    aiOpenIn:       "_blank"
  },
  links: {
    folders: [
      {
        id: "f-media",
        name: "Media",
        collapsed: false,
        links: [
          { id: "l-yt",  name: "YouTube",  url: "https://www.youtube.com/", favorite: true },
          { id: "l-nf",  name: "Netflix",  url: "https://www.netflix.com/browse", favorite: false },
          { id: "l-dp",  name: "Disney+",  url: "https://www.disneyplus.com/", favorite: false }
        ]
      },
      {
        id: "f-tools",
        name: "Tools",
        collapsed: false,
        links: [
          { id: "l-gpt", name: "ChatGPT",   url: "https://chatgpt.com/", favorite: false },
          { id: "l-wiki",name: "Wikipedia", url: "https://www.wikipedia.org", favorite: false }
        ]
      }
    ]
  },
  widgets: {
    weather: { enabled: false, location: "auto", units: "fahrenheit", showOnFocus: false, showForecast: true },
    todo:    { enabled: false, tasks: [], showCompleted: true },
    notes:   { enabled: false, content: "", title: "Notes" }
  },
  onboarding: { completed: false, timestamp: null }
};

/* ═══════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════ */

function deepMerge(target, src) {
  const out = { ...target };
  for (const [k, v] of Object.entries(src || {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge(target[k] || {}, v);
    } else {
      out[k] = Array.isArray(v) ? [...v] : v;
    }
  }
  return out;
}

function saveConfig(cfg) {
  try {
    cfg.version = VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent("ct:configSaved", { detail: cfg }));
  } catch (e) {
    console.error("[CustomTab] Failed to save config:", e);
  }
}

function migrateOldConfig(old) {
  const cfg = deepMerge({}, DEFAULT_CONFIG);

  if (old.theme) {
    cfg.appearance.accent = old.theme.brand || cfg.appearance.accent;
    const styleMap = { default:"glass", oled:"oled", glass:"glass", pastel:"pastel", cyber:"neon", forest:"forest" };
    cfg.appearance.style = styleMap[old.theme.preset] || "glass";
    if (old.theme.bg) cfg.appearance.backgroundValue = old.theme.bg;
  }

  if (Array.isArray(old.links) && old.links.length) {
    const folderMap = new Map();
    for (const link of old.links) {
      const name = link.category || "General";
      if (!folderMap.has(name)) {
        folderMap.set(name, { id: uid(), name, collapsed: false, links: [] });
      }
      folderMap.get(name).links.push({
        id: uid(), name: link.name || "Link", url: link.url || "", favorite: !!link.favorite
      });
    }
    cfg.links.folders = [...folderMap.values()];
  }

  if (old.search) {
    const eMap = { google:"google", duckduckgo:"duckduckgo", brave:"brave" };
    cfg.search.engine = eMap[old.search.engine] || "brave";
    cfg.search.customUrl = old.search.url || "";
    cfg.search.openIn = old.search.target || "_blank";
  }
  if (old.searchAI) {
    cfg.search.aiCustomUrl = old.searchAI.url || "";
    cfg.search.aiOpenIn = old.searchAI.target || "_blank";
  }

  if (old.widgets) {
    const w = old.widgets;
    if (w.weather) {
      cfg.widgets.weather.enabled = w.weather.enabled;
      cfg.widgets.weather.location = w.weather.config?.location || "auto";
      cfg.widgets.weather.units = w.weather.config?.units || "fahrenheit";
      cfg.widgets.weather.showForecast = w.weather.config?.showForecast ?? true;
    }
    if (w.todo) {
      cfg.widgets.todo.enabled = w.todo.enabled;
      cfg.widgets.todo.tasks = Array.isArray(w.todo.config?.tasks) ? w.todo.config.tasks : [];
      cfg.widgets.todo.showCompleted = w.todo.config?.showCompleted ?? true;
    }
    if (w.notes) {
      cfg.widgets.notes.enabled = w.notes.enabled;
      cfg.widgets.notes.content = w.notes.config?.content || "";
      cfg.widgets.notes.title = w.notes.config?.title || "Notes";
    }
  }

  cfg.onboarding = { completed: true, timestamp: Date.now() };
  return cfg;
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return deepMerge(DEFAULT_CONFIG, JSON.parse(raw));
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const migrated = migrateOldConfig(JSON.parse(old));
      saveConfig(migrated);
      return migrated;
    }
  } catch {}
  return deepMerge({}, DEFAULT_CONFIG);
}

/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function esc(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function showToast(msg, ms = 2400) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), ms);
}

/* ═══════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════ */

let CFG = loadConfig();
let dashVisible = false;
let inactivityTimer = null;
let weatherCache = null;

/* ═══════════════════════════════════════════════════════════
   APPEARANCE
═══════════════════════════════════════════════════════════ */

function applyAppearance() {
  const a = CFG.appearance;
  const html = document.documentElement;
  html.setAttribute("data-style", a.style || "glass");
  html.setAttribute("data-mode", a.mode || "system");
  if (a.accent) html.style.setProperty("--accent", a.accent);
}

function applyBackground() {
  const a = CFG.appearance;
  const media = document.getElementById("bg-media");
  if (!media) return;

  // Reset
  media.style.cssText = "";
  document.documentElement.style.removeProperty("--bg");
  document.body.classList.remove("has-bg-image");

  if (a.backgroundType === "solid" && a.backgroundValue) {
    document.documentElement.style.setProperty("--bg", a.backgroundValue);

  } else if (a.backgroundType === "gradient" && a.backgroundValue) {
    media.style.cssText = `position:absolute;inset:0;width:100%;height:100%;background:${a.backgroundValue};filter:none;transform:none`;
    document.body.classList.add("has-bg-image");

  } else if (a.backgroundType === "image" && a.backgroundValue) {
    const safeUrl = a.backgroundValue.replace(/'/g, "\\'");
    media.style.cssText = `position:absolute;inset:0;width:100%;height:100%;background-image:url('${safeUrl}');background-size:cover;background-position:center;filter:blur(0px) brightness(0.65);transform:scale(1.05)`;
    document.body.classList.add("has-bg-image");
  }
}

/* ═══════════════════════════════════════════════════════════
   CLOCK
═══════════════════════════════════════════════════════════ */

function pad(n) { return String(n).padStart(2, "0"); }

function getGreeting(h) {
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function updateClock() {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();

  document.getElementById("f-clock").textContent = `${pad(h)}:${pad(m)}`;

  document.getElementById("f-date").textContent = now.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric"
  });

  document.getElementById("f-greeting").textContent = getGreeting(h);
}

/* ═══════════════════════════════════════════════════════════
   FOCUS / DASHBOARD STATE
═══════════════════════════════════════════════════════════ */

function showDash(focusSearch = false) {
  if (dashVisible) { resetInactivity(); return; }
  dashVisible = true;
  document.body.classList.add("dash-on");
  document.getElementById("dash-layer").setAttribute("aria-hidden", "false");
  document.getElementById("focus-layer").setAttribute("aria-hidden", "true");
  resetInactivity();
  if (focusSearch) {
    requestAnimationFrame(() => document.getElementById("search-input")?.focus());
  }
}

function hideDash() {
  if (!dashVisible) return;
  dashVisible = false;
  document.body.classList.remove("dash-on");
  document.getElementById("dash-layer").setAttribute("aria-hidden", "true");
  document.getElementById("focus-layer").setAttribute("aria-hidden", "false");
  clearTimeout(inactivityTimer);
}

function resetInactivity() {
  clearTimeout(inactivityTimer);
  const secs = CFG.focus.returnAfter;
  if (!secs || secs <= 0) return;
  inactivityTimer = setTimeout(() => {
    if (document.getElementById("settings-modal").hidden &&
        document.getElementById("quick-open").hidden) {
      hideDash();
    }
  }, secs * 1000);
}

function setupFocusHandlers() {
  const focus = CFG.focus;

  // Reveal on mouse move
  if (focus.revealOnMove) {
    document.addEventListener("mousemove", () => {
      dashVisible ? resetInactivity() : showDash();
    }, { passive: true });
  }

  // Reveal on click (focus layer)
  if (focus.revealOnClick) {
    document.getElementById("focus-layer").addEventListener("click", () => showDash(true));
  }

  // Keyboard handling
  document.addEventListener("keydown", (e) => {
    const active = document.activeElement;
    const typing = active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable;

    // Ctrl/Cmd+K — Quick Open
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      quickOpen.toggle();
      return;
    }

    // Escape — close modals / return to focus
    if (e.key === "Escape") {
      if (!document.getElementById("quick-open").hidden) { quickOpen.close(); return; }
      if (!document.getElementById("settings-modal").hidden) { closeSettings(); return; }
      if (dashVisible) { hideDash(); return; }
    }

    // F — toggle focus (when not typing)
    if ((e.key === "f" || e.key === "F") && !typing && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      dashVisible ? hideDash() : showDash();
      return;
    }

    // Printable key while in focus mode — reveal + fill search
    if (focus.revealOnKey && !dashVisible && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
      const ch = e.key;
      e.preventDefault();
      showDash();
      requestAnimationFrame(() => {
        const inp = document.getElementById("search-input");
        if (!inp) return;
        inp.focus();
        inp.value = ch;
        inp.setSelectionRange(1, 1);
      });
      return;
    }

    if (dashVisible && !typing) resetInactivity();
  }, { passive: false });

  // Focus / settings buttons
  document.getElementById("focus-btn")?.addEventListener("click", hideDash);
  document.getElementById("settings-btn")?.addEventListener("click", openSettings);

  // Auto-show dashboard if focus mode is disabled
  if (!focus.defaultOnLoad) {
    showDash();
  }
}

/* ═══════════════════════════════════════════════════════════
   LINKS RENDERING
═══════════════════════════════════════════════════════════ */

function faviconUrl(url) {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=32`;
  } catch { return ""; }
}

function renderLinks() {
  const area = document.getElementById("links-area");
  if (!area) return;
  area.innerHTML = "";

  const folders = CFG.links.folders || [];

  // Favorites row
  const allFavs = folders.flatMap(f => f.links.filter(l => l.favorite));
  if (allFavs.length) {
    const favRow = document.createElement("div");
    favRow.className = "favorites-row";
    favRow.innerHTML = `<div class="favorites-label">Favorites</div>`;
    for (const link of allFavs) {
      favRow.appendChild(makeChip(link, true));
    }
    area.appendChild(favRow);
  }

  // Folders
  for (const folder of folders) {
    if (!folder.links || !folder.links.length) continue;
    const el = document.createElement("div");
    el.className = "link-folder";
    el.dataset.folderId = folder.id;

    const hdr = document.createElement("div");
    hdr.className = "folder-header";
    hdr.setAttribute("role", "button");
    hdr.setAttribute("aria-expanded", String(!folder.collapsed));
    hdr.innerHTML = `
      <span class="folder-caret ${folder.collapsed ? "collapsed" : ""}">▾</span>
      <span class="folder-name">${esc(folder.name)}</span>
      <button class="folder-open-all" title="Open all in folder" aria-label="Open all ${esc(folder.name)} links">Open all</button>
    `;

    const chips = document.createElement("div");
    chips.className = `folder-chips${folder.collapsed ? " collapsed" : ""}`;

    for (const link of folder.links) {
      chips.appendChild(makeChip(link, false));
    }

    hdr.addEventListener("click", (e) => {
      if (e.target.classList.contains("folder-open-all")) {
        folder.links.forEach(l => window.open(l.url, "_blank", "noopener,noreferrer"));
        return;
      }
      folder.collapsed = !folder.collapsed;
      chips.classList.toggle("collapsed", folder.collapsed);
      hdr.querySelector(".folder-caret").classList.toggle("collapsed", folder.collapsed);
      hdr.setAttribute("aria-expanded", String(!folder.collapsed));
      saveConfig(CFG);
    });

    el.appendChild(hdr);
    el.appendChild(chips);
    area.appendChild(el);
  }
}

function makeChip(link, isFav) {
  const a = document.createElement("a");
  a.className = "link-chip" + (link.favorite ? " favorite" : "");
  a.href = link.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.dataset.linkId = link.id;
  a.title = link.url;

  const fav = faviconUrl(link.url);
  a.innerHTML = fav
    ? `<img class="chip-favicon" src="${esc(fav)}" alt="" loading="lazy" onerror="this.style.display='none'">${esc(link.name)}`
    : esc(link.name);

  return a;
}

function findLink(linkId) {
  for (const folder of CFG.links.folders) {
    const link = folder.links.find(l => l.id === linkId);
    if (link) return { folder, link };
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   LINK CONTEXT MENU
═══════════════════════════════════════════════════════════ */

function setupLinkContextMenu() {
  const menu = document.getElementById("link-ctx");

  document.getElementById("links-area")?.addEventListener("contextmenu", (e) => {
    const chip = e.target.closest(".link-chip[data-link-id]");
    if (!chip) return;
    e.preventDefault();

    const { link } = findLink(chip.dataset.linkId) || {};
    if (!link) return;

    menu.innerHTML = `
      <div class="ctx-item" data-action="open"><span>↗</span> Open</div>
      <div class="ctx-item" data-action="fav"><span>${link.favorite ? "★" : "☆"}</span> ${link.favorite ? "Unfavorite" : "Favorite"}</div>
      <div class="ctx-sep"></div>
      <div class="ctx-item" data-action="edit"><span>✏</span> Edit in settings</div>
      <div class="ctx-item" data-action="delete"><span>✕</span> Remove</div>
    `;

    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 160);
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.removeAttribute("hidden");

    menu.querySelectorAll(".ctx-item").forEach(item => {
      item.addEventListener("click", () => {
        const action = item.dataset.action;
        const res = findLink(chip.dataset.linkId);
        if (!res) { menu.setAttribute("hidden", ""); return; }

        if (action === "open") {
          window.open(res.link.url, "_blank", "noopener,noreferrer");
        } else if (action === "fav") {
          res.link.favorite = !res.link.favorite;
          saveConfig(CFG);
          renderLinks();
        } else if (action === "edit") {
          openSettings("links");
        } else if (action === "delete") {
          res.folder.links = res.folder.links.filter(l => l.id !== res.link.id);
          saveConfig(CFG);
          renderLinks();
          showToast("Link removed");
        }
        menu.setAttribute("hidden", "");
      });
    });
  });

  document.addEventListener("click", () => menu.setAttribute("hidden", ""), { passive: true });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") menu.setAttribute("hidden", "");
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════
   WEATHER
═══════════════════════════════════════════════════════════ */

async function getCoords(location) {
  if (location && location !== "auto") {
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      ).then(r => r.json());
      if (r.results?.length) {
        return { lat: r.results[0].latitude, lon: r.results[0].longitude, name: r.results[0].name };
      }
    } catch {}
  }
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Your location" }),
      () => resolve({ lat: 37.7749, lon: -122.4194, name: "San Francisco" })
    );
  });
}

async function fetchWeather() {
  const w = CFG.widgets.weather;
  if (!w.enabled) return null;
  if (weatherCache) return weatherCache;

  try {
    const coords = await getCoords(w.location);
    const params = new URLSearchParams({
      latitude: coords.lat, longitude: coords.lon,
      current_weather: true,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m",
      daily: "weathercode,temperature_2m_max,temperature_2m_min",
      timezone: "auto", forecast_days: 4
    });
    const data = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`).then(r => r.json());
    if (!data.current_weather) return null;

    const code = data.current_weather.weathercode;
    const info = WEATHER_CODES[code] || WEATHER_CODES[0];
    const tempC = data.current_weather.temperature;
    const isFahr = w.units === "fahrenheit";
    const temp = isFahr ? `${(tempC * 9/5 + 32).toFixed(0)}°F` : `${tempC.toFixed(0)}°C`;

    weatherCache = { code, info, temp, tempC, coords, raw: data, isFahr };
    return weatherCache;
  } catch {
    return null;
  }
}

function updateFocusWeather(wx) {
  const el = document.getElementById("f-weather");
  if (!el) return;
  const w = CFG.widgets.weather;
  if (!w.enabled || !w.showOnFocus || !wx) { el.hidden = true; return; }
  el.textContent = `${wx.temp} · ${wx.info.label}`;
  el.hidden = false;
}

/* ═══════════════════════════════════════════════════════════
   WIDGET TILES
═══════════════════════════════════════════════════════════ */

function renderWidgets() {
  const area = document.getElementById("widgets-area");
  if (!area) return;
  area.innerHTML = "";

  const { weather, todo, notes } = CFG.widgets;

  if (weather.enabled) {
    const tile = buildWeatherTile();
    area.appendChild(tile);
    fetchWeather().then(wx => {
      updateWeatherTile(tile, wx);
      updateFocusWeather(wx);
    });
  }

  if (todo.enabled) area.appendChild(buildTodoTile());
  if (notes.enabled) area.appendChild(buildNotesTile());
}

function buildWeatherTile() {
  const el = document.createElement("div");
  el.className = "widget-tile";
  el.id = "weather-tile";
  el.innerHTML = `<div class="tile-label">Weather</div><div class="wx-main"><span class="wx-icon">⏳</span><span class="wx-temp">—</span></div>`;
  return el;
}

function updateWeatherTile(tile, wx) {
  if (!wx) {
    tile.querySelector(".wx-main").innerHTML = `<span style="font-size:.85rem;color:var(--muted)">Unable to load weather</span>`;
    return;
  }

  const daily = wx.raw.daily;
  let fcHTML = "";
  if (CFG.widgets.weather.showForecast && daily) {
    fcHTML = `<div class="wx-fc">`;
    for (let i = 1; i < Math.min(4, daily.time.length); i++) {
      const day = new Date(daily.time[i]).toLocaleDateString(undefined, { weekday: "short" });
      const fc = WEATHER_CODES[daily.weathercode[i]] || WEATHER_CODES[0];
      const maxC = daily.temperature_2m_max[i];
      const max = wx.isFahr ? `${(maxC * 9/5 + 32).toFixed(0)}°` : `${maxC.toFixed(0)}°`;
      fcHTML += `<div class="wx-fc-day"><div class="wx-fc-name">${day}</div><div class="wx-fc-icon">${fc.icon}</div><div>${max}</div></div>`;
    }
    fcHTML += `</div>`;
  }

  tile.innerHTML = `
    <div class="tile-label">Weather</div>
    <div class="wx-main">
      <span class="wx-icon">${wx.info.icon}</span>
      <div>
        <div class="wx-temp">${wx.temp}</div>
        <div class="wx-desc">${wx.info.label}</div>
        <div class="wx-loc">${wx.coords.name}</div>
      </div>
    </div>
    ${fcHTML}
  `;
}

function buildTodoTile() {
  const el = document.createElement("div");
  el.className = "widget-tile";
  renderTodo(el);
  return el;
}

function renderTodo(el) {
  const todo = CFG.widgets.todo;
  const tasks = todo.tasks || [];
  const visible = todo.showCompleted ? tasks : tasks.filter(t => !t.done);

  const listHTML = visible.map((t, i) => `
    <div class="todo-item ${t.done ? "todo-done" : ""}">
      <input type="checkbox" id="td-${i}" ${t.done ? "checked" : ""} data-idx="${i}">
      <label for="td-${i}">${esc(t.text)}</label>
      <button class="todo-del-btn" data-del="${i}" aria-label="Remove task">✕</button>
    </div>
  `).join("");

  el.innerHTML = `
    <div class="tile-label">To-do</div>
    <div class="todo-list">${listHTML || `<span style="font-size:.82rem;color:var(--muted)">No tasks</span>`}</div>
    <div class="todo-add-row">
      <input class="todo-in" placeholder="Add a task…" maxlength="200" aria-label="New task" />
      <button class="todo-add-btn" aria-label="Add task">+</button>
    </div>
  `;

  el.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      tasks[+cb.dataset.idx].done = cb.checked;
      saveConfig(CFG);
      renderTodo(el);
    });
  });

  el.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      tasks.splice(+btn.dataset.del, 1);
      todo.tasks = tasks;
      saveConfig(CFG);
      renderTodo(el);
    });
  });

  const inp = el.querySelector(".todo-in");
  const add = () => {
    const text = inp.value.trim();
    if (!text) return;
    tasks.push({ text, done: false });
    todo.tasks = tasks;
    saveConfig(CFG);
    inp.value = "";
    renderTodo(el);
  };
  el.querySelector(".todo-add-btn").addEventListener("click", add);
  inp.addEventListener("keydown", e => { if (e.key === "Enter") add(); });
}

function buildNotesTile() {
  const el = document.createElement("div");
  el.className = "widget-tile";
  const notes = CFG.widgets.notes;

  el.innerHTML = `
    <div class="tile-label">${esc(notes.title || "Notes")}</div>
    <textarea class="notes-ta" placeholder="Start typing…" aria-label="Notes">${esc(notes.content || "")}</textarea>
  `;

  let saveTimeout;
  el.querySelector("textarea").addEventListener("input", (e) => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      notes.content = e.target.value;
      saveConfig(CFG);
    }, 500);
  });

  return el;
}

/* ═══════════════════════════════════════════════════════════
   SEARCH
═══════════════════════════════════════════════════════════ */

let searchMode = "web";

function setupSearch() {
  const form = document.getElementById("search-form");
  const inp = document.getElementById("search-input");
  const modeWeb = document.getElementById("mode-web");
  const modeAI = document.getElementById("mode-ai");

  function setMode(m) {
    searchMode = m;
    modeWeb.classList.toggle("active", m === "web");
    modeAI.classList.toggle("active", m === "ai");
    modeWeb.setAttribute("aria-pressed", String(m === "web"));
    modeAI.setAttribute("aria-pressed", String(m === "ai"));
    inp.placeholder = m === "ai" ? "Ask AI anything…" : "Search the web…";
    inp.focus();
  }

  modeWeb.addEventListener("click", () => setMode("web"));
  modeAI.addEventListener("click", () => setMode("ai"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = inp.value.trim();
    if (!q) return;
    doSearch(q, searchMode);
    inp.value = "";
    inp.blur();
  });
}

function doSearch(q, mode) {
  const isAI = mode === "ai";
  let url, openIn;

  if (isAI) {
    const engine = AI_ENGINES[CFG.search.aiEngine];
    url = (engine && engine.url) || CFG.search.aiCustomUrl || AI_ENGINES.perplexity.url;
    openIn = CFG.search.aiOpenIn || "_blank";
  } else {
    const engine = SEARCH_ENGINES[CFG.search.engine];
    url = (engine && engine.url) || CFG.search.customUrl || SEARCH_ENGINES.brave.url;
    openIn = CFG.search.openIn || "_blank";
  }

  const finalUrl = url.includes("{q}")
    ? url.replace("{q}", encodeURIComponent(q))
    : url + encodeURIComponent(q);

  window.open(finalUrl, openIn, "noopener,noreferrer");
}

/* ═══════════════════════════════════════════════════════════
   QUICK OPEN
═══════════════════════════════════════════════════════════ */

const quickOpen = (() => {
  const el = document.getElementById("quick-open");
  const inp = document.getElementById("quick-input");
  const results = document.getElementById("quick-results");
  let selIdx = 0;
  let filteredItems = [];

  function buildItems(q) {
    const items = [];
    const lq = q.toLowerCase();

    const actions = [
      { icon: "⚙", name: "Open settings",     hint: "",      action: () => openSettings() },
      { icon: "◎", name: "Return to focus",    hint: "F",     action: hideDash },
      { icon: "💾", name: "Export backup",      hint: "",      action: exportConfig },
      { icon: "📥", name: "Import backup",      hint: "",      action: () => document.getElementById("import-file").click() },
      { icon: "➕", name: "Add link",           hint: "",      action: () => openSettings("links") },
      { icon: "🎨", name: "Appearance",         hint: "",      action: () => openSettings("appearance") },
      { icon: "⭐", name: "Open all favorites", hint: "",      action: openAllFavorites },
    ];

    const matchedActions = q ? actions.filter(a => a.name.toLowerCase().includes(lq)) : actions;

    // Web search item if query exists
    if (q) {
      items.push({ type: "search", icon: "🔍", name: `Search web for "${q}"`, hint: "", action: () => doSearch(q, "web") });
      items.push({ type: "search", icon: "🤖", name: `Ask AI: "${q}"`, hint: "", action: () => doSearch(q, "ai") });
    }

    // Links
    const linkItems = [];
    for (const folder of CFG.links.folders) {
      for (const link of folder.links) {
        if (!q || link.name.toLowerCase().includes(lq) || link.url.toLowerCase().includes(lq)) {
          linkItems.push({
            type: "link",
            icon: link.favorite ? "⭐" : "🔗",
            name: link.name,
            hint: folder.name,
            action: () => window.open(link.url, "_blank", "noopener,noreferrer")
          });
        }
      }
    }

    if (matchedActions.length) {
      if (items.length) items.push({ type: "sep", label: "Actions" });
      else items.push({ type: "label", label: "Actions" });
      items.push(...matchedActions);
    }

    if (linkItems.length) {
      items.push({ type: "label", label: "Links" });
      items.push(...linkItems.slice(0, 12));
    }

    return items;
  }

  function render(q) {
    const all = buildItems(q);
    filteredItems = all.filter(i => i.type !== "label" && i.type !== "sep");
    selIdx = 0;

    if (!all.length) {
      results.innerHTML = `<div class="q-empty">No results</div>`;
      return;
    }

    let actionIdx = 0;
    results.innerHTML = all.map(item => {
      if (item.type === "label") return `<div class="q-section">${esc(item.label)}</div>`;
      if (item.type === "sep") return `<div class="q-section">${esc(item.label)}</div>`;
      const idx = actionIdx++;
      return `<div class="q-item${idx === selIdx ? " sel" : ""}" data-idx="${idx}" role="option">
        <span class="q-item-icon">${item.icon}</span>
        <span class="q-item-name">${esc(item.name)}</span>
        ${item.hint ? `<span class="q-item-hint">${esc(item.hint)}</span>` : ""}
      </div>`;
    }).join("");

    results.querySelectorAll(".q-item").forEach(row => {
      row.addEventListener("click", () => {
        const item = filteredItems[+row.dataset.idx];
        if (item) { item.action(); close(); }
      });
    });
  }

  function highlight(dir) {
    selIdx = ((selIdx + dir) + filteredItems.length) % filteredItems.length;
    results.querySelectorAll(".q-item").forEach((row, i) => {
      row.classList.toggle("sel", i === selIdx);
      if (i === selIdx) row.scrollIntoView({ block: "nearest" });
    });
  }

  function open() {
    el.removeAttribute("hidden");
    inp.value = "";
    selIdx = 0;
    render("");
    inp.focus();
  }

  function close() {
    el.setAttribute("hidden", "");
    inp.value = "";
  }

  inp.addEventListener("input", () => render(inp.value.trim()));
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(-1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const item = filteredItems[selIdx];
      if (item) { item.action(); close(); }
    }
  });

  document.getElementById("quick-backdrop").addEventListener("click", close);

  return {
    toggle: () => el.hidden ? open() : close(),
    open, close
  };
})();

function openAllFavorites() {
  const favs = CFG.links.folders.flatMap(f => f.links.filter(l => l.favorite));
  if (!favs.length) { showToast("No favorites saved yet"); return; }
  favs.forEach(l => window.open(l.url, "_blank", "noopener,noreferrer"));
}

/* ═══════════════════════════════════════════════════════════
   SETTINGS MODAL
═══════════════════════════════════════════════════════════ */

function openSettings(tab = "appearance") {
  const modal = document.getElementById("settings-modal");
  modal.removeAttribute("hidden");
  selectTab(tab);
  showDash();
}

function closeSettings() {
  document.getElementById("settings-modal").setAttribute("hidden", "");
}

document.getElementById("settings-close")?.addEventListener("click", closeSettings);
document.getElementById("settings-modal")?.querySelector(".modal-backdrop")?.addEventListener("click", closeSettings);

document.getElementById("settings-tabs")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (btn) selectTab(btn.dataset.tab);
});

function selectTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  renderTabContent(tab);
}

function renderTabContent(tab) {
  const el = document.getElementById("settings-content");
  if (!el) return;

  const renders = {
    appearance: renderAppearanceTab,
    search:     renderSearchTab,
    links:      renderLinksTab,
    widgets:    renderWidgetsTab,
    focus:      renderFocusTab,
    background: renderBackgroundTab,
    backup:     renderBackupTab,
    about:      renderAboutTab
  };

  const fn = renders[tab];
  if (fn) fn(el);
}

/* ── Appearance tab ── */
function renderAppearanceTab(el) {
  const a = CFG.appearance;
  const swatches = Object.entries(STYLE_PRESETS).map(([key, p]) => `
    <div class="style-card ${a.style === key ? "active" : ""}" data-preset="${key}">
      <div class="style-swatch" style="background:${p.bg};border:2px solid ${p.accent}"></div>
      <div class="style-name">${p.name}</div>
    </div>
  `).join("");

  el.innerHTML = `
    <div class="s-section">Style</div>
    <div class="style-grid" id="style-grid">${swatches}</div>

    <div class="s-section" style="margin-top:1.25rem">Mode</div>
    <div class="s-row">
      <div class="s-label"><strong>Color mode</strong><span>System follows your OS preference</span></div>
      <div class="s-ctrl">
        <div class="mode-group">
          ${["system","light","dark"].map(m => `<button class="mode-opt ${a.mode===m?"active":""}" data-mode="${m}">${m.charAt(0).toUpperCase()+m.slice(1)}</button>`).join("")}
        </div>
      </div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">Accent Color</div>
    <div class="s-row">
      <div class="s-label"><strong>Accent</strong><span>Used for active elements and highlights</span></div>
      <div class="s-ctrl">
        <label class="color-swatch" title="Pick accent color">
          <input type="color" id="accent-color" value="${esc(a.accent || "#a78bfa")}" />
        </label>
        <span id="accent-hex" style="font-size:.8rem;color:var(--muted)">${esc(a.accent || "#a78bfa")}</span>
      </div>
    </div>
  `;

  el.querySelectorAll(".style-card").forEach(card => {
    card.addEventListener("click", () => {
      const preset = STYLE_PRESETS[card.dataset.preset];
      if (!preset) return;
      CFG.appearance.style = card.dataset.preset;
      CFG.appearance.accent = preset.accent;
      saveConfig(CFG);
      applyAppearance();
      renderAppearanceTab(el);
    });
  });

  el.querySelectorAll(".mode-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      CFG.appearance.mode = btn.dataset.mode;
      saveConfig(CFG);
      applyAppearance();
      el.querySelectorAll(".mode-opt").forEach(b => b.classList.toggle("active", b.dataset.mode === CFG.appearance.mode));
    });
  });

  const accentInp = el.querySelector("#accent-color");
  const accentHex = el.querySelector("#accent-hex");
  accentInp.addEventListener("input", () => {
    accentHex.textContent = accentInp.value;
    document.documentElement.style.setProperty("--accent", accentInp.value);
  });
  accentInp.addEventListener("change", () => {
    CFG.appearance.accent = accentInp.value;
    saveConfig(CFG);
    applyAppearance();
  });
}

/* ── Search tab ── */
function renderSearchTab(el) {
  const s = CFG.search;
  const engineOpts = Object.entries(SEARCH_ENGINES).map(([k, v]) =>
    `<option value="${k}" ${s.engine===k?"selected":""}>${v.name}</option>`).join("");
  const aiOpts = Object.entries(AI_ENGINES).map(([k, v]) =>
    `<option value="${k}" ${s.aiEngine===k?"selected":""}>${v.name}</option>`).join("");
  const openInOpts = `<option value="_blank" ${s.openIn==="_blank"?"selected":""}>New tab</option><option value="_self" ${s.openIn==="_self"?"selected":""}>Same tab</option>`;
  const aiOpenInOpts = `<option value="_blank" ${s.aiOpenIn==="_blank"?"selected":""}>New tab</option><option value="_self" ${s.aiOpenIn==="_self"?"selected":""}>Same tab</option>`;

  el.innerHTML = `
    <div class="s-section">Web Search</div>
    <div class="s-row">
      <div class="s-label"><strong>Default engine</strong></div>
      <div class="s-ctrl"><select class="s-select" id="s-engine">${engineOpts}</select></div>
    </div>
    <div class="s-row" id="custom-url-row" style="${s.engine==="custom"?"":"display:none"}">
      <div class="s-label"><strong>Custom URL</strong><span>Use {q} for the search query</span></div>
      <div class="s-ctrl"><input class="s-input s-input-wide" id="s-custom-url" value="${esc(s.customUrl)}" placeholder="https://example.com/search?q={q}" /></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Open results in</strong></div>
      <div class="s-ctrl"><select class="s-select" id="s-open-in">${openInOpts}</select></div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">AI Search</div>
    <div class="s-row">
      <div class="s-label"><strong>AI engine</strong></div>
      <div class="s-ctrl"><select class="s-select" id="s-ai-engine">${aiOpts}</select></div>
    </div>
    <div class="s-row" id="ai-custom-url-row" style="${s.aiEngine==="custom"?"":"display:none"}">
      <div class="s-label"><strong>Custom AI URL</strong><span>Use {q} for the query</span></div>
      <div class="s-ctrl"><input class="s-input s-input-wide" id="s-ai-custom-url" value="${esc(s.aiCustomUrl)}" placeholder="https://example.com/?q={q}" /></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Open AI results in</strong></div>
      <div class="s-ctrl"><select class="s-select" id="s-ai-open-in">${aiOpenInOpts}</select></div>
    </div>
  `;

  const bind = (id, key, sub) => {
    el.querySelector(id)?.addEventListener("change", (e) => {
      if (sub) CFG.search[sub][key] = e.target.value;
      else CFG.search[key] = e.target.value;
      saveConfig(CFG);
      if (key === "engine") {
        document.getElementById("custom-url-row").style.display = e.target.value === "custom" ? "" : "none";
      }
      if (key === "aiEngine") {
        document.getElementById("ai-custom-url-row").style.display = e.target.value === "custom" ? "" : "none";
      }
    });
  };

  bind("#s-engine", "engine");
  bind("#s-custom-url", "customUrl");
  bind("#s-open-in", "openIn");
  bind("#s-ai-engine", "aiEngine");
  bind("#s-ai-custom-url", "aiCustomUrl");
  bind("#s-ai-open-in", "aiOpenIn");

  // input events for text fields
  ["#s-custom-url", "#s-ai-custom-url"].forEach(sel => {
    el.querySelector(sel)?.addEventListener("input", (e) => {
      const key = sel === "#s-custom-url" ? "customUrl" : "aiCustomUrl";
      CFG.search[key] = e.target.value;
      saveConfig(CFG);
    });
  });
}

/* ── Links tab ── */
function renderLinksTab(el) {
  function rebuild() {
    const list = el.querySelector(".folders-list");
    if (!list) return;
    list.innerHTML = "";
    CFG.links.folders.forEach((folder, fi) => {
      list.appendChild(buildFolderEditor(folder, fi, rebuild));
    });
  }

  el.innerHTML = `
    <div class="s-section">Folders & Links</div>
    <p style="font-size:.8rem;color:var(--muted);margin-bottom:.75rem">Changes save automatically. Right-click any link on the home page for quick actions.</p>
    <div class="folders-list"></div>
    <button class="add-folder-btn" id="add-folder-btn" style="margin-top:.65rem">+ Add folder</button>
  `;

  rebuild();

  el.querySelector("#add-folder-btn").addEventListener("click", () => {
    CFG.links.folders.push({ id: uid(), name: "New folder", collapsed: false, links: [] });
    saveConfig(CFG);
    rebuild();
    renderLinks();
  });
}

function buildFolderEditor(folder, fi, onRebuild) {
  const wrap = document.createElement("div");
  wrap.className = "lfe";

  const head = document.createElement("div");
  head.className = "lfe-head";
  head.innerHTML = `
    <input class="lfe-fold-name" value="${esc(folder.name)}" placeholder="Folder name" aria-label="Folder name" />
    <button class="lfe-fold-del" title="Delete folder" aria-label="Delete folder">✕</button>
  `;

  head.querySelector(".lfe-fold-name").addEventListener("input", (e) => {
    folder.name = e.target.value;
    saveConfig(CFG);
    renderLinks();
  });
  head.querySelector(".lfe-fold-del").addEventListener("click", () => {
    if (folder.links.length && !confirm(`Delete folder "${folder.name}" and all its links?`)) return;
    CFG.links.folders.splice(fi, 1);
    saveConfig(CFG);
    onRebuild();
    renderLinks();
  });

  const body = document.createElement("div");
  body.className = "lfe-links";

  function rebuildLinks() {
    body.innerHTML = "";
    folder.links.forEach((link, li) => {
      const row = document.createElement("div");
      row.className = "lfe-link-row";
      row.innerHTML = `
        <input class="lfe-ln" value="${esc(link.name)}" placeholder="Name" aria-label="Link name" />
        <input class="lfe-lu" value="${esc(link.url)}" placeholder="https://..." aria-label="Link URL" />
        <button class="lfe-fav ${link.favorite ? "on" : ""}" title="${link.favorite ? "Unfavorite" : "Favorite"}" aria-label="Toggle favorite">★</button>
        <button class="lfe-link-del" title="Remove" aria-label="Remove link">✕</button>
      `;

      row.querySelector(".lfe-ln").addEventListener("input", (e) => {
        link.name = e.target.value; saveConfig(CFG); renderLinks();
      });
      row.querySelector(".lfe-lu").addEventListener("input", (e) => {
        link.url = e.target.value; saveConfig(CFG); renderLinks();
      });
      row.querySelector(".lfe-fav").addEventListener("click", (e) => {
        link.favorite = !link.favorite;
        e.currentTarget.classList.toggle("on", link.favorite);
        e.currentTarget.title = link.favorite ? "Unfavorite" : "Favorite";
        saveConfig(CFG);
        renderLinks();
      });
      row.querySelector(".lfe-link-del").addEventListener("click", () => {
        folder.links.splice(li, 1);
        saveConfig(CFG);
        rebuildLinks();
        renderLinks();
      });

      body.appendChild(row);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "lfe-add-link";
    addBtn.textContent = "+ Add link";
    addBtn.addEventListener("click", () => {
      folder.links.push({ id: uid(), name: "", url: "", favorite: false });
      saveConfig(CFG);
      rebuildLinks();
      renderLinks();
    });
    body.appendChild(addBtn);
  }

  rebuildLinks();
  wrap.appendChild(head);
  wrap.appendChild(body);
  return wrap;
}

/* ── Widgets tab ── */
function renderWidgetsTab(el) {
  const { weather, todo, notes } = CFG.widgets;

  el.innerHTML = `
    <div class="s-section">Weather</div>
    <div class="s-row">
      <div class="s-label"><strong>Show weather</strong><span>Uses Open-Meteo — no API key needed</span></div>
      <div class="s-ctrl">
        <label class="s-toggle" aria-label="Enable weather">
          <input type="checkbox" id="w-weather" ${weather.enabled ? "checked" : ""} />
          <span class="s-track"></span>
        </label>
      </div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Show on focus screen</strong><span>Tiny weather line under the clock</span></div>
      <div class="s-ctrl">
        <label class="s-toggle" aria-label="Show weather on focus screen">
          <input type="checkbox" id="w-wx-focus" ${weather.showOnFocus ? "checked" : ""} />
          <span class="s-track"></span>
        </label>
      </div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Location</strong><span>Leave blank or "auto" for auto-detect</span></div>
      <div class="s-ctrl"><input class="s-input" id="w-location" value="${esc(weather.location === "auto" ? "" : weather.location)}" placeholder="City name (or leave blank)" /></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Units</strong></div>
      <div class="s-ctrl">
        <select class="s-select" id="w-units">
          <option value="fahrenheit" ${weather.units==="fahrenheit"?"selected":""}>Fahrenheit (°F)</option>
          <option value="celsius" ${weather.units==="celsius"?"selected":""}>Celsius (°C)</option>
        </select>
      </div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Show forecast</strong></div>
      <div class="s-ctrl">
        <label class="s-toggle">
          <input type="checkbox" id="w-forecast" ${weather.showForecast?"checked":""} />
          <span class="s-track"></span>
        </label>
      </div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">To-do List</div>
    <div class="s-row">
      <div class="s-label"><strong>Show to-do list</strong></div>
      <div class="s-ctrl">
        <label class="s-toggle">
          <input type="checkbox" id="w-todo" ${todo.enabled?"checked":""} />
          <span class="s-track"></span>
        </label>
      </div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Show completed tasks</strong></div>
      <div class="s-ctrl">
        <label class="s-toggle">
          <input type="checkbox" id="w-todo-done" ${todo.showCompleted?"checked":""} />
          <span class="s-track"></span>
        </label>
      </div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">Notes</div>
    <div class="s-row">
      <div class="s-label"><strong>Show notes</strong></div>
      <div class="s-ctrl">
        <label class="s-toggle">
          <input type="checkbox" id="w-notes" ${notes.enabled?"checked":""} />
          <span class="s-track"></span>
        </label>
      </div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Notes title</strong></div>
      <div class="s-ctrl"><input class="s-input" id="w-notes-title" value="${esc(notes.title||"Notes")}" /></div>
    </div>
  `;

  const tog = (id, obj, key, rerender = true) => {
    el.querySelector(id)?.addEventListener("change", (e) => {
      obj[key] = e.target.checked;
      saveConfig(CFG);
      if (rerender) { weatherCache = null; renderWidgets(); }
    });
  };
  const inp2 = (id, obj, key, extra) => {
    el.querySelector(id)?.addEventListener("input", (e) => {
      obj[key] = e.target.value.trim() || (key === "location" ? "auto" : e.target.value);
      saveConfig(CFG);
      if (extra) extra();
    });
  };
  const sel = (id, obj, key) => {
    el.querySelector(id)?.addEventListener("change", (e) => {
      obj[key] = e.target.value;
      saveConfig(CFG);
      weatherCache = null;
      renderWidgets();
    });
  };

  tog("#w-weather", weather, "enabled");
  tog("#w-wx-focus", weather, "showOnFocus");
  tog("#w-forecast", weather, "showForecast");
  tog("#w-todo", todo, "enabled");
  tog("#w-todo-done", todo, "showCompleted");
  tog("#w-notes", notes, "enabled");
  inp2("#w-location", weather, "location", () => { weatherCache = null; renderWidgets(); });
  inp2("#w-notes-title", notes, "title");
  sel("#w-units", weather, "units");
}

/* ── Focus tab ── */
function renderFocusTab(el) {
  const f = CFG.focus;
  const returnOpts = [
    ["0",   "Never"],
    ["30",  "After 30 seconds"],
    ["60",  "After 1 minute"],
    ["300", "After 5 minutes"]
  ].map(([v, l]) => `<option value="${v}" ${String(f.returnAfter)===v?"selected":""}>${l}</option>`).join("");

  el.innerHTML = `
    <div class="s-section">Focus Mode</div>
    <div class="s-row">
      <div class="s-label"><strong>Start in focus mode</strong><span>Show calm clock on every new tab</span></div>
      <div class="s-ctrl"><label class="s-toggle"><input type="checkbox" id="f-default" ${f.defaultOnLoad?"checked":""}/><span class="s-track"></span></label></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Reveal on mouse move</strong></div>
      <div class="s-ctrl"><label class="s-toggle"><input type="checkbox" id="f-move" ${f.revealOnMove?"checked":""}/><span class="s-track"></span></label></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Reveal when typing</strong><span>Typing focuses the search bar</span></div>
      <div class="s-ctrl"><label class="s-toggle"><input type="checkbox" id="f-key" ${f.revealOnKey?"checked":""}/><span class="s-track"></span></label></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Reveal on click</strong></div>
      <div class="s-ctrl"><label class="s-toggle"><input type="checkbox" id="f-click" ${f.revealOnClick?"checked":""}/><span class="s-track"></span></label></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Return to focus after</strong><span>Inactivity timer</span></div>
      <div class="s-ctrl"><select class="s-select" id="f-return">${returnOpts}</select></div>
    </div>
  `;

  [["#f-default","defaultOnLoad"],["#f-move","revealOnMove"],["#f-key","revealOnKey"],["#f-click","revealOnClick"]].forEach(([id, key]) => {
    el.querySelector(id)?.addEventListener("change", (e) => { f[key] = e.target.checked; saveConfig(CFG); });
  });
  el.querySelector("#f-return")?.addEventListener("change", (e) => {
    f.returnAfter = parseInt(e.target.value, 10);
    saveConfig(CFG);
    resetInactivity();
  });
}

/* ── Background tab ── */
function renderBackgroundTab(el) {
  const a = CFG.appearance;

  el.innerHTML = `
    <div class="s-section">Background</div>
    <div class="s-row">
      <div class="s-label"><strong>Type</strong></div>
      <div class="s-ctrl">
        <select class="s-select" id="bg-type">
          <option value="solid" ${a.backgroundType==="solid"?"selected":""}>Solid color</option>
          <option value="gradient" ${a.backgroundType==="gradient"?"selected":""}>Gradient</option>
          <option value="image" ${a.backgroundType==="image"?"selected":""}>Image URL</option>
        </select>
      </div>
    </div>

    <div id="bg-solid-row" class="s-row" style="${a.backgroundType!=="solid"?"display:none":""}">
      <div class="s-label"><strong>Background color</strong></div>
      <div class="s-ctrl">
        <label class="color-swatch"><input type="color" id="bg-color" value="${esc(a.backgroundValue||"#1a1a2e")}" /></label>
      </div>
    </div>

    <div id="bg-gradient-row" class="s-row" style="${a.backgroundType!=="gradient"?"display:none":""}">
      <div class="s-label"><strong>CSS gradient</strong><span>e.g. linear-gradient(135deg, #1a1a2e, #0f0f23)</span></div>
      <div class="s-ctrl"><input class="s-input s-input-wide" id="bg-gradient" value="${esc(a.backgroundType==="gradient"?a.backgroundValue:"")}" placeholder="linear-gradient(…)" /></div>
    </div>

    <div id="bg-image-row" class="s-row" style="${a.backgroundType!=="image"?"display:none":""}">
      <div class="s-label"><strong>Image URL</strong><span>Direct link to a JPG, PNG, or WebP</span></div>
      <div class="s-ctrl"><input class="s-input s-input-wide" id="bg-image" value="${esc(a.backgroundType==="image"?a.backgroundValue:"")}" placeholder="https://example.com/photo.jpg" /></div>
    </div>
  `;

  el.querySelector("#bg-type").addEventListener("change", (e) => {
    a.backgroundType = e.target.value;
    a.backgroundValue = "";
    saveConfig(CFG);
    applyBackground();
    renderBackgroundTab(el);
  });

  el.querySelector("#bg-color")?.addEventListener("input", (e) => {
    a.backgroundValue = e.target.value;
    document.documentElement.style.setProperty("--bg", e.target.value);
  });
  el.querySelector("#bg-color")?.addEventListener("change", (e) => {
    a.backgroundValue = e.target.value;
    saveConfig(CFG);
    applyBackground();
  });

  el.querySelector("#bg-gradient")?.addEventListener("input", (e) => {
    a.backgroundValue = e.target.value;
    saveConfig(CFG);
    applyBackground();
  });

  el.querySelector("#bg-image")?.addEventListener("input", (e) => {
    a.backgroundValue = e.target.value;
    saveConfig(CFG);
    applyBackground();
  });
}

/* ── Backup tab ── */
function renderBackupTab(el) {
  el.innerHTML = `
    <div class="s-section">Export</div>
    <div class="s-row">
      <div class="s-label"><strong>Export backup</strong><span>Download your settings as a JSON file</span></div>
      <div class="s-ctrl"><button class="s-btn ghost" id="exp-btn">Download backup</button></div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">Import</div>
    <div class="s-row">
      <div class="s-label"><strong>Import backup</strong><span>Restore from a previously exported JSON file</span></div>
      <div class="s-ctrl"><button class="s-btn ghost" id="imp-btn">Choose file…</button></div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">Reset</div>
    <div class="s-row">
      <div class="s-label"><strong>Reset everything</strong><span>Deletes all settings — cannot be undone</span></div>
      <div class="s-ctrl"><button class="s-btn danger" id="reset-btn">Reset to defaults</button></div>
    </div>
  `;

  el.querySelector("#exp-btn").addEventListener("click", exportConfig);
  el.querySelector("#imp-btn").addEventListener("click", () => document.getElementById("import-file").click());
  el.querySelector("#reset-btn").addEventListener("click", () => {
    if (confirm("Reset all settings to defaults?\n\nThis will delete all your links, widgets, and theme settings. This cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(OLD_KEY);
      location.reload();
    }
  });
}

/* ── About tab ── */
function renderAboutTab(el) {
  el.innerHTML = `
    <div class="about-card">
      <p><strong>CustomTab v${esc(VERSION)}</strong></p>
      <p style="margin-top:.5rem">A calm, privacy-first new tab page. Open a new tab and find focus. Move or type to reveal your links and search.</p>
    </div>
    <div class="about-card">
      <p><strong>Privacy</strong></p>
      <p style="margin-top:.5rem">Your setup is stored locally in your browser. <strong>No analytics. No tracking. No account required.</strong> The only external requests are weather data (Open-Meteo) and favicons — and only when you've enabled those features.</p>
    </div>
    <div class="about-card">
      <p><strong>Support</strong></p>
      <p style="margin-top:.5rem">CustomTab is free forever — no subscriptions, no feature gates. If it makes your browser feel better, consider supporting the project on Ko-fi.</p>
      <a href="https://ko-fi.com/gkaze77" target="_blank" rel="noopener noreferrer" class="kofi-link">☕ Support on Ko-fi</a>
    </div>
    <div class="about-card">
      <p style="font-size:.78rem;color:var(--muted)">Keyboard shortcuts: <kbd style="background:var(--subtle);padding:.1rem .35rem;border-radius:4px;font-size:.75rem">Ctrl+K</kbd> Quick Open &nbsp;·&nbsp; <kbd style="background:var(--subtle);padding:.1rem .35rem;border-radius:4px;font-size:.75rem">F</kbd> Toggle focus &nbsp;·&nbsp; <kbd style="background:var(--subtle);padding:.1rem .35rem;border-radius:4px;font-size:.75rem">Esc</kbd> Close / focus</p>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════
   EXPORT / IMPORT
═══════════════════════════════════════════════════════════ */

function exportConfig() {
  const blob = new Blob([JSON.stringify(CFG, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customtab-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup downloaded");
}

document.getElementById("import-file")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== "object") throw new Error("Invalid file");
      // Detect old format
      if (data.widgets && !data.appearance) {
        CFG = migrateOldConfig(data);
      } else {
        CFG = deepMerge(DEFAULT_CONFIG, data);
      }
      saveConfig(CFG);
      applyAppearance();
      applyBackground();
      renderLinks();
      renderWidgets();
      showToast("Backup imported");
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

/* ═══════════════════════════════════════════════════════════
   ONBOARDING
═══════════════════════════════════════════════════════════ */

function checkOnboarding() {
  if (CFG.onboarding.completed) return;

  const toast = document.getElementById("toast");
  if (!toast) return;

  // Simple non-intrusive welcome on first load
  setTimeout(() => {
    showToast("Welcome to CustomTab · Move mouse or press any key to get started", 5000);
    CFG.onboarding.completed = true;
    CFG.onboarding.timestamp = Date.now();
    saveConfig(CFG);
  }, 1200);
}

/* ═══════════════════════════════════════════════════════════
   MULTI-TAB SYNC
═══════════════════════════════════════════════════════════ */

window.addEventListener("storage", (e) => {
  if (e.key !== STORAGE_KEY) return;
  try {
    const fresh = JSON.parse(e.newValue);
    if (fresh) {
      CFG = deepMerge(DEFAULT_CONFIG, fresh);
      applyAppearance();
      applyBackground();
      renderLinks();
      weatherCache = null;
      renderWidgets();
    }
  } catch {}
});

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */

function init() {
  applyAppearance();
  applyBackground();

  updateClock();
  setInterval(updateClock, 15000);

  setupFocusHandlers();
  setupLinkContextMenu();
  renderLinks();
  renderWidgets();
  setupSearch();

  // Weather on focus screen (if enabled)
  if (CFG.widgets.weather.enabled && CFG.widgets.weather.showOnFocus) {
    fetchWeather().then(updateFocusWeather);
  }

  checkOnboarding();
}

init();
