#!/usr/bin/env bash
set -uo pipefail

echo "==> No Trace: aplicando esquema en PostgreSQL"

attempt=1
until npx drizzle-kit push --force; do
  if [ "$attempt" -ge 3 ]; then
    echo "!! No se pudo aplicar el esquema despues de $attempt intentos"
    attempt=$((attempt + 1))
    if [ "$attempt" -gt 4 ]; then
      echo "!! Continuando sin esquema aplicado, el servidor se levantara igual"
      break
    fi
  else
    echo "-- Reintentando en 5s (intento $attempt)"
  fi
  attempt=$((attempt + 1))
  sleep 5
done

echo "==> No Trace: arrancando servidor en puerto ${PORT:-3000}"
exec npx next start -p "${PORT:-3000}"
