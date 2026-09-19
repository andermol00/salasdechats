import {
  isHexColor,
  isValidCode,
  isValidUsername,
  normalizeCode,
  sanitizeUsername,
} from "@/lib/format";
import {
  getActiveRoom,
  listMembers,
  listMessages,
  listReactions,
  purgeExpired,
  serializeRoom,
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
    };

    const username = sanitizeUsername(body.username ?? "");
    const color = (body.color ?? "").trim();
    const userId = (body.userId ?? "").trim();

    if (!isValidUsername(username) || !isHexColor(color) || !userId) {
      return NextResponse.json({ error: "Sesión incompleta." }, { status: 400 });
    }

    await purgeExpired();
    const room = await getActiveRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "Esta sala expiró.", expired: true },
        { status: 410 },
      );
    }

    await upsertMember({ roomId: room.id, userId, username, color });

    const [members, messages, reactions] = await Promise.all([
      listMembers(room.id),
      listMessages(room.id),
      listReactions(room.id, userId),
    ]);

    return NextResponse.json({
      room: serializeRoom(room),
      members,
      messages,
      reactions,
      serverTime: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Error al sincronizar." }, { status: 500 });
  }
}
