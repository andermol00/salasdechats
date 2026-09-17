"use client";

import { AVATAR_COLORS } from "@/lib/constants";
import { generateCode, normalizeCode } from "@/lib/format";
import { useMemo, useState } from "react";

type Props = {
  initialUsername?: string;
  initialColor?: string;
  initialCode?: string;
  submitLabel?: string;
  busy?: boolean;
  error?: string | null;
  lockCode?: boolean;
  onSubmit: (input: { username: string; color: string; code: string }) => void;
};

export function JoinCard({
  initialUsername = "",
  initialColor,
  initialCode = "",
  submitLabel = "Encender sala",
  busy = false,
  error,
  lockCode = false,
  onSubmit,
}: Props) {
  const fallbackColor = useMemo(
    () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    [],
  );
  const [username, setUsername] = useState(initialUsername);
  const [color, setColor] = useState(initialColor || fallbackColor);
  const [code, setCode] = useState(initialCode);

  return (
    <form
      className="join-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          username,
          color,
          code: normalizeCode(code) || generateCode(),
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
          Código <strong>{initialCode || code}</strong>
        </p>
      ) : (
        <label className="field">
          <span>Código de sala</span>
          <div className="code-row">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="igual para todos · o déjalo vacío"
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
      )}

      <fieldset className="field">
        <legend>Color</legend>
        <div className="swatches">
          {AVATAR_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={swatch === color ? "swatch active" : "swatch"}
              style={{ background: swatch }}
              aria-label={`Color ${swatch}`}
              onClick={() => setColor(swatch)}
            />
          ))}
        </div>
      </fieldset>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-btn" type="submit" disabled={busy}>
        {busy ? "Entrando…" : submitLabel}
      </button>
    </form>
  );
}
