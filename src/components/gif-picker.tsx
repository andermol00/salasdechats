"use client";

import { GIFS } from "@/lib/gifs";

type Props = {
  onPick: (id: string) => void;
};

export function GifPicker({ onPick }: Props) {
  return (
    <div className="gif-picker">
      <p className="gif-hint">GIFs incluidos · sin API key ni conexión externa</p>
      <div className="gif-grid">
        {GIFS.map((gif) => (
          <button
            key={gif.id}
            type="button"
            className="gif-card"
            title={gif.label}
            aria-label={gif.label}
            onClick={() => onPick(gif.id)}
          >
            <img src={gif.src} alt={gif.label} loading="lazy" />
          </button>
        ))}
      </div>
      <p className="gif-hint">También puedes subir tu propio GIF con el botón 🖼️</p>
    </div>
  );
}
