import type { FontSizeId } from "./constants";

export type Settings = {
  sound: boolean;
  desktop: boolean;
  timestamps: boolean;
  fontSize: FontSizeId;
  enterToSend: boolean;
};

export type Identity = {
  userId: string;
  username: string;
  color: string;
  roomCode: string | null;
};

export type RoomPayload = {
  id: string;
  code: string;
  durationMinutes: number;
  createdAt: string;
  expiresAt: string;
};

export type MessagePayload = {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  color: string;
  content: string;
  createdAt: string;
};

export type MemberPayload = {
  userId: string;
  username: string;
  color: string;
  lastSeenAt: string;
  lastReadAt: string | null;
  online: boolean;
  typing: boolean;
};

export type ReactionPayload = {
  messageId: string;
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type RadioTrack = {
  id: string;
  videoId: string;
  title: string;
  addedBy: string;
  createdAt: string;
};

export type RadioPayload = {
  current: RadioTrack | null;
  queue: RadioTrack[];
  playing: boolean;
  /** Playback position in seconds, already computed for `serverTime`. */
  positionSeconds: number;
  updatedAt: string | null;
  serverTime: string;
};

export type SyncPayload = {
  room: RoomPayload;
  messages: MessagePayload[];
  members: MemberPayload[];
  reactions: ReactionPayload[];
  radio: RadioPayload;
  serverTime: string;
};

export const defaultSettings = (): Settings => ({
  sound: true,
  desktop: true,
  timestamps: true,
  fontSize: "md",
  enterToSend: true,
});
