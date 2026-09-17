export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
export const ONLINE_MS = 25_000;
export const STALE_MEMBER_MS = 5 * 60 * 1000;
export const MAX_MESSAGE_LEN = 1500;
export const MAX_MEDIA_LEN = 400_000;
export const MAX_USERNAME = 20;
export const MIN_USERNAME = 2;
export const SESSION_KEY = "vela-session-v1";
export const SETTINGS_KEY = "vela-settings-v1";

export const AVATAR_COLORS = [
  "#f5a524",
  "#f0506e",
  "#3ecf8e",
  "#4f9cf9",
  "#b07cf7",
  "#f472b6",
  "#22d3ee",
  "#a3e635",
  "#fb923c",
  "#e879f9",
] as const;

export const FONT_SIZES = [
  { id: "sm", label: "S" },
  { id: "md", label: "M" },
  { id: "lg", label: "L" },
] as const;

export type FontSizeId = (typeof FONT_SIZES)[number]["id"];

export const QUICK_EMOJIS = ["🔥", "✨", "👋", "❤️", "😂", "", "🌙", "☕"];
