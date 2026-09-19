import { db } from "@/db";
import { members, messages, rooms } from "@/db/schema";
import {
  DEFAULT_DURATION_HOURS,
  MAX_DURATION_HOURS,
  MIN_DURATION_HOURS,
  ONLINE_MS,
  STALE_MEMBER_MS,
  TYPING_MS,
} from "@/lib/constants";
import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import type {
  MemberPayload,
  MessagePayload,
  ReactionUpdate,
  RoomPayload,
} from "@/lib/types";

function clampHours(hours: number) {
  if (!Number.isFinite(hours)) return DEFAULT_DURATION_HOURS;
  return Math.min(MAX_DURATION_HOURS, Math.max(MIN_DURATION_HOURS, Math.round(hours)));
}

export async function purgeExpired() {
  const now = new Date();
  await db.delete(rooms).where(lt(rooms.expiresAt, now));
  await db
    .delete(members)
    .where(lt(members.lastSeenAt, new Date(Date.now() - STALE_MEMBER_MS)));
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
    durationHours: room.durationHours,
    createdAt: room.createdAt.toISOString(),
    expiresAt: room.expiresAt.toISOString(),
  };
}

export async function getOrCreateRoom(code: string, durationHours = DEFAULT_DURATION_HOURS) {
  const existing = await getActiveRoom(code);
  if (existing) return existing;

  const now = new Date();
  const hours = clampHours(durationHours);
  try {
    const [created] = await db
      .insert(rooms)
      .values({
        id: crypto.randomUUID(),
        code,
        durationHours: hours,
        createdAt: now,
        expiresAt: new Date(now.getTime() + hours * 60 * 60 * 1000),
      })
      .returning();
    if (!created) throw new Error("No se pudo crear la sala");
    return created;
  } catch {
    const raced = await getActiveRoom(code);
    if (!raced) throw new Error("No se pudo crear la sala");
    return raced;
  }
}

export async function upsertMember(input: {
  roomId: string;
  userId: string;
  username: string;
  color: string;
  typing?: boolean;
}) {
  const now = new Date();
  const typingAt = input.typing ? now : null;
  await db
    .insert(members)
    .values({
      id: crypto.randomUUID(),
      roomId: input.roomId,
      userId: input.userId,
      username: input.username,
      color: input.color,
      lastSeenAt: now,
      typingAt,
    })
    .onConflictDoUpdate({
      target: [members.roomId, members.userId],
      set: {
        username: input.username,
        color: input.color,
        lastSeenAt: now,
        typingAt,
      },
    });
}

export async function markRead(roomId: string, userId: string) {
  await db
    .update(members)
    .set({ lastReadAt: new Date() })
    .where(and(eq(members.roomId, roomId), eq(members.userId, userId)));
}

/** Usernames typing in the last few seconds, excluding the caller. */
export async function listTyping(roomId: string, selfId: string) {
  const rows = await db.select().from(members).where(eq(members.roomId, roomId));
  const cutoff = Date.now() - TYPING_MS;
  return rows
    .filter(
      (row) =>
        row.userId !== selfId &&
        row.typingAt !== null &&
        row.typingAt.getTime() > cutoff,
    )
    .map((row) => row.username)
    .slice(0, 6);
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
      lastReadAt: row.lastReadAt ? row.lastReadAt.toISOString() : null,
      online: now - row.lastSeenAt.getTime() <= ONLINE_MS,
    }))
    .sort(
      (a, b) =>
        Number(b.online) - Number(a.online) || a.username.localeCompare(b.username),
    );
}

function toPayload(row: typeof messages.$inferSelect): MessagePayload {
  return {
    id: row.id,
    roomId: row.roomId,
    userId: row.userId,
    username: row.username,
    color: row.color,
    content: row.content,
    reactions: row.reactions ?? {},
    createdAt: row.createdAt.toISOString(),
  };
}

/** Only the messages newer than `since`, oldest first. Keeps sync payloads tiny. */
export async function listMessagesSince(roomId: string, since: Date) {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.roomId, roomId), gt(messages.createdAt, since)))
    .orderBy(asc(messages.createdAt))
    .limit(200);
  return rows.map(toPayload);
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
    .map(toPayload);
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
      reactions: {},
    })
    .returning();

  if (!row) throw new Error("No se pudo guardar el mensaje");
  return toPayload(row);
}

export async function toggleReaction(
  roomId: string,
  messageId: string,
  userId: string,
  emoji: string,
): Promise<ReactionUpdate | null> {
  const [row] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.roomId, roomId)))
    .limit(1);
  if (!row) return null;

  const current = row.reactions ?? {};
  const list = new Set(current[emoji] ?? []);
  if (list.has(userId)) list.delete(userId);
  else list.add(userId);

  const next: Record<string, string[]> = {};
  for (const [key, users] of Object.entries(current)) {
    if (key === emoji) continue;
    next[key] = users;
  }
  if (list.size > 0) next[emoji] = [...list];

  await db.update(messages).set({ reactions: next }).where(eq(messages.id, messageId));
  return { messageId, reactions: next };
}

export async function removeMember(roomId: string, userId: string) {
  await db
    .delete(members)
    .where(and(eq(members.roomId, roomId), eq(members.userId, userId)));
}
