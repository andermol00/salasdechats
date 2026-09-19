const HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
];

/** Extracts a YouTube video id from watch / share / shorts / embed links. */
export function extractYouTube(text: string): string | null {
  const matches = text.match(/https?:\/\/[^\s<]+/g) ?? [];
  for (const raw of matches) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (!HOSTS.includes(url.hostname.toLowerCase())) continue;

    if (url.hostname.toLowerCase().includes("youtu.be")) {
      const id = url.pathname.slice(1).split("/")[0];
      if (id) return id;
      continue;
    }

    const v = url.searchParams.get("v");
    if (v) return v;

    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts[0];
    if (marker && ["shorts", "embed", "live", "v"].includes(marker)) {
      const id = parts[1];
      if (id) return id;
    }
  }
  return null;
}

/** Removes the YouTube link from the caption so it is not shown twice. */
export function stripYouTube(text: string): string {
  return text
    .replace(/https?:\/\/[^\s<]+/g, (link) => {
      return extractYouTube(link) ? "" : link;
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
