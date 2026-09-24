import { db } from "@/db";
import { radioTracks, rooms } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { RadioPayload, RadioTrack } from "@/lib/types";

type RoomRow = typeof rooms.$inferSelect;

function toTrack(row: typeof radioTracks.$inferSelect): RadioTrack {
  return {
    id: row.id,
    videoId: row.videoId,
    title: row.title,
    addedBy: row.addedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Current playback position, derived from the stored base + elapsed time. */
function positionMs(room: RoomRow, now: number) {
  const base = room.radioPosMs ?? 0;
  if (!room.radioPlaying) return base;
  const updated = room.radioUpdatedAt?.getTime() ?? now;
  return base + Math.max(0, now - updated);
}

export async function currentRoom(roomId: string): Promise<RoomRow | null> {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  return room ?? null;
}

export async function getRadio(roomId: string): Promise<RadioPayload> {
  const now = Date.now();
  const [room, queue] = await Promise.all([
    currentRoom(roomId),
    db
      .select()
      .from(radioTracks)
      .where(eq(radioTracks.roomId, roomId))
      .orderBy(asc(radioTracks.createdAt)),
  ]);

  const current: RadioTrack | null =
    room?.radioVideoId && room.radioTitle
      ? {
          id: "current",
          videoId: room.radioVideoId,
          title: room.radioTitle,
          addedBy: "",
          createdAt: (room.radioUpdatedAt ?? room.createdAt).toISOString(),
        }
      : null;

  return {
    current,
    queue: queue.map(toTrack),
    playing: Boolean(room?.radioPlaying && room.radioVideoId),
    positionSeconds: room ? Math.max(0, positionMs(room, now) / 1000) : 0,
    updatedAt: room?.radioUpdatedAt?.toISOString() ?? null,
    serverTime: new Date(now).toISOString(),
  };
}

async function setCurrent(
  roomId: string,
  track: { videoId: string; title: string } | null,
  playing: boolean,
  posMs = 0,
) {
  await db
    .update(rooms)
    .set({
      radioVideoId: track?.videoId ?? null,
      radioTitle: track?.title ?? null,
      radioPlaying: track ? playing : false,
      radioPosMs: Math.max(0, Math.round(posMs)),
      radioUpdatedAt: new Date(),
    })
    .where(eq(rooms.id, roomId));
}

export async function addTrack(input: {
  roomId: string;
  videoId: string;
  title: string;
  addedBy: string;
}) {
  const room = await currentRoom(input.roomId);
  if (!room) return;

  // Nothing playing and queue empty: start immediately.
  if (!room.radioVideoId) {
    await setCurrent(input.roomId, { videoId: input.videoId, title: input.title }, true, 0);
    return;
  }

  await db.insert(radioTracks).values({
    id: crypto.randomUUID(),
    roomId: input.roomId,
    videoId: input.videoId,
    title: input.title,
    addedBy: input.addedBy,
  });
}

export async function playRadio(roomId: string, positionSeconds?: number) {
  const room = await currentRoom(roomId);
  if (!room?.radioVideoId) return;
  const posMs =
    positionSeconds !== undefined && Number.isFinite(positionSeconds)
      ? Math.max(0, positionSeconds * 1000)
      : positionMs(room, Date.now());
  await setCurrent(roomId, { videoId: room.radioVideoId, title: room.radioTitle ?? "" }, true, posMs);
}

export async function pauseRadio(roomId: string) {
  const room = await currentRoom(roomId);
  if (!room?.radioVideoId) return;
  await setCurrent(
    roomId,
    { videoId: room.radioVideoId, title: room.radioTitle ?? "" },
    false,
    positionMs(room, Date.now()),
  );
}

export async function seekRadio(roomId: string, positionSeconds: number) {
  const room = await currentRoom(roomId);
  if (!room?.radioVideoId) return;
  await setCurrent(
    roomId,
    { videoId: room.radioVideoId, title: room.radioTitle ?? "" },
    room.radioPlaying,
    Math.max(0, positionSeconds * 1000),
  );
}

/**
 * Moves to the next queued track. `expectVideoId` makes the call idempotent
 * when several clients react to the same "video ended" event.
 */
export async function nextTrack(roomId: string, expectVideoId?: string) {
  const room = await currentRoom(roomId);
  if (!room) return;
  if (expectVideoId && room.radioVideoId && room.radioVideoId !== expectVideoId) return;

  const [queued] = await db
    .select()
    .from(radioTracks)
    .where(eq(radioTracks.roomId, roomId))
    .orderBy(asc(radioTracks.createdAt))
    .limit(1);

  if (!queued) {
    await setCurrent(roomId, null, false, 0);
    return;
  }

  await setCurrent(roomId, { videoId: queued.videoId, title: queued.title }, true, 0);
  await db.delete(radioTracks).where(eq(radioTracks.id, queued.id));
}

export async function removeTrack(roomId: string, trackId: string) {
  await db
    .delete(radioTracks)
    .where(eq(radioTracks.id, trackId));
}

export async function clearQueue(roomId: string) {
  await db.delete(radioTracks).where(eq(radioTracks.roomId, roomId));
}
