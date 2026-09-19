"use client";

import { Brand } from "@/components/brand";
import { JoinCard } from "@/components/join-card";
import { colorFor, isValidUsername, sanitizeUsername } from "@/lib/format";
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
    setIdentity(loadIdentity());
    saveSettings(loadSettings());
    setReady(true);
  }, []);

  async function enter(input: {
    username: string;
    color: string;
    code: string;
    durationHours: number;
  }) {
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
          durationHours: input.durationHours,
        }),
      });
      const data = (await response.json()) as SyncPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo entrar.");
      saveIdentity({
        userId,
        username,
        color: input.color,
        roomCode: data.room.code,
      });
      router.push(`/sala/${data.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <main className="boot">
        <Brand />
      </main>
    );
  }

  const userId = identity?.userId || "";
  const color = identity?.color || colorFor(userId || "notrace");

  return (
    <main className="landing">
      <header className="landing-top">
        <Brand />
      </header>

      <section className="landing-main">
        <div className="landing-copy">
          <h1>Salas temporales de 24 horas</h1>
        </div>

        <div className="landing-panel">
          {identity?.roomCode ? (
            <button
              className="resume-chip"
              onClick={() => router.push(`/sala/${identity.roomCode}`)}
            >
              Volver a tu sala <strong>{identity.roomCode}</strong>
            </button>
          ) : null}

          <JoinCard
            initialUsername={identity?.username ?? ""}
            initialCode={prefill || identity?.roomCode || ""}
            color={color}
            busy={busy}
            error={error}
            onSubmit={enter}
          />
        </div>
      </section>
    </main>
  );
}
