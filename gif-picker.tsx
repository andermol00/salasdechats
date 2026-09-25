"use client";

import { GIFS } from "@/lib/gifs";
import { useEffect, useState } from "react";

type Props = {
  onPick: (id: string) => void;
};

type KlippyGif = {
  id: string;
  media: { gif: { url: string } };
};

export function GifPicker({ onPick }: Props) {
  const [klippyGifs, setKlippyGifs] = useState<KlippyGif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGifs = async () => {
      try {
        const response = await fetch(
          "https://api.klippy.com/gifs?&limit=30&sort=trending",
          {
            headers: {
              Authorization:
                "Bearer 16DShOqa3NVnGvg87PEUAXHmyjvttQwDpPSCwAD7ETnz5lJTnHcXlOvCDU9doyzU",
            },
          }
        );
        const data = await response.json();
        if (data.data) setKlippyGifs(data.data);
      } catch {
        console.error("Error fetching Klippy GIFs");
      } finally {
        setLoading(false);
      }
    };

    void fetchGifs();
  }, []);

  return (
    <div className="gif-picker">
      <p className="gif-hint">
        {loading ? "Cargando GIFs…" : "GIFs en tiempo real · Klippy API"}
      </p>
      {!loading && klippyGifs.length > 0 ? (
        <div className="gif-grid">
          {klippyGifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              className="gif-card"
              title={gif.id}
              aria-label={gif.id}
              onClick={() => onPick(`klippy:${gif.media.gif.url}`)}
            >
              <img
                src={gif.media.gif.url}
                alt={gif.id}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}
      
      {!loading ? (
        <div className="gif-grid">
          <p className="gif-hint">También disponibles GIFs locales</p>
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
      ) : null}
    </div>
  );
}
