import { state } from "../core/config.js?v=2026-06-15-1";
import { saveConfig } from "../core/storage.js?v=2026-06-15-1";
import { bus, EV } from "../core/events.js?v=2026-06-15-1";
import { esc, faviconUrl, uid } from "../core/dom.js?v=2026-06-15-1";

export function renderLinks() {
  const area = document.getElementById("links-area");
  if (!area) {
    // Blocks system active — delegate via bus
    bus.emit(EV.LINKS_CHANGED);
    return;
  }
  area.innerHTML = "";

  const folders = state.cfg.links.folders || [];

  // Favorites row
  const allFavs = folders.flatMap(f => (f.links || []).filter(l => l.favorite));
  if (allFavs.length) {
    const row = document.createElement("div");
    row.className = "favorites-row";
    row.innerHTML = `<div class="favorites-label">Favorites</div>`;
    for (const link of allFavs) row.appendChild(makeChip(link));
    area.appendChild(row);
  }

  // Folders
  for (const folder of folders) {
    if (!folder.links?.length) continue;
    const el = document.createElement("div");
    el.className = "link-folder";
    el.dataset.folderId = folder.id;

    const hdr = document.createElement("div");
    hdr.className = "folder-header";
    hdr.setAttribute("role", "button");
    hdr.setAttribute("aria-expanded", String(!folder.collapsed));
    hdr.setAttribute("tabindex", "0");
    hdr.innerHTML = `
      <span class="folder-caret${folder.collapsed ? " collapsed" : ""}" aria-hidden="true">▾</span>
      <span class="folder-name">${esc(folder.name)}</span>
      <button class="folder-open-all" title="Open all in folder" aria-label="Open all ${esc(folder.name)} links">Open all</button>
    `;

    const chips = document.createElement("div");
    chips.className = `folder-chips${folder.collapsed ? " collapsed" : ""}`;
    for (const link of folder.links) chips.appendChild(makeChip(link));

    function toggleCollapse(e) {
      if (e.target.classList.contains("folder-open-all")) {
        folder.links.forEach(l => window.open(l.url, "_blank", "noopener,noreferrer"));
        return;
      }
      folder.collapsed = !folder.collapsed;
      chips.classList.toggle("collapsed", folder.collapsed);
      hdr.querySelector(".folder-caret").classList.toggle("collapsed", folder.collapsed);
      hdr.setAttribute("aria-expanded", String(!folder.collapsed));
      saveConfig();
    }

    hdr.addEventListener("click", toggleCollapse);
    hdr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCollapse(e); } });

    el.appendChild(hdr);
    el.appendChild(chips);
    area.appendChild(el);
  }
}

export function makeChip(link) {
  const a = document.createElement("a");
  a.className = "link-chip" + (link.favorite ? " favorite" : "");
  a.href = link.url;
  a.target = state.cfg.search.openIn || "_blank";
  a.rel = "noopener noreferrer";
  a.dataset.linkId = link.id;
  a.title = link.url;

  const fav = faviconUrl(link.url, state.cfg);
  if (fav) {
    const img = document.createElement("img");
    img.className = "chip-favicon";
    img.src = fav;
    img.alt = "";
    img.loading = "lazy";
    img.onerror = () => img.remove();
    a.appendChild(img);
  }
  a.appendChild(document.createTextNode(link.name));
  return a;
}

export function addLink(folderId, name, url) {
  const folder = (state.cfg.links.folders || []).find(f => f.id === folderId);
  if (!folder) return;
  folder.links = folder.links || [];
  folder.links.push({ id: uid(), name, url, favorite: false });
  saveConfig();
  bus.emit(EV.LINKS_CHANGED);
}

// Bus listeners moved to blocks.js (unified renderer).
