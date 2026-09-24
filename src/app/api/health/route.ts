import { db, isDatabaseConfigured } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { describeDbFailure } from "@/lib/server/errors";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return Response.json(
      {
        ok: false,
        database: "missing",
        hint: "Falta DATABASE_URL. En Render: crea una PostgreSQL, copia la Internal Database URL y añádela en Web Service → Environment.",
      },
      { status: 503 },
    );
  }

  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: "unreachable",
        hint: describeDbFailure(error),
      },
      { status: 500 },
    );
  }

  try {
    await ensureSchema();
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: "no_schema",
        hint: describeDbFailure(error),
      },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    database: "connected",
    schema: "ready",
    app: "no-trace",
  });
}
