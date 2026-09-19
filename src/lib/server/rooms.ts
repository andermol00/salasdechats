import { db } from "@/db";
import { members, messages, reactions, rooms } from "@/db/schema";
import {
  DEFAULT_ROOM_DURATION_MINUTES,
  ONLINE_MS,
  STALE_MEMBER_MS,
  TYPING_MS,
} from "@/lib/constants";
import { and, desc, eq, lt } from "drizzle-orm";
import type {
  MemberPayload,
  MessagePayload,
  ReactionPayload,
  RoomPayload,
} from "@/lib/types";

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
    durationMinutes: room.durationMinutes,
    createdAt: room.createdAt.toISOString(),
    expiresAt: room.expiresAt.toISOString(),
  };
}

export async function getOrCreateRoom(
  code: string,
  durationMinutes = DEFAULT_ROOM_DURATION_MINUTES,
) {
  const existing = await getActiveRoom(code);
  if (existing) return existing;

  const now = new Date();
  try {
    const [created] = await db
      .insert(rooms)
      .values({
        id: crypto.randomUUID(),
        code,
        durationMinutes,
        createdAt: now,
        expiresAt: new Date(now.getTime() + durationMinutes * 60_000),
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
      lastReadAt: row.lastReadAt?.toISOString() ?? null,
      online: now - row.lastSeenAt.getTime() <= ONLINE_MS,
      typing: Boolean(row.typingUntil && row.typingUntil.getTime() > now),
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

export async function listReactions(
  roomId: string,
  userId: string,
): Promise<ReactionPayload[]> {
  const rows = await db.select().from(reactions).where(eq(reactions.roomId, roomId));
  const grouped = new Map<string, ReactionPayload>();

  for (const reaction of rows) {
    const key = `${reaction.messageId}:${reaction.emoji}`;
    const current = grouped.get(key) ?? {
      messageId: reaction.messageId,
      emoji: reaction.emoji,
      count: 0,
      reactedByMe: false,
    };
    current.count += 1;
    current.reactedByMe ||= reaction.userId === userId;
    grouped.set(key, current);
  }
  return [...grouped.values()];
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

  if (!row) throw new Error("No se pudo guardar el mensaje");
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

export async function messageBelongsToRoom(messageId: string, roomId: string) {
  const [message] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.roomId, roomId)))
    .limit(1);
  return Boolean(message);
}

export async function toggleReaction(input: {
  roomId: string;
  messageId: string;
  userId: string;
  emoji: string;
}) {
  const [existing] = await db
    .select({ id: reactions.id })
    .from(reactions)
    .where(
      and(
        eq(reactions.roomId, input.roomId),
        eq(reactions.messageId, input.messageId),
        eq(reactions.userId, input.userId),
        eq(reactions.emoji, input.emoji),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(reactions).where(eq(reactions.id, existing.id));
    return false;
  }

  await db.insert(reactions).values({
    id: crypto.randomUUID(),
    roomId: input.roomId,
    messageId: input.messageId,
    userId: input.userId,
    emoji: input.emoji,
  });
  return true;
}

export async function markRead(roomId: string, userId: string) {
  await db
    .update(members)
    .set({ lastReadAt: new Date(), lastSeenAt: new Date() })
    .where(and(eq(members.roomId, roomId), eq(members.userId, userId)));
}

export async function setTyping(roomId: string, userId: string, typing: boolean) {
  const now = Date.now();
  await db
    .update(members)
    .set({
      lastSeenAt: new Date(now),
      typingUntil: new Date(typing ? now + TYPING_MS : now - 1),
    })
    .where(and(eq(members.roomId, roomId), eq(members.userId, userId)));
}

export async function removeMember(roomId: string, userId: string) {
  await db
    .delete(members)
    .where(and(eq(members.roomId, roomId), eq(members.userId, userId)));
}
