import { esc } from "../core/dom.js?v=2026-06-14-3";
import { state, DEFAULT_RSS_PROXY_TEMPLATE } from "../core/config.js?v=2026-06-14-3";
import { bus, EV } from "../core/events.js?v=2026-06-14-3";
import { fetchAndCacheFeed, clearRssCache, RSS_ERR } from "../integrations/rss.js?v=2026-06-14-3";

const RENDER_MAX = 100;

export const RssWidget = {
  id: "rss",
  name: "RSS Feeds",
  description: "News and feed reader",
  defaultSize: "large",

  render(container, { widgetCfg }) {
    renderRssWidget(container, widgetCfg);
    bus.on("rss:refresh", () => { clearRssCache(); renderRssWidget(container, widgetCfg); });
  }
};

async function renderRssWidget(container, wCfg) {
  container.innerHTML = `<div class="tile-label">RSS</div><div class="widget-loading">Loading feeds…</div>`;

  if (!state.cfg.privacy.allowRssFetches) {
    container.innerHTML = `<div class="tile-label">RSS</div><div class="widget-error">RSS fetches are disabled in Privacy settings.</div>`;
    return;
  }

  const feeds = (wCfg.feeds || []).filter(f => f.enabled !== false);
  if (!feeds.length) {
    container.innerHTML = `<div class="tile-label">RSS</div><div class="widget-empty">No feeds added. Open Settings → Widgets → RSS to add feeds.</div>`;
    return;
  }

  // Resolve proxy defensively: prefer wCfg, then live state (in case wCfg is a stale copy),
  // then the hardcoded default so the proxy is always tried.
  const effectiveProxy =
    wCfg.proxyTemplate ||
    state.cfg.widgets?.rss?.proxyTemplate ||
    DEFAULT_RSS_PROXY_TEMPLATE;

  let allItems = [];
  const errors = []; // { feed, error, kind }

  const perFeedCap = Math.max(1, wCfg.maxItemsPerFeed || 10);
  let perFeedTruncated = false;
  await Promise.allSettled(feeds.map(async (feed) => {
    try {
      let items = await fetchAndCacheFeed(feed.url, effectiveProxy, wCfg.refreshMinutes);
      items.sort((a, b) => (b.date || 0) - (a.date || 0));
      if (items.length > perFeedCap) { perFeedTruncated = true; items = items.slice(0, perFeedCap); }
      items.forEach(item => { item._feedName = feed.name; });
      allItems.push(...items);
    } catch (e) {
      if (state.cfg?.debug) console.warn(`[RSS] Feed "${feed.name}" failed:`, e.message);
      errors.push({ feed: feed.name, error: e.message, kind: e.kind || RSS_ERR.NETWORK });
    }
  }));

  // Deduplicate by normalized URL
  const _seenUrls = new Set();
  allItems = allItems.filter(item => {
    const key = (item.link || "").trim().toLowerCase();
    if (!key || _seenUrls.has(key)) return false;
    _seenUrls.add(key);
    return true;
  });

  // Sort by date desc, cap at dashboard maximum
  allItems.sort((a, b) => (b.date || 0) - (a.date || 0));
  const totalItems = allItems.length;
  const capItems = Math.min(wCfg.maxItems || 8, RENDER_MAX);
  allItems = allItems.slice(0, capItems);

  const lastFetch = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  let html = `
    <div class="tile-label">RSS
      <div class="tile-label-actions">
        <button class="tile-action-btn rss-refresh-btn" aria-label="Refresh feeds" title="Refresh">↺</button>
      </div>
    </div>
  `;

  if (errors.length && !allItems.length) {
    html += buildAllErrorHtml(errors, effectiveProxy);
  } else {
    if (!allItems.length) {
      html += `<div class="widget-empty">No items found. Check your feed URLs.</div>`;
    } else {
      html += `<div class="rss-list">`;
      allItems.forEach(item => {
        const dateStr = item.date
          ? new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
          : "";
        html += `
          <a class="rss-item" href="${esc(item.link)}" target="${esc(wCfg.openIn || "_blank")}" rel="noopener noreferrer">
            <div class="rss-item-title">${esc(item.title)}</div>
            <div class="rss-item-meta">
              ${wCfg.showSource && item._feedName ? `<span>${esc(item._feedName)}</span>` : ""}
              ${dateStr ? `<span>${esc(dateStr)}</span>` : ""}
            </div>
            ${wCfg.showExcerpt && item.excerpt ? `<div class="rss-item-excerpt">${esc(item.excerpt)}</div>` : ""}
          </a>
        `;
      });
      html += `</div>`;
      if (totalItems > capItems || perFeedTruncated) {
        html += `<div class="rss-cap-note">Showing ${allItems.length} items total · max ${perFeedCap} per feed</div>`;
      }
    }
    if (errors.length) {
      const errMsg = errors.length === 1
        ? `${esc(errors[0].feed)} failed to load`
        : `${errors.length} feeds failed to load`;
      html += `<div class="widget-error rss-error-compact">${errMsg}</div>`;
    }
    html += `<div class="rss-footer"><span>Updated ${lastFetch}</span></div>`;
  }

  container.innerHTML = html;
  container.querySelector(".rss-refresh-btn")?.addEventListener("click", () => {
    clearRssCache(); renderRssWidget(container, wCfg);
  });
}

function buildAllErrorHtml(errors, effectiveProxy) {
  const kinds = new Set(errors.map(e => e.kind));
  let html = "";

  if (kinds.has(RSS_ERR.CONFIG)) {
    html += `<div class="widget-error">Proxy configuration error: ${esc(errors.find(e => e.kind === RSS_ERR.CONFIG).error)}</div>`;
    return html;
  }

  const summary = errors.length === 1
    ? `${esc(errors[0].feed)}: ${esc(errors[0].error)}`
    : `${errors.length} feeds failed to load`;

  if (kinds.has(RSS_ERR.PROXY_TIMEOUT)) {
    html += `<div class="widget-error">${summary}</div>`;
    html += `<p style="font-size:.72rem;color:var(--muted);margin-top:.5rem">Proxy timed out — check the proxy URL in RSS settings.</p>`;
  } else if (kinds.has(RSS_ERR.PROXY_HTTP)) {
    html += `<div class="widget-error">${summary}</div>`;
    html += `<p style="font-size:.72rem;color:var(--muted);margin-top:.5rem">Proxy returned an error — verify the proxy URL in RSS settings.</p>`;
  } else {
    html += `<div class="widget-error">${summary}</div>`;
  }
  return html;
}
