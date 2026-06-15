import { state } from "../core/config.js?v=2026-06-15-1";
import { saveConfig } from "../core/storage.js?v=2026-06-15-1";
import { esc } from "../core/dom.js?v=2026-06-15-1";

export const StatusWidget = {
  id: "status",
  name: "Status",
  description: "Website uptime checker",
  defaultSize: "small",

  render(container, { widgetCfg }) {
    renderStatus(container, widgetCfg);

    const interval = (widgetCfg.refreshMinutes || 5) * 60_000;
    const timer = setInterval(() => {
      if (!document.contains(container)) { clearInterval(timer); return; }
      checkAll(widgetCfg).then(() => renderStatus(container, widgetCfg));
    }, interval);
  }
};

async function checkAll(wCfg) {
  if (!state.cfg.privacy.allowStatusChecks) return;
  const checks = wCfg.checks || [];
  await Promise.allSettled(checks.map(async (c) => {
    const before = Date.now();
    try {
      const res = await fetch(c.url, { method: "HEAD", mode: "no-cors", cache: "no-store", signal: AbortSignal.timeout(5000) });
      // no-cors always returns opaque response; treat as online if we got a response
      c.status = "online";
    } catch (e) {
      c.status = "offline";
    }
    c.lastChecked = Date.now();
    c.latencyMs = Date.now() - before;
  }));
  saveConfig();
}

function renderStatus(container, wCfg) {
  if (!state.cfg.privacy.allowStatusChecks) {
    container.innerHTML = `<div class="tile-label">Status</div><div class="widget-error">Status checks are disabled in Privacy settings.</div>`;
    return;
  }

  const checks = wCfg.checks || [];
  if (!checks.length) {
    container.innerHTML = `<div class="tile-label">Status</div><div class="widget-empty">No sites added. Open Settings → Widgets → Status to add URLs.</div>`;
    return;
  }

  let html = `<div class="tile-label">Status</div><div class="status-list">`;
  checks.forEach(c => {
    const time = c.lastChecked ? new Date(c.lastChecked).toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit" }) : "—";
    html += `
      <div class="status-item">
        <div class="status-dot ${c.status || "unknown"}" title="${c.status || "unknown"}"></div>
        <span class="status-name">${esc(c.name)}</span>
        <span class="status-time">${time}</span>
      </div>
    `;
  });
  html += `</div>`;

  // Initial check if never checked
  if (checks.some(c => !c.lastChecked)) {
    checkAll(wCfg).then(() => renderStatus(container, wCfg));
  }

  container.innerHTML = html;
}
