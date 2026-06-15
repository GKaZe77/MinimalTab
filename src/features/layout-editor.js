// Layout editor — widget order and size management.
// Primary UI is rendered inside settings-modal.js (Layout tab and Widgets tab).
// This module exposes helpers used by other parts of the app.

import { state } from "../core/config.js?v=2026-06-15-1";
import { saveConfig, resetConfig } from "../core/storage.js?v=2026-06-15-1";
import { bus, EV } from "../core/events.js?v=2026-06-15-1";

export function moveWidget(id, direction) {
  const order = state.cfg.layout.widgetOrder;
  const idx = order.indexOf(id);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= order.length) return;
  [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
  saveConfig();
  bus.emit(EV.WIDGETS_CHANGED);
}

export function setWidgetSize(id, size) {
  state.cfg.layout.widgetSizes[id] = size;
  saveConfig();
  bus.emit(EV.WIDGETS_CHANGED);
}

export function setWidgetVisible(id, visible) {
  state.cfg.layout.widgetVisibility[id] = visible;
  saveConfig();
  bus.emit(EV.WIDGETS_CHANGED);
}

export function resetLayout() {
  resetConfig("layout");
  bus.emit(EV.WIDGETS_CHANGED);
}
