import { MAX_MEDIA_LEN, MAX_MESSAGE_LEN } from "@/lib/constants";
import {
  isHexColor,
  isValidCode,
  isValidUsername,
  normalizeCode,
  sanitizeUsername,
} from "@/lib/format";
import {
  addMessage,
  getActiveRoom,
  purgeExpired,
  upsertMember,
} from "@/lib/server/rooms";
import { GIF_PREFIX, getGif } from "@/lib/gifs";
import { describeDbFailure } from "@/lib/server/errors";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

const MEDIA_PATTERN =
  /^img:(data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+|https:\/\/[^\s"']+)(\n[\s\S]*)?$/;

export async function POST(request: Request, ctx: Ctx) {
  try {
    const { code: rawCode } = await ctx.params;
    const code = normalizeCode(rawCode);
    if (!isValidCode(code)) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const body = (await request.json()) as {
      username?: string;
      color?: string;
      userId?: string;
      content?: string;
    };

    const username = sanitizeUsername(body.username ?? "");
    const color = (body.color ?? "").trim();
    const userId = (body.userId ?? "").trim();
    const content = (body.content ?? "").replace(/\s+\n/g, "\n").trim();

    if (!isValidUsername(username) || !isHexColor(color) || !userId) {
      return NextResponse.json({ error: "Sesión incompleta." }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "Escribe un mensaje." }, { status: 400 });
    }

    const isMedia = content.startsWith("img:");
    const isGif = content.startsWith(GIF_PREFIX);
    if (isMedia) {
      const newline = content.indexOf("\n");
      const caption = newline === -1 ? "" : content.slice(newline + 1);
      if (
        content.length > MAX_MEDIA_LEN ||
        caption.length > MAX_MESSAGE_LEN ||
        !MEDIA_PATTERN.test(content)
      ) {
        return NextResponse.json(
          { error: "Imagen o GIF no válido o demasiado pesado." },
          { status: 400 },
        );
      }
    } else if (isGif) {
      const newline = content.indexOf("\n");
      const id = newline === -1 ? content.slice(GIF_PREFIX.length) : content.slice(GIF_PREFIX.length, newline);
      const caption = newline === -1 ? "" : content.slice(newline + 1);
      if (!getGif(id) || caption.length > MAX_MESSAGE_LEN || content.length > MAX_MESSAGE_LEN + 32) {
        return NextResponse.json({ error: "GIF no válido." }, { status: 400 });
      }
    } else if (content.length > MAX_MESSAGE_LEN) {
      return NextResponse.json(
        { error: `Máximo ${MAX_MESSAGE_LEN} caracteres.` },
        { status: 400 },
      );
    }

    await purgeExpired();
    const room = await getActiveRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "Esta sala se apagó.", expired: true },
        { status: 410 },
      );
    }

    await upsertMember({ roomId: room.id, userId, username, color });
    const message = await addMessage({
      roomId: room.id,
      userId,
      username,
      color,
      content,
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("[api/rooms/messages] error:", error);
    return NextResponse.json(
      { error: "No se pudo enviar.", detail: describeDbFailure(error) },
      { status: 500 },
    );
  }
}
