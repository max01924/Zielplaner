export const SETTINGS_STORAGE_KEY = "zielplaner.settings";
export const STANDARD_ACCENT = "#97373A";

export const defaultSettings = {
  startMode: "goals",
  startTab: "daily",
  theme: "dark",
  accentMode: "standard",
  accentColor: STANDARD_ACCENT,
  backgroundMode: "default",
  backgroundBlur: 0,
};

const validModes = new Set(["goals", "habits"]);
const validTabs = new Set(["daily", "weekly", "monthly", "yearly"]);

export function normalizeHexColor(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(value ?? ""));
  return match ? `#${match[1].toUpperCase()}` : null;
}

export function normalizeSettings(value = {}) {
  const backgroundBlur = Number(value.backgroundBlur);
  return {
    startMode: validModes.has(value.startMode) ? value.startMode : defaultSettings.startMode,
    startTab: validTabs.has(value.startTab) ? value.startTab : defaultSettings.startTab,
    theme: value.theme === "light" ? "light" : "dark",
    accentMode: value.accentMode === "custom" ? "custom" : "standard",
    accentColor: normalizeHexColor(value.accentColor) ?? STANDARD_ACCENT,
    backgroundMode: value.backgroundMode === "custom" ? "custom" : "default",
    backgroundBlur: Number.isFinite(backgroundBlur)
      ? Math.max(0, Math.min(24, Math.round(backgroundBlur)))
      : defaultSettings.backgroundBlur,
  };
}

export function loadSettings(storage = globalThis.localStorage) {
  try {
    return normalizeSettings(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY)));
  } catch {
    return { ...defaultSettings };
  }
}

export function storeSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizeSettings(settings);
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Browser storage can be unavailable in restricted sessions.
  }
  return normalized;
}

export function resolvedAccentColor(settings) {
  const normalized = normalizeSettings(settings);
  return normalized.accentMode === "custom" ? normalized.accentColor : STANDARD_ACCENT;
}

function relativeLuminance(hexColor) {
  const channels = hexColor.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
  const [red, green, blue] = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function accentContrastColor(hexColor) {
  const accent = normalizeHexColor(hexColor) ?? STANDARD_ACCENT;
  const accentLuminance = relativeLuminance(accent);
  const dark = "#151517";
  const light = "#F2F2F0";
  const darkContrast = (accentLuminance + 0.05) / (relativeLuminance(dark) + 0.05);
  const lightContrast = (relativeLuminance(light) + 0.05) / (accentLuminance + 0.05);
  return darkContrast > lightContrast ? dark : light;
}

export function applyAppearance(settings, root = globalThis.document?.documentElement) {
  if (!root) return;
  const normalized = normalizeSettings(settings);
  const accent = resolvedAccentColor(normalized);
  const [red, green, blue] = accent.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16));
  root.dataset.theme = normalized.theme;
  root.style.setProperty("--color-accent", accent);
  root.style.setProperty("--color-accent-rgb", `${red} ${green} ${blue}`);
  root.style.setProperty("--color-accent-contrast", accentContrastColor(accent));
  root.style.setProperty("--custom-background-blur", `${normalized.backgroundBlur}px`);
}

export function applyBackgroundImage(settings, imageUrl, root = globalThis.document?.documentElement) {
  if (!root) return;
  const useCustomBackground = normalizeSettings(settings).backgroundMode === "custom" && Boolean(imageUrl);
  root.dataset.background = useCustomBackground ? "custom" : "default";
  if (useCustomBackground) {
    root.style.setProperty("--custom-background-image", `url("${imageUrl}")`);
  } else {
    root.style.removeProperty("--custom-background-image");
  }
}
