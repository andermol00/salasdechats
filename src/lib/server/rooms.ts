import { db } from "@/db";
import { members, messages, rooms } from "@/db/schema";
import {
  ONLINE_MS,
  ROOM_TTL_MS,
  STALE_MEMBER_MS,
} from "@/lib/constants";
import { and, desc, eq, lt } from "drizzle-orm";
import type { MemberPayload, MessagePayload, RoomPayload } from "@/lib/types";

export async function purgeExpired() {
  const now = new Date();
  await db.delete(rooms).where(lt(rooms.expiresAt, now));
  await db.delete(members).where(lt(members.lastSeenAt, new Date(Date.now() - STALE_MEMBER_MS)));
}

export async function getActiveRoom(code: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!room) return null;
  if (room.expiresAt.getTime() <= Date.now()) {
    await db.delete(rooms).where(eq(rooms.id, room.id));
    return null;
  }
  return room;
}

export function serializeRoom(room: typeof rooms.$inferSelect): RoomPayload {
  return {
    id: room.id,
    code: room.code,
    createdAt: room.createdAt.toISOString(),
    expiresAt: room.expiresAt.toISOString(),
  };
}

export async function getOrCreateRoom(code: string) {
  const existing = await getActiveRoom(code);
  if (existing) return existing;

  const now = new Date();
  try {
    const [created] = await db
      .insert(rooms)
      .values({
        id: crypto.randomUUID(),
        code,
        createdAt: now,
        expiresAt: new Date(now.getTime() + ROOM_TTL_MS),
      })
      .returning();
    if (!created) {
      throw new Error("No se pudo crear la sala");
    }
    return created;
  } catch {
    const raced = await getActiveRoom(code);
    if (!raced) {
      throw new Error("No se pudo crear la sala");
    }
    return raced;
  }
}

export async function upsertMember(input: {
  roomId: string;
  userId: string;
  username: string;
  color: string;
}) {
  const now = new Date();
  await db
    .insert(members)
    .values({
      id: crypto.randomUUID(),
      roomId: input.roomId,
      userId: input.userId,
      username: input.username,
      color: input.color,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [members.roomId, members.userId],
      set: {
        username: input.username,
        color: input.color,
        lastSeenAt: now,
      },
    });
}

export async function listMembers(roomId: string): Promise<MemberPayload[]> {
  const rows = await db.select().from(members).where(eq(members.roomId, roomId));
  const now = Date.now();
  return rows
    .map((row) => ({
      userId: row.userId,
      username: row.username,
      color: row.color,
      lastSeenAt: row.lastSeenAt.toISOString(),
      online: now - row.lastSeenAt.getTime() <= ONLINE_MS,
    }))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username));
}

export async function listMessages(roomId: string): Promise<MessagePayload[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.roomId, roomId))
    .orderBy(desc(messages.createdAt))
    .limit(400);

  return rows
    .slice()
    .reverse()
    .map((row) => ({
      id: row.id,
      roomId: row.roomId,
      userId: row.userId,
      username: row.username,
      color: row.color,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    }));
}

export async function addMessage(input: {
  roomId: string;
  userId: string;
  username: string;
  color: string;
  content: string;
}) {
  const [row] = await db
    .insert(messages)
    .values({
      id: crypto.randomUUID(),
      roomId: input.roomId,
      userId: input.userId,
      username: input.username,
      color: input.color,
      content: input.content,
    })
    .returning();

  return {
    id: row.id,
    roomId: row.roomId,
    userId: row.userId,
    username: row.username,
    color: row.color,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  } satisfies MessagePayload;
}

export async function removeMember(roomId: string, userId: string) {
  await db
    .delete(members)
    .where(and(eq(members.roomId, roomId), eq(members.userId, userId)));
}
