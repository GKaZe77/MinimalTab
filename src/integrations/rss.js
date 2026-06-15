// RSS/Atom feed fetcher and parser

import { state, DEFAULT_RSS_PROXY_TEMPLATE } from "../core/config.js?v=2026-06-15-1";
console.info("[RSS] patched proxy fallback build 2026-06-14-3 loaded");

const _cache = new Map(); // url → { items, timestamp }

// Error kind constants — used by the widget for friendly UI messages
export const RSS_ERR = {
  CORS:          "cors",
  NO_PROXY:      "no-proxy",
  PROXY_HTTP:    "proxy-http",
  PROXY_TIMEOUT: "proxy-timeout",
  NETWORK:       "network",
  PARSE:         "parse",
  CONFIG:        "config",
};

export class RssFetchError extends Error {
  constructor(message, kind) {
    super(message);
    this.name = "RssFetchError";
    this.kind = kind;
  }
}

function dbg(...args) {
  if (state.cfg?.debug) console.debug("[RSS]", ...args);
}

function isCorsOrNetworkError(err) {
  if (!err || err instanceof RssFetchError) return false;
  const msg = String(err.message).toLowerCase();
  return (
    err instanceof TypeError ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed")
  );
}

export function clearRssCache() { _cache.clear(); }

export async function fetchAndCacheFeed(url, proxyTemplate, refreshMinutes = 30) {
  const cacheMs = refreshMinutes * 60_000;
  const cached = _cache.get(url);
  if (cached && Date.now() - cached.timestamp < cacheMs) {
    dbg("cache hit", url);
    return cached.items;
  }

  const items = await fetchFeed(url, proxyTemplate);
  _cache.set(url, { items, timestamp: Date.now() });
  return items;
}

async function fetchFeed(url, proxyTemplate) {
  // Only validate a user-supplied template — the built-in default is always valid.
  if (proxyTemplate && !proxyTemplate.includes("{url}")) {
    throw new RssFetchError(
      "Proxy URL template must contain {url} as a placeholder (e.g. https://proxy.example.com/?url={url}).",
      RSS_ERR.CONFIG
    );
  }

  let text = null;
  let directErr = null;

  // 1. Try direct fetch first (succeeds for feeds that send CORS headers).
  if (state.cfg?.debug) console.info("[RSS] fetching", { url, direct: true });
  try {
    const res = await fetch(url, {
      mode: "cors",
      cache: "no-cache",
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new RssFetchError(`HTTP ${res.status}`, RSS_ERR.NETWORK);
    text = await res.text();
    dbg("direct fetch OK", url);
  } catch (err) {
    directErr = err;
    dbg("direct fetch failed:", err.message);
  }

  if (text !== null) return parseFeed(text, url);

  // 2. Direct failed — always fall back to proxy.
  //    Use the caller-supplied template; if blank, use the built-in default.
  const effectiveProxy = proxyTemplate || DEFAULT_RSS_PROXY_TEMPLATE;
  const proxyUrl = effectiveProxy.replace("{url}", encodeURIComponent(url));

  if (state.cfg?.debug) console.info("[RSS] fetching", { url, direct: false, proxyUrl });
  dbg("proxy fetch →", proxyUrl);

  try {
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) {
      throw new RssFetchError(`Proxy returned HTTP ${res.status}.`, RSS_ERR.PROXY_HTTP);
    }
    text = await res.text();
    dbg("proxy fetch OK", url);
  } catch (proxyErr) {
    const isTimeout =
      proxyErr.name === "TimeoutError" || proxyErr.name === "AbortError";
    const kind = proxyErr instanceof RssFetchError
      ? proxyErr.kind
      : isTimeout ? RSS_ERR.PROXY_TIMEOUT : RSS_ERR.NETWORK;
    const directDetail = directErr ? ` Direct error: ${directErr.message}.` : "";
    throw new RssFetchError(`${proxyErr.message}${directDetail}`, kind);
  }
  return parseFeed(text, url);
}

function parseFeed(text, sourceUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");

  if (doc.querySelector("parsererror")) {
    // Some feeds return valid XML but with an incorrect content-type that confuses parsers —
    // try treating as HTML to recover <item>/<entry> elements.
    const htmlDoc = parser.parseFromString(text, "text/html");
    if (htmlDoc.querySelectorAll("item, entry").length > 0) {
      return parseItems(htmlDoc, sourceUrl);
    }
    throw new RssFetchError(
      "Feed could not be parsed — the URL may not point to a valid RSS or Atom feed.",
      RSS_ERR.PARSE
    );
  }

  return parseItems(doc, sourceUrl);
}

function parseItems(doc, sourceUrl) {
  const items = [];

  // RSS 2.0
  doc.querySelectorAll("item").forEach(item => {
    const title   = item.querySelector("title")?.textContent?.trim() || "(no title)";
    const link    = item.querySelector("link")?.textContent?.trim()
                 || item.querySelector("link")?.getAttribute("href")
                 || sourceUrl;
    const pubDate = item.querySelector("pubDate, pubdate")?.textContent?.trim();
    const desc    = item.querySelector("description")?.textContent?.trim() || "";
    items.push({
      title,
      link,
      date: pubDate ? Date.parse(pubDate) : 0,
      excerpt: stripHtml(desc).slice(0, 160)
    });
  });

  // Atom
  doc.querySelectorAll("entry").forEach(entry => {
    const title   = entry.querySelector("title")?.textContent?.trim() || "(no title)";
    const link    = entry.querySelector("link[rel=alternate], link")?.getAttribute("href") || sourceUrl;
    const updated = entry.querySelector("updated, published")?.textContent?.trim();
    const summary = entry.querySelector("summary, content")?.textContent?.trim() || "";
    items.push({
      title,
      link,
      date: updated ? Date.parse(updated) : 0,
      excerpt: stripHtml(summary).slice(0, 160)
    });
  });

  return items;
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.textContent = html;
  return div.textContent
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── RSS Presets ──────────────────────────────────────────────
export const RSS_PRESETS = [
  // Tech
  { id: "hn",          name: "Hacker News",        category: "Tech",          description: "Top stories from Hacker News",           url: "https://news.ycombinator.com/rss" },
  { id: "techcrunch",  name: "TechCrunch",          category: "Tech",          description: "Tech news and startup coverage",          url: "https://techcrunch.com/feed/" },
  { id: "theverge",    name: "The Verge",           category: "Tech",          description: "Technology, science, art, and culture",   url: "https://www.theverge.com/rss/index.xml" },
  { id: "arstechnica", name: "Ars Technica",        category: "Tech",          description: "Technology, science, and culture",        url: "https://feeds.arstechnica.com/arstechnica/index" },
  { id: "wired",       name: "Wired",               category: "Tech",          description: "How tech is changing everything",         url: "https://www.wired.com/feed/rss" },
  // News
  { id: "bbc",         name: "BBC News",            category: "News",          description: "BBC top news headlines",                  url: "https://feeds.bbci.co.uk/news/rss.xml" },
  { id: "npr",         name: "NPR News",            category: "News",          description: "National Public Radio top stories",       url: "https://feeds.npr.org/1001/rss.xml" },
  { id: "ap",          name: "AP News",             category: "News",          description: "Associated Press top headlines",          url: "https://apnews.com/rss" },
  // Developer
  { id: "css-tricks",  name: "CSS-Tricks",          category: "Developer",     description: "Tips on CSS and web design",              url: "https://css-tricks.com/feed/" },
  { id: "devto",       name: "Dev.to",              category: "Developer",     description: "Community articles for developers",       url: "https://dev.to/feed" },
  { id: "smashing",    name: "Smashing Magazine",   category: "Developer",     description: "Web design and development articles",     url: "https://www.smashingmagazine.com/feed/" },
  { id: "github-blog", name: "GitHub Blog",         category: "Developer",     description: "Updates and articles from GitHub",        url: "https://github.blog/feed/" },
  // Gaming
  { id: "ign",         name: "IGN",                 category: "Gaming",        description: "Video game news, reviews, and videos",   url: "https://feeds.feedburner.com/ign/all" },
  { id: "polygon",     name: "Polygon",             category: "Gaming",        description: "Gaming news and culture",                 url: "https://www.polygon.com/rss/index.xml" },
  // Entertainment
  { id: "ann",         name: "Anime News Network", category: "Entertainment",  description: "Anime and manga news",                    url: "https://www.animenewsnetwork.com/all/rss.xml" },
  // Faith / Bible
  { id: "heartlight-daily-bible-verse-kjv", name: "Heartlight Daily Bible Verse", category: "Faith / Bible", description: "Daily Bible verse from Heartlight, KJV.", url: "https://feeds.feedburner.com/hl-int-tv-en-kjv" },
];
