import { isValidCode, normalizeCode } from "@/lib/format";
import { fetchYoutubeTitle, parseYoutubeId } from "@/lib/youtube";
import { getActiveRoom, purgeExpired } from "@/lib/server/rooms";
import {
  addTrack,
  clearQueue,
  getRadio,
  nextTrack,
  pauseRadio,
  playRadio,
  removeTrack,
  seekRadio,
} from "@/lib/server/radio";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

type Body = {
  action?: "add" | "play" | "pause" | "next" | "seek" | "remove" | "clear";
  userId?: string;
  url?: string;
  videoId?: string;
  trackId?: string;
  positionSeconds?: number;
  expectVideoId?: string;
};

export async function POST(request: Request, ctx: Ctx) {
  try {
    const { code: rawCode } = await ctx.params;
    const code = normalizeCode(rawCode);
    if (!isValidCode(code)) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const body = (await request.json()) as Body;
    const userId = (body.userId ?? "").trim();
    if (!userId) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 400 });
    }

    await purgeExpired();
    const room = await getActiveRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "Esta sala expiró.", expired: true },
        { status: 410 },
      );
    }

    switch (body.action) {
      case "add": {
        const videoId =
          parseYoutubeId(body.url ?? "") ?? parseYoutubeId(body.videoId ?? "");
        if (!videoId) {
          return NextResponse.json(
            { error: "Enlace de YouTube no válido." },
            { status: 400 },
          );
        }
        const title =
          (await fetchYoutubeTitle(videoId)) ?? "Video de YouTube";
        await addTrack({ roomId: room.id, videoId, title, addedBy: userId });
        break;
      }
      case "play":
        await playRadio(room.id, body.positionSeconds);
        break;
      case "pause":
        await pauseRadio(room.id);
        break;
      case "seek":
        if (typeof body.positionSeconds !== "number") {
          return NextResponse.json({ error: "Posición inválida." }, { status: 400 });
        }
        await seekRadio(room.id, body.positionSeconds);
        break;
      case "next":
        await nextTrack(room.id, body.expectVideoId);
        break;
      case "remove":
        if (!body.trackId) {
          return NextResponse.json({ error: "Pista inválida." }, { status: 400 });
        }
        await removeTrack(room.id, body.trackId);
        break;
      case "clear":
        await clearQueue(room.id);
        break;
      default:
        return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
    }

    const radio = await getRadio(room.id);
    return NextResponse.json({ radio });
  } catch (error) {
    console.error("[api/rooms/radio] error:", error);
    return NextResponse.json({ error: "No se pudo actualizar la radio." }, { status: 500 });
  }
}
