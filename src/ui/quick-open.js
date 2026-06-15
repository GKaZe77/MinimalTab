import { state } from "../core/config.js?v=2026-06-15-1";
import { bus, EV } from "../core/events.js?v=2026-06-15-1";
import { esc } from "../core/dom.js?v=2026-06-15-1";
import { doSearch } from "../features/search.js?v=2026-06-15-1";
import { showToast } from "./toast.js?v=2026-06-15-1";
import { exportConfig, saveConfig } from "../core/storage.js?v=2026-06-15-1";
import { hideDash, showDash } from "./app-shell.js?v=2026-06-15-1";

const qEl = () => document.getElementById("quick-open");
const qInp = () => document.getElementById("quick-input");
const qRes = () => document.getElementById("quick-results");

let selIdx = 0;
let filteredItems = [];

function buildItems(q) {
  const items = [];
  const lq = q.toLowerCase().trim();

  const actions = [
    { icon: "⚙", name: "Open settings",       action: () => bus.emit(EV.SETTINGS_OPEN) },
    { icon: "⚙", name: "Appearance settings", action: () => bus.emit(EV.SETTINGS_OPEN, "appearance") },
    { icon: "🔗", name: "Links settings",      action: () => bus.emit(EV.SETTINGS_OPEN, "links") },
    { icon: "🧩", name: "Widget settings",     action: () => bus.emit(EV.SETTINGS_OPEN, "widgets") },
    { icon: "🔒", name: "Privacy settings",    action: () => bus.emit(EV.SETTINGS_OPEN, "privacy") },
    { icon: "◎", name: "Return to focus",      hint: "F", action: hideDash },
    { icon: "💾", name: "Export backup",        action: () => { exportConfig(); showToast("Backup downloaded"); } },
    { icon: "📥", name: "Import backup",        action: () => document.getElementById("import-file")?.click() },
    { icon: "⭐", name: "Open all favorites",   action: openAllFavs },
    { icon: "🌤", name: "Refresh weather",      action: () => bus.emit("weather:refresh") },
    { icon: "📰", name: "Refresh RSS",          action: () => bus.emit("rss:refresh") },
    { icon: "🎨", name: "Toggle dark mode",     action: toggleDarkMode },
  ];

  const matched = lq ? actions.filter(a => a.name.toLowerCase().includes(lq)) : actions;

  // Search items
  if (lq) {
    items.push({ type: "label", label: "Search" });
    items.push({ type: "action", icon: "🔍", name: `Search web: "${q}"`, action: () => doSearch(q, "web") });
    items.push({ type: "action", icon: "🤖", name: `Ask AI: "${q}"`,     action: () => doSearch(q, "ai") });
  }

  // Actions
  if (matched.length) {
    items.push({ type: "label", label: "Actions" });
    matched.forEach(a => items.push({ type: "action", ...a }));
  }

  // Links
  const linkItems = [];
  for (const folder of (state.cfg.links.folders || [])) {
    for (const link of (folder.links || [])) {
      if (!lq || link.name.toLowerCase().includes(lq) || link.url.toLowerCase().includes(lq)) {
        linkItems.push({
          type: "action",
          icon: link.favorite ? "⭐" : "🔗",
          name: link.name,
          hint: folder.name,
          action: () => window.open(link.url, "_blank", "noopener,noreferrer")
        });
      }
    }
  }
  if (linkItems.length) {
    items.push({ type: "label", label: "Links" });
    items.push(...linkItems.slice(0, 15));
  }

  return items;
}

function render(q) {
  const all = buildItems(q);
  filteredItems = all.filter(i => i.type === "action");
  selIdx = 0;

  const res = qRes();
  if (!res) return;

  if (!all.length) {
    res.innerHTML = `<div class="q-empty">No results</div>`;
    return;
  }

  let ai = 0;
  res.innerHTML = all.map(item => {
    if (item.type === "label") return `<div class="q-section">${esc(item.label)}</div>`;
    const idx = ai++;
    return `<div class="q-item${idx === 0 ? " sel" : ""}" data-idx="${idx}" role="option" aria-selected="${idx === 0}">
      <span class="q-item-icon">${item.icon}</span>
      <span class="q-item-name">${esc(item.name)}</span>
      ${item.hint ? `<span class="q-item-hint">${esc(item.hint)}</span>` : ""}
    </div>`;
  }).join("");

  res.querySelectorAll(".q-item").forEach(row => {
    row.addEventListener("mouseenter", () => {
      selIdx = +row.dataset.idx;
      highlight();
    });
    row.addEventListener("click", () => {
      const it = filteredItems[+row.dataset.idx];
      if (it) { it.action(); close(); }
    });
  });
}

function highlight() {
  qRes()?.querySelectorAll(".q-item").forEach((row, i) => {
    const on = i === selIdx;
    row.classList.toggle("sel", on);
    row.setAttribute("aria-selected", String(on));
    if (on) row.scrollIntoView({ block: "nearest" });
  });
}

function open() {
  const el = qEl();
  if (!el) return;
  el.removeAttribute("hidden");
  const inp = qInp();
  if (inp) { inp.value = ""; }
  selIdx = 0;
  render("");
  qInp()?.focus();
  showDash();
}

function close() {
  qEl()?.setAttribute("hidden", "");
}

function openAllFavs() {
  const seen = new Set();
  const favs = (state.cfg.links.folders || [])
    .flatMap(f => (f.links || []).filter(l => l.favorite))
    .filter(l => { if (seen.has(l.url)) return false; seen.add(l.url); return true; });
  if (!favs.length) { showToast("No favorite links set."); return; }
  favs.forEach(l => window.open(l.url, "_blank", "noopener,noreferrer"));
}

function toggleDarkMode() {
  const modes = ["system", "light", "dark"];
  const cur = state.cfg.appearance.mode || "system";
  const next = modes[(modes.indexOf(cur) + 1) % modes.length];
  state.cfg.appearance.mode = next;
  saveConfig();
  import("../features/appearance.js?v=2026-06-15-1").then(m => m.applyAppearance());
  showToast(`Color mode: ${next}`);
}

export function initQuickOpen() {
  const inp = qInp();
  inp?.addEventListener("input", () => render(inp.value.trim()));
  inp?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); selIdx = Math.min(selIdx + 1, filteredItems.length - 1); highlight(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selIdx = Math.max(selIdx - 1, 0); highlight(); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const it = filteredItems[selIdx];
      if (it) { it.action(); close(); }
    }
  });

  document.getElementById("quick-backdrop")?.addEventListener("click", close);

  bus.on("quickopen:toggle", () => qEl()?.hidden ? open() : close());
  bus.on("quickopen:close", close);
}
