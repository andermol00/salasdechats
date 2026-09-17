import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[migrate] DATABASE_URL no está definido. Saltando migración.");
  process.exit(0);
}

const isLocal =
  databaseUrl.includes("127.0.0.1") || databaseUrl.includes("localhost");

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

const statements = [
  `CREATE TABLE IF NOT EXISTS rooms (
    id text PRIMARY KEY,
    code text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS rooms_code_idx ON rooms (code)`,
  `CREATE INDEX IF NOT EXISTS rooms_expires_idx ON rooms (expires_at)`,
  `CREATE TABLE IF NOT EXISTS messages (
    id text PRIMARY KEY,
    room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id text NOT NULL,
    username text NOT NULL,
    color text NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS messages_room_created_idx ON messages (room_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS members (
    id text PRIMARY KEY,
    room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id text NOT NULL,
    username text NOT NULL,
    color text NOT NULL,
    last_seen_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS members_room_user_uidx ON members (room_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS members_room_seen_idx ON members (room_id, last_seen_at)`,
];

async function run() {
  const client = await pool.connect();
  try {
    for (const statement of statements) {
      await client.query(statement);
    }
    console.log("[migrate] Esquema aplicado correctamente.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("[migrate] Error aplicando el esquema:", error);
  process.exit(1);
});
