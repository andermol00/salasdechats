import { REACTION_EMOJIS } from "@/lib/constants";
import { isValidCode, normalizeCode } from "@/lib/format";
import { allow } from "@/lib/server/rate-limit";
import { getActiveRoom, purgeExpired, toggleReaction } from "@/lib/server/rooms";
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
      userId?: string;
      messageId?: string;
      emoji?: string;
    };

    const userId = (body.userId ?? "").trim();
    const messageId = (body.messageId ?? "").trim();
    const emoji = (body.emoji ?? "").trim();

    if (!userId || !messageId) {
      return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
    }
    if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
      return NextResponse.json({ error: "Reacción no permitida." }, { status: 400 });
    }
    if (!allow(`react:${userId}`, 30, 10_000)) {
      return NextResponse.json({ error: "Vas muy rápido." }, { status: 429 });
    }

    await purgeExpired();
    const room = await getActiveRoom(code);
    if (!room) {
      return NextResponse.json({ error: "La sala expiró.", expired: true }, { status: 410 });
    }

    const update = await toggleReaction(room.id, messageId, userId, emoji);
    if (!update) {
      return NextResponse.json({ error: "Mensaje no encontrado." }, { status: 404 });
    }

    return NextResponse.json(update);
  } catch {
    return NextResponse.json({ error: "No se pudo reaccionar." }, { status: 500 });
  }
}
