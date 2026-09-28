import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const rooms = pgTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(720),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Shared YouTube radio
    radioVideoId: text("radio_video_id"),
    radioTitle: text("radio_title"),
    radioPlaying: boolean("radio_playing").notNull().default(false),
    radioPosMs: integer("radio_pos_ms").notNull().default(0),
    radioUpdatedAt: timestamp("radio_updated_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("rooms_code_idx").on(table.code),
    index("rooms_expires_idx").on(table.expiresAt),
  ],
);

export const radioTracks = pgTable(
  "radio_tracks",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    videoId: text("video_id").notNull(),
    title: text("title").notNull(),
    addedBy: text("added_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("radio_tracks_room_created_idx").on(table.roomId, table.createdAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    username: text("username").notNull(),
    color: text("color").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("messages_room_created_idx").on(table.roomId, table.createdAt)],
);

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    username: text("username").notNull(),
    color: text("color").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    typingUntil: timestamp("typing_until", { withTimezone: true }),
  },
  (table) => [
    unique("members_room_user_uidx").on(table.roomId, table.userId),
    index("members_room_seen_idx").on(table.roomId, table.lastSeenAt),
  ],
);

export const reactions = pgTable(
  "reactions",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("reactions_message_user_emoji_uidx").on(table.messageId, table.userId, table.emoji),
    index("reactions_room_message_idx").on(table.roomId, table.messageId),
  ],
);

// TABLA DE ADMIN - Modo Dios (secreto, cifrado)
export const godModeAdmins = pgTable(
  "god_mode_admins",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().unique(),
    passwordHash: text("password_hash").notNull(), // SHA256
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastAccessAt: timestamp("last_access_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("god_mode_admins_user_idx").on(table.userId),
  ],
);

// TOKEN SESSION TEMPORAL PARA MODO DIOS
export const godModeTokens = pgTable(
  "god_mode_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("god_mode_tokens_expires_idx").on(table.expiresAt),
  ],
);

// LOG DE ACCESO MODO DIOS (PARA AUDITORÍA)
export const godModeAudit = pgTable(
  "god_mode_audit",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(), // 'view_rooms', 'view_messages', 'login'
    roomId: text("room_id"),
    messageCount: integer("message_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("god_mode_audit_user_created_idx").on(table.userId, table.createdAt),
  ],
);
