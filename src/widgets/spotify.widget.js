import { state } from "../core/config.js?v=2026-06-15-1";
import { bus, EV } from "../core/events.js?v=2026-06-15-1";
import { esc } from "../core/dom.js?v=2026-06-15-1";
import {
  startSpotifyAuth,
  fetchNowPlaying,
  spotifyControl,
  isTokenExpired,
  needsReconnect,
  SP_ERR,
} from "../integrations/spotify.js?v=2026-06-15-1";

let pollTimer = null;

export const SpotifyWidget = {
  id: "spotify",
  name: "Spotify",
  description: "Now playing from Spotify",
  defaultSize: "medium",

  render(container, { widgetCfg }) {
    clearInterval(pollTimer);
    renderSpotify(container, widgetCfg);

    const sp = state.cfg.integrations.spotify;
    if (sp.accessToken && !isTokenExpired(sp) && !needsReconnect(sp)) {
      pollTimer = setInterval(
        () => renderSpotify(container, widgetCfg),
        (widgetCfg.pollSeconds || 20) * 1000
      );
    }

    bus.on(EV.WIDGETS_CHANGED, () => { clearInterval(pollTimer); renderSpotify(container, widgetCfg); });
  }
};

async function renderSpotify(container, wCfg) {
  const sp = state.cfg.integrations.spotify;

  if (!state.cfg.privacy.allowSpotifyApi) {
    container.innerHTML = `<div class="tile-label">Spotify</div><div class="widget-error">Spotify API is disabled in Privacy settings.</div>`;
    return;
  }

  if (!sp.accessToken) {
    container.innerHTML = `
      <div class="tile-label">Spotify</div>
      <div class="spotify-disconnected">
        <p>Connect your Spotify account to see what's playing.</p>
        ${sp.clientId
          ? `<button class="spotify-connect-btn" id="sp-connect">Connect Spotify</button>`
          : `<p style="font-size:.75rem;color:var(--warning)">Enter your Spotify Client ID in Settings → Widgets → Spotify first.</p>`}
        <a href="#" id="sp-settings-link" style="font-size:.75rem;color:var(--muted)">Open Spotify settings</a>
      </div>
    `;
    container.querySelector("#sp-connect")?.addEventListener("click", () => startSpotifyAuth(sp.clientId));
    container.querySelector("#sp-settings-link")?.addEventListener("click", (e) => {
      e.preventDefault();
      bus.emit(EV.SETTINGS_OPEN, "widgets");
    });
    return;
  }

  // Prompt reconnect if scope version is outdated
  if (needsReconnect(sp)) {
    container.innerHTML = `
      <div class="tile-label">Spotify</div>
      <div class="spotify-disconnected">
        <p style="color:var(--warning);font-size:.85rem">Spotify permissions need to be refreshed — please reconnect.</p>
        <button class="spotify-connect-btn" id="sp-reconnect">Reconnect Spotify</button>
      </div>
    `;
    container.querySelector("#sp-reconnect")?.addEventListener("click", () => startSpotifyAuth(sp.clientId));
    return;
  }

  // Token expired and refresh will be attempted by fetchNowPlaying — show loading first
  if (isTokenExpired(sp)) {
    container.innerHTML = `<div class="tile-label">Spotify</div><div class="widget-loading">Refreshing session…</div>`;
  } else {
    container.innerHTML = `<div class="tile-label">Spotify</div><div class="widget-loading">Checking now playing…</div>`;
  }

  try {
    const track = await fetchNowPlaying(sp);
    if (!track) {
      container.innerHTML = `
        <div class="tile-label">Spotify</div>
        <div class="widget-empty" style="text-align:left">
          <div style="color:var(--muted);font-size:.85rem">Nothing playing right now.</div>
          <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" style="font-size:.78rem;color:var(--accent);display:block;margin-top:.4rem">Open Spotify →</a>
        </div>
      `;
      return;
    }
    renderNowPlaying(container, track, wCfg, sp);
  } catch (e) {
    renderSpotifyError(container, e, sp);
  }
}

function renderSpotifyError(container, e, sp) {
  const kind = e.kind || SP_ERR.GENERIC;
  let actionHtml = "";

  if (kind === SP_ERR.EXPIRED || kind === SP_ERR.REVOKED) {
    actionHtml = `<button class="spotify-connect-btn" id="sp-reconnect" style="margin-top:.5rem;font-size:.78rem">Reconnect Spotify</button>`;
  } else if (kind === SP_ERR.SCOPE) {
    actionHtml = `<button class="spotify-connect-btn" id="sp-reconnect" style="margin-top:.5rem;font-size:.78rem">Reconnect to fix permissions</button>`;
  } else if (kind === SP_ERR.DEV_MODE) {
    actionHtml = `<a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener" style="font-size:.75rem;color:var(--accent);display:block;margin-top:.4rem">Open Developer Dashboard →</a>`;
  } else if (kind === SP_ERR.PREMIUM) {
    actionHtml = `<p style="font-size:.75rem;color:var(--muted);margin-top:.3rem">Playback controls require Spotify Premium. You can still see now-playing info.</p>`;
  }

  container.innerHTML = `
    <div class="tile-label">Spotify</div>
    <div class="widget-error">${esc(e.message || "Failed to fetch now playing")}</div>
    ${actionHtml}
  `;

  if (kind === SP_ERR.EXPIRED || kind === SP_ERR.REVOKED || kind === SP_ERR.SCOPE) {
    container.querySelector("#sp-reconnect")?.addEventListener("click", () => startSpotifyAuth(sp.clientId));
  }
}

function renderNowPlaying(container, track, wCfg, sp) {
  const progress = track.duration ? Math.round((track.progress / track.duration) * 100) : 0;

  container.innerHTML = `
    <div class="tile-label">Spotify
      <div class="tile-label-actions">
        <a class="tile-action-btn" href="${esc(track.url || "https://open.spotify.com")}" target="_blank" rel="noopener noreferrer" title="Open in Spotify">↗</a>
      </div>
    </div>
    <div class="spotify-now-playing">
      ${wCfg.showAlbumArt && track.artUrl
        ? `<img class="spotify-art" src="${esc(track.artUrl)}" alt="Album art" loading="lazy" />`
        : ""}
      <div class="spotify-info">
        <div class="spotify-track" title="${esc(track.title)}">${esc(track.title)}</div>
        <div class="spotify-artist">${esc(track.artist)}</div>
      </div>
    </div>
    <div class="spotify-controls">
      <button class="spotify-ctrl-btn" id="sp-prev" aria-label="Previous">⏮</button>
      <button class="spotify-ctrl-btn play-pause" id="sp-play" aria-label="${track.isPlaying ? "Pause" : "Play"}">${track.isPlaying ? "⏸" : "▶"}</button>
      <button class="spotify-ctrl-btn" id="sp-next" aria-label="Next">⏭</button>
    </div>
    <div class="spotify-progress-bar">
      <div class="spotify-progress-fill" style="width:${progress}%"></div>
    </div>
  `;

  container.querySelector("#sp-prev")?.addEventListener("click", () => spotifyControl(sp, "previous"));
  container.querySelector("#sp-next")?.addEventListener("click", () => spotifyControl(sp, "next"));
  container.querySelector("#sp-play")?.addEventListener("click", () => {
    spotifyControl(sp, track.isPlaying ? "pause" : "play");
    setTimeout(() => renderSpotify(container, wCfg), 500);
  });
}
