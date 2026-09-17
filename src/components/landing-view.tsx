"use client";

import { FlameMark } from "@/components/flame-mark";
import { JoinCard } from "@/components/join-card";
import { isValidUsername, sanitizeUsername } from "@/lib/format";
import {
  ensureUserId,
  loadIdentity,
  loadSettings,
  saveIdentity,
  saveSettings,
} from "@/lib/session";
import type { Identity, SyncPayload } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function LandingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefill = (searchParams.get("sala") || searchParams.get("room") || "").trim();

  useEffect(() => {
    const stored = loadIdentity();
    setIdentity(stored);
    const settings = loadSettings();
    document.documentElement.setAttribute("data-theme", settings.theme);
    setReady(true);
  }, []);

  async function enter(input: { username: string; color: string; code: string }) {
    const username = sanitizeUsername(input.username);
    if (!isValidUsername(username)) {
      setError("El apodo debe tener entre 2 y 20 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const userId = identity?.userId || ensureUserId();
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username,
          color: input.color,
          code: input.code,
        }),
      });
      const data = (await response.json()) as SyncPayload & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "No se pudo entrar.");
      }
      const next: Identity = {
        userId,
        username,
        color: input.color,
        roomCode: data.room.code,
      };
      saveIdentity(next);
      saveSettings(loadSettings());
      router.push(`/sala/${data.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <main className="boot">
        <FlameMark />
        <p>Encendiendo VELA…</p>
      </main>
    );
  }

  return (
    <main className="landing">
      <div className="landing-media" aria-hidden>
        <img src="/images/hero.jpg" alt="" />
        <div className="landing-veil" />
      </div>

      <header className="topbar landing-top">
        <div className="brand">
          <FlameMark />
          <span>VELA</span>
        </div>
        <p className="top-note">Sin cuentas · 24 horas · cero archivo</p>
      </header>

      <section className="landing-copy">
        <p className="eyebrow">Mensajería que se apaga sola</p>
        <h1>
          Habla ahora.
          <em> Mañana no queda rastro.</em>
        </h1>
        <p className="lede">
          Enciende una sala con un código compartido. Quien escriba el mismo código entra
          al mismo fuego. A las 24 horas, todo se extingue.
        </p>
      </section>

      <div className="landing-panel">
        {identity?.roomCode ? (
          <button
            className="resume-chip"
            onClick={() => router.push(`/sala/${identity.roomCode}`)}
          >
            Seguir en la sala <strong>{identity.roomCode}</strong>
          </button>
        ) : null}

        <JoinCard
          initialUsername={identity?.username ?? ""}
          initialColor={identity?.color}
          initialCode={prefill || identity?.roomCode || ""}
          busy={busy}
          error={error}
          onSubmit={enter}
        />

        <ul className="landing-points">
          <li>Recarga la página y sigues dentro.</li>
          <li>Avisos sonoros y del sistema.</li>
          <li>Temas, tamaño y presencia a tu medida.</li>
        </ul>
      </div>
    </main>
  );
}
