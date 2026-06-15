import { state } from "../core/config.js?v=2026-06-14-3";
import { saveConfig } from "../core/storage.js?v=2026-06-14-3";
import { bus, EV } from "../core/events.js?v=2026-06-14-3";
import { showToast } from "./toast.js?v=2026-06-14-3";

const menu = () => document.getElementById("link-ctx");

function findLink(linkId) {
  for (const folder of (state.cfg.links.folders || [])) {
    const link = folder.links?.find(l => l.id === linkId);
    if (link) return { folder, link };
  }
  return null;
}

export function setupContextMenu() {
  const m = menu();
  if (!m) return;

  // Desktop: right-click on any link chip in the blocks container
  document.getElementById("blocks-container")?.addEventListener("contextmenu", (e) => {
    const chip = e.target.closest(".link-chip[data-link-id]");
    if (!chip) return;
    e.preventDefault();
    showMenu(e.clientX, e.clientY, chip.dataset.linkId);
  });

  // Mobile: long-press via menu button on chip
  document.getElementById("blocks-container")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip-menu-btn[data-link-id]");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    showMenu(rect.left, rect.bottom, btn.dataset.linkId);
  });

  // Close handlers
  document.addEventListener("click", (e) => {
    if (!m.contains(e.target)) m.setAttribute("hidden", "");
  }, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") m.setAttribute("hidden", "");
  }, { passive: true });
}

function showMenu(x, y, linkId) {
  const m = menu();
  const res = findLink(linkId);
  if (!res) return;
  const { link } = res;

  m.innerHTML = `
    <div class="ctx-item" data-action="open">↗ <span>Open</span></div>
    <div class="ctx-item" data-action="open-new">⧉ <span>Open in new tab</span></div>
    <div class="ctx-item" data-action="fav"><span>${link.favorite ? "★" : "☆"} ${link.favorite ? "Unfavorite" : "Add to favorites"}</span></div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" data-action="edit">✏ <span>Edit in settings</span></div>
    <div class="ctx-item" data-action="delete" style="color:var(--danger-text)">✕ <span>Remove</span></div>
  `;

  const px = Math.min(x, window.innerWidth - 185);
  const py = Math.min(y, window.innerHeight - 170);
  m.style.left = px + "px";
  m.style.top  = py + "px";
  m.removeAttribute("hidden");

  m.querySelectorAll(".ctx-item").forEach(item => {
    item.addEventListener("click", () => {
      m.setAttribute("hidden", "");
      const action = item.dataset.action;
      const r = findLink(linkId);
      if (!r) return;

      if (action === "open") {
        const target = state.cfg.search.openIn || "_blank";
        window.open(r.link.url, target, "noopener,noreferrer");
      } else if (action === "open-new") {
        window.open(r.link.url, "_blank", "noopener,noreferrer");
      } else if (action === "fav") {
        r.link.favorite = !r.link.favorite;
        saveConfig();
        bus.emit(EV.LINKS_CHANGED);
        showToast(r.link.favorite ? "Added to favorites" : "Removed from favorites");
      } else if (action === "edit") {
        bus.emit(EV.SETTINGS_OPEN, "links");
      } else if (action === "delete") {
        r.folder.links = r.folder.links.filter(l => l.id !== r.link.id);
        saveConfig();
        bus.emit(EV.LINKS_CHANGED);
        showToast("Link removed");
      }
    });
  });
}
