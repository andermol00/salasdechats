import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const raw =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

const isLocal = raw.includes("127.0.0.1") || raw.includes("localhost");

// Render (and most hosted Postgres) require SSL. `no-verify` avoids
// self-signed certificate errors while keeping the connection encrypted.
const url =
  isLocal || raw.includes("sslmode=")
    ? raw
    : `${raw}${raw.includes("?") ? "&" : "?"}sslmode=no-verify`;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url },
});
