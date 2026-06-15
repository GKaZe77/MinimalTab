import { state } from "../core/config.js?v=2026-06-14-3";
import { saveConfig } from "../core/storage.js?v=2026-06-14-3";
import { bus, EV } from "../core/events.js?v=2026-06-14-3";
import { esc, trapFocus } from "../core/dom.js?v=2026-06-14-3";
import { applyAppearance, applyBackground } from "../features/appearance.js?v=2026-06-14-3";
import { STYLE_PRESETS } from "../core/constants.js?v=2026-06-14-3";
import { showToast } from "./toast.js?v=2026-06-14-3";

const ACCENT_PRESETS = ["#a78bfa","#00ffff","#f9a8d4","#4ade80","#fbbf24","#f87171","#60a5fa","#e5e5e5"];

const STEPS = [
  { id: "welcome",    icon: "✨", title: "Welcome to CustomTab",         subtitle: "A private, customizable new-tab page. It starts minimal and becomes personal." },
  { id: "focus",      icon: "◎", title: "Focus & Dashboard",            subtitle: "By default you see the Focus screen — just the clock. Move, click, or type to reveal your links and search." },
  { id: "search",     icon: "🔍", title: "Search & Quick Open",         subtitle: "Search the web or ask AI from the dashboard. Press Ctrl/Cmd+K for Quick Open — search links, run actions, toggle widgets." },
  { id: "links",      icon: "🔗", title: "Links & Widgets",             subtitle: "Add favorite links and folders. Enable optional widgets like Weather, Notes, To-do, RSS, Calendar, Goals, Status, and Spotify." },
  { id: "appearance", icon: "🎨", title: "Make it yours",               subtitle: "Choose a style and accent color. You can always change these in Settings → Appearance." },
  { id: "privacy",    icon: "🔒", title: "Privacy-first",               subtitle: "CustomTab is local-first. Everything stays in your browser unless you enable an external feature." },
  { id: "finish",     icon: "🚀", title: "You're all set!",             subtitle: "Start exploring or customize further in Settings." },
];

let currentStep = 0;
let releaseTrap = null;

export function startOnboarding() {
  const modal = document.getElementById("onboarding-modal");
  if (!modal) return;
  currentStep = 0;
  modal.removeAttribute("hidden");
  renderStep();
  releaseTrap = trapFocus(modal);
}

function finish(action = "start") {
  const modal = document.getElementById("onboarding-modal");
  state.cfg.onboarding.completed = true;
  state.cfg.onboarding.timestamp = Date.now();
  saveConfig();
  releaseTrap?.();
  releaseTrap = null;
  modal?.setAttribute("hidden", "");
  bus.emit(EV.ONBOARDING_DONE);

  if (action === "settings") {
    bus.emit(EV.SETTINGS_OPEN);
  } else if (action === "start") {
    import("./app-shell.js?v=2026-06-14-3").then(m => m.showDash(true));
  }
  showToast("Welcome to CustomTab!");
}

function next() {
  if (currentStep < STEPS.length - 1) { currentStep++; renderStep(); }
  else finish("start");
}

function prev() {
  if (currentStep > 0) { currentStep--; renderStep(); }
}

function renderStep() {
  const panel = document.getElementById("onboarding-panel");
  if (!panel) return;
  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  const dotsHtml = STEPS.map((_, i) => `
    <div class="ob-step-dot ${i < currentStep ? "done" : i === currentStep ? "active" : ""}"></div>
  `).join("");

  let bodyHtml = "";
  if (step.id === "welcome") {
    bodyHtml = `
      <div class="ob-callout"><span class="ob-callout-icon">🏠</span><span>CustomTab replaces your browser's new tab page with this calm, private dashboard.</span></div>
      <div class="ob-callout"><span class="ob-callout-icon">💾</span><span>Everything is stored locally in your browser. No account required.</span></div>
      <div class="ob-callout"><span class="ob-callout-icon">🎛</span><span>Customize everything: links, widgets, appearance, background, search — all from Settings.</span></div>
    `;
  } else if (step.id === "focus") {
    bodyHtml = `
      <div class="ob-callout"><span class="ob-callout-icon">◎</span><span><strong>Focus screen</strong> — clock, date, greeting. No distractions.</span></div>
      <div class="ob-callout"><span class="ob-callout-icon">🖱</span><span><strong>Move mouse, click, or type</strong> to reveal the dashboard with search and your links.</span></div>
      <div style="margin-top:.85rem">
        <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.5rem">Keyboard shortcuts</div>
        <div class="ob-shortcut-row"><span class="ob-shortcut-key"><kbd>F</kbd></span><span class="ob-shortcut-desc">Toggle focus / dashboard</span></div>
        <div class="ob-shortcut-row"><span class="ob-shortcut-key"><kbd>Esc</kbd></span><span class="ob-shortcut-desc">Close modal or return to focus</span></div>
        <div class="ob-shortcut-row"><span class="ob-shortcut-key"><kbd>Any key</kbd></span><span class="ob-shortcut-desc">In focus mode: open dashboard and search</span></div>
      </div>
    `;
  } else if (step.id === "search") {
    bodyHtml = `
      <div class="ob-callout"><span class="ob-callout-icon">⌘</span><span><strong>Ctrl/Cmd+K</strong> opens Quick Open — search links, toggle widgets, open settings, and more.</span></div>
      <div style="margin-top:.85rem">
        <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.5rem">Search shortcuts</div>
        ${["g cats → Google","b query → Brave","yt lofi → YouTube","gh repo → GitHub","r startpages → Reddit","ai explain… → AI"].map(s => {
          const [k,d] = s.split(" → ");
          return `<div class="ob-shortcut-row"><span class="ob-shortcut-key"><kbd>${esc(k)}</kbd></span><span class="ob-shortcut-desc">→ ${esc(d)}</span></div>`;
        }).join("")}
      </div>
    `;
  } else if (step.id === "links") {
    bodyHtml = `
      <div class="ob-callout"><span class="ob-callout-icon">⭐</span><span>Mark links as <strong>favorites</strong> to pin them at the top. Right-click any link for quick actions.</span></div>
      <div class="ob-callout"><span class="ob-callout-icon">🧩</span><span>Optional widgets include <strong>Weather, Notes, To-do, RSS feeds, Calendar, Daily Goals, Status checks,</strong> and <strong>Spotify</strong>.</span></div>
      <div class="ob-callout"><span class="ob-callout-icon">⚙</span><span>Enable and configure widgets in <strong>Settings → Widgets</strong>.</span></div>
    `;
  } else if (step.id === "appearance") {
    const a = state.cfg.appearance;
    const swatches = Object.entries(STYLE_PRESETS).map(([key, p]) => `
      <button class="ob-style-card${a.style===key?" active":""}" data-preset="${key}" aria-pressed="${a.style===key}">
        <div class="ob-style-swatch" style="background:${p.bg};border:2px solid ${p.accent}"></div>
        <div class="ob-style-name">${p.name}</div>
      </button>
    `).join("");
    const accents = ACCENT_PRESETS.map(c => `
      <button class="ob-accent-preset${a.accent===c?" active":""}" style="background:${c}" data-color="${c}" aria-label="Accent ${c}"></button>
    `).join("");
    bodyHtml = `
      <div style="font-size:.78rem;color:var(--muted);margin-bottom:.65rem">Choose a style preset:</div>
      <div class="ob-style-grid" id="ob-style-grid">${swatches}</div>
      <div style="font-size:.78rem;color:var(--muted);margin:1rem 0 .5rem">Accent color:</div>
      <div class="ob-accent-row" id="ob-accent-row">
        ${accents}
        <label class="ob-accent-custom" title="Custom color">
          <input type="color" id="ob-accent-custom" value="${esc(a.accent)}" />
        </label>
      </div>
    `;
  } else if (step.id === "privacy") {
    bodyHtml = `
      <div class="ob-privacy-item"><div class="ob-privacy-dot local"></div><div><strong>Core CustomTab</strong><br><span style="font-size:.8rem;color:var(--muted)">100% local. Config, links, tasks, notes — stored only in your browser.</span></div></div>
      ${[
        ["Weather", "Calls Open-Meteo if you enable the Weather widget"],
        ["Favicons", "Loads icons from Google Favicon service if enabled"],
        ["Spotify",  "Calls Spotify Web API if you connect your account"],
        ["RSS feeds","Fetches RSS/Atom URLs you provide"],
        ["Calendar", "Fetches ICS calendar URLs you provide"],
        ["Status",   "Sends requests to URLs you specify"],
      ].map(([n,d]) => `
        <div class="ob-privacy-item">
          <div class="ob-privacy-dot optional"></div>
          <div><strong>${esc(n)}</strong><br><span style="font-size:.8rem;color:var(--muted)">${esc(d)} — disabled by default.</span></div>
        </div>
      `).join("")}
      <p style="font-size:.78rem;color:var(--muted);margin-top:.75rem">Enable external features in <strong>Settings → Privacy</strong>.</p>
    `;
  } else if (step.id === "finish") {
    bodyHtml = `
      <div class="ob-finish-actions">
        <button class="ob-finish-btn primary" data-action="start">🚀 Start exploring</button>
        <button class="ob-finish-btn" data-action="settings">⚙ Open settings</button>
      </div>
    `;
  }

  panel.innerHTML = `
    <div class="ob-header">
      <div class="ob-steps">${dotsHtml}</div>
      <span class="ob-icon" aria-hidden="true">${step.icon}</span>
      <h2 class="ob-title">${esc(step.title)}</h2>
      <p class="ob-subtitle">${esc(step.subtitle)}</p>
    </div>
    <div class="ob-body">${bodyHtml}</div>
    <div class="ob-footer">
      ${!isFirst ? `<button class="ob-btn-secondary" id="ob-back">← Back</button>` : ""}
      ${!isLast ? `<button class="ob-btn-skip" id="ob-skip">Skip setup</button>` : ""}
      ${!isLast ? `<button class="ob-btn-primary" id="ob-next">${currentStep === 0 ? "Get started →" : "Next →"}</button>` : ""}
    </div>
  `;

  panel.querySelector("#ob-next")?.addEventListener("click", next);
  panel.querySelector("#ob-back")?.addEventListener("click", prev);
  panel.querySelector("#ob-skip")?.addEventListener("click", () => finish("start"));

  // Finish actions
  panel.querySelectorAll(".ob-finish-btn").forEach(btn => {
    btn.addEventListener("click", () => finish(btn.dataset.action || "start"));
  });

  // Appearance step handlers
  if (step.id === "appearance") {
    panel.querySelectorAll(".ob-style-card").forEach(card => {
      card.addEventListener("click", () => {
        const preset = STYLE_PRESETS[card.dataset.preset];
        if (!preset) return;
        state.cfg.appearance.style  = card.dataset.preset;
        state.cfg.appearance.accent = preset.accent;
        saveConfig(); applyAppearance();
        panel.querySelectorAll(".ob-style-card").forEach(c => {
          c.classList.toggle("active", c.dataset.preset === card.dataset.preset);
          c.setAttribute("aria-pressed", String(c.dataset.preset === card.dataset.preset));
        });
        // Update accent presets
        panel.querySelectorAll(".ob-accent-preset").forEach(b => b.classList.toggle("active", b.dataset.color === preset.accent));
      });
    });
    panel.querySelectorAll(".ob-accent-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        state.cfg.appearance.accent = btn.dataset.color;
        saveConfig(); applyAppearance();
        panel.querySelectorAll(".ob-accent-preset").forEach(b => b.classList.toggle("active", b.dataset.color === btn.dataset.color));
      });
    });
    panel.querySelector("#ob-accent-custom")?.addEventListener("input", (e) => {
      state.cfg.appearance.accent = e.target.value;
      applyAppearance();
    });
    panel.querySelector("#ob-accent-custom")?.addEventListener("change", () => saveConfig());
  }
}

export function checkOnboarding() {
  if (!state.cfg.onboarding?.completed) {
    setTimeout(startOnboarding, 400);
  }
}
