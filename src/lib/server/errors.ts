/**
 * Turns low-level PostgreSQL/runtime failures into messages a human can
 * act on, so the UI never shows a bare "no se pudo entrar".
 */
export function describeDbFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/DATABASE_URL is required/i.test(message)) {
    return "Falta la variable DATABASE_URL en el servidor (Render → Web Service → Environment).";
  }
  if (/password authentication failed|role ".*" does not exist/i.test(message)) {
    return "Las credenciales de PostgreSQL no son válidas. Revisa DATABASE_URL.";
  }
  if (/ECONNREFUSED|ENOTFOUND|getaddrinfo|ETIMEDOUT|timeout exceeded/i.test(message)) {
    return "No se pudo alcanzar el servidor de PostgreSQL. Revisa el host de DATABASE_URL.";
  }
  if (/self.signed certificate|unable to verify|certificate/i.test(message)) {
    return "Error de certificado SSL al conectar con PostgreSQL.";
  }
  if (/too many clients|remaining connection slots/i.test(message)) {
    return "La base de datos alcanzó su límite de conexiones. Intenta de nuevo en unos segundos.";
  }
  if (/does not exist/i.test(message)) {
    return "La base de datos conecta, pero falta el esquema. Vuelve a desplegar para crearlo.";
  }
  if (/read-only|permission denied/i.test(message)) {
    return "El usuario de PostgreSQL no tiene permisos para escribir.";
  }
  return "Error de base de datos.";
}
