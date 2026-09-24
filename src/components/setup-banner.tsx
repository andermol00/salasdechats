"use client";

import { useEffect, useState } from "react";

type HealthState =
  | { status: "checking" }
  | { status: "ready" }
  | { status: "not_configured" }
  | { status: "unreachable"; hint?: string };

export function SetupBanner() {
  const [state, setState] = useState<HealthState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const data = (await response.json()) as {
          ok?: boolean;
          database?: string;
          hint?: string;
        };
        if (cancelled) return;
        if (data.ok) {
          setState({ status: "ready" });
        } else if (data.database === "missing") {
          setState({ status: "not_configured" });
        } else {
          setState({ status: "unreachable", hint: data.hint });
        }
      } catch {
        if (!cancelled) setState({ status: "unreachable" });
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "checking" || state.status === "ready") return null;

  return (
    <div className="setup-banner" role="status">
      <div className="setup-banner-head">
        <strong>
          {state.status === "not_configured"
            ? "Falta conectar la base de datos"
            : "No se pudo conectar con la base de datos"}
        </strong>
      </div>

      {state.status === "not_configured" ? (
        <>
          <p>
            Sin PostgreSQL no se pueden guardar salas ni mensajes. Necesitas una base de
            datos y su cadena de conexión en la variable{" "}
            <code>DATABASE_URL</code>. El nombre de la base es libre: elige el que quieras.
          </p>
          <ol>
            <li>
              En Render: <strong>New + → Postgres</strong>. Name: <code>notrace-db</code>{" "}
              (la region debe ser la misma del Web Service).
            </li>
            <li>
              Cuando diga <code>Available</code>, copia su{" "}
              <strong>Internal Database URL</strong>.
            </li>
            <li>
              Ve al Web Service:{" "}
              <strong>Environment → Add Environment Variable</strong>.
            </li>
            <li>
              Key: <code>DATABASE_URL</code> · Value: la URL copiada.
            </li>
            <li>Guarda y espera el redespliegue. Recarga esta página.</li>
          </ol>
          <p className="setup-alt">
            El esquema (tablas) se crea solo en la primera visita, no hace falta
            ejecutar nada más.
          </p>
        </>
      ) : (
        <p>{state.hint ?? "Revisa la variable DATABASE_URL y que el servidor PostgreSQL esté disponible."}</p>
      )}
    </div>
  );
}
