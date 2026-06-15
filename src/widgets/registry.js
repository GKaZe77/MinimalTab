import { state } from "../core/config.js?v=2026-06-14-3";
import { saveConfig } from "../core/storage.js?v=2026-06-14-3";
import { bus, EV } from "../core/events.js?v=2026-06-14-3";
import { WeatherWidget }  from "./weather.widget.js?v=2026-06-14-3";
import { TodoWidget }     from "./todo.widget.js?v=2026-06-14-3";
import { NotesWidget }    from "./notes.widget.js?v=2026-06-14-3";
import { RssWidget }      from "./rss.widget.js?v=2026-06-14-3";
import { CalendarWidget } from "./calendar.widget.js?v=2026-06-14-3";
import { GoalsWidget }    from "./goals.widget.js?v=2026-06-14-3";
import { StatusWidget }   from "./status.widget.js?v=2026-06-14-3";
import { SpotifyWidget }  from "./spotify.widget.js?v=2026-06-14-3";

export const WIDGET_REGISTRY = {
  weather:  WeatherWidget,
  todo:     TodoWidget,
  notes:    NotesWidget,
  rss:      RssWidget,
  calendar: CalendarWidget,
  goals:    GoalsWidget,
  status:   StatusWidget,
  spotify:  SpotifyWidget,
};

const DEFAULT_WIDGET_SIZES = {
  weather:  "small",
  todo:     "medium",
  notes:    "medium",
  rss:      "large",
  calendar: "medium",
  goals:    "medium",
  status:   "small",
  spotify:  "medium",
};

const SIZE_OPTIONS = [
  { value: "small",  label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large",  label: "Large" },
  { value: "wide",   label: "Wide" },
  { value: "full",   label: "Full width" },
];

function createResizeButton(id, currentSize, tileEl) {
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
    menu.setAttribute("aria-label", "Widget size");

    SIZE_OPTIONS.forEach((opt, i) => {
      const item = document.createElement("button");
      item.className = "resize-opt" + (opt.value === currentSize ? " active" : "");
      item.textContent = opt.label;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(opt.value === currentSize));
      item.setAttribute("tabindex", i === 0 ? "0" : "-1");

      item.addEventListener("click", (ev) => {
        ev.stopPropagation();
        state.cfg.layout.widgetSizes = state.cfg.layout.widgetSizes || {};
        state.cfg.layout.widgetSizes[id] = opt.value;
        saveConfig();
        tileEl.dataset.size = opt.value;
        currentSize = opt.value;
        menu.remove();
      });

      item.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") { menu.remove(); btn.focus(); }
        else if (ev.key === "ArrowDown") { ev.preventDefault(); (item.nextElementSibling || menu.firstElementChild).focus(); }
        else if (ev.key === "ArrowUp")   { ev.preventDefault(); (item.previousElementSibling || menu.lastElementChild).focus(); }
        else if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); item.click(); }
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

export function renderWidgets() {
  const area = document.getElementById("widgets-area");
  if (!area) return;
  area.innerHTML = "";

  const { widgetOrder = [], widgetSizes = {} } = state.cfg.layout;

  for (const id of widgetOrder) {
    const widget = WIDGET_REGISTRY[id];
    const wCfg = state.cfg.widgets[id];
    if (!widget || !wCfg?.enabled) continue;

    const tile = document.createElement("div");
    tile.className = "widget-tile";
    tile.dataset.widgetId = id;
    const size = widgetSizes[id] || DEFAULT_WIDGET_SIZES[id] || widget.defaultSize || "medium";
    tile.dataset.size = size;

    try {
      widget.render(tile, { cfg: state.cfg, widgetCfg: wCfg });
    } catch (e) {
      console.error(`[CustomTab] Widget ${id} render error:`, e);
      tile.innerHTML = `<div class="tile-label">${widget.name || id}</div><div class="widget-error">Widget failed to render.</div>`;
    }

    // Inject resize button into tile-label-actions (create if absent)
    let actions = tile.querySelector(".tile-label-actions");
    if (!actions) {
      const label = tile.querySelector(".tile-label");
      if (label) {
        actions = document.createElement("div");
        actions.className = "tile-label-actions";
        label.appendChild(actions);
      }
    }
    if (actions) actions.appendChild(createResizeButton(id, size, tile));

    area.appendChild(tile);
  }
}

// Bus listeners moved to blocks.js (unified renderer).
