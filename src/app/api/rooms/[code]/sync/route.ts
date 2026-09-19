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
  listMessagesSince,
  listTyping,
  markRead,
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
      typing?: boolean;
      read?: boolean;
      since?: string | null;
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

    await upsertMember({
      roomId: room.id,
      userId,
      username,
      color,
      typing: body.typing === true,
    });

    const serverTime = new Date().toISOString();
    if (body.read === true) {
      await markRead(room.id, userId);
    }

    const since = body.since ? new Date(body.since) : null;
    const incremental =
      since !== null && !Number.isNaN(since.getTime()) && since.getTime() > 0;

    const [members, messages, typing] = await Promise.all([
      listMembers(room.id),
      incremental ? listMessagesSince(room.id, since as Date) : listMessages(room.id),
      listTyping(room.id, userId),
    ]);

    return NextResponse.json({
      room: serializeRoom(room),
      members,
      messages,
      typing,
      incremental,
      serverTime,
    });
  } catch {
    return NextResponse.json({ error: "Error al sincronizar." }, { status: 500 });
  }
}
