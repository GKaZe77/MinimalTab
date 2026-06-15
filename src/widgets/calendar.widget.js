import { state } from "../core/config.js?v=2026-06-15-1";
import { esc } from "../core/dom.js?v=2026-06-15-1";
import { fetchAndParseICS } from "../integrations/calendar-ics.js?v=2026-06-15-1";

export const CalendarWidget = {
  id: "calendar",
  name: "Calendar",
  description: "Upcoming events from ICS sources",
  defaultSize: "medium",

  render(container, { widgetCfg }) {
    renderCalendar(container, widgetCfg);
  }
};

async function renderCalendar(container, wCfg) {
  container.innerHTML = `<div class="tile-label">Calendar</div><div class="widget-loading">Loading events…</div>`;

  if (!state.cfg.privacy.allowCalendarFetches) {
    container.innerHTML = `<div class="tile-label">Calendar</div><div class="widget-error">Calendar fetches are disabled in Privacy settings.</div>`;
    return;
  }

  const sources = (wCfg.sources || []).filter(s => s.enabled !== false);
  if (!sources.length) {
    container.innerHTML = `<div class="tile-label">Calendar</div><div class="widget-empty">No calendars added. Open Settings → Widgets → Calendar to add an ICS URL.</div>`;
    return;
  }

  let allEvents = [];
  const errors = [];

  await Promise.allSettled(sources.map(async (src) => {
    try {
      const events = await fetchAndParseICS(src.url, wCfg.proxyTemplate);
      events.forEach(e => { e._calName = src.name; });
      allEvents.push(...events);
    } catch (e) {
      errors.push({ name: src.name, error: e.message });
    }
  }));

  const now   = new Date();
  const cutoff = new Date(now.getTime() + (wCfg.maxDays || 7) * 86400_000);

  allEvents = allEvents
    .filter(e => e.start >= now && e.start <= cutoff)
    .sort((a, b) => a.start - b.start)
    .slice(0, wCfg.maxItems || 6);

  let html = `<div class="tile-label">Calendar</div>`;

  if (!allEvents.length && !errors.length) {
    html += `<div class="widget-empty">No upcoming events in the next ${wCfg.maxDays || 7} days.</div>`;
  } else {
    html += `<div class="cal-list">`;
    let lastDay = "";
    allEvents.forEach(event => {
      const dayLabel = event.start.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
      if (dayLabel !== lastDay) {
        html += `<div class="cal-day-label">${esc(dayLabel)}</div>`;
        lastDay = dayLabel;
      }
      const isAllDay = event.allDay;
      const timeStr  = isAllDay ? "All day" : event.start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      html += `
        <div class="cal-event">
          <div class="cal-event-dot"></div>
          <div class="cal-event-title">${esc(event.summary)}</div>
          <div class="cal-event-time">${esc(timeStr)}</div>
        </div>
      `;
    });
    html += `</div>`;
  }

  if (errors.length) {
    html += `<div class="widget-error">${errors.map(e => `${esc(e.name)}: ${esc(e.error)}`).join("<br>")}</div>`;
  }

  container.innerHTML = html;
}
