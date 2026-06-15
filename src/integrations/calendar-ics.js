// Basic ICS (iCalendar) parser — handles VEVENT blocks.

const _cache = new Map(); // url → { events, timestamp }
const CACHE_MS = 30 * 60_000;

export async function fetchAndParseICS(url, proxyTemplate) {
  const cached = _cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_MS) return cached.events;

  const text = await fetchICS(url, proxyTemplate);
  const events = parseICS(text);
  _cache.set(url, { events, timestamp: Date.now() });
  return events;
}

async function fetchICS(url, proxyTemplate) {
  try {
    const res = await fetch(url, { cache: "no-cache", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } catch (directErr) {
    if (!proxyTemplate) throw new Error(`${directErr.message}. Add a proxy URL in Calendar settings to work around CORS.`);
    const proxyUrl = proxyTemplate.replace("{url}", encodeURIComponent(url));
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) throw new Error(`Proxy failed: ${res.status}`);
    return res.text();
  }
}

function parseICS(text) {
  // Unfold lines per RFC 5545
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events = [];
  let inEvent = false;
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === "END:VEVENT" && inEvent) {
      inEvent = false;
      if (current.start) events.push(current);
      current = null;
      continue;
    }
    if (!inEvent || !current) continue;

    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).toUpperCase();
    const val = line.slice(colon + 1);

    if (key === "SUMMARY") current.summary = decodeText(val);
    else if (key.startsWith("DTSTART")) current.start = parseICSDate(val, key.includes("VALUE=DATE"));
    else if (key.startsWith("DTEND"))   current.end   = parseICSDate(val, key.includes("VALUE=DATE"));
    else if (key === "DESCRIPTION")     current.description = decodeText(val);
    else if (key === "LOCATION")        current.location = decodeText(val);
  }

  return events;
}

function parseICSDate(val, forceDate = false) {
  // Formats: 20231225, 20231225T130000, 20231225T130000Z
  const v = val.trim().replace(/Z$/, "");
  if (v.length === 8 || forceDate) {
    // Date only (all-day)
    const d = new Date(`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`);
    d.allDay = true;
    return d;
  }
  const d = new Date(
    `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}:${v.slice(13,15)}`
  );
  return d;
}

function decodeText(val) {
  return val
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}
