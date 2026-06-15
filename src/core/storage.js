import { STORAGE_KEY, OLD_KEYS, VERSION } from "./constants.js?v=2026-06-14-3";
import { DEFAULT_CONFIG, DEFAULT_RSS_PROXY_TEMPLATE, state } from "./config.js?v=2026-06-14-3";
import { bus, EV } from "./events.js?v=2026-06-14-3";

// Old Heartlight feed URL that must be migrated to the FeedBurner redirect.
const HEARTLIGHT_OLD = "https://www.heartlight.org/rss/track/int/tv-en-kjv/";
const HEARTLIGHT_NEW = "https://feeds.feedburner.com/hl-int-tv-en-kjv";

// ── Deep merge ────────────────────────────────────────────────
// target supplies defaults; src values win.  Arrays are replaced wholesale.
export function deepMerge(target, src) {
  const out = { ...target };
  for (const [k, v] of Object.entries(src || {})) {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge(target[k] || {}, v);
    } else {
      out[k] = Array.isArray(v) ? [...v] : v;
    }
  }
  return out;
}

// ── Config normalization / migration ──────────────────────────
// Mutates `cfg` in place.  Returns true when any field was changed so the
// caller knows whether to persist the updated config.
export function normalizeConfig(cfg) {
  let changed = false;

  // 1. Fill blank RSS proxy template with the project default.
  if (cfg.widgets?.rss && !cfg.widgets.rss.proxyTemplate) {
    cfg.widgets.rss.proxyTemplate = DEFAULT_RSS_PROXY_TEMPLATE;
    changed = true;
  }

  // 2. Migrate old Heartlight feed URL in user's saved feed list.
  const feeds = cfg.widgets?.rss?.feeds;
  if (Array.isArray(feeds)) {
    feeds.forEach(feed => {
      if (feed.url === HEARTLIGHT_OLD) {
        feed.url = HEARTLIGHT_NEW;
        changed = true;
      }
    });
  }

  // 3. Fill missing maxItemsPerFeed for existing configs that predate the field.
  if (cfg.widgets?.rss && (cfg.widgets.rss.maxItemsPerFeed == null || typeof cfg.widgets.rss.maxItemsPerFeed !== "number" || cfg.widgets.rss.maxItemsPerFeed < 1)) {
    cfg.widgets.rss.maxItemsPerFeed = 10;
    changed = true;
  }

  // 4. Ensure Spotify scopeVersion is a number (old saves have null/undefined).
  //    A value of 0 means the token pre-dates versioning; the widget will prompt reconnect.
  if (cfg.integrations?.spotify) {
    if (cfg.integrations.spotify.scopeVersion == null) {
      cfg.integrations.spotify.scopeVersion = 0;
      changed = true;
    }
  }

  // 5. Block layout: fill missing layout fields and editMode is never persisted.
  const lay = cfg.layout;
  if (!lay.mode)    { lay.mode = "auto"; changed = true; }
  if (!lay.columns) { lay.columns = 12;  changed = true; }
  if (!lay.rowHeight) { lay.rowHeight = 80; changed = true; }
  if (!lay.blocks)  { lay.blocks = {};   changed = true; }
  lay.editMode = false; // never persist editMode as true

  // Derive blockOrder if empty (first load or reset)
  if (!Array.isArray(lay.blockOrder) || !lay.blockOrder.length) {
    lay.blockOrder = _deriveBlockOrder(cfg);
    changed = true;
  } else {
    // Sync: add new blocks, remove stale ones
    const canonical = new Set(_deriveBlockOrder(cfg));
    const before = lay.blockOrder.length;
    lay.blockOrder = lay.blockOrder.filter(id => canonical.has(id));
    for (const id of canonical) {
      if (!lay.blockOrder.includes(id)) lay.blockOrder.push(id);
    }
    if (lay.blockOrder.length !== before) changed = true;
  }

  return changed;
}

function _deriveBlockOrder(cfg) {
  const order = ["search"];
  const folders = cfg.links?.folders || [];
  if (folders.some(f => f.links?.some(l => l.favorite))) order.push("favorites");
  for (const f of folders) { if (f.links?.length) order.push(`links:${f.id}`); }
  for (const id of (cfg.layout?.widgetOrder || [])) order.push(`widget:${id}`);
  return order;
}

// ── Load ──────────────────────────────────────────────────────
export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = deepMerge(DEFAULT_CONFIG, parsed);
      const changed = normalizeConfig(merged);
      if (changed) {
        // Silently persist the migrated data so future loads start clean.
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      }
      return merged;
    }
  } catch (e) {
    console.warn("[CustomTab] Failed to parse config, using defaults:", e);
  }
  return deepMerge({}, DEFAULT_CONFIG);
}

// ── Save ──────────────────────────────────────────────────────
export function saveConfig() {
  try {
    state.cfg.version = VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cfg));
    window.dispatchEvent(new CustomEvent("ct:configSaved", { detail: state.cfg }));
    bus.emit(EV.CONFIG_SAVED, state.cfg);
  } catch (e) {
    console.error("[CustomTab] Failed to save config:", e);
    if (e.name === "QuotaExceededError") {
      window.dispatchEvent(new CustomEvent("ct:storageFull"));
    }
  }
}

// ── Detect old storage keys ───────────────────────────────────
export function detectOldKeys() {
  return OLD_KEYS.filter(k => {
    try { return !!localStorage.getItem(k); } catch { return false; }
  });
}

// ── Export ────────────────────────────────────────────────────
// Adds metadata fields prefixed with _ so importConfig can strip them.
export function exportConfig() {
  const exportData = {
    ...state.cfg,
    _exportedAt:      new Date().toISOString(),
    _exportVersion:   VERSION,
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `customtab-v5-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import ────────────────────────────────────────────────────
export function importConfig(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid config file — expected a JSON object");
  }

  // Backup current config before overwriting.
  try { localStorage.setItem("ct_config_v5_backup", JSON.stringify(state.cfg)); } catch {}

  // Strip export-only metadata so it doesn't pollute the live config.
  const { _exportedAt, _exportVersion, ...importData } = data;
  if (_exportedAt) {
    console.info("[CustomTab] Importing backup exported at", _exportedAt, "version", _exportVersion || "unknown");
  }

  // Warn about obviously mismatched backups but proceed; deepMerge fills gaps.
  if (_exportVersion && _exportVersion !== VERSION) {
    console.warn(`[CustomTab] Backup version (${_exportVersion}) differs from app version (${VERSION}). Proceeding with merge.`);
  }

  const merged = deepMerge(DEFAULT_CONFIG, importData);
  normalizeConfig(merged);
  state.cfg = merged;
  saveConfig();
  return merged;
}

// ── Reset ─────────────────────────────────────────────────────
export function resetConfig(section = "all") {
  try { localStorage.setItem("ct_config_v5_backup", JSON.stringify(state.cfg)); } catch {}

  if (section === "all") {
    localStorage.removeItem(STORAGE_KEY);
    OLD_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} });
    state.cfg = deepMerge({}, DEFAULT_CONFIG);
  } else if (section === "appearance") {
    state.cfg.appearance = deepMerge({}, DEFAULT_CONFIG.appearance);
  } else if (section === "links") {
    state.cfg.links = deepMerge({}, DEFAULT_CONFIG.links);
  } else if (section === "widgets") {
    state.cfg.widgets = deepMerge({}, DEFAULT_CONFIG.widgets);
  } else if (section === "layout") {
    state.cfg.layout = deepMerge({}, DEFAULT_CONFIG.layout);
  }
  saveConfig();
}

// ── Bootstrap ─────────────────────────────────────────────────
export function initStorage() {
  state.cfg = loadConfig();
}

// ── Multi-tab sync ────────────────────────────────────────────
window.addEventListener("storage", (e) => {
  if (e.key !== STORAGE_KEY || !e.newValue) return;
  try {
    const fresh = JSON.parse(e.newValue);
    if (fresh) {
      const merged = deepMerge(DEFAULT_CONFIG, fresh);
      normalizeConfig(merged); // normalize in memory; the writing tab already persisted
      state.cfg = merged;
      window.dispatchEvent(new CustomEvent("ct:configReloaded", { detail: state.cfg }));
      bus.emit(EV.CONFIG_RELOADED, state.cfg);
    }
  } catch {}
});
