"use client";

import { GIFS, searchLocalGifs } from "@/lib/gifs";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  /** Receives either a local id (e.g. `heart`) or a full `https://...` URL. */
  onPick: (idOrUrl: string) => void;
};

type OnlineGif = {
  id: string;
  title: string;
  url: string;
  preview: string;
};

type Tab = "trending" | "local";

export function GifPicker({ onPick }: Props) {
  const [tab, setTab] = useState<Tab>("trending");
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState<OnlineGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const timer = useRef<number | null>(null);

  // Debounced fetch for trending/search.
  useEffect(() => {
    if (tab !== "trending") return;
    setLoading(true);
    setError(null);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const params = new URLSearchParams({ limit: "24" });
      if (query.trim()) params.set("q", query.trim());
      fetch(`/api/gifs?${params.toString()}`)
        .then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = (await response.json()) as {
            gifs?: OnlineGif[];
            live?: boolean;
          };
          setOnline(Array.isArray(data.gifs) ? data.gifs : []);
          setLive(Boolean(data.live));
          setLoading(false);
        })
        .catch(() => {
          setError("No se pudieron cargar. Revisa tu conexión.");
          setLoading(false);
        });
    }, query.trim() ? 350 : 0);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [tab, query]);

  const local = useMemo(() => searchLocalGifs(tab === "local" ? query : ""), [tab, query]);

  return (
    <div className="gif-picker">
      <div className="gif-tabs" role="tablist" aria-label="Fuentes de GIFs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "trending"}
          className={tab === "trending" ? "gif-tab active" : "gif-tab"}
          onClick={() => setTab("trending")}
        >
          🔥 Tendencias
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "local"}
          className={tab === "local" ? "gif-tab active" : "gif-tab"}
          onClick={() => setTab("local")}
        >
          📦 Locales ({GIFS.length})
        </button>
      </div>

      <input
        className="gif-search"
        type="search"
        value={query}
        maxLength={60}
        placeholder={tab === "trending" ? "Buscar GIFs… (gato, risa, fiesta)" : "Filtrar locales…"}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Buscar GIFs"
      />

      {tab === "trending" ? (
        <>
          <p className="gif-hint">
            {loading
              ? "Cargando GIFs…"
              : error
                ? error
                : online.length === 0
                  ? query.trim()
                    ? `Sin resultados para “${query.trim()}”. Prueba con otra palabra.`
                    : "No hay GIFs disponibles ahora mismo."
                  : live
                    ? "Resultados en vivo de GIPHY"
                    : "Pack verificado · funciona sin API key"}
          </p>
          {!loading && !error && online.length > 0 ? (
            <div className="gif-grid online">
              {online.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  className="gif-card online"
                  title={gif.title}
                  aria-label={gif.title}
                  onClick={() => onPick(gif.url)}
                >
                  <img src={gif.preview || gif.url} alt={gif.title} loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
          {loading ? <div className="gif-skeleton" aria-hidden="true" /> : null}
        </>
      ) : (
        <>
          <p className="gif-hint">
            {local.length === 0
              ? `Sin resultados para “${query.trim()}”.`
              : "GIFs incluidos en la app · funcionan sin internet"}
          </p>
          <div className="gif-grid">
            {local.map((gif) => (
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
        </>
      )}

      <p className="gif-hint">También puedes pegar un enlace de GIF o subir el tuyo con 🖼️</p>
    </div>
  );
}
