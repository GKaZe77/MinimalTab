// ============================================================================
// MinimalTab v3.0 — Settings (All Phases Complete)
// ============================================================================

const VERSION = "3.0.0";
const STORAGE_KEY = "mt_config_v2";

/* ============================================================================
   LOGGING SYSTEM (Phase 7)
   ============================================================================ */
const MT_LOG = {
  log(...args) {
    const debug = getDebugMode();
    if (debug) console.log(`[MT Settings ${new Date().toISOString()}]`, ...args);
  },
  error(...args) {
    console.error(`[MT Settings Error ${new Date().toISOString()}]`, ...args);
  },
  warn(...args) {
    console.warn(`[MT Settings Warn]`, ...args);
  },
  info(...args) {
    console.info(`[MT Settings]`, ...args);
  }
};

function getDebugMode() {
  try {
    const cfg = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return cfg?.debug || false;
  } catch {
    return false;
  }
}

/* ============================================================================
   THEME PRESETS (Phase 5)
   ============================================================================ */
const THEME_PRESETS = {
  default: {
    name: "Default",
    brand: "#ff4ecf",
    bg: "#0f0f0f",
    blurPx: 6
  },
  oled: {
    name: "OLED Black",
    brand: "#00d9ff",
    bg: "#000000",
    blurPx: 4
  },
  glass: {
    name: "Glassmorphism",
    brand: "#a78bfa",
    bg: "#1a1a2e",
    blurPx: 12
  },
  pastel: {
    name: "Pastel Dream",
    brand: "#ffd6e7",
    bg: "#fff5f7",
    blurPx: 8
  },
  cyber: {
    name: "Cyber Neon",
    brand: "#00ffff",
    bg: "#0a0e27",
    blurPx: 6
  },
  forest: {
    name: "Forest",
    brand: "#4ade80",
    bg: "#0f172a",
    blurPx: 6
  }
};

/* ============================================================================
   SEARCH ENGINES (Phase 4)
   ============================================================================ */
const SEARCH_ENGINES = {
  google: {
    name: "Google",
    url: "https://www.google.com/search?q={q}"
  },
  duckduckgo: {
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q={q}"
  },
  brave: {
    name: "Brave Search",
    url: "https://search.brave.com/search?q={q}"
  },
  custom: {
    name: "Custom",
    url: ""
  }
};

/* ============================================================================
   DEFAULT CONFIGURATION
   ============================================================================ */
const DEFAULTS = {
  version: VERSION,
  theme: { 
    brand: "#ff4ecf", 
    bg: "#0f0f0f", 
    blurPx: 6,
    preset: "default",
    adaptive: false
  },
  search: { 
    url: "https://www.google.com/search?q={q}", 
    target: "_blank",
    engine: "google",
    autocomplete: false
  },
  searchAI: { 
    url: "https://www.perplexity.ai/search?q={q}", 
    target: "_blank" 
  },
  media: { 
    miniplayer: "video", 
    background: "thumb" 
  },
  links: [
    { name: "YouTube", url: "https://www.youtube.com/feed/subscriptions", category: "Media", favorite: true },
    { name: "Disney+", url: "https://www.disneyplus.com/", category: "Media" },
    { name: "X (Twitter)", url: "https://www.x.com", category: "Social" },
    { name: "Prime Video", url: "https://www.amazon.com/gp/video/storefront?ref_=nav_cs_prime_video", category: "Media" },
    { name: "Max", url: "https://www.max.com/", category: "Media" },
    { name: "Netflix", url: "https://www.netflix.com/browse", category: "Media" },
    { name: "Wikipedia", url: "https://www.wikipedia.org", category: "Reference" },
    { name: "Instagram", url: "https://instagram.com/", category: "Social" },
    { name: "ChatGPT", url: "https://chatgpt.com/", category: "Tools" }
  ],
  videos: [],
  widgets: {
    clock: {
      enabled: true,
      placement: 0,
      size: "m",
      config: {
        format: "12h",
        showSeconds: false,
        showDate: true,
        showGreeting: true
      }
    },
    weather: {
      enabled: true,
      placement: 1,
      size: "m",
      config: {
        location: "auto",
        units: "fahrenheit",
        showForecast: true,
        showDetails: true
      }
    },
    todo: {
      enabled: false,
      placement: 2,
      size: "m",
      config: {
        tasks: [],
        showCompleted: true
      }
    },
    notes: {
      enabled: false,
      placement: 3,
      size: "l",
      config: {
        content: "",
        title: "Quick Notes"
      }
    },
    links: {
      enabled: true,
      placement: 4,
      size: "l",
      config: {
        groupByCategory: true,
        showIcons: false
      }
    },
    spotify: {
      enabled: false,
      placement: 5,
      size: "m",
      config: {
        clientId: "",
        refreshToken: ""
      }
    },
    reddit: {
      enabled: false,
      placement: 6,
      size: "m",
      config: {
        subreddit: "popular",
        limit: 5
      }
    },
    calendar: {
      enabled: false,
      placement: 7,
      size: "m",
      config: {
        apiKey: "",
        calendarId: "primary"
      }
    }
  },
  layout: {
    order: ["clock", "weather", "links", "todo", "notes", "spotify", "reddit", "calendar"],
    columns: 3
  },
  onboarding: {
    completed: false,
    timestamp: null
  },
  integrations: {
    spotify: { enabled: false },
    reddit: { enabled: false },
    calendar: { enabled: false }
  },
  debug: false
};

/* ============================================================================
   WIDGET DEFINITIONS (Phase 2)
   ============================================================================ */
const WIDGET_DEFINITIONS = {
  clock: {
    name: "Clock & Date",
    description: "Display current time and date",
    icon: "🕐",
    fields: [
      { 
        id: "format", 
        label: "Time format", 
        type: "select", 
        options: [
          { value: "12h", label: "12-hour" },
          { value: "24h", label: "24-hour" }
        ]
      },
      { id: "showSeconds", label: "Show seconds", type: "checkbox" },
      { id: "showDate", label: "Show date", type: "checkbox" },
      { id: "showGreeting", label: "Show greeting", type: "checkbox" }
    ]
  },
  weather: {
    name: "Weather",
    description: "Current weather with forecast",
    icon: "⛅",
    fields: [
      { 
        id: "location", 
        label: "Location", 
        type: "text", 
        placeholder: "auto or City Name" 
      },
      { 
        id: "units", 
        label: "Temperature units", 
        type: "select", 
        options: [
          { value: "fahrenheit", label: "Fahrenheit (°F)" },
          { value: "celsius", label: "Celsius (°C)" }
        ]
      },
      { id: "showForecast", label: "Show 3-day forecast (Phase 3)", type: "checkbox" },
      { id: "showDetails", label: "Show feels-like, humidity, wind (Phase 3)", type: "checkbox" }
    ]
  },
  todo: {
    name: "To-Do List",
    description: "Task management widget",
    icon: "✓",
    fields: [
      { id: "showCompleted", label: "Show completed tasks", type: "checkbox" }
    ]
  },
  notes: {
    name: "Quick Notes",
    description: "Simple note-taking widget",
    icon: "📝",
    fields: [
      { 
        id: "title", 
        label: "Widget title", 
        type: "text", 
        placeholder: "Quick Notes" 
      }
    ]
  },
  links: {
    name: "Links",
    description: "Your saved links and bookmarks",
    icon: "🔗",
    fields: [
      { id: "groupByCategory", label: "Group by category", type: "checkbox" },
      { id: "showIcons", label: "Show icons (coming soon)", type: "checkbox", disabled: true }
    ]
  },
  spotify: {
    name: "Spotify",
    description: "Now Playing (Phase 6)",
    icon: "🎵",
    fields: []
  },
  reddit: {
    name: "Reddit",
    description: "Latest posts (Phase 6)",
    icon: "🤖",
    fields: []
  },
  calendar: {
    name: "Calendar",
    description: "Today's events (Phase 6)",
    icon: "📅",
    fields: []
  }
};

/* ============================================================================
   UTILITY FUNCTIONS
   ============================================================================ */

function deepMerge(target, src) {
  const out = { ...target };
  for (const [k, v] of Object.entries(src || {})) {
    if (Array.isArray(v)) {
      out[k] = [...v];
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge(target[k] || {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function saveConfig(cfg) {
  try {
    cfg.version = VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    MT_LOG.info("Config saved successfully");
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify(cfg)
    }));
  } catch (e) {
    MT_LOG.error("Failed to save config:", e);
    throw e;
  }
}

/* ============================================================================
   CONFIGURATION MANAGEMENT
   ============================================================================ */

function migrateV1ToV2(v1Config) {
  MT_LOG.info("Migrating v1 config to v3");
  const v3 = deepMerge(DEFAULTS, {});
  
  if (v1Config.theme) v3.theme = { ...v3.theme, ...v1Config.theme };
  if (v1Config.search) v3.search = { ...v3.search, ...v1Config.search };
  if (v1Config.searchAI) v3.searchAI = { ...v3.searchAI, ...v1Config.searchAI };
  
  if (Array.isArray(v1Config.links)) {
    v3.links = v1Config.links.map(link => ({
      ...link,
      category: link.category || "Uncategorized"
    }));
  }
  
  if (Array.isArray(v1Config.videos)) v3.videos = v1Config.videos;
  if (v1Config.media) v3.media = { ...v3.media, ...v1Config.media };
  
  v3.onboarding = { completed: true, timestamp: Date.now() };
  
  return v3;
}

function getConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!raw) {
      const v1 = JSON.parse(localStorage.getItem("mt_config_v1"));
      if (v1) {
        MT_LOG.info("Migrating from v1");
        return migrateV1ToV2(v1);
      }
      MT_LOG.info("No config found, using defaults");
      return deepMerge(DEFAULTS, {});
    }
    MT_LOG.log("Config loaded, version:", raw.version || "2.x");
    return deepMerge(DEFAULTS, raw);
  } catch (e) {
    MT_LOG.error("Error loading config:", e);
    return deepMerge(DEFAULTS, {});
  }
}

/* ============================================================================
   DOM ELEMENTS
   ============================================================================ */

const brandColor = document.getElementById("brandColor");
const bgColor = document.getElementById("bgColor");
const blurPx = document.getElementById("blurPx");
const blurValue = document.getElementById("blurValue");
const adaptiveTheme = document.getElementById("adaptiveTheme");

const searchEngine = document.getElementById("searchEngine");
const searchUrl = document.getElementById("searchUrl");
const searchTarget = document.getElementById("searchTarget");
const searchAutocomplete = document.getElementById("searchAutocomplete");
const searchAIUrl = document.getElementById("searchAIUrl");
const searchAITarget = document.getElementById("searchAITarget");

const miniplayerMode = document.getElementById("miniplayerMode");
const backgroundMode = document.getElementById("backgroundMode");
const videosTA = document.getElementById("videos");

const widgetsList = document.getElementById("widgets-list");
const linksList = document.getElementById("linksList");
const themePresetsContainer = document.getElementById("theme-presets");

const saveBtn = document.getElementById("saveBtn");
const addLinkBtn = document.getElementById("addLink");
const resetLinksBtn = document.getElementById("resetLinks");
const importBtn = document.getElementById("importBtn");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");
const resetAllBtn = document.getElementById("resetAll");

// Integrations
const spotifyClientId = document.getElementById("spotifyClientId");
const spotifyRefreshToken = document.getElementById("spotifyRefreshToken");
const redditSubreddit = document.getElementById("redditSubreddit");
const redditLimit = document.getElementById("redditLimit");
const calendarApiKey = document.getElementById("calendarApiKey");
const calendarId = document.getElementById("calendarId");

// Advanced
const debugMode = document.getElementById("debugMode");

let CFG = getConfig();

/* ============================================================================
   UI RENDERING
   ============================================================================ */

function hydrate() {
  MT_LOG.log("Hydrating UI with config");
  
  // Theme
  brandColor.value = CFG.theme.brand || DEFAULTS.theme.brand;
  bgColor.value = CFG.theme.bg || DEFAULTS.theme.bg;
  blurPx.value = CFG.theme.blurPx ?? DEFAULTS.theme.blurPx;
  blurValue.textContent = `${blurPx.value}px`;
  adaptiveTheme.checked = Boolean(CFG.theme.adaptive);
  
  // Search
  searchEngine.value = CFG.search.engine || "google";
  searchUrl.value = CFG.search.url || DEFAULTS.search.url;
  searchTarget.value = CFG.search.target || DEFAULTS.search.target;
  searchAutocomplete.checked = Boolean(CFG.search.autocomplete);
  searchAIUrl.value = CFG.searchAI?.url || DEFAULTS.searchAI.url;
  searchAITarget.value = CFG.searchAI?.target || DEFAULTS.searchAI.target;
  
  // Media
  miniplayerMode.value = CFG.media?.miniplayer || DEFAULTS.media.miniplayer;
  backgroundMode.value = CFG.media?.background || DEFAULTS.media.background;
  videosTA.value = (CFG.videos || []).join("\n");
  
  // Integrations
  spotifyClientId.value = CFG.widgets.spotify?.config?.clientId || "";
  spotifyRefreshToken.value = CFG.widgets.spotify?.config?.refreshToken || "";
  redditSubreddit.value = CFG.widgets.reddit?.config?.subreddit || "popular";
  redditLimit.value = CFG.widgets.reddit?.config?.limit || 5;
  calendarApiKey.value = CFG.widgets.calendar?.config?.apiKey || "";
  calendarId.value = CFG.widgets.calendar?.config?.calendarId || "primary";
  
  // Advanced
  debugMode.checked = Boolean(CFG.debug);
  
  // Theme Presets
  renderThemePresets();
  
  // Widgets
  renderWidgets();
  
  // Links
  renderLinks();
  
  MT_LOG.log("UI hydration complete");
}

/* ============================================================================
   THEME PRESETS (Phase 5)
   ============================================================================ */

function renderThemePresets() {
  if (!themePresetsContainer) return;
  
  themePresetsContainer.innerHTML = "";
  
  for (const [key, preset] of Object.entries(THEME_PRESETS)) {
    const isActive = CFG.theme.preset === key;
    
    const card = document.createElement("div");
    card.className = `theme-preset ${isActive ? 'active' : ''}`;
    card.innerHTML = `
      <div class="theme-preview" style="background: ${preset.bg}; border: 2px solid ${preset.brand};">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    color: ${preset.brand}; font-weight: bold; font-size: 1.5rem;">
          Aa
        </div>
      </div>
      <div class="theme-name">${preset.name}</div>
    `;
    
    card.addEventListener("click", () => {
      CFG.theme = {
        ...CFG.theme,
        brand: preset.brand,
        bg: preset.bg,
        blurPx: preset.blurPx,
        preset: key
      };
      
      brandColor.value = preset.brand;
      bgColor.value = preset.bg;
      blurPx.value = preset.blurPx;
      blurValue.textContent = `${preset.blurPx}px`;
      
      renderThemePresets();
      
      MT_LOG.log("Theme preset selected:", key);
    });
    
    themePresetsContainer.appendChild(card);
  }
}

/* ============================================================================
   WIDGET RENDERING (Phase 2)
   ============================================================================ */

function renderWidgets() {
  if (!widgetsList) return;
  
  widgetsList.innerHTML = "";
  
  for (const [widgetId, definition] of Object.entries(WIDGET_DEFINITIONS)) {
    const widget = CFG.widgets[widgetId] || DEFAULTS.widgets[widgetId];
    if (!widget) continue;
    
    const container = document.createElement("div");
    container.className = "widget-section";
    
    const toggle = document.createElement("label");
    toggle.className = "widget-toggle";
    toggle.innerHTML = `
      <input type="checkbox" ${widget.enabled ? "checked" : ""} data-widget="${widgetId}">
      <div class="flex-1">
        <div class="font-semibold">${definition.icon} ${definition.name}</div>
        <div class="text-sm opacity-70">${definition.description}</div>
      </div>
      <svg class="w-5 h-5 transition-transform config-chevron ${widget.enabled ? 'rotate-180' : ''}" 
           fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    `;
    
    const configPanel = document.createElement("div");
    configPanel.className = `widget-config ${!widget.enabled ? 'hidden' : ''}`;
    configPanel.dataset.widgetId = widgetId;
    
    let configHTML = '<div class="space-y-3">';
    
    configHTML += `
      <div>
        <label class="block text-sm mb-1 opacity-90">Widget size</label>
        <select data-config="size" class="w-full">
          <option value="s" ${widget.size === 's' ? 'selected' : ''}>Small (1 column)</option>
          <option value="m" ${widget.size === 'm' ? 'selected' : ''}>Medium (1 column)</option>
          <option value="l" ${widget.size === 'l' ? 'selected' : ''}>Large (2 columns)</option>
        </select>
      </div>
    `;
    
    for (const field of definition.fields) {
      const value = widget.config[field.id];
      const disabled = field.disabled ? 'disabled' : '';
      
      if (field.type === "checkbox") {
        configHTML += `
          <label class="flex items-center gap-2 text-sm ${disabled ? 'opacity-50' : ''}">
            <input type="checkbox" ${value ? 'checked' : ''} data-field="${field.id}" ${disabled}>
            <span>${field.label}</span>
          </label>
        `;
      } else if (field.type === "select") {
        configHTML += `
          <div>
            <label class="block text-sm mb-1 opacity-90">${field.label}</label>
            <select data-field="${field.id}" class="w-full" ${disabled}>
              ${field.options.map(opt => `
                <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>
                  ${opt.label}
                </option>
              `).join('')}
            </select>
          </div>
        `;
      } else if (field.type === "text") {
        configHTML += `
          <div>
            <label class="block text-sm mb-1 opacity-90">${field.label}</label>
            <input type="text" 
                   data-field="${field.id}" 
                   value="${value || ''}" 
                   placeholder="${field.placeholder || ''}"
                   class="w-full"
                   ${disabled}>
          </div>
        `;
      }
    }
    
    configHTML += '</div>';
    configPanel.innerHTML = configHTML;
    
    const checkbox = toggle.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("change", (e) => {
      e.stopPropagation();
      widget.enabled = checkbox.checked;
      configPanel.classList.toggle('hidden', !checkbox.checked);
      toggle.querySelector('.config-chevron').classList.toggle('rotate-180', checkbox.checked);
      MT_LOG.log(`Widget ${widgetId} ${checkbox.checked ? 'enabled' : 'disabled'}`);
    });
    
    toggle.addEventListener("click", (e) => {
      if (e.target.tagName !== 'INPUT') {
        if (checkbox.checked) {
          configPanel.classList.toggle('hidden');
          toggle.querySelector('.config-chevron').classList.toggle('rotate-180');
        }
      }
    });
    
    container.appendChild(toggle);
    container.appendChild(configPanel);
    widgetsList.appendChild(container);
  }
  
  MT_LOG.log("Widgets rendered");
}

/* ============================================================================
   LINK RENDERING
   ============================================================================ */

function renderLinks() {
  if (!linksList) return;
  
  linksList.innerHTML = "";
  const tpl = document.getElementById("linkRow");
  if (!tpl) return;
  
  CFG.links.forEach((link, idx) => {
    const row = tpl.content.firstElementChild.cloneNode(true);
    row.dataset.index = String(idx);
    
    row.querySelector("[data-field=name]").value = link.name || "";
    row.querySelector("[data-field=url]").value = link.url || "";
    row.querySelector("[data-field=category]").value = link.category || "";
    row.querySelector("[data-field=favorite]").checked = Boolean(link.favorite);
    
    row.querySelector("[data-remove]").addEventListener("click", () => {
      CFG.links.splice(idx, 1);
      renderLinks();
      MT_LOG.log("Link removed");
    });
    
    row.addEventListener("dragstart", (e) => {
      row.classList.add("opacity-50");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(idx));
    });
    
    row.addEventListener("dragend", () => {
      row.classList.remove("opacity-50");
    });
    
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      row.classList.add("ring-2", "ring-brand");
    });
    
    row.addEventListener("dragleave", () => {
      row.classList.remove("ring-2", "ring-brand");
    });
    
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("ring-2", "ring-brand");
      
      const from = parseInt(e.dataTransfer.getData("text/plain") || "-1", 10);
      const to = idx;
      
      if (from < 0 || from === to) return;
      
      const [moved] = CFG.links.splice(from, 1);
      CFG.links.splice(to, 0, moved);
      renderLinks();
      MT_LOG.log(`Link moved from ${from} to ${to}`);
    });
    
    let touchFrom = null;
    row.addEventListener("touchstart", () => {
      touchFrom = idx;
      row.classList.add("opacity-50");
    }, { passive: true });
    
    row.addEventListener("touchend", (e) => {
      row.classList.remove("opacity-50");
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const dropRow = el?.closest?.("[data-index]");
      if (!dropRow) return;
      
      const to = parseInt(dropRow.dataset.index || "-1", 10);
      if (touchFrom === null || to < 0 || touchFrom === to) return;
      
      const [moved] = CFG.links.splice(touchFrom, 1);
      CFG.links.splice(to, 0, moved);
      touchFrom = null;
      renderLinks();
      MT_LOG.log("Link reordered via touch");
    }, { passive: true });
    
    linksList.appendChild(row);
  });
  
  MT_LOG.log(`${CFG.links.length} links rendered`);
}

/* ============================================================================
   EVENT HANDLERS
   ============================================================================ */

// Search engine selector (Phase 4)
searchEngine?.addEventListener("change", () => {
  const selected = searchEngine.value;
  if (selected !== "custom" && SEARCH_ENGINES[selected]) {
    searchUrl.value = SEARCH_ENGINES[selected].url;
  }
  searchUrl.disabled = selected !== "custom";
});

// Blur slider
blurPx?.addEventListener("input", () => {
  blurValue.textContent = `${blurPx.value}px`;
});

// Add link
addLinkBtn?.addEventListener("click", () => {
  CFG.links.push({ 
    name: "", 
    url: "", 
    category: "Uncategorized", 
    favorite: false 
  });
  renderLinks();
  linksList.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
  MT_LOG.log("New link added");
});

// Reset links
resetLinksBtn?.addEventListener("click", () => {
  if (confirm("Reset all links to defaults? This cannot be undone.")) {
    CFG.links = DEFAULTS.links.map(x => ({ ...x }));
    renderLinks();
    MT_LOG.log("Links reset to defaults");
  }
});

// Reset all (Phase 7)
resetAllBtn?.addEventListener("click", () => {
  if (confirm("⚠️ Reset ALL settings to default?\n\nThis will delete:\n• All your links\n• All widget configurations\n• All theme settings\n• All integration settings\n\nThis CANNOT be undone!")) {
    if (confirm("Are you absolutely sure? This action is permanent.")) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("mt_config_v1");
      MT_LOG.info("All settings reset");
      window.location.reload();
    }
  }
});

// Save configuration
saveBtn?.addEventListener("click", () => {
  MT_LOG.log("Saving configuration...");
  
  try {
    // Collect theme
    CFG.theme = {
      brand: brandColor.value,
      bg: bgColor.value,
      blurPx: parseInt(blurPx.value, 10) || 0,
      preset: CFG.theme.preset || "custom",
      adaptive: adaptiveTheme.checked
    };
    
    // Collect search
    CFG.search = {
      url: (searchUrl.value || DEFAULTS.search.url).trim(),
      target: searchTarget.value,
      engine: searchEngine.value,
      autocomplete: searchAutocomplete.checked
    };
    
    CFG.searchAI = {
      url: (searchAIUrl.value || DEFAULTS.searchAI.url).trim(),
      target: searchAITarget.value
    };
    
    // Collect media
    CFG.media = {
      miniplayer: miniplayerMode.value,
      background: backgroundMode.value
    };
    
    // Collect videos
    const urls = (videosTA.value || "")
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    CFG.videos = urls;
    
    // Collect widget configs
    document.querySelectorAll('.widget-config').forEach(panel => {
      const widgetId = panel.dataset.widgetId;
      const widget = CFG.widgets[widgetId];
      if (!widget) return;
      
      const sizeSelect = panel.querySelector('[data-config="size"]');
      if (sizeSelect) {
        widget.size = sizeSelect.value;
      }
      
      panel.querySelectorAll('[data-field]').forEach(input => {
        const fieldId = input.dataset.field;
        
        if (input.type === "checkbox") {
          widget.config[fieldId] = input.checked;
        } else if (input.tagName === "SELECT") {
          widget.config[fieldId] = input.value;
        } else {
          widget.config[fieldId] = input.value.trim();
        }
      });
    });
    
    // Collect integration configs (Phase 6)
    if (CFG.widgets.spotify) {
      CFG.widgets.spotify.config = {
        clientId: spotifyClientId.value.trim(),
        refreshToken: spotifyRefreshToken.value.trim()
      };
      CFG.widgets.spotify.enabled = Boolean(
        CFG.widgets.spotify.config.clientId && 
        CFG.widgets.spotify.config.refreshToken
      );
    }
    
    if (CFG.widgets.reddit) {
      CFG.widgets.reddit.config = {
        subreddit: redditSubreddit.value.trim() || "popular",
        limit: parseInt(redditLimit.value, 10) || 5
      };
    }
    
    if (CFG.widgets.calendar) {
      CFG.widgets.calendar.config = {
        apiKey: calendarApiKey.value.trim(),
        calendarId: calendarId.value.trim() || "primary"
      };
      CFG.widgets.calendar.enabled = Boolean(CFG.widgets.calendar.config.apiKey);
    }
    
    // Collect links
    const rows = [...linksList.children];
    const collected = rows.map(row => ({
      name: row.querySelector("[data-field=name]").value.trim() || "New Link",
      url: row.querySelector("[data-field=url]").value.trim(),
      category: row.querySelector("[data-field=category]").value.trim() || "Uncategorized",
      favorite: row.querySelector("[data-field=favorite]").checked
    })).filter(l => l.url);
    
    // Validate URLs
    const bad = collected.find(l => l.url && !/^https?:\/\//i.test(l.url));
    if (bad && !confirm(`The link "${bad.name}" doesn't look like a full URL.\nSave anyway?`)) {
      return;
    }
    
    CFG.links = collected;
    
    // Advanced settings
    CFG.debug = debugMode.checked;
    
    // Save to localStorage
    saveConfig(CFG);
    
    // Show success feedback
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "✓ Saved!";
    saveBtn.classList.add("bg-green-600");
    saveBtn.classList.remove("bg-fuchsia-600");
    
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.classList.remove("bg-green-600");
      saveBtn.classList.add("bg-fuchsia-600");
    }, 2000);
    
    MT_LOG.info("Configuration saved successfully");
  } catch (e) {
    MT_LOG.error("Failed to save configuration:", e);
    alert("Failed to save configuration. Check console for details.");
  }
});

// Export configuration
exportBtn?.addEventListener("click", () => {
  try {
    const blob = new Blob([JSON.stringify(CFG, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minimalTab-v${VERSION}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    MT_LOG.info("Configuration exported");
  } catch (e) {
    MT_LOG.error("Export failed:", e);
    alert("Failed to export configuration.");
  }
});

// Import configuration
importBtn?.addEventListener("click", () => importFile.click());

importFile?.addEventListener("change", () => {
  const file = importFile.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== "object") {
        throw new Error("Invalid config file");
      }
      
      const isV1 = !data.widgets && !data.layout;
      
      if (isV1) {
        if (confirm("This looks like a v1 config. Migrate to v3?")) {
          CFG = migrateV1ToV2(data);
        } else {
          return;
        }
      } else {
        CFG = deepMerge(DEFAULTS, data);
      }
      
      saveConfig(CFG);
      hydrate();
      alert("Config imported successfully!");
      MT_LOG.info("Configuration imported");
      
    } catch (e) {
      MT_LOG.error("Import failed:", e);
      alert(`Failed to import config: ${e.message}`);
    }
  };
  
  reader.readAsText(file);
  importFile.value = "";
});

/* ============================================================================
   STORAGE SYNC
   ============================================================================ */

window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    MT_LOG.log("Config updated from another tab");
    CFG = getConfig();
    hydrate();
  }
});

/* ============================================================================
   INITIALIZATION
   ============================================================================ */

MT_LOG.info("MinimalTab Settings v" + VERSION + " initializing...");
hydrate();
MT_LOG.info("Settings page ready - All phases active");