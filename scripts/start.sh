#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "=========================================================="
  echo " ERROR: falta la variable DATABASE_URL"
  echo "=========================================================="
  echo " En Render:"
  echo "   1. Abre tu Web Service -> Environment"
  echo "   2. Add Environment Variable"
  echo "   3. Key:   DATABASE_URL"
  echo "   4. Value: Internal Database URL de tu PostgreSQL"
  echo ""
  echo " Tambien puedes enlazarla desde tu base de datos en"
  echo " Render con 'Connect' -> 'Link existing database'."
  echo "=========================================================="
  exit 1
fi

echo "==> No Trace: aplicando esquema en PostgreSQL"

attempt=1
until npx drizzle-kit push --force; do
  if [ "$attempt" -ge 3 ]; then
    echo "!! No se pudo aplicar el esquema despues de $attempt intentos"
    exit 1
  fi
  echo "-- Reintentando en 5s (intento $attempt)"
  attempt=$((attempt + 1))
  sleep 5
done

echo "==> No Trace: esquema listo, arrancando servidor en puerto ${PORT}"
exec npx next start -p "${PORT}"
