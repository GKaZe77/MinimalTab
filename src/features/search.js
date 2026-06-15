import { state } from "../core/config.js?v=2026-06-14-3";
import { saveConfig } from "../core/storage.js?v=2026-06-14-3";
import { SEARCH_ENGINES, AI_ENGINES, SHORTCUT_URLS } from "../core/constants.js?v=2026-06-14-3";

let searchMode = "web";
let _searchAbort = null;

export function getSearchMode() { return searchMode; }

export function setupSearch() {
  // Abort any previous listener set so re-rendering the search block
  // doesn't accumulate duplicate event listeners.
  if (_searchAbort) { _searchAbort.abort(); }
  _searchAbort = new AbortController();
  const signal = _searchAbort.signal;

  const form = document.getElementById("search-form");
  const inp  = document.getElementById("search-input");
  const mWeb = document.getElementById("mode-web");
  const mAI  = document.getElementById("mode-ai");

  if (!form || !inp) return;

  // Initialize mode from config
  searchMode = state.cfg.search.mode || "web";
  setMode(searchMode, false);

  mWeb?.addEventListener("click", () => setMode("web"), { signal });
  mAI?.addEventListener("click",  () => setMode("ai"),  { signal });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = inp.value.trim();
    if (!raw) return;

    // Check search shortcuts: "g cats", "yt lofi", etc.
    if (state.cfg.search.shortcutsEnabled) {
      const spaceIdx = raw.indexOf(" ");
      if (spaceIdx > 0) {
        const prefix = raw.slice(0, spaceIdx).toLowerCase();
        const query  = raw.slice(spaceIdx + 1).trim();
        const resolved = resolveShortcut(prefix, query);
        if (resolved) { window.open(resolved.url, resolved.target, "noopener,noreferrer"); inp.value = ""; return; }
      }
    }

    doSearch(raw, searchMode);
    inp.value = "";
    inp.blur();
  }, { signal });
}

function setMode(m, saveState = true) {
  searchMode = m;
  const mWeb = document.getElementById("mode-web");
  const mAI  = document.getElementById("mode-ai");
  const inp  = document.getElementById("search-input");

  mWeb?.classList.toggle("active", m === "web");
  mAI?.classList.toggle("active",  m === "ai");
  mWeb?.setAttribute("aria-pressed", String(m === "web"));
  mAI?.setAttribute("aria-pressed",  String(m === "ai"));

  if (inp) inp.placeholder = m === "ai" ? "Ask AI anything…" : "Search the web…";

  if (saveState) {
    state.cfg.search.mode = m;
    saveConfig();
  }
}

export function doSearch(q, mode = searchMode) {
  const cfg = state.cfg.search;
  let url, openIn;

  if (mode === "ai") {
    const eng = AI_ENGINES[cfg.aiEngine];
    url    = (eng?.url) || cfg.aiCustomUrl || AI_ENGINES.perplexity.url;
    openIn = cfg.aiOpenIn || "_blank";
  } else {
    const eng = SEARCH_ENGINES[cfg.engine];
    url    = (eng?.url) || cfg.customUrl || SEARCH_ENGINES.brave.url;
    openIn = cfg.openIn || "_blank";
  }

  const finalUrl = url.includes("{q}")
    ? url.replace("{q}", encodeURIComponent(q))
    : url + encodeURIComponent(q);

  window.open(finalUrl, openIn, "noopener,noreferrer");
}

function resolveShortcut(prefix, query) {
  const shortcuts = state.cfg.search.shortcuts || {};
  const mapped = shortcuts[prefix];
  if (!mapped) return null;

  const openIn = state.cfg.search.openIn || "_blank";
  let url = null;

  if (mapped === "ai") {
    const eng = AI_ENGINES[state.cfg.search.aiEngine];
    url = (eng?.url || AI_ENGINES.perplexity.url).replace("{q}", encodeURIComponent(query));
    return { url, target: state.cfg.search.aiOpenIn || "_blank" };
  }

  const eng = SEARCH_ENGINES[mapped];
  if (eng) {
    url = eng.url.replace("{q}", encodeURIComponent(query));
    return { url, target: openIn };
  }

  const special = SHORTCUT_URLS[mapped];
  if (special) {
    url = special.replace("{q}", encodeURIComponent(query));
    return { url, target: openIn };
  }

  return null;
}
