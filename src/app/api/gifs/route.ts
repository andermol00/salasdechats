import { REMOTE_GIFS, searchRemoteGifs } from "@/lib/gifs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_QUERY = 60;
const MAX_LIMIT = 24;

type GiphyItem = {
  id?: string;
  title?: string;
  images?: {
    fixed_width?: { url?: string; width?: string; height?: string };
    fixed_width_small?: { url?: string };
    preview_gif?: { url?: string };
    downsized_medium?: { url?: string };
  };
};

function safeQuery(value: string | null) {
  return (value ?? "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, MAX_QUERY);
}

function curated(query: string, limit: number) {
  const list = query ? searchRemoteGifs(query, limit) : REMOTE_GIFS.slice(0, limit);
  return list.map((gif) => ({
    id: gif.id,
    title: gif.label,
    url: gif.url,
    preview: gif.preview,
  }));
}

function isSafeGifUrl(url: string) {
  if (!url.startsWith("https://")) return false;
  if (/[\s"'<>]/.test(url)) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith("giphy.com")) return true;
    return /\.(gif|png|jpe?g|webp)(\?[^]*)?$/i.test(parsed.pathname + parsed.search);
  } catch {
    return false;
  }
}

async function liveGiphy(query: string, limit: number, apiKey: string) {
  const endpoint = query ? "search" : "trending";
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: String(limit),
    rating: "pg-13",
    lang: "es",
    bundle: "messaging_non_clips",
  });
  if (query) params.set("q", query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${params}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: GiphyItem[] };
    const gifs = (payload.data ?? [])
      .map((item) => {
        const url =
          item.images?.fixed_width?.url ?? item.images?.downsized_medium?.url ?? "";
        const preview =
          item.images?.preview_gif?.url ??
          item.images?.fixed_width_small?.url ??
          url;
        return {
          id: item.id ?? crypto.randomUUID(),
          title: (item.title ?? "").trim() || "GIF",
          url,
          preview: preview || url,
        };
      })
      .filter((gif) => gif.url && isSafeGifUrl(gif.url));
    return gifs.length > 0 ? gifs : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * GET /api/gifs?q=<query>&limit=<n>
 *
 * Always returns usable GIFs:
 * - With `GIPHY_API_KEY` configured: live GIPHY results (trending/search).
 * - Without it (or when GIPHY fails): the verified curated pack,
 *   filtered locally when `q` is present.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = safeQuery(searchParams.get("q"));
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 18) || 18, 1), MAX_LIMIT);
  const apiKey = process.env.GIPHY_API_KEY?.trim();

  if (apiKey) {
    const live = await liveGiphy(query, limit, apiKey);
    if (live) {
      return NextResponse.json({ configured: true, live: true, gifs: live });
    }
    // Fall through to the curated pack so the picker never breaks.
  }

  return NextResponse.json({
    configured: Boolean(apiKey),
    live: false,
    gifs: curated(query, limit),
  });
}
