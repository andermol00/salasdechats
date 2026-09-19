import type { FontSizeId } from "./constants";

export type Settings = {
  sound: boolean;
  desktop: boolean;
  timestamps: boolean;
  readReceipts: boolean;
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
  durationHours: number;
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
  reactions: Record<string, string[]>;
  createdAt: string;
};

export type MemberPayload = {
  userId: string;
  username: string;
  color: string;
  lastSeenAt: string;
  lastReadAt: string | null;
  online: boolean;
};

export type SyncPayload = {
  room: RoomPayload;
  /** Full history on the first call, only new messages afterwards. */
  messages: MessagePayload[];
  members: MemberPayload[];
  typing: string[];
  incremental: boolean;
  serverTime: string;
};

export type ReactionUpdate = {
  messageId: string;
  reactions: Record<string, string[]>;
};

export const defaultSettings = (): Settings => ({
  sound: true,
  desktop: true,
  timestamps: true,
  readReceipts: true,
  fontSize: "md",
  enterToSend: true,
});
