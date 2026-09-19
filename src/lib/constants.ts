export const DEFAULT_ROOM_DURATION_MINUTES = 12 * 60;
export const ROOM_DURATION_OPTIONS = [
  { minutes: 60, label: "1 hora" },
  { minutes: 3 * 60, label: "3 horas" },
  { minutes: 6 * 60, label: "6 horas" },
  { minutes: 12 * 60, label: "12 horas" },
  { minutes: 24 * 60, label: "24 horas" },
] as const;
export const MIN_ROOM_DURATION_MINUTES = ROOM_DURATION_OPTIONS[0].minutes;
export const MAX_ROOM_DURATION_MINUTES = ROOM_DURATION_OPTIONS[ROOM_DURATION_OPTIONS.length - 1].minutes;
export const ONLINE_MS = 25_000;
export const STALE_MEMBER_MS = 5 * 60 * 1000;
export const TYPING_MS = 3_500;
export const MAX_MESSAGE_LEN = 1500;
export const MAX_MEDIA_LEN = 400_000;
export const MAX_USERNAME = 20;
export const MIN_USERNAME = 2;
export const SESSION_KEY = "no-trace-session-v1";
export const SETTINGS_KEY = "no-trace-settings-v1";

export const AVATAR_COLORS = [
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#22d3ee",
  "#fb7185",
  "#a3e635",
] as const;

export const FONT_SIZES = [
  { id: "sm", label: "S" },
  { id: "md", label: "M" },
  { id: "lg", label: "L" },
] as const;

export type FontSizeId = (typeof FONT_SIZES)[number]["id"];

export const QUICK_EMOJIS = ["🔥", "✨", "👋", "❤️", "😂", "👍", "🌙", "☕"];
export const REACTION_EMOJIS = ["❤️", "😂", "🔥", "👍"] as const;
