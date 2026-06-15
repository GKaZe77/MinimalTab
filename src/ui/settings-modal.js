import { state, DEFAULT_RSS_PROXY_TEMPLATE } from "../core/config.js?v=2026-06-15-1";
import { saveConfig, exportConfig, importConfig, resetConfig } from "../core/storage.js?v=2026-06-15-1";
import { bus, EV } from "../core/events.js?v=2026-06-15-1";
import { esc, uid, $, trapFocus } from "../core/dom.js?v=2026-06-15-1";
import { applyAppearance, applyBackground } from "../features/appearance.js?v=2026-06-15-1";
import { renderLinks } from "../features/links.js?v=2026-06-15-1";
import { showToast } from "./toast.js?v=2026-06-15-1";
import { SEARCH_ENGINES, AI_ENGINES, STYLE_PRESETS } from "../core/constants.js?v=2026-06-15-1";

const TABS = [
  { id: "appearance",   label: "Appearance" },
  { id: "layout",       label: "Layout" },
  { id: "focus",        label: "Focus" },
  { id: "search",       label: "Search" },
  { id: "links",        label: "Links" },
  { id: "widgets",      label: "Widgets" },
  { id: "integrations", label: "Integrations" },
  { id: "privacy",      label: "Privacy" },
  { id: "backup",       label: "Backup" },
  { id: "help",         label: "Help" },
  { id: "advanced",     label: "Advanced" },
];

let activeTab = "appearance";
let releaseFocusTrap = null;

export function openSettings(tab = "appearance") {
  const modal = document.getElementById("settings-modal");
  if (!modal) return;
  modal.removeAttribute("hidden");
  buildTabs();
  selectTab(tab || activeTab);
  releaseFocusTrap = trapFocus(modal);
  import("./app-shell.js?v=2026-06-15-1").then(m => m.showDash());
}

export function closeSettings() {
  const modal = document.getElementById("settings-modal");
  if (!modal) return;
  modal.setAttribute("hidden", "");
  releaseFocusTrap?.();
  releaseFocusTrap = null;
}

function buildTabs() {
  const nav = document.getElementById("settings-tabs");
  if (!nav || nav.dataset.built) return;
  nav.dataset.built = "1";
  nav.innerHTML = TABS.map(t =>
    `<button class="tab-btn${t.id === activeTab ? " active" : ""}" data-tab="${t.id}">${t.label}</button>`
  ).join("");
  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (btn) selectTab(btn.dataset.tab);
  });
}

export function selectTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  renderTab(tab);
}

function renderTab(tab) {
  const el = document.getElementById("settings-content");
  if (!el) return;
  const renders = {
    appearance:   renderAppearance,
    layout:       renderLayout,
    focus:        renderFocus,
    search:       renderSearch,
    links:        renderLinksTab,
    widgets:      renderWidgets,
    integrations: renderIntegrations,
    privacy:      renderPrivacy,
    backup:       renderBackup,
    help:         renderHelp,
    advanced:     renderAdvanced,
  };
  renders[tab]?.(el);
}

/* ── Appearance ── */
function renderAppearance(el) {
  const a = state.cfg.appearance;
  const swatches = Object.entries(STYLE_PRESETS).map(([key, p]) => `
    <button class="style-card${a.style === key ? " active" : ""}" data-preset="${key}" aria-pressed="${a.style === key}">
      <div class="style-swatch" style="background:${p.bg};border:2px solid ${p.accent}"></div>
      <div class="style-name">${p.name}</div>
    </button>
  `).join("");

  el.innerHTML = `
    <div class="s-section">Style preset</div>
    <div class="style-grid" id="style-grid">${swatches}</div>

    <div class="s-section" style="margin-top:1.25rem">Mode</div>
    <div class="s-row">
      <div class="s-label"><strong>Color mode</strong><span>System follows your OS preference</span></div>
      <div class="s-ctrl">
        <div class="mode-group">
          ${["system","light","dark"].map(m => `<button class="mode-opt${a.mode===m?" active":""}" data-mode="${m}" aria-pressed="${a.mode===m}">${m[0].toUpperCase()}${m.slice(1)}</button>`).join("")}
        </div>
      </div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">Accent color</div>
    <div class="s-row">
      <div class="s-label"><strong>Accent</strong><span>Used for highlights and active states</span></div>
      <div class="s-ctrl">
        <label class="color-swatch" title="Pick accent color">
          <input type="color" id="accent-color" value="${esc(a.accent || "#a78bfa")}" />
        </label>
        <span id="accent-hex" style="font-size:.8rem;color:var(--muted)">${esc(a.accent || "#a78bfa")}</span>
      </div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">Background</div>
    <div class="s-row">
      <div class="s-label"><strong>Type</strong></div>
      <div class="s-ctrl">
        <select class="s-select" id="bg-type">
          <option value="solid"    ${a.backgroundType==="solid"?"selected":""}>Solid color</option>
          <option value="gradient" ${a.backgroundType==="gradient"?"selected":""}>Gradient</option>
          <option value="image"    ${a.backgroundType==="image"?"selected":""}>Image URL</option>
        </select>
      </div>
    </div>
    <div class="s-row" id="bg-solid-row"    style="${a.backgroundType!=="solid"?"display:none":""}">
      <div class="s-label"><strong>Background color</strong></div>
      <div class="s-ctrl">
        <label class="color-swatch"><input type="color" id="bg-color" value="${esc(a.backgroundValue||"#1a1a2e")}" /></label>
      </div>
    </div>
    <div class="s-row" id="bg-gradient-row" style="${a.backgroundType!=="gradient"?"display:none":""}">
      <div class="s-label"><strong>CSS gradient</strong><span>e.g. linear-gradient(135deg, #1a1a2e, #0f0f23)</span></div>
      <div class="s-ctrl"><input class="s-input s-input-wide" id="bg-gradient" value="${esc(a.backgroundType==="gradient"?a.backgroundValue:"")}" placeholder="linear-gradient(…)" /></div>
    </div>
    <div class="s-row" id="bg-image-row"    style="${a.backgroundType!=="image"?"display:none":""}">
      <div class="s-label"><strong>Image URL</strong><span>Direct link to a JPG, PNG, or WebP</span></div>
      <div class="s-ctrl"><input class="s-input s-input-wide" id="bg-image" value="${esc(a.backgroundType==="image"?a.backgroundValue:"")}" placeholder="https://example.com/photo.jpg" /></div>
    </div>
    <div class="s-row" id="bg-dim-row" style="${a.backgroundType==="solid"?"display:none":""}">
      <div class="s-label"><strong>Dim</strong><span>Background darkness (0 = none, 1 = black)</span></div>
      <div class="s-ctrl">
        <input type="range" class="s-range" id="bg-dim" min="0" max="1" step="0.05" value="${a.backgroundDim??0.45}" />
        <span id="bg-dim-val" style="font-size:.8rem;color:var(--muted);min-width:2.5rem">${((a.backgroundDim??0.45)*100).toFixed(0)}%</span>
      </div>
    </div>
    <div class="s-row" id="bg-blur-row" style="${a.backgroundType!=="image"?"display:none":""}">
      <div class="s-label"><strong>Blur</strong><span>Blur the background image (px)</span></div>
      <div class="s-ctrl">
        <input type="range" class="s-range" id="bg-blur" min="0" max="20" step="1" value="${a.backgroundBlur??0}" />
        <span id="bg-blur-val" style="font-size:.8rem;color:var(--muted);min-width:2rem">${a.backgroundBlur??0}px</span>
      </div>
    </div>
  `;

  // Style cards
  el.querySelectorAll(".style-card").forEach(card => {
    card.addEventListener("click", () => {
      const preset = STYLE_PRESETS[card.dataset.preset];
      if (!preset) return;
      a.style  = card.dataset.preset;
      a.accent = preset.accent;
      saveConfig(); applyAppearance();
      renderAppearance(el);
    });
  });

  // Mode opts
  el.querySelectorAll(".mode-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      a.mode = btn.dataset.mode;
      saveConfig(); applyAppearance();
      el.querySelectorAll(".mode-opt").forEach(b => { b.classList.toggle("active", b.dataset.mode === a.mode); b.setAttribute("aria-pressed", String(b.dataset.mode === a.mode)); });
    });
  });

  // Accent
  const accentInp = el.querySelector("#accent-color");
  const accentHex = el.querySelector("#accent-hex");
  accentInp?.addEventListener("input", () => {
    accentHex.textContent = accentInp.value;
    document.documentElement.style.setProperty("--accent", accentInp.value);
  });
  accentInp?.addEventListener("change", () => {
    a.accent = accentInp.value;
    saveConfig(); applyAppearance();
  });

  // BG type
  el.querySelector("#bg-type")?.addEventListener("change", (e) => {
    a.backgroundType  = e.target.value;
    a.backgroundValue = "";
    saveConfig(); applyBackground();
    renderAppearance(el);
  });

  const setAndApply = (id, key) => {
    el.querySelector(id)?.addEventListener("input", (e) => {
      a[key] = e.target.value;
      if (id === "#bg-dim") { el.querySelector("#bg-dim-val").textContent = Math.round(e.target.value * 100) + "%"; }
      if (id === "#bg-blur") { el.querySelector("#bg-blur-val").textContent = e.target.value + "px"; }
      applyBackground();
    });
    el.querySelector(id)?.addEventListener("change", () => saveConfig());
  };
  setAndApply("#bg-color",    "backgroundValue");
  setAndApply("#bg-gradient", "backgroundValue");
  setAndApply("#bg-image",    "backgroundValue");
  setAndApply("#bg-dim",      "backgroundDim");
  setAndApply("#bg-blur",     "backgroundBlur");
}

/* ── Layout ── */
function renderLayout(el) {
  const layout = state.cfg.layout;
  const isCustom = layout.mode === "custom";

  el.innerHTML = `
    <div class="s-section">Dashboard</div>
    <div class="s-row">
      <div class="s-label"><strong>Width</strong><span>Max width of the dashboard column</span></div>
      <div class="s-ctrl">
        <select class="s-select" id="dash-width">
          <option value="sm" ${layout.dashboardWidth==="sm"?"selected":""}>Narrow (540px)</option>
          <option value="md" ${layout.dashboardWidth==="md"?"selected":""}>Medium (680px)</option>
          <option value="lg" ${layout.dashboardWidth==="lg"?"selected":""}>Wide (860px)</option>
          <option value="xl" ${layout.dashboardWidth==="xl"?"selected":""}>Full (1080px)</option>
        </select>
      </div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Density</strong><span>Spacing between sections</span></div>
      <div class="s-ctrl">
        <select class="s-select" id="dash-density">
          <option value="compact"    ${layout.density==="compact"?"selected":""}>Compact</option>
          <option value="comfortable" ${layout.density==="comfortable"?"selected":""}>Comfortable</option>
          <option value="spacious"   ${layout.density==="spacious"?"selected":""}>Spacious</option>
        </select>
      </div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">Layout mode</div>
    <div class="s-row">
      <div class="s-label">
        <strong>Mode</strong>
        <span>Auto: flexible stack. Custom: 12-column grid with drag &amp; resize.</span>
      </div>
      <div class="s-ctrl">
        <div class="mode-group">
          <button class="mode-opt${!isCustom?" active":""}" id="layout-mode-auto">Auto</button>
          <button class="mode-opt${isCustom?" active":""}"  id="layout-mode-custom">Custom grid</button>
        </div>
      </div>
    </div>
    ${isCustom ? `
    <div class="s-row">
      <div class="s-label"><strong>Grid columns</strong><span>Number of columns (default 12)</span></div>
      <div class="s-ctrl"><input type="number" class="s-input" id="layout-cols" value="${layout.columns||12}" min="2" max="24" style="min-width:70px" /></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Row height (px)</strong><span>Height of each grid row unit</span></div>
      <div class="s-ctrl"><input type="number" class="s-input" id="layout-rowh" value="${layout.rowHeight||80}" min="40" max="200" style="min-width:70px" /></div>
    </div>` : ""}

    <div class="s-section" style="margin-top:1.25rem">Design mode</div>
    <div class="s-row">
      <div class="s-label"><strong>Design mode</strong><span>Drag blocks, resize and reorder everything on the dashboard</span></div>
      <div class="s-ctrl"><button class="s-btn sm" id="open-design-mode-btn">Open Design Mode ⊞</button></div>
    </div>
    <div class="s-row" style="margin-top:.25rem">
      <div class="s-label"><strong>Reset layout</strong><span>Restore default block order and positions</span></div>
      <div class="s-ctrl"><button class="s-btn danger sm" id="reset-layout-btn">Reset layout</button></div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">Widget order</div>
    <p style="font-size:.78rem;color:var(--muted);margin-bottom:.75rem">Legacy widget order (also controls default block order). Use Design Mode to reorder freely.</p>
    <div class="widget-order-list" id="widget-order-list"></div>
  `;

  el.querySelector("#dash-width")?.addEventListener("change", (e) => {
    layout.dashboardWidth = e.target.value;
    saveConfig();
    document.documentElement.setAttribute("data-dash-width", e.target.value);
  });
  el.querySelector("#dash-density")?.addEventListener("change", (e) => {
    layout.density = e.target.value;
    saveConfig();
    document.documentElement.setAttribute("data-density", e.target.value);
  });

  el.querySelector("#layout-mode-auto")?.addEventListener("click", () => {
    layout.mode = "auto"; saveConfig();
    import("../layout/blocks.js?v=2026-06-15-1").then(m => m.renderBlocks());
    renderLayout(el);
  });
  el.querySelector("#layout-mode-custom")?.addEventListener("click", () => {
    layout.mode = "custom";
    import("../layout/blocks.js?v=2026-06-15-1").then(({ ensurePositions, renderBlocks }) => {
      ensurePositions(layout); saveConfig(); renderBlocks();
    });
    renderLayout(el);
  });

  el.querySelector("#layout-cols")?.addEventListener("input", (e) => {
    layout.columns = Math.max(2, +e.target.value || 12); saveConfig();
  });
  el.querySelector("#layout-rowh")?.addEventListener("input", (e) => {
    layout.rowHeight = Math.max(40, +e.target.value || 80); saveConfig();
  });

  el.querySelector("#open-design-mode-btn")?.addEventListener("click", () => {
    import("../layout/design-mode.js?v=2026-06-15-1").then(m => {
      bus.emit(EV.SETTINGS_CLOSE);
      m.enterDesignMode();
    });
  });

  el.querySelector("#reset-layout-btn")?.addEventListener("click", () => {
    if (!confirm("Reset layout to defaults?")) return;
    layout.blockOrder = [];
    layout.blocks     = {};
    layout.mode       = "auto";
    saveConfig();
    import("./app-shell.js?v=2026-06-15-1").then(m => m.applyLayoutAttrs());
    import("../layout/blocks.js?v=2026-06-15-1").then(m => m.renderBlocks());
    renderLayout(el);
    showToast("Layout reset to defaults");
  });

  buildWidgetOrderList(el.querySelector("#widget-order-list"));
}

function buildWidgetOrderList(list) {
  if (!list) return;
  const order = state.cfg.layout.widgetOrder || [];
  list.innerHTML = "";
  const icons = { weather:"🌤", todo:"✅", notes:"📝", spotify:"🎵", rss:"📰", calendar:"📅", goals:"🎯", status:"🟢" };
  const names = { weather:"Weather", todo:"To-do", notes:"Notes", spotify:"Spotify", rss:"RSS", calendar:"Calendar", goals:"Goals", status:"Status" };
  order.forEach((id, i) => {
    const w = state.cfg.widgets[id];
    const row = document.createElement("div");
    row.className = "widget-order-item";
    row.innerHTML = `
      <span class="widget-order-handle" aria-hidden="true">⠿</span>
      <span class="widget-order-name">${icons[id]||"🧩"} ${names[id]||id} ${w?.enabled ? "" : '<span style="font-size:.72rem;color:var(--muted)">(disabled)</span>'}</span>
      <div class="widget-order-arrows">
        <button class="widget-order-arrow" data-dir="-1" aria-label="Move up"   ${i===0?"disabled":""}>↑</button>
        <button class="widget-order-arrow" data-dir="1"  aria-label="Move down" ${i===order.length-1?"disabled":""}>↓</button>
      </div>
    `;
    row.querySelectorAll(".widget-order-arrow").forEach(btn => {
      btn.addEventListener("click", () => {
        const dir = +btn.dataset.dir;
        const newI = i + dir;
        if (newI < 0 || newI >= order.length) return;
        [order[i], order[newI]] = [order[newI], order[i]];
        // Mirror change into blockOrder
        const bo = state.cfg.layout.blockOrder;
        const oa = `widget:${order[i]}`, ob = `widget:${order[newI]}`;
        const ia = bo.indexOf(oa), ib = bo.indexOf(ob);
        if (ia >= 0 && ib >= 0) [bo[ia], bo[ib]] = [bo[ib], bo[ia]];
        saveConfig();
        bus.emit(EV.WIDGETS_CHANGED);
        buildWidgetOrderList(list);
      });
    });
    list.appendChild(row);
  });
}

/* ── Focus ── */
function renderFocus(el) {
  const f = state.cfg.focus;
  const returnOpts = [
    [0, "Never"], [30, "30 seconds"], [60, "1 minute"], [300, "5 minutes"], [600, "10 minutes"]
  ].map(([v, l]) => `<option value="${v}" ${f.returnAfter===v?"selected":""}>${l}</option>`).join("");

  el.innerHTML = `
    <div class="s-section">Focus mode</div>
    ${toggle("f-default", "defaultOnLoad", f.defaultOnLoad, "Start in focus mode", "Clock screen on every new tab")}
    ${toggle("f-move",    "revealOnMove",  f.revealOnMove,  "Reveal on mouse move", "")}
    ${toggle("f-key",     "revealOnKey",   f.revealOnKey,   "Reveal when typing",   "Typing opens the search bar")}
    ${toggle("f-click",   "revealOnClick", f.revealOnClick, "Reveal on click", "")}
    ${toggle("f-hint",    "showHint",      f.showHint,      "Show focus hint",     "Small label when dashboard is open")}
    <div class="s-row">
      <div class="s-label"><strong>Return to focus after</strong><span>Inactivity timer</span></div>
      <div class="s-ctrl"><select class="s-select" id="f-return">${returnOpts}</select></div>
    </div>
    <div class="s-section" style="margin-top:1.25rem">Focus screen content</div>
    ${toggle("f-weather", "showWeather",   f.showWeather,   "Show weather",        "Tiny weather line under the clock")}
    ${toggle("f-music",   "showMusic",     f.showMusic,     "Show now playing",    "If Spotify widget is enabled")}
  `;

  bindToggles(el, f, [
    ["#f-default","defaultOnLoad"],["#f-move","revealOnMove"],
    ["#f-key","revealOnKey"],["#f-click","revealOnClick"],
    ["#f-hint","showHint"],["#f-weather","showWeather"],["#f-music","showMusic"]
  ]);

  el.querySelector("#f-return")?.addEventListener("change", (e) => {
    f.returnAfter = +e.target.value;
    saveConfig();
    import("./app-shell.js?v=2026-06-15-1").then(m => m.resetInactivity());
  });
}

/* ── Search ── */
function renderSearch(el) {
  const s = state.cfg.search;
  const engOpts = Object.entries(SEARCH_ENGINES).map(([k,v]) => `<option value="${k}" ${s.engine===k?"selected":""}>${v.name}</option>`).join("");
  const aiOpts  = Object.entries(AI_ENGINES).map(([k,v]) => `<option value="${k}" ${s.aiEngine===k?"selected":""}>${v.name}</option>`).join("");

  el.innerHTML = `
    <div class="s-section">Web search</div>
    <div class="s-row">
      <div class="s-label"><strong>Default engine</strong></div>
      <div class="s-ctrl"><select class="s-select" id="s-engine">${engOpts}</select></div>
    </div>
    <div class="s-row" id="cust-url-row" style="${s.engine==="custom"?"":"display:none"}">
      <div class="s-label"><strong>Custom URL</strong><span>Use {q} for the query</span></div>
      <div class="s-ctrl"><input class="s-input s-input-wide" id="s-cust-url" value="${esc(s.customUrl)}" placeholder="https://example.com/search?q={q}" /></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Open in</strong></div>
      <div class="s-ctrl">
        <div class="mode-group">
          <button class="mode-opt${s.openIn==="_blank"?" active":""}" data-open="_blank">New tab</button>
          <button class="mode-opt${s.openIn==="_self"?" active":""}"  data-open="_self">Same tab</button>
        </div>
      </div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">AI search</div>
    <div class="s-row">
      <div class="s-label"><strong>AI engine</strong></div>
      <div class="s-ctrl"><select class="s-select" id="s-ai-engine">${aiOpts}</select></div>
    </div>
    <div class="s-row" id="ai-cust-row" style="${s.aiEngine==="custom"?"":"display:none"}">
      <div class="s-label"><strong>Custom AI URL</strong><span>Use {q} for the query</span></div>
      <div class="s-ctrl"><input class="s-input s-input-wide" id="s-ai-cust" value="${esc(s.aiCustomUrl)}" placeholder="https://example.com/?q={q}" /></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Open in</strong></div>
      <div class="s-ctrl">
        <div class="mode-group">
          <button class="mode-opt${s.aiOpenIn==="_blank"?" active":""}" data-ai-open="_blank">New tab</button>
          <button class="mode-opt${s.aiOpenIn==="_self"?" active":""}"  data-ai-open="_self">Same tab</button>
        </div>
      </div>
    </div>

    <div class="s-section" style="margin-top:1.25rem">Search shortcuts</div>
    ${toggle("s-shortcuts", "shortcutsEnabled", s.shortcutsEnabled, "Enable shortcuts", "Type 'g cats' to search Google, 'yt music' for YouTube, etc.")}
    <div class="s-row">
      <div class="s-label"><strong>Shortcuts</strong><span>prefix → engine (e.g. g → google, ai → ai)</span></div>
    </div>
    <div style="font-size:.8rem;color:var(--muted);line-height:1.8;padding:.5rem 0">
      ${Object.entries(s.shortcuts||{}).map(([k,v]) => `<code style="background:var(--subtle);padding:.1rem .3rem;border-radius:3px;margin-right:.3rem">${esc(k)}</code> → ${esc(v)}`).join(" &nbsp; ")}
    </div>
  `;

  el.querySelector("#s-engine")?.addEventListener("change", (e) => {
    s.engine = e.target.value;
    el.querySelector("#cust-url-row").style.display = e.target.value === "custom" ? "" : "none";
    saveConfig();
  });
  el.querySelector("#s-cust-url")?.addEventListener("input", (e) => { s.customUrl = e.target.value; saveConfig(); });
  el.querySelector("#s-ai-engine")?.addEventListener("change", (e) => {
    s.aiEngine = e.target.value;
    el.querySelector("#ai-cust-row").style.display = e.target.value === "custom" ? "" : "none";
    saveConfig();
  });
  el.querySelector("#s-ai-cust")?.addEventListener("input", (e) => { s.aiCustomUrl = e.target.value; saveConfig(); });

  el.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => { s.openIn = btn.dataset.open; saveConfig(); el.querySelectorAll("[data-open]").forEach(b => b.classList.toggle("active", b.dataset.open === s.openIn)); });
  });
  el.querySelectorAll("[data-ai-open]").forEach(btn => {
    btn.addEventListener("click", () => { s.aiOpenIn = btn.dataset.aiOpen; saveConfig(); el.querySelectorAll("[data-ai-open]").forEach(b => b.classList.toggle("active", b.dataset.aiOpen === s.aiOpenIn)); });
  });

  bindToggles(el, s, [["#s-shortcuts","shortcutsEnabled"]]);
}

/* ── Links tab ── */
function renderLinksTab(el) {
  function rebuild() {
    const list = el.querySelector(".folders-list");
    if (!list) return;
    list.innerHTML = "";
    (state.cfg.links.folders || []).forEach((folder, fi) => list.appendChild(buildFolderEditor(folder, fi, rebuild)));
  }

  el.innerHTML = `
    <div class="s-section">Folders &amp; links</div>
    <p style="font-size:.78rem;color:var(--muted);margin-bottom:.75rem">Right-click or long-press links on the homepage for quick actions.</p>
    <div class="folders-list"></div>
    <button class="add-folder-btn" id="add-folder-btn" style="margin-top:.65rem">+ Add folder</button>
  `;

  rebuild();

  el.querySelector("#add-folder-btn")?.addEventListener("click", () => {
    (state.cfg.links.folders = state.cfg.links.folders || []).push({ id: uid(), name: "New folder", collapsed: false, links: [] });
    saveConfig(); renderLinks(); rebuild();
  });
}

function buildFolderEditor(folder, fi, onRebuild) {
  const wrap = document.createElement("div");
  wrap.className = "lfe";

  const head = document.createElement("div");
  head.className = "lfe-head";
  head.innerHTML = `
    <input class="lfe-fold-name" value="${esc(folder.name)}" placeholder="Folder name" aria-label="Folder name" />
    <button class="lfe-fold-del" title="Delete folder" aria-label="Delete folder">✕</button>
  `;
  head.querySelector(".lfe-fold-name").addEventListener("input", (e) => {
    folder.name = e.target.value; saveConfig(); renderLinks();
  });
  head.querySelector(".lfe-fold-del").addEventListener("click", () => {
    if (folder.links?.length && !confirm(`Delete "${folder.name}" and all its links?`)) return;
    state.cfg.links.folders.splice(fi, 1);
    saveConfig(); renderLinks(); onRebuild();
  });

  const body = document.createElement("div");
  body.className = "lfe-links";

  function rebuildLinks() {
    body.innerHTML = "";
    (folder.links || []).forEach((link, li) => {
      const row = document.createElement("div");
      row.className = "lfe-link-row";
      row.innerHTML = `
        <input class="lfe-ln" value="${esc(link.name)}" placeholder="Name" aria-label="Link name" />
        <input class="lfe-lu" value="${esc(link.url)}"  placeholder="https://…" aria-label="URL" />
        <button class="lfe-fav${link.favorite?" on":""}" title="${link.favorite?"Unfavorite":"Favorite"}" aria-label="Toggle favorite">★</button>
        <button class="lfe-link-del" title="Remove" aria-label="Remove">✕</button>
      `;
      row.querySelector(".lfe-ln").addEventListener("input", (e) => { link.name = e.target.value; saveConfig(); renderLinks(); });
      row.querySelector(".lfe-lu").addEventListener("input", (e) => { link.url  = e.target.value; saveConfig(); renderLinks(); });
      row.querySelector(".lfe-fav").addEventListener("click", (e) => {
        link.favorite = !link.favorite;
        e.currentTarget.classList.toggle("on", link.favorite);
        saveConfig(); renderLinks();
      });
      row.querySelector(".lfe-link-del").addEventListener("click", () => {
        folder.links.splice(li, 1); saveConfig(); renderLinks(); rebuildLinks();
      });
      body.appendChild(row);
    });
    const add = document.createElement("button");
    add.className = "lfe-add-link";
    add.textContent = "+ Add link";
    add.addEventListener("click", () => {
      folder.links = folder.links || [];
      folder.links.push({ id: uid(), name: "", url: "", favorite: false });
      saveConfig(); rebuildLinks(); renderLinks();
    });
    body.appendChild(add);
  }

  rebuildLinks();
  wrap.appendChild(head);
  wrap.appendChild(body);
  return wrap;
}

/* ── Widgets tab ── */
function renderWidgets(el) {
  el.innerHTML = `<div class="s-section">Enable &amp; configure widgets</div>`;

  const defs = [
    { id: "weather",  icon: "🌤", name: "Weather",  desc: "Current weather and forecast (Open-Meteo)" },
    { id: "todo",     icon: "✅", name: "To-do",    desc: "Simple task list" },
    { id: "notes",    icon: "📝", name: "Notes",    desc: "Quick freeform notes" },
    { id: "rss",      icon: "📰", name: "RSS Feeds",desc: "News and feed reader" },
    { id: "calendar", icon: "📅", name: "Calendar", desc: "Upcoming events from ICS sources" },
    { id: "goals",    icon: "🎯", name: "Daily Goals", desc: "Daily habits and goals tracker" },
    { id: "status",   icon: "🟢", name: "Status",   desc: "Website uptime checker" },
    { id: "spotify",  icon: "🎵", name: "Spotify",  desc: "Now playing — requires Spotify account" },
  ];

  defs.forEach(def => {
    const w = state.cfg.widgets[def.id] || {};
    const section = document.createElement("div");
    section.className = "widget-section" + (w.enabled ? " open" : "");
    section.innerHTML = `
      <div class="widget-section-head">
        <span class="widget-section-icon">${def.icon}</span>
        <span class="widget-section-title">${def.name}</span>
        <label class="s-toggle" aria-label="Enable ${def.name}" style="margin-right:.35rem">
          <input type="checkbox" class="w-enable" data-wid="${def.id}" ${w.enabled?"checked":""} />
          <span class="s-track"></span>
        </label>
        <span class="widget-section-caret" aria-hidden="true">▾</span>
      </div>
      <div class="widget-section-body"></div>
    `;
    const head = section.querySelector(".widget-section-head");
    const body = section.querySelector(".widget-section-body");

    head.addEventListener("click", (e) => {
      if (e.target.closest("label")) return;
      section.classList.toggle("open");
      if (section.classList.contains("open") && !body.dataset.rendered) {
        renderWidgetBody(def.id, body);
        body.dataset.rendered = "1";
      }
    });

    section.querySelector(".w-enable").addEventListener("change", (e) => {
      w.enabled = e.target.checked;
      saveConfig();
      bus.emit(EV.WIDGETS_CHANGED);
      showToast(`${def.name} ${w.enabled ? "enabled" : "disabled"}`);
      if (w.enabled && !body.dataset.rendered) {
        renderWidgetBody(def.id, body);
        body.dataset.rendered = "1";
      }
    });

    if (w.enabled) {
      renderWidgetBody(def.id, body);
      body.dataset.rendered = "1";
    }

    el.appendChild(section);
  });
}

function renderWidgetBody(id, el) {
  const w = state.cfg.widgets[id];
  if (!w) return;
  el.innerHTML = "";

  if (id === "weather") {
    el.innerHTML = `
      ${row("Location", "Leave blank for auto-detect", `<input class="s-input" id="wx-loc" value="${esc(w.location==="auto"?"":w.location)}" placeholder="City name or blank for auto" />`)}
      <div class="s-row">
        <div class="s-label"><strong>Units</strong></div>
        <div class="s-ctrl"><select class="s-select" id="wx-units">
          <option value="fahrenheit" ${w.units==="fahrenheit"?"selected":""}>Fahrenheit (°F)</option>
          <option value="celsius"    ${w.units==="celsius"?"selected":""}>Celsius (°C)</option>
        </select></div>
      </div>
      ${toggleRow("wx-forecast", w.showForecast, "Show forecast")}
    `;
    el.querySelector("#wx-loc")?.addEventListener("input",  (e) => { w.location = e.target.value.trim() || "auto"; saveConfig(); bus.emit("weather:refresh"); });
    el.querySelector("#wx-units")?.addEventListener("change", (e) => { w.units = e.target.value; saveConfig(); bus.emit("weather:refresh"); });
    el.querySelector("#wx-forecast")?.addEventListener("change", (e) => { w.showForecast = e.target.checked; saveConfig(); bus.emit(EV.WIDGETS_CHANGED); });
  }

  else if (id === "todo") {
    el.innerHTML = toggleRow("td-done", w.showCompleted, "Show completed tasks");
    el.querySelector("#td-done")?.addEventListener("change", (e) => { w.showCompleted = e.target.checked; saveConfig(); bus.emit(EV.WIDGETS_CHANGED); });
  }

  else if (id === "notes") {
    el.innerHTML = row("Title", "", `<input class="s-input" id="nt-title" value="${esc(w.title||"Notes")}" />`);
    el.querySelector("#nt-title")?.addEventListener("input", (e) => { w.title = e.target.value; saveConfig(); bus.emit(EV.WIDGETS_CHANGED); });
  }

  else if (id === "rss") { renderRssBody(el, w); }
  else if (id === "calendar") { renderCalendarBody(el, w); }
  else if (id === "goals")    { renderGoalsBody(el, w); }
  else if (id === "status")   { renderStatusBody(el, w); }
  else if (id === "spotify")  { renderSpotifyBody(el, w); }
}

function renderRssBody(el, w) {
  const privacy = state.cfg.privacy;
  if (!privacy.allowRssFetches) {
    el.innerHTML = `<p style="font-size:.8rem;color:var(--warning);padding:.5rem 0">⚠ RSS fetches are disabled in Privacy settings. Enable "Allow RSS fetches" to use this widget.</p>`;
    const btn = document.createElement("button");
    btn.className = "s-btn ghost sm";
    btn.textContent = "Go to Privacy settings";
    btn.addEventListener("click", () => selectTab("privacy"));
    el.appendChild(btn);
    return;
  }

  el.innerHTML = `
    <div class="s-row">
      <div class="s-label"><strong>Max items total</strong><span>Across all feeds combined</span></div>
      <div class="s-ctrl"><input type="number" class="s-input" id="rss-max" value="${w.maxItems||100}" min="1" max="500" style="min-width:80px" /></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Max items per feed</strong><span>Items taken from each feed</span></div>
      <div class="s-ctrl"><input type="number" class="s-input" id="rss-per-feed" value="${w.maxItemsPerFeed||10}" min="1" max="100" style="min-width:80px" /></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Refresh interval</strong></div>
      <div class="s-ctrl"><select class="s-select" id="rss-refresh">
        <option value="15"  ${w.refreshMinutes===15?"selected":""}>15 minutes</option>
        <option value="30"  ${w.refreshMinutes===30?"selected":""}>30 minutes</option>
        <option value="60"  ${w.refreshMinutes===60?"selected":""}>1 hour</option>
        <option value="180" ${w.refreshMinutes===180?"selected":""}>3 hours</option>
      </select></div>
    </div>
    ${toggleRow("rss-source", w.showSource, "Show source name")}
    ${toggleRow("rss-excerpt", w.showExcerpt, "Show excerpt")}
    <div class="s-row">
      <div class="s-label"><strong>Open links in</strong></div>
      <div class="s-ctrl">
        <div class="mode-group">
          <button class="mode-opt${w.openIn==="_blank"?" active":""}" data-rss-open="_blank">New tab</button>
          <button class="mode-opt${w.openIn==="_self"?" active":""}"  data-rss-open="_self">Same tab</button>
        </div>
      </div>
    </div>
    ${rowBlock("Proxy URL", "CORS proxy for feeds. Must contain {url}. Blank restores default.", `<input class="s-input s-input-full" id="rss-proxy" value="${esc(w.proxyTemplate||"")}" placeholder="${esc(DEFAULT_RSS_PROXY_TEMPLATE)}" />`)}

    <div style="margin-top:.85rem">
      <div style="font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.45rem">Active feeds</div>
      <div class="feed-list" id="rss-feed-list"></div>
      <button class="s-btn ghost sm" id="rss-add-preset-btn" style="margin-top:.4rem">+ Add from presets</button>
      <button class="s-btn ghost sm" id="rss-add-custom-btn" style="margin-top:.4rem;margin-left:.35rem">+ Add custom feed</button>
    </div>
  `;

  renderFeedList(el.querySelector("#rss-feed-list"), w);

  el.querySelector("#rss-max")?.addEventListener("input", (e) => { w.maxItems = +e.target.value; saveConfig(); bus.emit(EV.WIDGETS_CHANGED); });
  el.querySelector("#rss-per-feed")?.addEventListener("input", (e) => { w.maxItemsPerFeed = +e.target.value; saveConfig(); bus.emit(EV.WIDGETS_CHANGED); });
  el.querySelector("#rss-refresh")?.addEventListener("change", (e) => { w.refreshMinutes = +e.target.value; saveConfig(); });
  el.querySelector("#rss-source")?.addEventListener("change", (e) => { w.showSource = e.target.checked; saveConfig(); bus.emit(EV.WIDGETS_CHANGED); });
  el.querySelector("#rss-excerpt")?.addEventListener("change", (e) => { w.showExcerpt = e.target.checked; saveConfig(); bus.emit(EV.WIDGETS_CHANGED); });
  el.querySelector("#rss-proxy")?.addEventListener("input", (e) => { w.proxyTemplate = e.target.value; saveConfig(); });
  el.querySelectorAll("[data-rss-open]").forEach(btn => {
    btn.addEventListener("click", () => { w.openIn = btn.dataset.rssOpen; saveConfig(); el.querySelectorAll("[data-rss-open]").forEach(b => b.classList.toggle("active", b.dataset.rssOpen === w.openIn)); });
  });

  el.querySelector("#rss-add-preset-btn")?.addEventListener("click", () => showRssPresetPicker(el, w));
  el.querySelector("#rss-add-custom-btn")?.addEventListener("click", () => showAddCustomFeed(el, w));
}

function renderFeedList(list, w) {
  if (!list) return;
  list.innerHTML = "";
  (w.feeds || []).forEach((feed, i) => {
    const item = document.createElement("div");
    item.className = "feed-item";
    item.innerHTML = `
      <label class="s-toggle" aria-label="Enable ${esc(feed.name)}">
        <input type="checkbox" ${feed.enabled!==false?"checked":""} />
        <span class="s-track"></span>
      </label>
      <span class="feed-item-name">${esc(feed.name)}</span>
      <button class="feed-item-del" aria-label="Remove feed">✕</button>
    `;
    item.querySelector("input")?.addEventListener("change", (e) => { feed.enabled = e.target.checked; saveConfig(); bus.emit(EV.WIDGETS_CHANGED); });
    item.querySelector(".feed-item-del")?.addEventListener("click", () => {
      w.feeds.splice(i, 1); saveConfig(); bus.emit(EV.WIDGETS_CHANGED);
      const parent = list.closest("[class]");
      renderFeedList(list, w);
    });
    list.appendChild(item);
  });
  if (!w.feeds?.length) {
    list.innerHTML = `<p style="font-size:.78rem;color:var(--muted)">No feeds added yet.</p>`;
  }
}

function showRssPresetPicker(parent, w) {
  import("../integrations/rss.js?v=2026-06-15-1").then(({ RSS_PRESETS }) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:9900;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(4px)";
    const panel = document.createElement("div");
    panel.style.cssText = `background:color-mix(in srgb,var(--bg) 95%,transparent);border:1px solid var(--glass-border);border-radius:var(--radius-lg);width:90%;max-width:500px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;`;

    const byCategory = {};
    RSS_PRESETS.forEach(p => { (byCategory[p.category] = byCategory[p.category] || []).push(p); });

    let html = `<div style="padding:1rem;border-bottom:1px solid var(--glass-border);display:flex;align-items:center;gap:.75rem"><strong style="flex:1">RSS Presets</strong><button id="preset-close" style="background:none;border:none;color:var(--muted);font-size:1rem;cursor:pointer">✕</button></div>`;
    html += `<input id="preset-search" class="rss-preset-search" placeholder="Search presets…" style="margin:.75rem;border-radius:var(--radius-sm)">`;
    html += `<div style="overflow-y:auto;padding:.5rem .75rem">`;
    Object.entries(byCategory).forEach(([cat, presets]) => {
      html += `<div class="rss-preset-category"><div class="rss-preset-cat-label">${esc(cat)}</div>`;
      presets.forEach(p => {
        const already = (w.feeds||[]).some(f => f.url === p.url);
        html += `<div class="rss-preset-item" data-url="${esc(p.url)}" data-name="${esc(p.name)}">
          <input type="checkbox" ${already?"checked":""} ${already?"disabled":""} id="pr-${esc(p.id)}" />
          <div class="rss-preset-item-info">
            <div class="rss-preset-item-name">${esc(p.name)}</div>
            <div class="rss-preset-item-desc">${esc(p.description)}</div>
          </div>
        </div>`;
      });
      html += `</div>`;
    });
    html += `</div><div style="padding:.75rem;border-top:1px solid var(--glass-border);display:flex;justify-content:flex-end;gap:.5rem">
      <button class="s-btn ghost" id="preset-cancel">Cancel</button>
      <button class="s-btn" id="preset-add">Add selected</button>
    </div>`;
    panel.innerHTML = html;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const close = () => document.body.removeChild(overlay);
    panel.querySelector("#preset-close")?.addEventListener("click", close);
    panel.querySelector("#preset-cancel")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    panel.querySelector("#preset-search")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      panel.querySelectorAll(".rss-preset-item").forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });

    panel.querySelector("#preset-add")?.addEventListener("click", () => {
      panel.querySelectorAll(".rss-preset-item input:checked:not(:disabled)").forEach(cb => {
        const item = cb.closest(".rss-preset-item");
        w.feeds = w.feeds || [];
        if (!w.feeds.some(f => f.url === item.dataset.url)) {
          w.feeds.push({ id: uid(), name: item.dataset.name, url: item.dataset.url, enabled: true });
        }
      });
      saveConfig(); bus.emit(EV.WIDGETS_CHANGED);
      close();
      // Refresh feed list
      const list = parent.querySelector("#rss-feed-list");
      if (list) renderFeedList(list, w);
    });
  });
}

function showAddCustomFeed(parent, w) {
  const d = document.createElement("div");
  d.style.cssText = "border:1px solid var(--glass-border);border-radius:var(--radius-md);padding:.75rem;margin-top:.5rem;background:var(--glass-bg)";
  d.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:.4rem">
      <input class="s-input s-input-full" id="cf-name" placeholder="Feed name" />
      <input class="s-input s-input-full" id="cf-url"  placeholder="https://example.com/feed.rss" />
      <div style="display:flex;gap:.4rem;margin-top:.25rem">
        <button class="s-btn sm" id="cf-save">Add</button>
        <button class="s-btn ghost sm" id="cf-cancel">Cancel</button>
      </div>
    </div>
  `;
  parent.appendChild(d);
  d.querySelector("#cf-cancel")?.addEventListener("click", () => d.remove());
  d.querySelector("#cf-save")?.addEventListener("click", () => {
    const name = d.querySelector("#cf-name")?.value.trim();
    const url  = d.querySelector("#cf-url")?.value.trim();
    if (!name || !url) { showToast("Name and URL are required"); return; }
    w.feeds = w.feeds || [];
    w.feeds.push({ id: uid(), name, url, enabled: true });
    saveConfig(); bus.emit(EV.WIDGETS_CHANGED);
    const list = parent.querySelector("#rss-feed-list");
    if (list) renderFeedList(list, w);
    d.remove();
  });
}

function renderCalendarBody(el, w) {
  el.innerHTML = `
    <div class="s-row">
      <div class="s-label"><strong>Max days ahead</strong></div>
      <div class="s-ctrl"><input type="number" class="s-input" id="cal-days" value="${w.maxDays||7}" min="1" max="30" style="min-width:80px"/></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Max events shown</strong></div>
      <div class="s-ctrl"><input type="number" class="s-input" id="cal-max" value="${w.maxItems||6}" min="1" max="30" style="min-width:80px"/></div>
    </div>
    ${rowBlock("Proxy URL", "Optional for CORS issues", `<input class="s-input s-input-full" id="cal-proxy" value="${esc(w.proxyTemplate||"")}" placeholder="https://…?url={url}" />`)}
    <div style="margin-top:.75rem">
      <div style="font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.4rem">ICS Calendar sources</div>
      <div id="cal-source-list"></div>
      <button class="s-btn ghost sm" id="cal-add-btn" style="margin-top:.4rem">+ Add calendar URL</button>
    </div>
  `;
  el.querySelector("#cal-days")?.addEventListener("input",  (e) => { w.maxDays = +e.target.value; saveConfig(); });
  el.querySelector("#cal-max")?.addEventListener("input",   (e) => { w.maxItems = +e.target.value; saveConfig(); });
  el.querySelector("#cal-proxy")?.addEventListener("input", (e) => { w.proxyTemplate = e.target.value; saveConfig(); });

  const sourceList = el.querySelector("#cal-source-list");
  function rebuildSources() {
    if (!sourceList) return;
    sourceList.innerHTML = "";
    (w.sources||[]).forEach((src, i) => {
      const item = document.createElement("div");
      item.className = "feed-item";
      item.innerHTML = `
        <label class="s-toggle"><input type="checkbox" ${src.enabled!==false?"checked":""}><span class="s-track"></span></label>
        <span class="feed-item-name">${esc(src.name)}</span>
        <button class="feed-item-del">✕</button>
      `;
      item.querySelector("input")?.addEventListener("change", (e) => { src.enabled = e.target.checked; saveConfig(); bus.emit(EV.WIDGETS_CHANGED); });
      item.querySelector(".feed-item-del")?.addEventListener("click", () => { w.sources.splice(i, 1); saveConfig(); rebuildSources(); });
      sourceList.appendChild(item);
    });
    if (!w.sources?.length) sourceList.innerHTML = `<p style="font-size:.78rem;color:var(--muted)">No calendars added.</p>`;
  }
  rebuildSources();

  el.querySelector("#cal-add-btn")?.addEventListener("click", () => {
    const name = prompt("Calendar name:");
    const url  = prompt("ICS URL (https://…):");
    if (!name || !url) return;
    w.sources = w.sources || [];
    w.sources.push({ id: uid(), name, url, enabled: true });
    saveConfig(); bus.emit(EV.WIDGETS_CHANGED); rebuildSources();
  });
}

function renderGoalsBody(el, w) {
  el.innerHTML = `
    ${toggleRow("gol-focus", w.showOnFocus, "Show on focus screen")}
    ${toggleRow("gol-reset", w.resetDaily, "Reset completions daily")}
    <div style="margin-top:.75rem">
      <div style="font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.4rem">Goals</div>
      <div id="goal-list"></div>
      <button class="s-btn ghost sm" id="goal-add-btn" style="margin-top:.4rem">+ Add goal</button>
    </div>
  `;
  el.querySelector("#gol-focus")?.addEventListener("change", (e) => { w.showOnFocus = e.target.checked; saveConfig(); });
  el.querySelector("#gol-reset")?.addEventListener("change", (e) => { w.resetDaily = e.target.checked; saveConfig(); });

  const list = el.querySelector("#goal-list");
  function rebuildGoals() {
    if (!list) return;
    list.innerHTML = "";
    (w.goals||[]).forEach((g, i) => {
      const item = document.createElement("div");
      item.className = "feed-item";
      item.innerHTML = `
        <span class="feed-item-name">${esc(g.text)}</span>
        <button class="feed-item-del">✕</button>
      `;
      item.querySelector(".feed-item-del")?.addEventListener("click", () => { w.goals.splice(i, 1); saveConfig(); bus.emit(EV.WIDGETS_CHANGED); rebuildGoals(); });
      list.appendChild(item);
    });
    if (!w.goals?.length) list.innerHTML = `<p style="font-size:.78rem;color:var(--muted)">No goals yet.</p>`;
  }
  rebuildGoals();

  el.querySelector("#goal-add-btn")?.addEventListener("click", () => {
    const text = prompt("Goal description:");
    if (!text) return;
    w.goals = w.goals || [];
    w.goals.push({ id: uid(), text, completedToday: false, lastReset: null });
    saveConfig(); bus.emit(EV.WIDGETS_CHANGED); rebuildGoals();
  });
}

function renderStatusBody(el, w) {
  el.innerHTML = `
    <div class="s-row">
      <div class="s-label"><strong>Refresh interval</strong></div>
      <div class="s-ctrl"><select class="s-select" id="st-refresh">
        <option value="5"  ${w.refreshMinutes===5?"selected":""}>5 minutes</option>
        <option value="10" ${w.refreshMinutes===10?"selected":""}>10 minutes</option>
        <option value="30" ${w.refreshMinutes===30?"selected":""}>30 minutes</option>
      </select></div>
    </div>
    <div style="margin-top:.75rem">
      <div style="font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.4rem">Sites to check</div>
      <div id="st-check-list"></div>
      <button class="s-btn ghost sm" id="st-add-btn" style="margin-top:.4rem">+ Add site</button>
    </div>
  `;
  el.querySelector("#st-refresh")?.addEventListener("change", (e) => { w.refreshMinutes = +e.target.value; saveConfig(); });

  const list = el.querySelector("#st-check-list");
  function rebuild() {
    if (!list) return;
    list.innerHTML = "";
    (w.checks||[]).forEach((c, i) => {
      const item = document.createElement("div");
      item.className = "feed-item";
      item.innerHTML = `<span class="feed-item-name">${esc(c.name)} <span style="font-size:.72rem;color:var(--muted)">${esc(c.url)}</span></span><button class="feed-item-del">✕</button>`;
      item.querySelector(".feed-item-del")?.addEventListener("click", () => { w.checks.splice(i, 1); saveConfig(); rebuild(); });
      list.appendChild(item);
    });
    if (!w.checks?.length) list.innerHTML = `<p style="font-size:.78rem;color:var(--muted)">No sites added.</p>`;
  }
  rebuild();

  el.querySelector("#st-add-btn")?.addEventListener("click", () => {
    const name = prompt("Site name:");
    const url  = prompt("URL (https://…):");
    if (!name || !url) return;
    w.checks = w.checks || [];
    w.checks.push({ id: uid(), name, url, status: "unknown", lastChecked: null });
    saveConfig(); rebuild();
  });
}

function renderSpotifyBody(el, w) {
  const sp = state.cfg.integrations.spotify;
  el.innerHTML = `
    <p style="font-size:.8rem;color:var(--muted);line-height:1.6;margin-bottom:.75rem">
      Spotify integration uses PKCE authorization — no client secret required. You need a free Spotify Developer account to get a Client ID.
    </p>
    ${row("Client ID", "From developer.spotify.com/dashboard", `<input class="s-input s-input-wide" id="sp-client-id" value="${esc(sp.clientId||"")}" placeholder="Your Spotify Client ID" />`)}
    ${toggleRow("sp-art", w.showAlbumArt,      "Show album art")}
    ${toggleRow("sp-acc", w.useAlbumArtAccent, "Use album art accent color")}
    ${toggleRow("sp-focus", w.showOnFocus,     "Show on focus screen")}
    <div class="s-row">
      <div class="s-label"><strong>Poll interval</strong><span>How often to check now-playing</span></div>
      <div class="s-ctrl"><select class="s-select" id="sp-poll">
        <option value="10" ${w.pollSeconds===10?"selected":""}>10 seconds</option>
        <option value="20" ${w.pollSeconds===20?"selected":""}>20 seconds</option>
        <option value="30" ${w.pollSeconds===30?"selected":""}>30 seconds</option>
      </select></div>
    </div>
    <div class="s-row" style="flex-wrap:wrap;gap:.5rem;border-bottom:none">
      ${sp.accessToken
        ? `<button class="s-btn ghost" id="sp-disconnect">Disconnect Spotify</button>`
        : `<button class="s-btn" id="sp-connect" ${!sp.clientId?"disabled title='Enter Client ID first'":""}>Connect with Spotify</button>`}
      <span style="font-size:.75rem;color:var(--muted);align-self:center">${sp.accessToken ? "✓ Connected" : "Not connected"}</span>
    </div>
  `;
  el.querySelector("#sp-client-id")?.addEventListener("input", (e) => { sp.clientId = e.target.value.trim(); saveConfig(); });
  el.querySelector("#sp-art")?.addEventListener("change", (e) => { w.showAlbumArt = e.target.checked; saveConfig(); });
  el.querySelector("#sp-acc")?.addEventListener("change", (e) => { w.useAlbumArtAccent = e.target.checked; saveConfig(); });
  el.querySelector("#sp-focus")?.addEventListener("change", (e) => { w.showOnFocus = e.target.checked; saveConfig(); });
  el.querySelector("#sp-poll")?.addEventListener("change", (e) => { w.pollSeconds = +e.target.value; saveConfig(); });

  el.querySelector("#sp-connect")?.addEventListener("click", () => {
    import("../integrations/spotify.js?v=2026-06-15-1").then(m => m.startSpotifyAuth(sp.clientId));
  });
  el.querySelector("#sp-disconnect")?.addEventListener("click", () => {
    import("../integrations/spotify.js?v=2026-06-15-1").then(m => {
      m.disconnectSpotify();
      bus.emit(EV.WIDGETS_CHANGED);
      renderSpotifyBody(el, w);
      showToast("Spotify disconnected");
    });
  });
}

/* ── Integrations tab ── */
function renderIntegrations(el) {
  el.innerHTML = `
    <div class="s-section">Spotify</div>
    <p style="font-size:.82rem;color:var(--muted);line-height:1.6">Configure Spotify in the <strong>Widgets → Spotify</strong> section. Spotify settings live there alongside the widget toggle.</p>
    <div style="margin-top:.75rem">
      <button class="s-btn ghost" id="goto-spotify-btn">Go to Spotify widget settings</button>
    </div>
  `;
  el.querySelector("#goto-spotify-btn")?.addEventListener("click", () => { selectTab("widgets"); });
}

/* ── Privacy tab ── */
function renderPrivacy(el) {
  const p = state.cfg.privacy;
  const features = [
    { key: "allowGoogleFavicons", icon: "🌐", name: "Google Favicons", type: "optional", desc: "Loads small icons for your saved links from Google's favicon service. Disable to show text-only links." },
    { key: "allowWeatherApi",     icon: "🌤", name: "Weather API",      type: "optional", desc: "Calls Open-Meteo (open-meteo.com) for weather data and geolocation geocoding. No API key required." },
    { key: "allowSpotifyApi",     icon: "🎵", name: "Spotify API",      type: "optional", desc: "Calls Spotify Web API to show now-playing. Only active if you connect your Spotify account." },
    { key: "allowRssFetches",     icon: "📰", name: "RSS Fetches",      type: "optional", desc: "Fetches RSS/Atom feed URLs you provide. Fetches happen directly from your browser." },
    { key: "allowCalendarFetches",icon: "📅", name: "Calendar Fetches", type: "optional", desc: "Fetches ICS calendar URLs you provide. Fetches happen directly from your browser." },
    { key: "allowStatusChecks",   icon: "🟢", name: "Status Checks",    type: "optional", desc: "Sends HEAD requests to URLs you provide to check if they're online." },
  ];

  el.innerHTML = `
    <div class="s-section">Local-first by default</div>
    <div class="privacy-feature">
      <div class="privacy-dot local"></div>
      <div class="privacy-feature-info">
        <div class="privacy-feature-name">Core CustomTab</div>
        <div class="privacy-feature-desc">Your config, links, tasks, and notes are stored only in your browser's localStorage. No server, no account, no tracking.</div>
      </div>
    </div>

    <div class="s-section" style="margin-top:1.1rem">Optional external calls</div>
    <p style="font-size:.78rem;color:var(--muted);margin-bottom:.75rem">These are all disabled by default. Enable only what you need.</p>
    ${features.map(f => `
      <div class="privacy-feature">
        <div class="privacy-dot external"></div>
        <div class="privacy-feature-info">
          <div class="privacy-feature-name">${f.icon} ${f.name}</div>
          <div class="privacy-feature-desc">${esc(f.desc)}</div>
        </div>
        <label class="s-toggle" style="flex-shrink:0;margin-left:.5rem" aria-label="Allow ${f.name}">
          <input type="checkbox" class="priv-tog" data-key="${f.key}" ${p[f.key]?"checked":""} />
          <span class="s-track"></span>
        </label>
      </div>
    `).join("")}

  `;

  el.querySelectorAll(".priv-tog").forEach(cb => {
    cb.addEventListener("change", (e) => {
      p[cb.dataset.key] = e.target.checked;
      saveConfig();
      bus.emit(EV.WIDGETS_CHANGED);
      showToast(e.target.checked ? `${cb.dataset.key.replace("allow","")} enabled` : "Setting saved");
    });
  });
}

/* ── Backup tab ── */
function renderBackup(el) {
  el.innerHTML = `
    <div class="s-section">Export</div>
    <div class="s-row">
      <div class="s-label"><strong>Export backup</strong><span>Download your full config as JSON</span></div>
      <div class="s-ctrl"><button class="s-btn ghost" id="exp-btn">Download backup</button></div>
    </div>
    <div class="s-section" style="margin-top:1.25rem">Import</div>
    <div class="s-row">
      <div class="s-label"><strong>Import backup</strong><span>Restore from a CustomTab v5 JSON file</span></div>
      <div class="s-ctrl"><button class="s-btn ghost" id="imp-btn">Choose file…</button></div>
    </div>
    <div class="s-section" style="margin-top:1.25rem">Reset</div>
    <div class="s-row">
      <div class="s-label"><strong>Reset appearance</strong></div>
      <div class="s-ctrl"><button class="s-btn danger sm" id="reset-app-btn">Reset</button></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Reset links</strong></div>
      <div class="s-ctrl"><button class="s-btn danger sm" id="reset-lnk-btn">Reset</button></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Reset widgets</strong></div>
      <div class="s-ctrl"><button class="s-btn danger sm" id="reset-wid-btn">Reset</button></div>
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Reset everything</strong><span>Deletes all settings — cannot be undone</span></div>
      <div class="s-ctrl"><button class="s-btn danger" id="reset-all-btn">Reset all</button></div>
    </div>
  `;
  el.querySelector("#exp-btn")?.addEventListener("click", () => { exportConfig(); showToast("Backup downloaded"); });
  el.querySelector("#imp-btn")?.addEventListener("click", () => document.getElementById("import-file")?.click());

  el.querySelector("#reset-app-btn")?.addEventListener("click", () => {
    if (confirm("Reset appearance to defaults?")) { resetConfig("appearance"); applyAppearance(); applyBackground(); showToast("Appearance reset"); renderAppearance(el); }
  });
  el.querySelector("#reset-lnk-btn")?.addEventListener("click", () => {
    if (confirm("Reset all links to defaults?")) { resetConfig("links"); renderLinks(); showToast("Links reset"); }
  });
  el.querySelector("#reset-wid-btn")?.addEventListener("click", () => {
    if (confirm("Reset all widget settings?")) { resetConfig("widgets"); bus.emit(EV.WIDGETS_CHANGED); showToast("Widgets reset"); }
  });
  el.querySelector("#reset-all-btn")?.addEventListener("click", () => {
    if (confirm("Reset ALL settings to defaults? This cannot be undone.")) {
      resetConfig("all");
      location.reload();
    }
  });
}

/* ── Help tab ── */
function renderHelp(el) {
  el.innerHTML = `
    <div class="shortcut-group">
      <div class="shortcut-group-title">Keyboard shortcuts</div>
      ${sc(["F"],             "Toggle focus / dashboard")}
      ${sc(["Esc"],          "Close modal / return to focus")}
      ${sc(["Ctrl","K"],     "Quick Open command palette")}
      ${sc(["/"],            "Focus search bar")}
      ${sc(["Any key"],      "In focus mode: reveal dashboard and begin search")}
    </div>
    <div class="shortcut-group">
      <div class="shortcut-group-title">Search shortcuts</div>
      ${sc(["g cats"],       "Search Google for 'cats'")}
      ${sc(["b query"],      "Search Brave")}
      ${sc(["ddg query"],    "Search DuckDuckGo")}
      ${sc(["yt lofi"],      "Search YouTube")}
      ${sc(["gh repo"],      "Search GitHub")}
      ${sc(["r startpages"], "Search Reddit")}
      ${sc(["ai explain…"],  "Ask selected AI provider")}
    </div>
    <div class="shortcut-group">
      <div class="shortcut-group-title">Mouse / touch</div>
      ${sc(["Move mouse"],   "Reveal dashboard (if enabled)")}
      ${sc(["Click focus"],  "Reveal dashboard (if enabled)")}
      ${sc(["Right-click link"], "Link actions (open, favorite, edit, remove)")}
      ${sc(["Long press link"],  "Same as right-click on touch")}
      ${sc(["⚙ button"],    "Open settings")}
      ${sc(["◎ button"],    "Return to focus")}
    </div>
    <div class="s-row">
      <div class="s-label"><strong>Restart onboarding</strong><span>Walk through the setup wizard again</span></div>
      <div class="s-ctrl"><button class="s-btn ghost" id="restart-ob-btn">Restart onboarding</button></div>
    </div>
  `;
  el.querySelector("#restart-ob-btn")?.addEventListener("click", () => {
    state.cfg.onboarding.completed = false;
    saveConfig();
    closeSettings();
    import("./onboarding.js?v=2026-06-15-1").then(m => m.startOnboarding());
  });
}

function sc(keys, desc) {
  return `<div class="shortcut-row">
    <span class="shortcut-keys">${keys.map(k => `<kbd>${esc(k)}</kbd>`).join("")}</span>
    <span class="shortcut-desc">${esc(desc)}</span>
  </div>`;
}

/* ── Advanced tab ── */
function renderAdvanced(el) {
  const cfg = state.cfg;
  el.innerHTML = `
    <div class="s-section">Debug</div>
    ${toggle("adv-debug", "debug", cfg.debug, "Debug mode", "Logs extra info to the browser console")}

    <div class="s-section" style="margin-top:1.25rem">About</div>
    <div class="about-card">
      <p><strong>CustomTab v5.0.0</strong></p>
      <p style="margin-top:.5rem">A calm, privacy-first new tab page. Open a new tab and find focus.</p>
    </div>
    <div class="about-card">
      <p><strong>Privacy</strong></p>
      <p style="margin-top:.5rem">Your setup is stored locally. No analytics. No tracking. No account required. External calls are opt-in — see the Privacy tab.</p>
      <a href="https://github.com/GKaZe77/MinimalTab" target="_blank" rel="noopener noreferrer" class="repo-link">⭐ GitHub Repository</a>
    </div>
    <div class="about-card">
      <p><strong>Support</strong></p>
      <p style="margin-top:.5rem">CustomTab is free forever. If it makes your browser feel better, consider supporting on Ko-fi.</p>
      <a href="https://ko-fi.com/gkaze77" target="_blank" rel="noopener noreferrer" class="kofi-link">☕ Support on Ko-fi</a>
    </div>
  `;
  bindToggles(el, cfg, [["#adv-debug","debug"]]);
}

/* ── Helpers ── */
function toggle(id, key, val, label, desc) {
  return `<div class="s-row">
    <div class="s-label"><strong>${esc(label)}</strong>${desc ? `<span>${esc(desc)}</span>` : ""}</div>
    <div class="s-ctrl">
      <label class="s-toggle" aria-label="${esc(label)}">
        <input type="checkbox" id="${id}" ${val?"checked":""} />
        <span class="s-track"></span>
      </label>
    </div>
  </div>`;
}

function toggleRow(id, val, label) {
  return `<div class="s-row">
    <div class="s-label"><strong>${esc(label)}</strong></div>
    <div class="s-ctrl"><label class="s-toggle"><input type="checkbox" id="${id}" ${val?"checked":""}><span class="s-track"></span></label></div>
  </div>`;
}

function row(label, desc, ctrl) {
  return `<div class="s-row">
    <div class="s-label"><strong>${esc(label)}</strong>${desc ? `<span>${esc(desc)}</span>` : ""}</div>
    <div class="s-ctrl">${ctrl}</div>
  </div>`;
}

function rowBlock(label, desc, ctrl) {
  return `<div class="s-row" style="flex-direction:column;align-items:stretch;gap:.3rem">
    <div class="s-label" style="flex:none"><strong>${esc(label)}</strong>${desc ? `<span>${esc(desc)}</span>` : ""}</div>
    <div style="width:100%">${ctrl}</div>
  </div>`;
}

function bindToggles(el, obj, pairs) {
  pairs.forEach(([sel, key]) => {
    el.querySelector(sel)?.addEventListener("change", (e) => {
      obj[key] = e.target.checked;
      saveConfig();
    });
  });
}

/* ── Bootstrap ── */
export function initSettings() {
  document.getElementById("settings-close")?.addEventListener("click", closeSettings);
  document.querySelector("#settings-modal .modal-backdrop")?.addEventListener("click", closeSettings);

  bus.on(EV.SETTINGS_OPEN,  (tab) => openSettings(tab));
  bus.on(EV.SETTINGS_CLOSE, closeSettings);

  // Import file
  document.getElementById("import-file")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importConfig(JSON.parse(reader.result));
        applyAppearance();
        applyBackground();
        renderLinks();
        bus.emit(EV.WIDGETS_CHANGED);
        showToast("Backup imported");
        if (!document.getElementById("settings-modal")?.hidden) selectTab(activeTab);
      } catch (err) {
        showToast(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });
}
