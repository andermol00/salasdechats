import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "unreachable",
        reason: error instanceof Error ? error.message : "Error desconocido",
        hint:
          "Crea una base PostgreSQL en Render, copiá la Internal Database URL y configurá DATABASE_URL en el servicio web.",
      },
      { status: 500 },
    );
  }
}
