import { state } from "../core/config.js?v=2026-06-14-3";
import { saveConfig } from "../core/storage.js?v=2026-06-14-3";
import { bus, EV } from "../core/events.js?v=2026-06-14-3";
import { WIDGET_REGISTRY } from "../widgets/registry.js?v=2026-06-14-3";
import { makeChip } from "../features/links.js?v=2026-06-14-3";
import { esc } from "../core/dom.js?v=2026-06-14-3";

// ── Block label map ─────────────────────────────────────────
const WIDGET_NAMES = {
  weather:"Weather", todo:"To-do", notes:"Notes", rss:"RSS Feeds",
  calendar:"Calendar", goals:"Goals", status:"Status", spotify:"Spotify",
};

export function blockLabel(id) {
  if (id === "search")    return "Search";
  if (id === "favorites") return "Favorites";
  if (id.startsWith("links:")) {
    const fid = id.slice(6);
    const f = (state.cfg.links?.folders || []).find(fl => fl.id === fid);
    return f ? f.name : "Links";
  }
  if (id.startsWith("widget:")) return WIDGET_NAMES[id.slice(7)] || id.slice(7);
  return id;
}

// ── Derive blockOrder from config ───────────────────────────
export function deriveBlockOrder(cfg) {
  const order = ["search"];
  const folders = cfg.links?.folders || [];
  const hasFavs = folders.some(f => f.links?.some(l => l.favorite));
  if (hasFavs) order.push("favorites");
  for (const f of folders) {
    if (f.links?.length) order.push(`links:${f.id}`);
  }
  for (const id of (cfg.layout?.widgetOrder || [])) {
    order.push(`widget:${id}`);
  }
  return order;
}

// ── Sync blockOrder: add missing, remove stale ──────────────
export function syncBlockOrder(cfg) {
  const lay = cfg.layout;
  if (!Array.isArray(lay.blockOrder)) lay.blockOrder = [];

  const canonical = deriveBlockOrder(cfg);
  const validSet  = new Set(canonical);

  // Remove blocks whose backing config no longer exists
  lay.blockOrder = lay.blockOrder.filter(id => validSet.has(id));

  // Append any newly-added blocks (preserve user's custom ordering)
  for (const id of canonical) {
    if (!lay.blockOrder.includes(id)) lay.blockOrder.push(id);
  }
}

// ── Default grid positions for custom mode ──────────────────
export function getDefaultPositions(blockOrder, cols = 12) {
  const positions = {};
  let y = 0;
  let wX = 0, wY = -1;
  const wW = Math.floor(cols / 2);

  for (const id of (blockOrder || [])) {
    if (id === "search" || id === "favorites" || id.startsWith("links:")) {
      positions[id] = { x: 0, y, w: cols, h: 1 };
      y += 1;
    } else if (id.startsWith("widget:")) {
      if (wY < 0) wY = y;
      positions[id] = { x: wX, y: wY, w: wW, h: 3 };
      wX += wW;
      if (wX + wW > cols) { wX = 0; wY += 3; }
      y = wY + 3;
    }
  }
  return positions;
}

// ── Ensure all blocks in order have grid positions ──────────
export function ensurePositions(layout) {
  if (!layout.blocks) layout.blocks = {};
  const missing = (layout.blockOrder || []).filter(id => !layout.blocks[id]);
  if (!missing.length) return;
  const defs = getDefaultPositions(layout.blockOrder, layout.columns || 12);
  for (const id of missing) {
    if (defs[id]) layout.blocks[id] = { ...defs[id] };
  }
}

// ── Main render function ────────────────────────────────────
let _searchSetup = null;    // injected by main.js to avoid circular dep
let _rerenderHook = null;   // called after every renderBlocks(); used by design-mode.js

export function setSearchSetupFn(fn) { _searchSetup = fn; }
export function setRerenderHook(fn) { _rerenderHook = fn; }

export function renderBlocks() {
  const container = document.getElementById("blocks-container");
  if (!container) return;

  const layout   = state.cfg.layout;
  const isCustom = layout.mode === "custom";
  const isDesign = document.body.classList.contains("design-mode");

  syncBlockOrder(state.cfg);
  if (isCustom) ensurePositions(layout);

  container.innerHTML = "";
  container.className = `blocks-container mode-${layout.mode}`;

  if (isCustom) {
    container.style.setProperty("--grid-cols",  layout.columns  || 12);
    container.style.setProperty("--row-height", (layout.rowHeight || 80) + "px");
  } else {
    container.style.removeProperty("--grid-cols");
    container.style.removeProperty("--row-height");
  }

  let searchRendered = false;

  for (const blockId of (layout.blockOrder || [])) {
    const pos    = layout.blocks?.[blockId];
    const blockEl = _createBlock(blockId, pos, isCustom, isDesign, layout);
    if (blockEl) {
      container.appendChild(blockEl);
      if (blockId === "search") searchRendered = true;
    }
  }

  if (searchRendered && _searchSetup) {
    requestAnimationFrame(_searchSetup);
  }
  if (_rerenderHook) _rerenderHook();
}

function _createBlock(blockId, pos, isCustom, isDesign, layout) {
  const [type, ...rest] = blockId.split(":");
  const subId = rest.join(":");

  // Skip disabled widgets in normal mode
  if (type === "widget" && !state.cfg.widgets[subId]?.enabled && !isDesign) {
    return null;
  }

  const blockEl = document.createElement("div");
  blockEl.className  = "layout-block";
  blockEl.dataset.blockId   = blockId;
  blockEl.dataset.blockType = type;

  if (isCustom && pos) {
    blockEl.style.setProperty("--block-x", pos.x + 1);
    blockEl.style.setProperty("--block-w", pos.w);
    blockEl.style.setProperty("--block-y", pos.y + 1);
    blockEl.style.setProperty("--block-h", pos.h);
  }

  // Propagate widget size to block element (auto-mode sizing)
  if (type === "widget") {
    const sz = layout.widgetSizes?.[subId]
             || WIDGET_REGISTRY[subId]?.defaultSize
             || "medium";
    blockEl.dataset.size = sz;
  }

  if (isDesign) {
    blockEl.draggable = !isCustom; // HTML5 drag only in auto mode
    blockEl.appendChild(_createEditBar(blockId, pos, isCustom, layout));
  }

  const content = document.createElement("div");
  content.className = "block-content";

  let ok = true;
  switch (type) {
    case "search":    _renderSearch(content);              break;
    case "favorites": _renderFavorites(content);           break;
    case "links":     ok = _renderFolder(content, subId);  break;
    case "widget":    ok = _renderWidget(content, subId, layout); break;
    default: return null;
  }

  if (!ok && !isDesign) return null;

  blockEl.appendChild(content);
  return blockEl;
}

function _createEditBar(blockId, pos, isCustom, layout) {
  const bar = document.createElement("div");
  bar.className = "block-edit-bar";

  const label = esc(blockLabel(blockId));
  const cols  = layout.columns || 12;
  const w     = pos?.w ?? cols;
  const h     = pos?.h ?? 1;

  const resizeControls = isCustom
    ? `<button class="block-resize-btn" data-action="w-dec" title="Narrower">◀</button>
       <span class="block-dim" data-dim="w">W:${w}</span>
       <button class="block-resize-btn" data-action="w-inc" title="Wider">▶</button>
       <button class="block-resize-btn" data-action="h-dec" title="Shorter">▲</button>
       <span class="block-dim" data-dim="h">H:${h}</span>
       <button class="block-resize-btn" data-action="h-inc" title="Taller">▼</button>`
    : `<button class="block-resize-btn" data-action="order-up"   title="Move up">↑</button>
       <button class="block-resize-btn" data-action="order-down" title="Move down">↓</button>`;

  bar.innerHTML = `
    <span class="block-drag-handle" title="Drag to move">⠿</span>
    <span class="block-edit-label">${label}</span>
    <div class="block-resize-controls">${resizeControls}</div>
  `;
  return bar;
}

// ── Block content renderers ─────────────────────────────────

function _renderSearch(container) {
  container.innerHTML = `
    <form id="search-form" role="search" aria-label="Search">
      <div id="search-bar">
        <div id="search-modes" role="group" aria-label="Search mode">
          <button type="button" class="mode-pill active" id="mode-web" aria-pressed="true">Web</button>
          <button type="button" class="mode-pill" id="mode-ai"  aria-pressed="false">AI</button>
        </div>
        <input id="search-input" type="search" placeholder="Search the web…"
               autocomplete="off" spellcheck="false" aria-label="Search" />
        <button type="submit" id="search-submit" aria-label="Search">Go</button>
      </div>
    </form>
  `;
}

function _renderFavorites(container) {
  const folders = state.cfg.links?.folders || [];
  const seen = new Set();
  const favs = folders
    .flatMap(f => (f.links || []).filter(l => l.favorite))
    .filter(l => { if (seen.has(l.url)) return false; seen.add(l.url); return true; });

  if (!favs.length) {
    container.innerHTML = `<div class="favorites-empty">No favorites yet — star a link to pin it here.</div>`;
    return;
  }
  const row = document.createElement("div");
  row.className = "favorites-row";
  row.innerHTML = `<div class="favorites-label">Favorites</div>`;
  for (const link of favs) row.appendChild(makeChip(link));
  container.appendChild(row);
}

function _renderFolder(container, folderId) {
  const folder = (state.cfg.links?.folders || []).find(f => f.id === folderId);
  if (!folder || !folder.links?.length) return false;

  const el  = document.createElement("div");
  el.className = "link-folder";
  el.dataset.folderId = folder.id;

  const hdr = document.createElement("div");
  hdr.className = "folder-header";
  hdr.setAttribute("role", "button");
  hdr.setAttribute("aria-expanded", String(!folder.collapsed));
  hdr.setAttribute("tabindex", "0");
  hdr.innerHTML = `
    <span class="folder-caret${folder.collapsed ? " collapsed" : ""}" aria-hidden="true">▾</span>
    <span class="folder-name">${esc(folder.name)}</span>
    <button class="folder-open-all" title="Open all" aria-label="Open all ${esc(folder.name)} links">Open all</button>
  `;

  const chips = document.createElement("div");
  chips.className = `folder-chips${folder.collapsed ? " collapsed" : ""}`;
  for (const link of folder.links) chips.appendChild(makeChip(link));

  function onToggle(e) {
    if (document.body.classList.contains("design-mode")) return;
    if (e.target.classList.contains("folder-open-all")) {
      folder.links.forEach(l => window.open(l.url, "_blank", "noopener,noreferrer"));
      return;
    }
    folder.collapsed = !folder.collapsed;
    chips.classList.toggle("collapsed", folder.collapsed);
    hdr.querySelector(".folder-caret").classList.toggle("collapsed", folder.collapsed);
    hdr.setAttribute("aria-expanded", String(!folder.collapsed));
    saveConfig();
  }

  hdr.addEventListener("click", onToggle);
  hdr.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(e); }
  });

  el.appendChild(hdr);
  el.appendChild(chips);
  container.appendChild(el);
  return true;
}

const SIZE_OPTS = ["small","medium","large","wide","full"];

function _renderWidget(container, widgetId, layout) {
  const widget = WIDGET_REGISTRY[widgetId];
  const wCfg   = state.cfg.widgets[widgetId];

  if (!widget) return false;

  if (!wCfg?.enabled) {
    container.innerHTML = `
      <div class="block-disabled">
        <span class="block-disabled-icon">🧩</span>
        <span>${esc(WIDGET_NAMES[widgetId] || widgetId)} — disabled</span>
      </div>`;
    return true;
  }

  const tile = document.createElement("div");
  tile.className = "widget-tile";
  const size = layout.widgetSizes?.[widgetId] || widget.defaultSize || "medium";
  tile.dataset.size     = size;
  tile.dataset.widgetId = widgetId;

  try {
    widget.render(tile, { cfg: state.cfg, widgetCfg: wCfg });
  } catch (e) {
    console.error(`[CustomTab] Widget ${widgetId} render error:`, e);
    tile.innerHTML = `<div class="tile-label">${esc(widget.name || widgetId)}</div>
                      <div class="widget-error">Widget failed to render.</div>`;
  }

  // Quick-resize button (⊡) — visible in normal mode only (design mode hides it via CSS)
  let actions = tile.querySelector(".tile-label-actions");
  if (!actions) {
    const label = tile.querySelector(".tile-label");
    if (label) {
      actions = document.createElement("div");
      actions.className = "tile-label-actions";
      label.appendChild(actions);
    }
  }
  if (actions) actions.appendChild(_makeResizeBtn(widgetId, size, tile, layout));

  container.appendChild(tile);
  return true;
}

function _makeResizeBtn(widgetId, curSize, tileEl, layout) {
  const btn = document.createElement("button");
  btn.className = "tile-action-btn tile-resize-btn";
  btn.title = "Resize widget";
  btn.setAttribute("aria-label", "Resize widget");
  btn.setAttribute("aria-haspopup", "listbox");
  btn.textContent = "⊡";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const existing = document.querySelector(".resize-menu");
    if (existing) { existing.remove(); return; }

    const menu = document.createElement("div");
    menu.className = "resize-menu";
    menu.setAttribute("role", "listbox");

    SIZE_OPTS.forEach(opt => {
      const item = document.createElement("button");
      item.className = "resize-opt" + (opt === curSize ? " active" : "");
      item.textContent = opt[0].toUpperCase() + opt.slice(1);
      item.setAttribute("role", "option");
      item.addEventListener("click", (ev) => {
        ev.stopPropagation();
        layout.widgetSizes = layout.widgetSizes || {};
        layout.widgetSizes[widgetId] = opt;
        saveConfig();
        tileEl.dataset.size = opt;
        // Update the layout-block wrapper size too
        const blockEl = tileEl.closest(".layout-block");
        if (blockEl) blockEl.dataset.size = opt;
        curSize = opt;
        menu.remove();
      });
      menu.appendChild(item);
    });

    const rect = btn.getBoundingClientRect();
    menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px`;
    document.body.appendChild(menu);
    menu.querySelector("button")?.focus();

    function closeMenu(ev) {
      if (!menu.contains(ev.target) && ev.target !== btn) {
        menu.remove();
        document.removeEventListener("click", closeMenu, true);
      }
    }
    setTimeout(() => document.addEventListener("click", closeMenu, true), 0);
  });

  return btn;
}

// ── Bus listeners ───────────────────────────────────────────
bus.on(EV.LINKS_CHANGED,   renderBlocks);
bus.on(EV.WIDGETS_CHANGED, renderBlocks);
bus.on(EV.CONFIG_RELOADED, () => {
  renderBlocks();
  if (_searchSetup) requestAnimationFrame(_searchSetup);
});
