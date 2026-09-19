import { REACTION_EMOJIS } from "@/lib/constants";
import { isValidCode, normalizeCode } from "@/lib/format";
import {
  getActiveRoom,
  listReactions,
  messageBelongsToRoom,
  purgeExpired,
  toggleReaction,
} from "@/lib/server/rooms";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

// Compatibility endpoint for older clients. New clients use /reactions.
export async function POST(request: Request, ctx: Ctx) {
  try {
    const { code: rawCode } = await ctx.params;
    const code = normalizeCode(rawCode);
    const body = (await request.json()) as {
      userId?: string;
      messageId?: string;
      emoji?: string;
    };
    const userId = (body.userId ?? "").trim();
    const messageId = (body.messageId ?? "").trim();
    const emoji = body.emoji ?? "";

    if (
      !isValidCode(code) ||
      !userId ||
      !messageId ||
      !(REACTION_EMOJIS as readonly string[]).includes(emoji)
    ) {
      return NextResponse.json({ error: "Reacción inválida." }, { status: 400 });
    }

    await purgeExpired();
    const room = await getActiveRoom(code);
    if (!room) {
      return NextResponse.json({ error: "La sala expiró.", expired: true }, { status: 410 });
    }
    if (!(await messageBelongsToRoom(messageId, room.id))) {
      return NextResponse.json({ error: "Mensaje no encontrado." }, { status: 404 });
    }

    await toggleReaction({ roomId: room.id, messageId, userId, emoji });
    const reactions = await listReactions(room.id, userId);
    return NextResponse.json({ reactions });
  } catch {
    return NextResponse.json({ error: "No se pudo reaccionar." }, { status: 500 });
  }
}
