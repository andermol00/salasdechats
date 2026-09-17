import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_QUERY = 40;
const MAX_LIMIT = 18;

type GiphyItem = {
  id?: string;
  title?: string;
  images?: {
    fixed_width?: { url?: string; width?: string; height?: string };
    preview_gif?: { url?: string };
  };
};

function safeQuery(value: string | null) {
  return (value ?? "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, MAX_QUERY);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = safeQuery(searchParams.get("q"));
  const limit = Math.min(Number(searchParams.get("limit") ?? 18) || 18, MAX_LIMIT);
  const apiKey = process.env.GIPHY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ configured: false, gifs: [] });
  }

  const endpoint = query ? "search" : "trending";
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: String(limit),
    rating: "pg-13",
    lang: "es",
  });
  if (query) params.set("q", query);

  try {
    const response = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      return NextResponse.json({ configured: true, gifs: [] }, { status: 502 });
    }

    const payload = (await response.json()) as { data?: GiphyItem[] };
    const gifs = (payload.data ?? [])
      .map((item) => ({
        id: item.id ?? crypto.randomUUID(),
        title: item.title ?? "GIF",
        url: item.images?.fixed_width?.url ?? "",
        preview: item.images?.preview_gif?.url ?? item.images?.fixed_width?.url ?? "",
      }))
      .filter((gif) => /^https:\/\/[^\s"']+\.gif(\?[^\s"']*)?$/i.test(gif.url));

    return NextResponse.json({ configured: true, gifs });
  } catch {
    return NextResponse.json({ configured: true, gifs: [] }, { status: 502 });
  }
}
