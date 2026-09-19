import { isValidCode, normalizeCode } from "@/lib/format";
import { getActiveRoom, purgeExpired, setTyping } from "@/lib/server/rooms";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const { code: rawCode } = await ctx.params;
    const code = normalizeCode(rawCode);
    const body = (await request.json()) as { userId?: string; typing?: boolean };
    const userId = (body.userId ?? "").trim();
    if (!isValidCode(code) || !userId) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 400 });
    }

    await purgeExpired();
    const room = await getActiveRoom(code);
    if (!room) {
      return NextResponse.json({ error: "La sala expiró.", expired: true }, { status: 410 });
    }
    await setTyping(room.id, userId, Boolean(body.typing));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar escritura." }, { status: 500 });
  }
}
