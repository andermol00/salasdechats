import { MAX_MESSAGE_LEN } from "@/lib/constants";
import {
  generateCode,
  isHexColor,
  isValidCode,
  isValidUsername,
  normalizeCode,
  sanitizeUsername,
} from "@/lib/format";
import {
  getOrCreateRoom,
  listMembers,
  listMessages,
  purgeExpired,
  serializeRoom,
  upsertMember,
} from "@/lib/server/rooms";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      username?: string;
      color?: string;
      userId?: string;
    };

    const username = sanitizeUsername(body.username ?? "");
    const color = (body.color ?? "").trim();
    const userId = (body.userId ?? "").trim();
    const code = normalizeCode(body.code?.trim() ? body.code : generateCode());

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: "El apodo debe tener entre 2 y 20 caracteres." },
        { status: 400 },
      );
    }
    if (!isHexColor(color)) {
      return NextResponse.json({ error: "Color inválido." }, { status: 400 });
    }
    if (!userId || userId.length > 80) {
      return NextResponse.json({ error: "Identidad inválida." }, { status: 400 });
    }
    if (!isValidCode(code)) {
      return NextResponse.json(
        { error: "El código debe tener 3-24 letras, números o guiones." },
        { status: 400 },
      );
    }

    await purgeExpired();
    const room = await getOrCreateRoom(code);
    await upsertMember({ roomId: room.id, userId, username, color });

    const [members, messages] = await Promise.all([
      listMembers(room.id),
      listMessages(room.id),
    ]);

    return NextResponse.json({
      room: serializeRoom(room),
      members,
      messages,
      serverTime: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo entrar a la sala." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ maxMessageLen: MAX_MESSAGE_LEN });
}
