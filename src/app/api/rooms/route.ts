import {
  DEFAULT_ROOM_DURATION_MINUTES,
  MAX_MESSAGE_LEN,
  MAX_ROOM_DURATION_MINUTES,
  MIN_ROOM_DURATION_MINUTES,
  ROOM_DURATION_OPTIONS,
} from "@/lib/constants";
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
  listReactions,
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
      durationMinutes?: number;
    };

    const username = sanitizeUsername(body.username ?? "");
    const color = (body.color ?? "").trim();
    const userId = (body.userId ?? "").trim();
    const code = normalizeCode(body.code?.trim() ? body.code : generateCode());
    const requestedDuration = Number(body.durationMinutes ?? DEFAULT_ROOM_DURATION_MINUTES);
    const durationMinutes = Math.round(requestedDuration);

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
    if (
      durationMinutes < MIN_ROOM_DURATION_MINUTES ||
      durationMinutes > MAX_ROOM_DURATION_MINUTES ||
      !ROOM_DURATION_OPTIONS.some((option) => option.minutes === durationMinutes)
    ) {
      return NextResponse.json({ error: "Duración inválida." }, { status: 400 });
    }

    await purgeExpired();
    const room = await getOrCreateRoom(code, durationMinutes);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo entrar a la sala.";
    const isDbError = /DATABASE_URL|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|password|authentication|database/i.test(
      message,
    );
    return NextResponse.json(
      {
        error: isDbError
          ? "La base de datos no está disponible. Crea una base PostgreSQL en Render y conecta DATABASE_URL."
          : "No se pudo entrar a la sala.",
        reason: message,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ maxMessageLen: MAX_MESSAGE_LEN });
}
