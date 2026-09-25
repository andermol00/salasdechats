import { sql } from "drizzle-orm";
import { getDb } from "./index";

/**
 * Idempotent schema bootstrap.
 *
 * Runs the same DDL that `drizzle-kit push` would produce, but at runtime,
 * once per process. This makes the app self-healing: even if the host's
 * start command is not `scripts/start.sh`, the tables get created on the
 * first request instead of failing with "relation does not exist".
 */

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "rooms" (
     "id" text PRIMARY KEY NOT NULL,
     "code" text NOT NULL,
     "duration_minutes" integer DEFAULT 720 NOT NULL,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL,
     "expires_at" timestamp with time zone NOT NULL
   )`,
  `ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "duration_minutes" integer DEFAULT 720 NOT NULL`,
  `ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "radio_video_id" text`,
  `ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "radio_title" text`,
  `ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "radio_playing" boolean DEFAULT false NOT NULL`,
  `ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "radio_pos_ms" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "radio_updated_at" timestamp with time zone`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "rooms_code_idx" ON "rooms" ("code")`,
  `CREATE INDEX IF NOT EXISTS "rooms_expires_idx" ON "rooms" ("expires_at")`,

  `CREATE TABLE IF NOT EXISTS "radio_tracks" (
     "id" text PRIMARY KEY NOT NULL,
     "room_id" text NOT NULL,
     "video_id" text NOT NULL,
     "title" text NOT NULL,
     "added_by" text NOT NULL,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS "radio_tracks_room_created_idx" ON "radio_tracks" ("room_id","created_at")`,
  `ALTER TABLE "radio_tracks" DROP CONSTRAINT IF EXISTS "radio_tracks_room_id_fk"`,
  `ALTER TABLE "radio_tracks" ADD CONSTRAINT "radio_tracks_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE`,

  `CREATE TABLE IF NOT EXISTS "messages" (
     "id" text PRIMARY KEY NOT NULL,
     "room_id" text NOT NULL,
     "user_id" text NOT NULL,
     "username" text NOT NULL,
     "color" text NOT NULL,
     "content" text NOT NULL,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS "messages_room_created_idx" ON "messages" ("room_id","created_at")`,

  `CREATE TABLE IF NOT EXISTS "members" (
     "id" text PRIMARY KEY NOT NULL,
     "room_id" text NOT NULL,
     "user_id" text NOT NULL,
     "username" text NOT NULL,
     "color" text NOT NULL,
     "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
     "last_read_at" timestamp with time zone,
     "typing_until" timestamp with time zone
   )`,
  `ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "last_read_at" timestamp with time zone`,
  `ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "typing_until" timestamp with time zone`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "members_room_user_idx" ON "members" ("room_id","user_id")`,
  `CREATE INDEX IF NOT EXISTS "members_room_seen_idx" ON "members" ("room_id","last_seen_at")`,

  `CREATE TABLE IF NOT EXISTS "reactions" (
     "id" text PRIMARY KEY NOT NULL,
     "room_id" text NOT NULL,
     "message_id" text NOT NULL,
     "user_id" text NOT NULL,
     "emoji" text NOT NULL,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "reactions_message_user_emoji_idx" ON "reactions" ("message_id","user_id","emoji")`,
  `CREATE INDEX IF NOT EXISTS "reactions_room_message_idx" ON "reactions" ("room_id","message_id")`,

  // Foreign keys added separately so existing tables keep working.
  `ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_room_id_fk"`,
  `ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE`,
  `ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_room_id_fk"`,
  `ALTER TABLE "members" ADD CONSTRAINT "members_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE`,
  `ALTER TABLE "reactions" DROP CONSTRAINT IF EXISTS "reactions_room_id_fk"`,
  `ALTER TABLE "reactions" ADD CONSTRAINT "reactions_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE`,
  `ALTER TABLE "reactions" DROP CONSTRAINT IF EXISTS "reactions_message_id_fk"`,
  `ALTER TABLE "reactions" ADD CONSTRAINT "reactions_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE`,
];

const REVALIDATE_MS = 30_000;

const globalForSchema = globalThis as typeof globalThis & {
  __noTraceSchemaReady?: Promise<void>;
  __noTraceSchemaCheckedAt?: number;
};

async function run() {
  const db = getDb();
  for (const statement of STATEMENTS) {
    try {
      await db.execute(sql.raw(statement));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Ignore "already exists" style races, surface anything else.
      if (/already exists|duplicate/i.test(message)) continue;
      throw error;
    }
  }
}

export function ensureSchema(): Promise<void> {
  const fresh =
    globalForSchema.__noTraceSchemaCheckedAt !== undefined &&
    Date.now() - globalForSchema.__noTraceSchemaCheckedAt < REVALIDATE_MS;

  if (fresh && globalForSchema.__noTraceSchemaReady) {
    return globalForSchema.__noTraceSchemaReady;
  }

  if (!globalForSchema.__noTraceSchemaReady) {
    globalForSchema.__noTraceSchemaReady = (async () => {
      // Always run the DDL: every statement is IF NOT EXISTS / ADD COLUMN
      // IF NOT EXISTS, so it is cheap when the schema is already in place
      // and it heals partial schemas (missing tables or columns).
      await run();
    })().then(
      () => {
        globalForSchema.__noTraceSchemaCheckedAt = Date.now();
      },
      (error) => {
        globalForSchema.__noTraceSchemaReady = undefined;
        globalForSchema.__noTraceSchemaCheckedAt = undefined;
        throw error;
      },
    );
  }

  return globalForSchema.__noTraceSchemaReady;
}
