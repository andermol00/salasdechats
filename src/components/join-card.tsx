"use client";

import {
  DEFAULT_DURATION_HOURS,
  ROOM_DURATIONS,
} from "@/lib/constants";
import { generateCode, normalizeCode } from "@/lib/format";
import { useState } from "react";

type Props = {
  initialUsername?: string;
  initialCode?: string;
  color: string;
  submitLabel?: string;
  busy?: boolean;
  error?: string | null;
  lockCode?: boolean;
  onSubmit: (input: {
    username: string;
    color: string;
    code: string;
    durationHours: number;
  }) => void;
};

export function JoinCard({
  initialUsername = "",
  initialCode = "",
  color,
  submitLabel = "Crear sala",
  busy = false,
  error,
  lockCode = false,
  onSubmit,
}: Props) {
  const [username, setUsername] = useState(initialUsername);
  const [code, setCode] = useState(initialCode);
  const [durationHours, setDurationHours] = useState<number>(DEFAULT_DURATION_HOURS);

  return (
    <form
      className="join-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          username,
          color,
          code: normalizeCode(code) || generateCode(),
          durationHours,
        });
      }}
    >
      <label className="field">
        <span>Apodo</span>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Cómo te verán"
          maxLength={20}
          autoComplete="nickname"
          required
          minLength={2}
        />
      </label>

      {lockCode ? (
        <p className="code-lock">
          Sala <strong>{initialCode || code}</strong>
        </p>
      ) : (
        <>
          <label className="field">
            <span>Código de sala</span>
            <div className="code-row">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Déjalo vacío para crear una nueva"
                maxLength={24}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setCode(generateCode())}
              >
                Azar
              </button>
            </div>
          </label>

          <div className="field">
            <span>La sala se borra en</span>
            <div className="duration-row" role="radiogroup" aria-label="Duración de la sala">
              {ROOM_DURATIONS.map((option) => (
                <button
                  key={option.hours}
                  type="button"
                  role="radio"
                  aria-checked={durationHours === option.hours}
                  className={
                    durationHours === option.hours ? "mini-chip active" : "mini-chip"
                  }
                  onClick={() => setDurationHours(option.hours)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-btn" type="submit" disabled={busy}>
        {busy ? "Entrando…" : submitLabel}
      </button>
    </form>
  );
}
