import { state } from "../core/config.js?v=2026-06-14-3";
import { saveConfig } from "../core/storage.js?v=2026-06-14-3";
import { bus, EV } from "../core/events.js?v=2026-06-14-3";
import { $ } from "../core/dom.js?v=2026-06-14-3";

let dashVisible = false;
let inactivityTimer = null;

export function isDashVisible() { return dashVisible; }

export function showDash(focusSearch = false) {
  if (dashVisible) { resetInactivity(); return; }
  dashVisible = true;
  document.body.classList.add("dash-on");
  $("#dash-layer")?.setAttribute("aria-hidden", "false");
  $("#focus-layer")?.setAttribute("aria-hidden", "true");
  resetInactivity();
  bus.emit(EV.DASH_SHOW);
  if (focusSearch) {
    requestAnimationFrame(() => $("#search-input")?.focus());
  }
}

export function hideDash() {
  if (!dashVisible) return;
  dashVisible = false;
  document.body.classList.remove("dash-on");
  $("#dash-layer")?.setAttribute("aria-hidden", "true");
  $("#focus-layer")?.setAttribute("aria-hidden", "false");
  clearTimeout(inactivityTimer);
  bus.emit(EV.DASH_HIDE);
}

export function resetInactivity() {
  clearTimeout(inactivityTimer);
  const secs = state.cfg.focus.returnAfter;
  if (!secs || secs <= 0) return;
  inactivityTimer = setTimeout(() => {
    const settingsOpen = !$("#settings-modal")?.hidden;
    const qoOpen = !$("#quick-open")?.hidden;
    const obOpen = !$("#onboarding-modal")?.hidden;
    if (!settingsOpen && !qoOpen && !obOpen) hideDash();
  }, secs * 1000);
}

export function setupFocusHandlers() {
  const focus = state.cfg.focus;

  if (focus.revealOnMove) {
    document.addEventListener("mousemove", () => {
      dashVisible ? resetInactivity() : showDash();
    }, { passive: true });
  }

  if (focus.revealOnClick) {
    $("#focus-layer")?.addEventListener("click", () => showDash(true));
  }

  document.addEventListener("keydown", handleKeydown, { passive: false });

  $("#focus-btn")?.addEventListener("click", hideDash);
  $("#settings-btn")?.addEventListener("click", () => bus.emit(EV.SETTINGS_OPEN));

  if (!focus.defaultOnLoad) showDash();
}

function handleKeydown(e) {
  const active = document.activeElement;
  const typing = active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable;

  // Ctrl/Cmd+K — Quick Open
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    bus.emit("quickopen:toggle");
    return;
  }

  // Escape
  if (e.key === "Escape") {
    const qo = $("#quick-open");
    const sm = $("#settings-modal");
    const ob = $("#onboarding-modal");
    if (!qo?.hidden) { bus.emit("quickopen:close"); return; }
    if (!sm?.hidden) { bus.emit(EV.SETTINGS_CLOSE); return; }
    if (!ob?.hidden) return; // don't allow escape out of onboarding
    if (dashVisible) { hideDash(); return; }
  }

  // F — toggle focus (not when typing)
  if ((e.key === "f" || e.key === "F") && !typing && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    dashVisible ? hideDash() : showDash();
    return;
  }

  // Printable key in focus mode → reveal + fill search
  if (state.cfg.focus.revealOnKey && !dashVisible && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
    const ch = e.key;
    e.preventDefault();
    showDash();
    requestAnimationFrame(() => {
      const inp = $("#search-input");
      if (!inp) return;
      inp.focus();
      inp.value = ch;
      inp.setSelectionRange(1, 1);
    });
    return;
  }

  if (dashVisible && !typing) resetInactivity();
}

// Apply layout width to body
export function applyLayoutAttrs() {
  const layout = state.cfg.layout;
  document.documentElement.setAttribute("data-dash-width", layout.dashboardWidth || "md");
  document.documentElement.setAttribute("data-density", layout.density || "comfortable");
}

// Layout attrs re-applied on multi-tab sync via main.js bus handler
