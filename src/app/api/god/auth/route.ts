// @/app/api/god/auth/route.ts
// ENDPOINT SECRETO - Modo Dios
// Acceso: POST /api/god/auth
// CONTRASEÑA: R29kIE1vZGU= (Base64 de "God Mode")

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { godModeAdmins, godModeTokens, godModeAudit } from "@/db/schema";
import { eq } from "drizzle-orm";

// CONTRASEÑA HARDCODED (en producción, usar variable de entorno)
// Contraseña: R29kIE1vZGU= (Base64)
const ADMIN_PASSWORD_HASH = crypto
  .createHash("sha256")
  .update(Buffer.from("R29kIE1vZGU=", "base64").toString())
  .digest("hex");

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, username } = body;

    // Validar contraseña
    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Contraseña inválida" },
        { status: 401 }
      );
    }

    const passwordHash = hashPassword(password);

    // Verificar contraseña maestra
    if (passwordHash !== ADMIN_PASSWORD_HASH) {
      // Log fallido (opcional, para auditoría)
      return NextResponse.json(
        { error: "Acceso denegado" },
        { status: 401 }
      );
    }

    // Generar usuario admin si no existe
    const adminUsername = username || `admin_${Date.now()}`;
    const adminUserId = `god_${crypto.randomBytes(8).toString("hex")}`;

    // Buscar admin existente o crear uno nuevo
    let admin = await db
      .select()
      .from(godModeAdmins)
      .where(eq(godModeAdmins.userId, adminUserId))
      .limit(1);

    if (admin.length === 0) {
      await db.insert(godModeAdmins).values({
        id: crypto.randomUUID(),
        userId: adminUserId,
        passwordHash: ADMIN_PASSWORD_HASH,
        createdAt: new Date(),
      });
    }

    // Generar token de sesión (válido por 8 horas)
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await db.insert(godModeTokens).values({
      id: crypto.randomUUID(),
      userId: adminUserId,
      token,
      createdAt: new Date(),
      expiresAt,
    });

    // Log de acceso
    await db.insert(godModeAudit).values({
      id: crypto.randomUUID(),
      userId: adminUserId,
      action: "login",
      createdAt: new Date(),
    });

    // Actualizar last access
    await db
      .update(godModeAdmins)
      .set({ lastAccessAt: new Date() })
      .where(eq(godModeAdmins.userId, adminUserId));

    return NextResponse.json({
      success: true,
      token,
      expiresAt,
      userId: adminUserId,
      // No devolver detalles sensibles
    });
  } catch (error) {
    console.error("[GOD MODE AUTH ERROR]", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}

// GET para verificar si el token es válido (mantener secreto)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Buscar token
    const tokenRecord = await db
      .select()
      .from(godModeTokens)
      .where(eq(godModeTokens.token, token))
      .limit(1);

    if (tokenRecord.length === 0) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 401 }
      );
    }

    const record = tokenRecord[0];

    // Verificar expiración
    if (new Date() > record.expiresAt) {
      return NextResponse.json(
        { error: "Token expirado" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      userId: record.userId,
      expiresAt: record.expiresAt,
    });
  } catch (error) {
    console.error("[GOD MODE VERIFY ERROR]", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
