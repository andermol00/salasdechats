/**
 * Built-in sticker pack.
 *
 * Everything here is authored SVG animated with CSS, so the GIF/sticker system
 * needs no API key, no external service and works offline. Messages sent with a
 * sticker use the format `stick:<id>`.
 */

export type Sticker = {
  id: string;
  label: string;
  svg: string;
};

const svg = (body: string) =>
  `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img">${body}</svg>`;

export const STICKERS: Sticker[] = [
  {
    id: "heart",
    label: "Amor",
    svg: svg(
      `<g class="st-beat"><path d="M32 54S8 39 8 24a13 13 0 0 1 24-7 13 13 0 0 1 24 7c0 15-24 30-24 30Z" fill="#ff4d6d"/><path d="M20 22a6 6 0 0 1 6-6" stroke="#ffc2cd" stroke-width="3" stroke-linecap="round" fill="none"/></g>`,
    ),
  },
  {
    id: "fire",
    label: "Fuego",
    svg: svg(
      `<g class="st-flick"><path d="M32 6c8 12 18 16 18 30a18 18 0 0 1-36 0C14 22 24 18 32 6Z" fill="#ff8a1f"/><path d="M32 26c4 6 9 8 9 15a9 9 0 0 1-18 0c0-7 5-9 9-15Z" fill="#ffd166"/></g>`,
    ),
  },
  {
    id: "laugh",
    label: "Risa",
    svg: svg(
      `<g class="st-bounce"><circle cx="32" cy="32" r="26" fill="#ffd166"/><circle cx="23" cy="26" r="4" fill="#3a2a00"/><circle cx="41" cy="26" r="4" fill="#3a2a00"/><path d="M20 40a13 13 0 0 0 24 0Z" fill="#3a2a00"/></g>`,
    ),
  },
  {
    id: "cry",
    label: "Llanto",
    svg: svg(
      `<g class="st-bounce"><circle cx="32" cy="30" r="24" fill="#8ec5ff"/><circle cx="24" cy="26" r="3.5" fill="#12324f"/><circle cx="40" cy="26" r="3.5" fill="#12324f"/><path d="M25 41a9 9 0 0 0 14 0" stroke="#12324f" stroke-width="3" fill="none" stroke-linecap="round"/><circle class="st-drop" cx="20" cy="38" r="4" fill="#3ba7ff"/><circle class="st-drop" cx="44" cy="38" r="4" fill="#3ba7ff"/></g>`,
    ),
  },
  {
    id: "thumbsup",
    label: "Me gusta",
    svg: svg(
      `<g class="st-bounce"><rect x="10" y="28" width="12" height="26" rx="4" fill="#4f9cf9"/><path d="M26 54V30l10-18a7 7 0 0 1 7 7v9h9a5 5 0 0 1 5 6l-4 20Z" fill="#2d7ff9"/></g>`,
    ),
  },
  {
    id: "thumbsdown",
    label: "No me gusta",
    svg: svg(
      `<g class="st-bounce"><rect x="10" y="10" width="12" height="26" rx="4" fill="#94a3b8"/><path d="M26 10v24l10 18a7 7 0 0 0 7-7v-9h9a5 5 0 0 0 5-6l-4-20Z" fill="#64748b"/></g>`,
    ),
  },
  {
    id: "party",
    label: "Fiesta",
    svg: svg(
      `<g class="st-shake"><path d="M12 54 26 18l20 20Z" fill="#a78bfa"/><path d="M26 18 12 54l24-10Z" fill="#7c3aed"/></g><circle class="st-spark" cx="46" cy="14" r="4" fill="#fbbf24"/><circle class="st-spark" cx="54" cy="30" r="3" fill="#22d3ee"/><circle class="st-spark" cx="30" cy="8" r="3" fill="#f472b6"/>`,
    ),
  },
  {
    id: "star",
    label: "Estrella",
    svg: svg(
      `<g class="st-twinkle"><path d="M32 6l8 18 20 2-15 13 4 19-17-10-17 10 4-19L4 26l20-2Z" fill="#fbbf24"/></g>`,
    ),
  },
  {
    id: "rocket",
    label: "Cohete",
    svg: svg(
      `<g class="st-float"><path d="M32 6c8 6 12 16 12 26l-12 6-12-6C20 22 24 12 32 6Z" fill="#e2e8f5"/><circle cx="32" cy="26" r="5" fill="#38bdf8"/><path d="M20 38l-6 12 10-4Z" fill="#ef4444"/><path d="M44 38l6 12-10-4Z" fill="#ef4444"/></g><path class="st-flick" d="M32 40c3 5 6 6 6 10a6 6 0 0 1-12 0c0-4 3-5 6-10Z" fill="#fb923c"/>`,
    ),
  },
  {
    id: "moon",
    label: "Luna",
    svg: svg(
      `<g class="st-glow"><path d="M40 6a26 26 0 1 0 18 44A22 22 0 0 1 40 6Z" fill="#a5b4fc"/></g>`,
    ),
  },
  {
    id: "coffee",
    label: "Café",
    svg: svg(
      `<g class="st-steam"><path d="M26 12c0 4-4 5-4 9" stroke="#cbd5e1" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M34 10c0 4-4 5-4 9" stroke="#cbd5e1" stroke-width="3" fill="none" stroke-linecap="round"/></g><path d="M12 30h32v12a10 10 0 0 1-10 10H22a10 10 0 0 1-10-10Z" fill="#7c4a21"/><path d="M44 32h6a6 6 0 0 1 0 12h-6" stroke="#7c4a21" stroke-width="4" fill="none"/>`,
    ),
  },
  {
    id: "gift",
    label: "Regalo",
    svg: svg(
      `<g class="st-shake"><rect x="12" y="26" width="40" height="30" rx="4" fill="#f43f5e"/><rect x="8" y="18" width="48" height="12" rx="3" fill="#fb7185"/><rect x="28" y="18" width="8" height="38" fill="#fde68a"/><path d="M32 18c-8 0-12-4-10-8s10 0 10 8Zm0 0c8 0 12-4 10-8s-10 0-10 8Z" fill="#fde68a"/></g>`,
    ),
  },
  {
    id: "wave",
    label: "Adiós",
    svg: svg(
      `<g class="st-wave"><path d="M22 52V28a5 5 0 0 1 10 0v-8a5 5 0 0 1 10 0v10a5 5 0 0 1 10 0v14a16 16 0 0 1-16 16h-2a12 12 0 0 1-12-12Z" fill="#fbbf24"/></g>`,
    ),
  },
  {
    id: "question",
    label: "Duda",
    svg: svg(
      `<g class="st-bounce"><circle cx="32" cy="32" r="26" fill="#a78bfa"/><path d="M24 24a8 8 0 1 1 10 8v6" stroke="#1e1b4b" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="34" cy="47" r="4" fill="#1e1b4b"/></g>`,
    ),
  },
  {
    id: "exclamation",
    label: "Alerta",
    svg: svg(
      `<g class="st-shake"><path d="M32 6 60 54H4Z" fill="#facc15"/><path d="M32 22v16" stroke="#3f2d00" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="46" r="3.6" fill="#3f2d00"/></g>`,
    ),
  },
  {
    id: "clock",
    label: "Tiempo",
    svg: svg(
      `<circle cx="32" cy="32" r="26" fill="#e2e8f5"/><circle cx="32" cy="32" r="26" fill="none" stroke="#0ea5e9" stroke-width="4"/><g class="st-spin" style="transform-origin:32px 32px"><path d="M32 18v14l10 8" stroke="#0f172a" stroke-width="4" fill="none" stroke-linecap="round"/></g>`,
    ),
  },
  {
    id: "sad",
    label: "Triste",
    svg: svg(
      `<g class="st-float"><circle cx="32" cy="32" r="26" fill="#cbd5e1"/><circle cx="23" cy="27" r="4" fill="#334155"/><circle cx="41" cy="27" r="4" fill="#334155"/><path d="M22 46a12 12 0 0 1 20 0" stroke="#334155" stroke-width="4" fill="none" stroke-linecap="round"/></g>`,
    ),
  },
  {
    id: "cool",
    label: "Cool",
    svg: svg(
      `<g class="st-bounce"><circle cx="32" cy="32" r="26" fill="#fcd34d"/><rect x="12" y="22" width="40" height="12" rx="3" fill="#0f172a"/><path d="M22 42a12 12 0 0 0 20 0" stroke="#0f172a" stroke-width="4" fill="none" stroke-linecap="round"/></g>`,
    ),
  },
];

const BY_ID = new Map(STICKERS.map((sticker) => [sticker.id, sticker]));

export const STICKER_PREFIX = "stick:";
export const STICKER_IDS = STICKERS.map((sticker) => sticker.id);

export function getSticker(id: string): Sticker | null {
  return BY_ID.get(id) ?? null;
}

export function isStickerContent(content: string) {
  return content.startsWith(STICKER_PREFIX);
}

/** Parses `stick:<id>` and returns the sticker only when it exists. */
export function parseSticker(content: string): { sticker: Sticker | null; text: string } {
  if (!isStickerContent(content)) return { sticker: null, text: content };
  const newline = content.indexOf("\n");
  const id = (newline === -1 ? content.slice(STICKER_PREFIX.length) : content.slice(STICKER_PREFIX.length, newline)).trim();
  const text = newline === -1 ? "" : content.slice(newline + 1);
  return { sticker: getSticker(id), text };
}

export const STICKER_PATTERN = new RegExp(`^${STICKER_PREFIX}[a-z0-9-]{1,24}(\\n[\\s\\S]*)?$`);
