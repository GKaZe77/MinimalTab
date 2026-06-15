import { state } from "../core/config.js?v=2026-06-15-1";
import { saveConfig } from "../core/storage.js?v=2026-06-15-1";
import { bus, EV } from "../core/events.js?v=2026-06-15-1";

function pad(n) { return String(n).padStart(2, "0"); }

function greeting(h) {
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export function updateClock() {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();

  const clock = document.getElementById("f-clock");
  const date  = document.getElementById("f-date");
  const greet = document.getElementById("f-greeting");
  if (clock) clock.textContent = `${pad(h)}:${pad(m)}`;
  if (date)  date.textContent = now.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric"
  });
  if (greet) greet.textContent = greeting(h);
}

export function updateFocusWeather(wx) {
  const el = document.getElementById("f-weather");
  if (!el) return;
  const cfg = state.cfg;
  if (!cfg.focus.showWeather || !cfg.widgets.weather.enabled || !wx) {
    el.hidden = true;
    return;
  }
  el.textContent = `${wx.temp} · ${wx.info.label}`;
  el.hidden = false;
}

export function updateFocusGoals() {
  const el = document.getElementById("f-goals");
  if (!el) return;
  const cfg = state.cfg;
  if (!cfg.widgets.goals?.enabled || !cfg.widgets.goals?.showOnFocus) {
    el.hidden = true;
    return;
  }
  const goals = cfg.widgets.goals.goals || [];
  if (!goals.length) { el.hidden = true; return; }

  el.hidden = false;
  el.innerHTML = "";
  goals.forEach((g, i) => {
    const chip = document.createElement("button");
    chip.className = "f-goal-chip" + (g.completedToday ? " done" : "");
    chip.textContent = (g.completedToday ? "✓ " : "") + g.text;
    chip.setAttribute("aria-label", `${g.completedToday ? "Completed: " : ""}${g.text}`);
    chip.addEventListener("click", () => {
      g.completedToday = !g.completedToday;
      saveConfig();
      updateFocusGoals();
    });
    el.appendChild(chip);
  });
}

export function initFocusView() {
  updateClock();
  setInterval(updateClock, 15_000);

  // Listen for weather updates
  bus.on(EV.WEATHER_UPDATED, (wx) => updateFocusWeather(wx));
  bus.on(EV.CONFIG_SAVED, () => updateFocusGoals());
}
