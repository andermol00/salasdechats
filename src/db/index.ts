import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Lazy database connection.
 *
 * The connection is created on first real query instead of at import time.
 * This matters because Next.js imports route modules while collecting page
 * data during `next build`, and builds must not require runtime secrets.
 */

type DrizzleDb = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as typeof globalThis & {
  __noTracePool?: Pool;
  __noTraceDb?: DrizzleDb;
};

function readDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Add it to your environment (Render: Web Service -> Environment).",
    );
  }
  return url;
}

function needsSsl(url: string) {
  if (process.env.DATABASE_SSL === "false") return false;
  if (process.env.DATABASE_SSL === "true") return true;
  if (/sslmode=disable/.test(url)) return false;
  return !(url.includes("127.0.0.1") || url.includes("localhost"));
}

export function getPool(): Pool {
  if (globalForDb.__noTracePool) return globalForDb.__noTracePool;
  const url = readDatabaseUrl();
  const created = new Pool({
    connectionString: url,
    ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  globalForDb.__noTracePool = created;
  return created;
}

export function getDb(): DrizzleDb {
  if (globalForDb.__noTraceDb) return globalForDb.__noTraceDb;
  const created = drizzle(getPool(), { schema });
  globalForDb.__noTraceDb = created;
  return created;
}

export const db: DrizzleDb = new Proxy(function noop() {} as unknown as DrizzleDb, {
  get(_target, property) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = real[property];
    return typeof value === "function" ? value.bind(real) : value;
  },
  apply(_target, _thisArg, args: unknown[]) {
    const real = getDb() as unknown as (...a: unknown[]) => unknown;
    return real(...args);
  },
}) as DrizzleDb;

export const pool: Pool = new Proxy({} as Pool, {
  get(_target, property) {
    const real = getPool() as unknown as Record<PropertyKey, unknown>;
    const value = real[property];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}
