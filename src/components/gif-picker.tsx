"use client";

import { GIFS } from "@/lib/gifs";
import { useState } from "react";

type Props = {
  onPick: (id: string) => void;
  onUpload: () => void;
  onDirectLink: (url: string) => void;
};

export function GifPicker({ onPick, onUpload, onDirectLink }: Props) {
  const [query, setQuery] = useState("");
  const [link, setLink] = useState("");
  const filtered = GIFS.filter((gif) =>
    `${gif.label} ${gif.tags}`.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")),
  );

  return (
    <section className="gif-picker" aria-label="Selector de GIFs">
      <div className="gif-picker-head">
        <strong>GIFs animados</strong>
        <span>Incluidos · sin API</span>
      </div>
      <input
        className="gif-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar hola, risa, fiesta…"
        aria-label="Buscar GIFs"
      />
      <div className="gif-grid">
        {filtered.length === 0 ? <p className="gif-empty">No hay resultados. Prueba otra palabra.</p> : null}
        {filtered.map((gif) => (
          <button
            type="button"
            key={gif.id}
            className="gif-card"
            onClick={() => onPick(gif.id)}
            aria-label={`Enviar GIF ${gif.label}`}
            title={`Enviar ${gif.label}`}
          >
            <img src={gif.src} alt="" width={224} height={144} loading="lazy" />
            <span>{gif.label}</span>
          </button>
        ))}
      </div>
      <div className="gif-picker-foot">
        <button className="ghost-btn" type="button" onClick={onUpload}>
          ↑ Subir un GIF
        </button>
        <div className="gif-link">
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            maxLength={500}
            placeholder="O pega un enlace .gif"
            aria-label="Enlace directo a GIF"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (link.trim()) onDirectLink(link.trim());
              }
            }}
          />
          <button className="ghost-btn" type="button" onClick={() => onDirectLink(link.trim())} disabled={!link.trim()}>
            Usar
          </button>
        </div>
      </div>
    </section>
  );
}
