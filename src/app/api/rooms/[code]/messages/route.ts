import { MAX_MESSAGE_LEN } from "@/lib/constants";
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
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

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
    if (content.length > MAX_MESSAGE_LEN) {
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
  } catch {
    return NextResponse.json({ error: "No se pudo enviar." }, { status: 500 });
  }
}
