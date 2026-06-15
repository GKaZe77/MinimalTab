// Spotify PKCE Authorization Code Flow
// No client secret required. Tokens stored in config.integrations.spotify.

import { state } from "../core/config.js?v=2026-06-14-3";
import { saveConfig } from "../core/storage.js?v=2026-06-14-3";

const SCOPES = "user-read-currently-playing user-read-playback-state user-modify-playback-state";

// Increment when required scopes change so the widget can prompt the user to reconnect.
export const SCOPE_VERSION = 1;

// Error kind constants — used by the widget for friendly UI messages
export const SP_ERR = {
  EXPIRED:    "token-expired",
  REVOKED:    "revoked",
  SCOPE:      "insufficient-scope",
  DEV_MODE:   "dev-mode",
  NO_DEVICE:  "no-device",
  PREMIUM:    "premium-required",
  RATE_LIMIT: "rate-limit",
  SERVER:     "server-error",
  GENERIC:    "generic",
};

export class SpotifyError extends Error {
  constructor(message, kind, status) {
    super(message);
    this.name = "SpotifyError";
    this.kind = kind;
    this.status = status;
  }
}

function dbg(...args) {
  if (state.cfg?.debug) console.debug("[Spotify]", ...args);
}

// ── PKCE helpers ──────────────────────────────────────────────
function generateCodeVerifier(len = 128) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr.reduce((s, b) => s + chars[b % chars.length], "");
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const hashed = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hashed)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ── Auth ──────────────────────────────────────────────────────
export async function startSpotifyAuth(clientId) {
  if (!clientId) {
    alert("Enter your Spotify Client ID in Settings → Widgets → Spotify first.");
    return;
  }

  const verifier   = generateCodeVerifier();
  const challenge  = await generateCodeChallenge(verifier);
  const redirectUri = window.location.href.split("?")[0].split("#")[0];

  try { sessionStorage.setItem("spotify_cv", verifier); } catch {}

  const params = new URLSearchParams({
    client_id:             clientId,
    response_type:         "code",
    redirect_uri:          redirectUri,
    scope:                 SCOPES,
    code_challenge_method: "S256",
    code_challenge:        challenge,
    state:                 "ct_spotify",
    show_dialog:           "true",  // always show consent screen to ensure fresh scopes
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function handleSpotifyCallback() {
  const url     = new URL(window.location.href);
  const code    = url.searchParams.get("code");
  const cbState = url.searchParams.get("state");
  if (!code || cbState !== "ct_spotify") return false;

  // Clean URL before doing anything (avoids double-processing on reload)
  window.history.replaceState({}, "", window.location.pathname);

  const verifier   = sessionStorage.getItem("spotify_cv");
  const redirectUri = window.location.href.split("?")[0].split("#")[0];
  const clientId   = state.cfg.integrations.spotify.clientId;

  if (!verifier || !clientId) {
    console.warn("[Spotify] Missing verifier or clientId — cannot exchange code");
    return false;
  }

  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  redirectUri,
        client_id:     clientId,
        code_verifier: verifier
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error_description || `Token exchange failed: ${res.status}`);
    }

    const tokens = await res.json();
    const sp = state.cfg.integrations.spotify;
    sp.accessToken  = tokens.access_token;
    sp.refreshToken = tokens.refresh_token || sp.refreshToken;
    sp.expiresAt    = Date.now() + tokens.expires_in * 1000;
    sp.scopeVersion = SCOPE_VERSION;
    sp.enabled      = true;
    state.cfg.privacy.allowSpotifyApi = true;

    saveConfig();
    sessionStorage.removeItem("spotify_cv");
    return true;
  } catch (e) {
    console.error("[Spotify] Token exchange failed:", e);
    return false;
  }
}

export async function refreshSpotifyToken(sp) {
  if (!sp.refreshToken || !sp.clientId) {
    throw new SpotifyError(
      "No refresh token available — please reconnect Spotify.",
      SP_ERR.EXPIRED
    );
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: sp.refreshToken,
      client_id:     sp.clientId
    })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const reason = body?.error || "";
    if (reason === "invalid_grant") {
      throw new SpotifyError(
        "Spotify session revoked — please reconnect.",
        SP_ERR.REVOKED,
        res.status
      );
    }
    throw new SpotifyError(
      `Token refresh failed (${res.status}): ${body?.error_description || reason || "unknown"}`,
      SP_ERR.EXPIRED,
      res.status
    );
  }

  const tokens = await res.json();
  sp.accessToken  = tokens.access_token;
  sp.refreshToken = tokens.refresh_token || sp.refreshToken;
  sp.expiresAt    = Date.now() + tokens.expires_in * 1000;
  saveConfig();
  dbg("token refreshed, expires", new Date(sp.expiresAt).toLocaleTimeString());
  return sp.accessToken;
}

export function isTokenExpired(sp) {
  if (!sp.expiresAt) return true;
  return Date.now() >= sp.expiresAt - 30_000; // 30 s grace
}

// Returns true if the stored token was granted before the current required scope version.
export function needsReconnect(sp) {
  return !!(sp.accessToken && (sp.scopeVersion == null || sp.scopeVersion < SCOPE_VERSION));
}

// Clears all Spotify credentials. Call this from the disconnect button.
export function disconnectSpotify() {
  const sp = state.cfg.integrations.spotify;
  sp.accessToken  = null;
  sp.refreshToken = null;
  sp.expiresAt    = null;
  sp.enabled      = false;
  sp.scopeVersion = 0;
  saveConfig();
}

// ── Internal API helper ───────────────────────────────────────

function classifySpotifyError(status, body) {
  const reason  = body?.error?.reason  || "";
  const message = body?.error?.message || "";

  if (status === 401) {
    return new SpotifyError(
      "Spotify session expired — please reconnect.",
      SP_ERR.EXPIRED, 401
    );
  }
  if (status === 403) {
    if (reason === "PREMIUM_REQUIRED") {
      return new SpotifyError(
        "Spotify Premium is required for playback control.",
        SP_ERR.PREMIUM, 403
      );
    }
    if (reason === "INSUFFICIENT_CLIENT_SCOPE" || message.toLowerCase().includes("scope")) {
      return new SpotifyError(
        "App lacks required Spotify permissions — disconnect and reconnect to grant all scopes.",
        SP_ERR.SCOPE, 403
      );
    }
    if (reason === "USER_NOT_IN_ALLOW_LIST") {
      return new SpotifyError(
        "Your account is not on this app's Spotify Developer Dashboard allowlist. " +
        "Apps in development mode are limited to 25 users — add your account at developer.spotify.com/dashboard.",
        SP_ERR.DEV_MODE, 403
      );
    }
    return new SpotifyError(
      `Spotify access denied (403): ${message || reason || "check your Developer Dashboard settings"}.`,
      SP_ERR.GENERIC, 403
    );
  }
  if (status === 429) {
    return new SpotifyError(
      "Spotify rate limit reached — too many requests. The widget will retry automatically.",
      SP_ERR.RATE_LIMIT, 429
    );
  }
  if (status >= 500) {
    return new SpotifyError(
      `Spotify server error (${status}). Try again later.`,
      SP_ERR.SERVER, status
    );
  }
  return new SpotifyError(
    `Spotify API error ${status}: ${message || reason || "unknown"}.`,
    SP_ERR.GENERIC, status
  );
}

// Calls a Spotify API endpoint, refreshing the token first if expired.
// On a 401 response, attempts one token refresh and retries.
async function callApi(sp, url, method = "GET") {
  if (isTokenExpired(sp)) {
    dbg("token expired locally, refreshing before call");
    await refreshSpotifyToken(sp);
  }

  let res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${sp.accessToken}` }
  });

  if (res.status === 401) {
    dbg("got 401 from API, attempting one token refresh and retry");
    try {
      await refreshSpotifyToken(sp);
      res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${sp.accessToken}` }
      });
    } catch (refreshErr) {
      console.error("[Spotify] Refresh after 401 failed:", refreshErr.message);
      throw refreshErr instanceof SpotifyError
        ? refreshErr
        : new SpotifyError("Spotify session expired — please reconnect.", SP_ERR.EXPIRED, 401);
    }
  }

  return res;
}

// ── API calls ─────────────────────────────────────────────────
export async function fetchNowPlaying(sp) {
  const res = await callApi(sp, "https://api.spotify.com/v1/me/player/currently-playing");

  if (res.status === 204 || res.status === 404) return null; // nothing playing / no active device

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("[Spotify] fetchNowPlaying error:", res.status, body);
    throw classifySpotifyError(res.status, body);
  }

  const data = await res.json();
  if (!data?.item) return null;

  return {
    title:     data.item.name,
    artist:    data.item.artists?.map(a => a.name).join(", ") || "Unknown",
    artUrl:    data.item.album?.images?.[1]?.url || data.item.album?.images?.[0]?.url || "",
    url:       data.item.external_urls?.spotify || "https://open.spotify.com",
    isPlaying: data.is_playing,
    progress:  data.progress_ms || 0,
    duration:  data.item.duration_ms || 0
  };
}

export async function spotifyControl(sp, action) {
  const endpoints = {
    play:     { url: "https://api.spotify.com/v1/me/player/play",     method: "PUT"  },
    pause:    { url: "https://api.spotify.com/v1/me/player/pause",    method: "PUT"  },
    next:     { url: "https://api.spotify.com/v1/me/player/next",     method: "POST" },
    previous: { url: "https://api.spotify.com/v1/me/player/previous", method: "POST" },
  };
  const ep = endpoints[action];
  if (!ep) return;

  const res = await callApi(sp, ep.url, ep.method);
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    console.warn("[Spotify] Control action failed:", action, res.status, body);
    // Don't throw — control failures are non-fatal; the next poll will reflect the real state.
  }
}
