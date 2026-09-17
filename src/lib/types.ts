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
  online: boolean;
};

export type SyncPayload = {
  room: RoomPayload;
  messages: MessagePayload[];
  members: MemberPayload[];
  serverTime: string;
};

export const defaultSettings = (): Settings => ({
  sound: true,
  desktop: true,
  timestamps: true,
  fontSize: "md",
  enterToSend: true,
});
