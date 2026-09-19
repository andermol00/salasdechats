import {
  index,
  integer,
  jsonb,
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
    durationHours: integer("duration_hours").notNull().default(24),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("rooms_code_idx").on(table.code),
    index("rooms_expires_idx").on(table.expiresAt),
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
    reactions: jsonb("reactions")
      .$type<Record<string, string[]>>()
      .notNull()
      .default({}),
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
    typingAt: timestamp("typing_at", { withTimezone: true }),
  },
  (table) => [
    unique("members_room_user_uidx").on(table.roomId, table.userId),
    index("members_room_seen_idx").on(table.roomId, table.lastSeenAt),
  ],
);
