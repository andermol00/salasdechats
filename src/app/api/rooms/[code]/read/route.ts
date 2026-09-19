import { isValidCode, normalizeCode } from "@/lib/format";
import { getActiveRoom, markRead, purgeExpired } from "@/lib/server/rooms";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const { code: rawCode } = await ctx.params;
    const code = normalizeCode(rawCode);
    const body = (await request.json()) as { userId?: string };
    const userId = (body.userId ?? "").trim();
    if (!isValidCode(code) || !userId) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 400 });
    }

    await purgeExpired();
    const room = await getActiveRoom(code);
    if (!room) {
      return NextResponse.json({ error: "La sala expiró.", expired: true }, { status: 410 });
    }
    await markRead(room.id, userId);
    return NextResponse.json({ ok: true, readAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "No se pudo registrar la lectura." }, { status: 500 });
  }
}
