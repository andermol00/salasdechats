#!/usr/bin/env bash
set -euo pipefail

echo "==> VELA: aplicando esquema en PostgreSQL"

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

echo "==> VELA: esquema listo, arrancando servidor en puerto ${PORT:-3000}"
exec npx next start -p "${PORT:-3000}"
