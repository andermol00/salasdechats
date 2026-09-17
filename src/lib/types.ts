import type { FontSizeId, ThemeId } from "./constants";

export type Settings = {
  theme: ThemeId;
  sound: boolean;
  desktop: boolean;
  timestamps: boolean;
  compact: boolean;
  fontSize: FontSizeId;
  enterToSend: boolean;
};

export type Identity = {
  userId: string;
  username: string;
  color: string;
  roomCode: string | null;
};

export type Session = Identity;

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
  theme: "ember",
  sound: true,
  desktop: true,
  timestamps: true,
  compact: false,
  fontSize: "md",
  enterToSend: true,
});
