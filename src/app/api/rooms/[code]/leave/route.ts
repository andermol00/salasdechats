import { isValidCode, normalizeCode } from "@/lib/format";
import { getActiveRoom, purgeExpired, removeMember } from "@/lib/server/rooms";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const { code: rawCode } = await ctx.params;
    const code = normalizeCode(rawCode);
    if (!isValidCode(code)) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const body = (await request.json()) as { userId?: string };
    const userId = (body.userId ?? "").trim();
    if (!userId) {
      return NextResponse.json({ error: "Identidad inválida." }, { status: 400 });
    }

    await purgeExpired();
    const room = await getActiveRoom(code);
    if (room) {
      await removeMember(room.id, userId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo salir." }, { status: 500 });
  }
}
