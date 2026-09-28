// @/app/api/god/rooms/route.ts
// Ver TODAS las salas (solo admin Modo Dios)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, messages, members, godModeTokens } from "@/db/schema";
import { eq, gt } from "drizzle-orm";

async function verifyGodToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const tokenRecord = await db
    .select()
    .from(godModeTokens)
    .where(eq(godModeTokens.token, token))
    .limit(1);

  if (tokenRecord.length === 0) return null;
  if (new Date() > tokenRecord[0].expiresAt) return null;

  return tokenRecord[0].userId;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminUserId = await verifyGodToken(authHeader);

    if (!adminUserId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener TODAS las salas (sin restricción)
    const allRooms = await db.select().from(rooms);

    const roomsWithStats = await Promise.all(
      allRooms.map(async (room) => {
        const messageCount = await db
          .select()
          .from(messages)
          .where(eq(messages.roomId, room.id));

        const memberCount = await db
          .select()
          .from(members)
          .where(eq(members.roomId, room.id));

        return {
          id: room.id,
          code: room.code.toUpperCase(),
          createdAt: room.createdAt,
          expiresAt: room.expiresAt,
          messageCount: messageCount.length,
          memberCount: memberCount.length,
          radioActive: !!room.radioVideoId,
          radioTitle: room.radioTitle,
        };
      })
    );

    return NextResponse.json({
      total: roomsWithStats.length,
      rooms: roomsWithStats.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error("[GOD ROOMS ERROR]", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
