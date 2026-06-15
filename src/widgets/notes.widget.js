import { saveConfig } from "../core/storage.js?v=2026-06-15-1";
import { esc } from "../core/dom.js?v=2026-06-15-1";

export const NotesWidget = {
  id: "notes",
  name: "Notes",
  description: "Freeform notes",
  defaultSize: "medium",

  render(container, { widgetCfg }) {
    container.innerHTML = `
      <div class="tile-label">${esc(widgetCfg.title || "Notes")}</div>
      <textarea class="notes-ta" placeholder="Start typing…" aria-label="${esc(widgetCfg.title || "Notes")}">${esc(widgetCfg.content || "")}</textarea>
    `;

    let saveTimer;
    container.querySelector("textarea")?.addEventListener("input", (e) => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        widgetCfg.content = e.target.value;
        saveConfig();
      }, 600);
    });
  }
};
