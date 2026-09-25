import { AVATAR_COLORS, MAX_USERNAME, MIN_USERNAME } from "./constants";

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

export function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const GIF_CDN_HOSTS = new Set([
  "i.giphy.com",
  "giphy.com",
  "media.tenor.com",
  "c.tenor.com",
  "tenor.com",
  "media.klippy.com",
  "cdn.klippy.com",
]);

export function isAllowedImageSrc(src: string) {
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src)) return true;
  if (!src.startsWith("https://") || /[\s"'<>]/.test(src)) return false;
  let host = "";
  try {
    host = new URL(src).hostname.toLowerCase();
  } catch {
    return false;
  }
  // Known GIF CDNs serve animated images even at extensionless URLs.
  if (GIF_CDN_HOSTS.has(host) || host.endsWith(".giphy.com") || host.endsWith(".tenor.com")) {
    return src.length <= 600;
  }
  return /^https:\/\/[^\s"']+\.(gif|png|jpe?g|webp)(\?[^\s"']*)?$/i.test(src);
}

/** Finds a bare GIF/image URL pasted directly in the chat text. */
export function extractBareImageUrl(content: string): string | null {
  const match = content.match(/https:\/\/[^\s"'<>]+/i);
  if (!match) return null;
  const url = match[0].replace(/[.,;:!?)]+$/, "");
  return isAllowedImageSrc(url) ? url : null;
}

export function splitMedia(content: string): { src: string | null; text: string } {
  if (!content.startsWith("img:")) return { src: null, text: content };
  const newline = content.indexOf("\n");
  const rawSrc = newline === -1 ? content.slice(4) : content.slice(4, newline);
  const text = newline === -1 ? "" : content.slice(newline + 1);
  return { src: isAllowedImageSrc(rawSrc) ? rawSrc : null, text };
}

export function getYoutubeEmbed(content: string) {
  const match = content.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i,
  );
  if (!match?.[1]) return null;
  return `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0`;
}
