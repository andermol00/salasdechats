export const BRAND = "NO TRACE";
export const APP_TAGLINE = "Salas temporales de 24 horas";

export const ROOM_DURATIONS = [
  { hours: 1, label: "1 hora" },
  { hours: 3, label: "3 horas" },
  { hours: 6, label: "6 horas" },
  { hours: 12, label: "12 horas" },
  { hours: 24, label: "24 horas" },
  { hours: 48, label: "2 días" },
  { hours: 72, label: "3 días" },
] as const;

export const DEFAULT_DURATION_HOURS = 24;
export const MIN_DURATION_HOURS = 1;
export const MAX_DURATION_HOURS = 168;

export const ONLINE_MS = 25_000;
export const STALE_MEMBER_MS = 5 * 60 * 1000;
export const TYPING_MS = 5_000;
export const SYNC_MS = 1_400;
export const MAX_SYNC_FAILURES = 2;

export const MAX_MESSAGE_LEN = 1500;
export const MAX_MEDIA_LEN = 400_000;
export const MAX_USERNAME = 20;
export const MIN_USERNAME = 2;

export const SESSION_KEY = "notrace-session-v1";
export const SETTINGS_KEY = "notrace-settings-v1";

export const AVATAR_COLORS = [
  "#22d3ee",
  "#3b82f6",
  "#a855f7",
  "#f0506e",
  "#3ecf8e",
  "#f5a524",
  "#ec4899",
  "#8b5cf6",
] as const;

export const FONT_SIZES = [
  { id: "sm", label: "S" },
  { id: "md", label: "M" },
  { id: "lg", label: "L" },
] as const;

export type FontSizeId = (typeof FONT_SIZES)[number]["id"];

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢"] as const;
export const QUICK_EMOJIS = ["🔥", "✨", "👋", "❤️", "😂", "👍", "🌙", "☕"];
