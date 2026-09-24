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
  expanded: boolean;
  onToggle: () => void;
  onAction: (action: RadioAction) => void;
};

const DRIFT_LIMIT = 4;

export function RadioPanel({ radio, roomCode, expanded, onToggle, onAction }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const loadedVideo = useRef<string | null>(null);
  const actionRef = useRef(onAction);
  actionRef.current = onAction;
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
    return playing ? seconds + (Date.now() - at) / 1000 : seconds;
  }

  // This component remains mounted when the panel is minimized. Never destroy
  // the iframe simply because the user wants to see more of the conversation.
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
            onReady: () => {
              if (!disposed) setReady(true);
            },
            onStateChange: (event: { data: number }) => {
              if (event.data !== window.YT?.PlayerState.ENDED) return;
              const ended = loadedVideo.current;
              if (ended) actionRef.current({ action: "next", expectVideoId: ended });
            },
          },
        });
      })
      .catch(() => {
        if (!disposed) setReady(false);
      });
    return () => {
      disposed = true;
      player.current?.destroy?.();
      player.current = null;
      loadedVideo.current = null;
    };
  }, []);

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
    } else {
      instance.pauseVideo();
    }
    const actual = instance.getCurrentTime?.() ?? 0;
    if (Math.abs(actual - want) > DRIFT_LIMIT) instance.seekTo(want, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.videoId, radio?.playing, radio?.positionSeconds, ready, unlocked]);

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

  function addUrl() {
    if (!url.trim()) return;
    onAction({ action: "add", url: url.trim() });
    setUrl("");
  }

  return (
    <div className="radio-widget">
      <button
        type="button"
        className={expanded ? "radio-trigger active" : "radio-trigger"}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="radio-popover"
        aria-label={expanded ? "Minimizar radio" : "Abrir radio de la sala"}
        title={current ? current.title : "Radio de la sala"}
      >
        <span aria-hidden="true">♫</span>
        {current ? <span className="radio-trigger-title">{current.title}</span> : null}
        {radio?.playing && current ? <i className="radio-live-dot" /> : null}
      </button>

      <section
        id="radio-popover"
        className={expanded ? "radio-popover open" : "radio-popover minimized"}
        aria-hidden={!expanded}
        inert={!expanded}
        aria-label="Radio compartida"
      >
        <header className="radio-popover-head">
          <div>
            <strong>♫ Radio compartida</strong>
            <span>Sala {roomCode.toUpperCase()}</span>
          </div>
          <button
            type="button"
            className="radio-collapse"
            onClick={onToggle}
            aria-label="Minimizar radio"
            title="Minimizar sin pausar"
          >
            −
          </button>
        </header>

        <div className="radio-stage">
          <div className="radio-holder" ref={holder} />
          {!unlocked ? (
            <button
              className="radio-unlock"
              type="button"
              onClick={() => {
                setUnlocked(true);
                // Directly call playVideo within the user's gesture so browser
                // autoplay policies do not prevent the first playback.
                if (radio?.playing) player.current?.playVideo();
              }}
            >
              <strong>▶ Escuchar</strong>
              <small>La música va al mismo tiempo para todos</small>
            </button>
          ) : null}
        </div>

        <div className="radio-now">
          <div className="radio-title">
            <strong>{current ? current.title : "Nada suena todavía"}</strong>
            <span>
              {current
                ? `${radio?.playing ? "Sonando" : "En pausa"} · ${radio?.queue.length ?? 0} en cola`
                : "Añade una canción para comenzar"}
            </span>
          </div>
          <div className="radio-controls">
            <button
              className="icon-btn"
              type="button"
              aria-label={radio?.playing ? "Pausar para todos" : "Reproducir para todos"}
              title={radio?.playing ? "Pausar" : "Reproducir"}
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
              aria-label="Siguiente canción"
              title="Siguiente"
              disabled={!current && !radio?.queue.length}
              onClick={() => onAction({ action: "next", expectVideoId: current?.videoId })}
            >
              ⏭
            </button>
            <button
              className={showQueue ? "icon-btn active" : "icon-btn"}
              type="button"
              aria-label="Mostrar cola"
              title="Cola de canciones"
              onClick={() => setShowQueue((value) => !value)}
            >
              ☰
            </button>
          </div>
        </div>

        <form
          className="radio-add"
          onSubmit={(event) => {
            event.preventDefault();
            addUrl();
          }}
        >
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Pega un enlace de YouTube…"
            aria-label="Añadir canción de YouTube"
          />
          <button className="ghost-btn" type="submit" disabled={!url.trim()}>
            Añadir
          </button>
        </form>

        {showQueue ? (
          <div className="radio-queue">
            {radio && radio.queue.length > 0 ? (
              <>
                <ul>
                  {radio.queue.map((track) => (
                    <li key={track.id}>
                      <span title={track.title}>{track.title}</span>
                      <button
                        type="button"
                        aria-label={`Quitar ${track.title}`}
                        onClick={() => onAction({ action: "remove", trackId: track.id })}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
                <button className="ghost-btn full" type="button" onClick={() => onAction({ action: "clear" })}>
                  Vaciar cola
                </button>
              </>
            ) : (
              <p className="radio-empty">La cola está vacía.</p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
