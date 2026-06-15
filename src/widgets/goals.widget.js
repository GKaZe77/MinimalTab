import { saveConfig } from "../core/storage.js?v=2026-06-15-1";
import { esc } from "../core/dom.js?v=2026-06-15-1";

export const GoalsWidget = {
  id: "goals",
  name: "Daily Goals",
  description: "Daily habits and goals tracker",
  defaultSize: "small",

  render(container, { widgetCfg }) {
    checkDailyReset(widgetCfg);
    renderGoals(container, widgetCfg);
  }
};

function checkDailyReset(wCfg) {
  if (!wCfg.resetDaily) return;
  const today = new Date().toDateString();
  (wCfg.goals || []).forEach(g => {
    if (g.lastReset !== today) {
      g.completedToday = false;
      g.lastReset = today;
    }
  });
}

function renderGoals(container, wCfg) {
  const goals = wCfg.goals || [];
  const done  = goals.filter(g => g.completedToday).length;

  let listHtml = "";
  goals.forEach((g, i) => {
    listHtml += `
      <div class="goal-item${g.completedToday ? " goal-done" : ""}">
        <input type="checkbox" id="g-${i}" ${g.completedToday ? "checked" : ""} data-idx="${i}" aria-label="${esc(g.text)}" />
        <label for="g-${i}">${esc(g.text)}</label>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="tile-label">Goals
      <span style="margin-left:.35rem;font-weight:400;color:${done===goals.length&&goals.length?"var(--success)":"var(--muted)"}">${done}/${goals.length}</span>
    </div>
    ${goals.length ? `<div class="goals-list">${listHtml}</div>` : `<div class="widget-empty">No goals. Add them in Settings → Widgets → Goals.</div>`}
  `;

  container.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const g = goals[+cb.dataset.idx];
      if (!g) return;
      g.completedToday = e.target.checked;
      g.lastReset = new Date().toDateString();
      saveConfig();
      renderGoals(container, wCfg);
    });
  });
}
