import { saveConfig } from "../core/storage.js?v=2026-06-15-1";
import { esc, uid } from "../core/dom.js?v=2026-06-15-1";

export const TodoWidget = {
  id: "todo",
  name: "To-do",
  description: "Simple task list",
  defaultSize: "medium",

  render(container, { widgetCfg }) {
    renderTodo(container, widgetCfg);
  }
};

function renderTodo(container, todo) {
  const tasks = todo.tasks || [];
  const visible = todo.showCompleted ? tasks : tasks.filter(t => !t.done);

  const listHTML = visible.map((t, i) => {
    const realIdx = tasks.indexOf(t);
    return `
      <div class="todo-item${t.done ? " todo-done" : ""}">
        <input type="checkbox" id="td-${i}" ${t.done ? "checked" : ""} data-idx="${realIdx}" aria-label="${esc(t.text)}" />
        <label for="td-${i}">${esc(t.text)}</label>
        <button class="todo-del-btn" data-del="${realIdx}" aria-label="Remove task">✕</button>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="tile-label">To-do
      <div class="tile-label-actions">
        <button class="tile-action-btn" id="td-clear" aria-label="Clear completed" title="Clear completed">✓ Clear</button>
      </div>
    </div>
    <div class="todo-list" role="list">
      ${listHTML || `<span class="widget-empty">No tasks. Add one below.</span>`}
    </div>
    <div class="todo-add-row">
      <input class="todo-in" placeholder="Add a task…" maxlength="200" aria-label="New task" />
      <button class="todo-add-btn" aria-label="Add task">+</button>
    </div>
  `;

  container.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      tasks[+cb.dataset.idx].done = cb.checked;
      saveConfig();
      renderTodo(container, todo);
    });
  });

  container.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      tasks.splice(+btn.dataset.del, 1);
      todo.tasks = tasks;
      saveConfig();
      renderTodo(container, todo);
    });
  });

  container.querySelector("#td-clear")?.addEventListener("click", () => {
    todo.tasks = tasks.filter(t => !t.done);
    saveConfig();
    renderTodo(container, todo);
  });

  const inp = container.querySelector(".todo-in");
  const addTask = () => {
    const text = inp?.value.trim();
    if (!text) return;
    tasks.push({ id: uid(), text, done: false });
    todo.tasks = tasks;
    saveConfig();
    renderTodo(container, todo);
  };

  container.querySelector(".todo-add-btn")?.addEventListener("click", addTask);
  inp?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addTask(); } });
}
