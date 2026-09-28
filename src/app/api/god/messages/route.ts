// @/app/api/god/messages/route.ts
// Ver TODOS los mensajes de cualquier sala (sin restricción)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, godModeTokens, godModeAudit, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

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

    // Parámetros opcionales
    const url = new URL(request.url);
    const roomId = url.searchParams.get("roomId");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "500"), 1000);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = db.select().from(messages);

    if (roomId) {
      // Ver mensajes de una sala específica
      query = query.where(eq(messages.roomId, roomId));

      // Log de auditoría
      await db.insert(godModeAudit).values({
        id: crypto.randomUUID(),
        userId: adminUserId,
        action: "view_messages",
        roomId,
        messageCount: undefined,
        createdAt: new Date(),
      });
    } else {
      // Ver todos los mensajes de todas las salas
      await db.insert(godModeAudit).values({
        id: crypto.randomUUID(),
        userId: adminUserId,
        action: "view_all_messages",
        createdAt: new Date(),
      });
    }

    const allMessages = await query.orderBy(messages.createdAt);
    const paginated = allMessages.slice(offset, offset + limit);

    return NextResponse.json({
      total: allMessages.length,
      count: paginated.length,
      offset,
      limit,
      messages: paginated.map((msg) => ({
        id: msg.id,
        roomId: msg.roomId,
        userId: msg.userId,
        username: msg.username,
        color: msg.color,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    console.error("[GOD MESSAGES ERROR]", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}

// POST - Ver mensajes con filtros avanzados
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminUserId = await verifyGodToken(authHeader);

    if (!adminUserId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      roomId,
      userId,
      username,
      searchText,
      limit = 500,
      offset = 0,
    } = body;

    let query = db.select().from(messages);

    if (roomId) query = query.where(eq(messages.roomId, roomId));
    if (userId) query = query.where(eq(messages.userId, userId));
    if (username) {
      const allMsgs = await query;
      return NextResponse.json({
        messages: allMsgs.filter((m) =>
          m.username.toLowerCase().includes(username.toLowerCase())
        ),
      });
    }

    const allMessages = await query.orderBy(messages.createdAt);

    const filtered = searchText
      ? allMessages.filter((m) =>
          m.content.toLowerCase().includes(searchText.toLowerCase())
        )
      : allMessages;

    const paginated = filtered.slice(offset, Math.min(offset + limit, filtered.length));

    // Audit log
    await db.insert(godModeAudit).values({
      id: crypto.randomUUID(),
      userId: adminUserId,
      action: "search_messages",
      messageCount: filtered.length,
      createdAt: new Date(),
    });

    return NextResponse.json({
      total: filtered.length,
      count: paginated.length,
      messages: paginated,
    });
  } catch (error) {
    console.error("[GOD MESSAGES POST ERROR]", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
