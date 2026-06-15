import { state } from "../core/config.js?v=2026-06-15-1";
import { saveConfig } from "../core/storage.js?v=2026-06-15-1";
import { renderBlocks, getDefaultPositions, ensurePositions, setRerenderHook } from "./blocks.js?v=2026-06-15-1";
import { showToast } from "../ui/toast.js?v=2026-06-15-1";

let _active = false;
let _searchSetup = null;
let _dragAbort = null;

export function isDesignMode() { return _active; }

export function setSearchSetupFn(fn) { _searchSetup = fn; }

// ── Toggle ───────────────────────────────────────────────────
export function toggleDesignMode() {
  _active ? exitDesignMode() : enterDesignMode();
}

export function enterDesignMode() {
  _active = true;
  document.body.classList.add("design-mode");
  _updateDesignBtn(true);
  _showToolbar(true);
  _updateModeLabel();
  renderBlocks();
  if (_searchSetup) requestAnimationFrame(_searchSetup);
  _setupInteractions();
}

export function exitDesignMode() {
  _active = false;
  document.body.classList.remove("design-mode");
  _updateDesignBtn(false);
  _showToolbar(false);
  _teardownInteractions();
  saveConfig();
  renderBlocks();
  if (_searchSetup) requestAnimationFrame(_searchSetup);
}

function _updateDesignBtn(on) {
  document.getElementById("design-btn")?.classList.toggle("active", on);
}
function _showToolbar(on) {
  const tb = document.getElementById("design-toolbar");
  if (!tb) return;
  if (on) tb.removeAttribute("hidden");
  else     tb.setAttribute("hidden", "");
}

// ── Interactions ─────────────────────────────────────────────
function _setupInteractions() {
  _teardownInteractions();
  _dragAbort = new AbortController();
  const signal = _dragAbort.signal;
  const container = document.getElementById("blocks-container");
  if (!container) return;

  if (state.cfg.layout.mode === "custom") {
    _setupGridDrag(container, signal);
  } else {
    _setupReorderDrag(container, signal);
  }
  _setupResizeClicks(container, signal);
}

function _teardownInteractions() {
  _dragAbort?.abort();
  _dragAbort = null;
}

// ── Auto mode: drag-to-reorder ───────────────────────────────
let _dragId = null;

function _setupReorderDrag(container, signal) {
  container.addEventListener("dragstart", (e) => {
    const block = e.target.closest(".layout-block[draggable]");
    if (!block) { e.preventDefault(); return; }
    _dragId = block.dataset.blockId;
    block.classList.add("block-dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", _dragId);
  }, { signal });

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    const block = e.target.closest(".layout-block");
    if (!block || block.dataset.blockId === _dragId) return;
    container.querySelectorAll(".block-drag-target")
             .forEach(b => b.classList.remove("block-drag-target"));
    block.classList.add("block-drag-target");
    e.dataTransfer.dropEffect = "move";
  }, { signal });

  container.addEventListener("dragleave", (e) => {
    if (!container.contains(e.relatedTarget)) {
      container.querySelectorAll(".block-drag-target")
               .forEach(b => b.classList.remove("block-drag-target"));
    }
  }, { signal });

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    const targetBlock = e.target.closest(".layout-block");
    const targetId    = targetBlock?.dataset.blockId;
    if (!_dragId || !targetId || _dragId === targetId) return;

    const order    = state.cfg.layout.blockOrder;
    const fromIdx  = order.indexOf(_dragId);
    const toIdx    = order.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, _dragId);
    saveConfig();
    _rerender();
  }, { signal });

  container.addEventListener("dragend", () => {
    container.querySelectorAll(".block-dragging,.block-drag-target")
             .forEach(b => b.classList.remove("block-dragging","block-drag-target"));
    _dragId = null;
  }, { signal });
}

// ── Custom mode: pointer-drag to grid cell ───────────────────
function _setupGridDrag(container, signal) {
  let dragging = null, draggingId = null;

  container.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".block-drag-handle")) return;
    const block = e.target.closest(".layout-block");
    if (!block) return;
    e.preventDefault();
    dragging   = block;
    draggingId = block.dataset.blockId;
    block.classList.add("block-dragging");
    block.setPointerCapture(e.pointerId);
  }, { signal });

  container.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    e.preventDefault();
    const lay  = state.cfg.layout;
    const b    = lay.blocks?.[draggingId];
    if (!b) return;

    const rect  = container.getBoundingClientRect();
    const cols  = lay.columns || 12;
    const cellW = rect.width / cols;
    const rowH  = lay.rowHeight || 80;
    const scrollTop = container.closest("#dash-layer")?.scrollTop || 0;

    const newX = Math.max(0, Math.min(cols - b.w,
      Math.floor((e.clientX - rect.left) / cellW)));
    const newY = Math.max(0,
      Math.floor((e.clientY - rect.top + scrollTop) / rowH));

    dragging.style.setProperty("--block-x", newX + 1);
    dragging.style.setProperty("--block-y", newY + 1);
    dragging._px = newX;
    dragging._py = newY;
  }, { signal });

  container.addEventListener("pointerup", () => {
    if (!dragging) return;
    const lay = state.cfg.layout;
    const b   = lay.blocks?.[draggingId];
    const nx  = dragging._px ?? b?.x ?? 0;
    const ny  = dragging._py ?? b?.y ?? 0;

    if (b) {
      b.x = nx; b.y = ny;
      _resolveCollisions(lay.blocks, draggingId);
      saveConfig();
    }
    dragging.classList.remove("block-dragging");
    dragging = null; draggingId = null;
    _rerender();
  }, { signal });

  container.addEventListener("pointercancel", () => {
    if (dragging) dragging.classList.remove("block-dragging");
    dragging = null; draggingId = null;
  }, { signal });
}

function _resolveCollisions(blocks, movedId) {
  const m = blocks[movedId];
  if (!m) return;
  for (const [id, b] of Object.entries(blocks)) {
    if (id === movedId) continue;
    if (_overlaps(m, b)) b.y = m.y + m.h;
  }
}

function _overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ── Resize / order clicks ────────────────────────────────────
function _setupResizeClicks(container, signal) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".block-resize-btn");
    if (!btn) return;
    e.stopPropagation();

    const block  = btn.closest(".layout-block");
    const id     = block?.dataset.blockId;
    if (!id) return;

    const lay    = state.cfg.layout;
    const action = btn.dataset.action;
    const cols   = lay.columns || 12;

    if (lay.mode === "custom") {
      if (!lay.blocks[id]) lay.blocks[id] = { x: 0, y: 0, w: cols, h: 1 };
      const b = lay.blocks[id];

      if (action === "w-dec") b.w = Math.max(1, b.w - 1);
      if (action === "w-inc") b.w = Math.min(cols - b.x, b.w + 1);
      if (action === "h-dec") b.h = Math.max(1, b.h - 1);
      if (action === "h-inc") b.h += 1;

      saveConfig();
      block.style.setProperty("--block-w", b.w);
      block.style.setProperty("--block-h", b.h);
      block.querySelectorAll(".block-dim[data-dim='w']").forEach(s => s.textContent = `W:${b.w}`);
      block.querySelectorAll(".block-dim[data-dim='h']").forEach(s => s.textContent = `H:${b.h}`);
    } else {
      // Auto mode: move block up/down in order
      const order = lay.blockOrder;
      const idx   = order.indexOf(id);
      if (action === "order-up"   && idx > 0)               { [order[idx], order[idx-1]] = [order[idx-1], order[idx]]; }
      if (action === "order-down" && idx < order.length - 1) { [order[idx], order[idx+1]] = [order[idx+1], order[idx]]; }
      saveConfig();
      _rerender();
    }
  }, { signal });
}

// ── Helpers ──────────────────────────────────────────────────
function _rerender() {
  renderBlocks();
  if (_searchSetup) requestAnimationFrame(_searchSetup);
  if (_active) {
    requestAnimationFrame(() => _setupInteractions());
  }
}

function _updateModeLabel() {
  const label = document.getElementById("design-mode-label");
  if (label) label.textContent = state.cfg.layout.mode === "custom" ? "Grid" : "Auto";
}

// ── Public init (called from main.js) ────────────────────────
export function initDesignMode(searchSetupFn) {
  _searchSetup = searchSetupFn;

  // Re-attach drag handlers when renderBlocks() fires from outside this module
  // (e.g., bus events during design mode: link edits, widget changes)
  setRerenderHook(() => { if (_active) _setupInteractions(); });

  // Sync toolbar label to persisted mode on init
  _updateModeLabel();

  document.getElementById("design-btn")
    ?.addEventListener("click", toggleDesignMode);

  document.getElementById("design-done-btn")
    ?.addEventListener("click", exitDesignMode);

  document.getElementById("design-reset-btn")
    ?.addEventListener("click", () => {
      if (!confirm("Reset all block positions and order to defaults?")) return;
      const lay    = state.cfg.layout;
      lay.blockOrder = [];
      lay.blocks     = {};
      saveConfig();
      if (_active) exitDesignMode();
      else { renderBlocks(); if (_searchSetup) requestAnimationFrame(_searchSetup); }
      showToast("Layout reset to defaults");
    });

  document.getElementById("design-mode-toggle-btn")
    ?.addEventListener("click", () => {
      const lay = state.cfg.layout;
      lay.mode  = lay.mode === "custom" ? "auto" : "custom";
      if (lay.mode === "custom") ensurePositions(lay);
      saveConfig();
      _updateModeLabel();
      _rerender();
      if (_active) requestAnimationFrame(() => _setupInteractions());
    });
}
