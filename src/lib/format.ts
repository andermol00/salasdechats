import { MAX_USERNAME, MIN_USERNAME } from "./constants";

export function normalizeCode(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function isValidCode(code: string) {
  return /^[a-z0-9-]{3,24}$/.test(code);
}

export function generateCode() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
}

export function sanitizeUsername(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_USERNAME);
}

export function isValidUsername(name: string) {
  return name.length >= MIN_USERNAME && name.length <= MAX_USERNAME;
}

export function isHexColor(color: string) {
  return /^#([0-9a-fA-F]{6})$/.test(color);
}

export function formatRemaining(ms: number) {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function formatClock(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}
