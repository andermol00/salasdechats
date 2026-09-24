"use client";

import { loadYoutubeApi, type YTPlayer } from "@/lib/youtube-client";
import type { RadioPayload } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

export type RadioAction =
  | { action: "add"; url: string }
  | { action: "play"; positionSeconds?: number }
  | { action: "pause" }
  | { action: "next"; expectVideoId?: string }
  | { action: "remove"; trackId: string }
  | { action: "clear" };

type Props = {
  radio: RadioPayload | null;
  roomCode: string;
  onAction: (action: RadioAction) => void;
  onMinimize?: () => void;
};

const DRIFT_LIMIT = 4;

export function RadioPanel({ radio, roomCode, onAction, onMinimize }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const loadedVideo = useRef<string | null>(null);
  const syncAt = useRef<{ at: number; seconds: number; playing: boolean }>({
    at: Date.now(),
    seconds: 0,
    playing: false,
  });
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [url, setUrl] = useState("");
  const [showQueue, setShowQueue] = useState(false);

  const current = radio?.current ?? null;

  useEffect(() => {
    if (radio) {
      syncAt.current = {
        at: Date.now(),
        seconds: radio.positionSeconds,
        playing: radio.playing,
      };
    }
  }, [radio]);

  function expectedSeconds() {
    const { at, seconds, playing } = syncAt.current;
    if (!playing) return seconds;
    return seconds + (Date.now() - at) / 1000;
  }

  // Create the player once.
  useEffect(() => {
    let disposed = false;
    void loadYoutubeApi()
      .then((YT) => {
        if (disposed || !holder.current || player.current) return;
        player.current = new YT.Player(holder.current, {
          height: "100%",
          width: "100%",
          playerVars: { controls: 1, modestbranding: 1, rel: 0, playsinline: 1 },
          events: {
            onReady: () => setReady(true),
            onStateChange: (event: { data: number }) => {
              const state = window.YT?.PlayerState;
              if (!state || event.data !== state.ENDED) return;
              const ended = loadedVideo.current;
              onAction({ action: "next", expectVideoId: ended ?? undefined });
            },
          },
        });
      })
      .catch(() => setReady(false));
    return () => {
      disposed = true;
      player.current?.destroy?.();
      player.current = null;
      loadedVideo.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the shared state: load track, play/pause and fix drift.
  useEffect(() => {
    const instance = player.current;
    if (!ready || !instance || !radio) return;

    if (!current) {
      if (loadedVideo.current) {
        instance.pauseVideo();
        loadedVideo.current = null;
      }
      return;
    }

    if (loadedVideo.current !== current.videoId) {
      loadedVideo.current = current.videoId;
      instance.loadVideoById({
        videoId: current.videoId,
        startSeconds: Math.max(0, radio.positionSeconds),
      });
    }

    if (!unlocked) {
      instance.pauseVideo();
      return;
    }

    const want = expectedSeconds();
    if (radio.playing) {
      instance.playVideo();
      const actual = instance.getCurrentTime?.() ?? 0;
      if (Math.abs(actual - want) > DRIFT_LIMIT) instance.seekTo(want, true);
    } else {
      instance.pauseVideo();
      if (Math.abs((instance.getCurrentTime?.() ?? 0) - want) > DRIFT_LIMIT) {
        instance.seekTo(want, true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.videoId, radio?.playing, radio?.positionSeconds, ready, unlocked]);

  // Periodic drift correction so everyone stays on the same second.
  useEffect(() => {
    if (!ready || !unlocked || !current || !radio?.playing) return;
    const timer = window.setInterval(() => {
      const instance = player.current;
      if (!instance) return;
      const want = expectedSeconds();
      const actual = instance.getCurrentTime?.() ?? 0;
      if (Math.abs(actual - want) > DRIFT_LIMIT) instance.seekTo(want, true);
    }, 4000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, unlocked, current?.videoId, radio?.playing]);

  return (
    <section className="radio">
      <div className="radio-main">
        <div className="radio-stage">
          <div className="radio-holder" ref={holder} />
          {!unlocked ? (
            <button className="radio-unlock" type="button" onClick={() => setUnlocked(true)}>
              <strong>▶ Escuchar</strong>
              <small>Igual para todos</small>
            </button>
          ) : null}
        </div>

        <div className="radio-info">
          <div className="radio-title">
            <strong>{current ? current.title : "Nada suena todavía"}</strong>
            <span>
              {current
                ? `${radio?.playing ? "Sonando" : "En pausa"} · cola ${
                    radio?.queue.length ?? 0
                  }`
                : "Pega un enlace de YouTube para empezar"}
            </span>
          </div>

          <div className="radio-controls">
            <button
              className="icon-btn"
              type="button"
              aria-label={radio?.playing ? "Pausar" : "Reproducir"}
              disabled={!current}
              onClick={() =>
                onAction(
                  radio?.playing
                    ? { action: "pause" }
                    : { action: "play", positionSeconds: expectedSeconds() },
                )
              }
            >
              {radio?.playing ? "❚❚" : "▶"}
            </button>
            <button
              className="icon-btn"
              type="button"
              aria-label="Siguiente"
              onClick={() => onAction({ action: "next", expectVideoId: current?.videoId })}
            >
              ⏭
            </button>
            <button
              className={showQueue ? "icon-btn active" : "icon-btn"}
              type="button"
              aria-label="Ver cola"
              onClick={() => setShowQueue((value) => !value)}
            >
              ☰ {radio?.queue.length ?? 0}
            </button>
            <button
              className="icon-btn"
              type="button"
              aria-label="Minimizar radio"
              onClick={() => onMinimize?.()}
            >
              ⌄
            </button>
          </div>

          <div className="radio-add">
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Enlace de YouTube…"
              aria-label="Añadir canción"
            />
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                if (!url.trim()) return;
                onAction({ action: "add", url: url.trim() });
                setUrl("");
              }}
            >
              Añadir
            </button>
          </div>
        </div>
      </div>

      {showQueue ? (
        <div className="radio-queue">
          {radio && radio.queue.length > 0 ? (
            <>
              <ul>
                {radio.queue.map((track) => (
                  <li key={track.id}>
                    <span>{track.title}</span>
                    <button
                      type="button"
                      aria-label="Quitar"
                      onClick={() => onAction({ action: "remove", trackId: track.id })}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <button
                className="ghost-btn full"
                type="button"
                onClick={() => onAction({ action: "clear" })}
              >
                Vaciar cola
              </button>
            </>
          ) : (
            <p className="radio-empty">La cola está vacía.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
