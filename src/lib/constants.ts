export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
export const ONLINE_MS = 25_000;
export const STALE_MEMBER_MS = 5 * 60 * 1000;
export const MAX_MESSAGE_LEN = 1500;
export const MAX_USERNAME = 20;
export const MIN_USERNAME = 2;
export const SESSION_KEY = "vela-session-v1";
export const SETTINGS_KEY = "vela-settings-v1";

export const AVATAR_COLORS = [
  "#f59e0b",
  "#fb7185",
  "#34d399",
  "#38bdf8",
  "#c084fc",
  "#f472b6",
  "#22d3ee",
  "#a3e635",
  "#fb923c",
  "#e879f9",
] as const;

export const THEMES = [
  { id: "ember", label: "Brasa", swatch: "#f59e0b" },
  { id: "midnight", label: "Medianoche", swatch: "#818cf8" },
  { id: "ocean", label: "Marea", swatch: "#22d3ee" },
  { id: "forest", label: "Musgo", swatch: "#34d399" },
  { id: "aurora", label: "Aurora", swatch: "#e879f9" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const FONT_SIZES = [
  { id: "sm", label: "Compacta" },
  { id: "md", label: "Media" },
  { id: "lg", label: "Amplia" },
] as const;

export type FontSizeId = (typeof FONT_SIZES)[number]["id"];

export const QUICK_EMOJIS = ["🔥", "✨", "👋", "❤️", "😂", "👍", "🌙", "☕"];
