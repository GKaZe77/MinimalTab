import { state } from "../core/config.js?v=2026-06-15-1";

export function applyAppearance() {
  const a = state.cfg.appearance;
  const html = document.documentElement;
  html.setAttribute("data-style", a.style || "glass");
  html.setAttribute("data-mode", a.mode || "system");
  if (a.accent) html.style.setProperty("--accent", a.accent);
}

export function applyBackground() {
  const a = state.cfg.appearance;
  const media = document.getElementById("bg-media");
  if (!media) return;

  // Reset
  media.style.cssText = "";
  document.documentElement.style.removeProperty("--bg");
  document.body.classList.remove("has-bg-image");

  const dim  = a.backgroundDim  ?? 0.45;
  const blur = a.backgroundBlur ?? 0;
  const scale = a.backgroundScale ?? 1.05;
  const focal = a.backgroundFocalPoint || "center";

  if (a.backgroundType === "solid" && a.backgroundValue) {
    document.documentElement.style.setProperty("--bg", a.backgroundValue);

  } else if (a.backgroundType === "gradient" && a.backgroundValue) {
    media.style.cssText = `position:absolute;inset:0;width:100%;height:100%;background:${a.backgroundValue};filter:none;transform:none`;
    document.body.classList.add("has-bg-image");

  } else if (a.backgroundType === "image" && a.backgroundValue) {
    // Use CSS URL only — don't inject raw value as style string
    media.style.position = "absolute";
    media.style.inset = "0";
    media.style.width = "100%";
    media.style.height = "100%";
    media.style.backgroundSize = "cover";
    media.style.backgroundPosition = focal;
    media.style.transform = `scale(${scale})`;
    media.style.filter = `blur(${blur}px) brightness(${1 - dim})`;
    // Set background-image via a CSS property (safe — no innerHTML)
    media.style.backgroundImage = `url("${CSS.escape ? a.backgroundValue.replace(/"/g, "%22") : a.backgroundValue}")`;
    document.body.classList.add("has-bg-image");
  }
}
