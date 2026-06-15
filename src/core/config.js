import { VERSION } from "./constants.js?v=2026-06-14-3";

export const DEFAULT_RSS_PROXY_TEMPLATE = "https://customtab-rss-proxy.gkaze77.workers.dev/?url={url}";

export const DEFAULT_CONFIG = {
  version: VERSION,

  appearance: {
    mode: "system",
    style: "glass",
    accent: "#a78bfa",
    backgroundType: "solid",
    backgroundValue: "",
    backgroundDim: 0.45,
    backgroundBlur: 0,
    backgroundScale: 1.05,
    backgroundFocalPoint: "center",
    backgroundSlideshow: {
      enabled: false,
      images: [],
      randomOnNewTab: false,
      rotateMinutes: 0
    },
    profiles: []
  },

  focus: {
    defaultOnLoad: true,
    revealOnMove: true,
    revealOnKey: true,
    revealOnClick: true,
    returnAfter: 60,
    showHint: true,
    showWeather: false,
    showMusic: false
  },

  search: {
    mode: "web",
    engine: "brave",
    customUrl: "",
    openIn: "_blank",
    aiEngine: "perplexity",
    aiCustomUrl: "",
    aiOpenIn: "_blank",
    shortcutsEnabled: true,
    shortcuts: {
      g: "google", b: "brave", ddg: "duckduckgo",
      yt: "youtube", gh: "github", r: "reddit", ai: "ai"
    }
  },

  links: {
    folders: [
      {
        id: "f-media",
        name: "Media",
        collapsed: false,
        links: [
          { id: "l-yt",  name: "YouTube", url: "https://www.youtube.com/",       favorite: true  },
          { id: "l-nf",  name: "Netflix", url: "https://www.netflix.com/browse", favorite: false },
          { id: "l-dp",  name: "Disney+", url: "https://www.disneyplus.com/",    favorite: false }
        ]
      },
      {
        id: "f-tools",
        name: "Tools",
        collapsed: false,
        links: [
          { id: "l-gpt",  name: "ChatGPT",   url: "https://chatgpt.com/",          favorite: true  },
          { id: "l-wiki", name: "Wikipedia", url: "https://www.wikipedia.org",      favorite: false }
        ]
      }
    ]
  },

  layout: {
    dashboardWidth: "md",
    density: "comfortable",
    mode: "auto",      // "auto" | "custom"
    columns: 12,
    rowHeight: 80,
    blockOrder: [],    // derived on first load from widgetOrder + link folders
    blocks: {},        // { blockId: { x, y, w, h } }
    widgetOrder: ["weather", "todo", "notes", "rss", "calendar", "goals", "status", "spotify"],
    widgetSizes: {},
    widgetVisibility: {}
  },

  widgets: {
    weather: {
      enabled: false,
      location: "auto",
      units: "fahrenheit",
      showForecast: true
    },
    todo: {
      enabled: false,
      tasks: [],
      showCompleted: true
    },
    notes: {
      enabled: false,
      title: "Notes",
      content: ""
    },
    spotify: {
      enabled: false,
      display: "compact",
      showAlbumArt: true,
      useAlbumArtAccent: false,
      showOnFocus: false,
      pollSeconds: 20
    },
    rss: {
      enabled: false,
      feeds: [],
      selectedPresetIds: [],
      refreshMinutes: 30,
      maxItems: 100,
      maxItemsPerFeed: 10,
      openIn: "_blank",
      showSource: true,
      showExcerpt: true,
      proxyTemplate: DEFAULT_RSS_PROXY_TEMPLATE
    },
    calendar: {
      enabled: false,
      sources: [],
      maxDays: 7,
      maxItems: 6,
      proxyTemplate: ""
    },
    goals: {
      enabled: false,
      goals: [],
      resetDaily: true,
      showOnFocus: false
    },
    status: {
      enabled: false,
      checks: [],
      refreshMinutes: 5
    }
  },

  integrations: {
    spotify: {
      enabled: false,
      clientId: "",
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      scopeVersion: 0
    }
  },

  privacy: {
    allowGoogleFavicons: true,
    allowWeatherApi: false,
    allowSpotifyApi: false,
    allowRssFetches: false,
    allowCalendarFetches: false,
    allowStatusChecks: false
  },

  onboarding: {
    completed: false,
    timestamp: null
  },

  debug: false
};

// Mutable singleton — all modules share this reference.
// Mutate properties directly; never reassign `state.cfg` from outside storage.js.
export const state = { cfg: null };
