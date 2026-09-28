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
  | { action: "clear" }
  | { action: "shuffle" }
  | { action: "savePlaylist"; name: string };

type Playlist = {
  id: string;
  name: string;
  tracks: Array<{ videoId: string; title: string }>;
  createdAt: Date;
};

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
  const [minimized, setMinimized] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [volume, setVolume] = useState(70);

  const current = radio?.current ?? null;

  // Cargar playlists desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`playlists_${roomCode}`);
      if (saved) setPlaylists(JSON.parse(saved));
    } catch {}
  }, [roomCode]);

  // Guardar playlists
  useEffect(() => {
    if (playlists.length > 0) {
      localStorage.setItem(`playlists_${roomCode}`, JSON.stringify(playlists));
    }
  }, [playlists, roomCode]);

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

  const saveCurrentPlaylist = () => {
    if (!newPlaylistName.trim() || !radio?.queue.length) return;

    const newPlaylist: Playlist = {
      id: `playlist_${Date.now()}`,
      name: newPlaylistName,
      tracks: radio.queue.map((track) => ({
        videoId: track.videoId || "",
        title: track.title,
      })),
      createdAt: new Date(),
    };

    setPlaylists((prev) => [...prev, newPlaylist]);
    setNewPlaylistName("");
  };

  const loadPlaylist = (playlist: Playlist) => {
    playlist.tracks.forEach((track) => {
      onAction({ action: "add", url: `https://youtube.com/watch?v=${track.videoId}` });
    });
    setShowPlaylists(false);
  };

  const deletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  };

  // Create the player once.
  useEffect(() => {
    let disposed = false;
    void loadYoutubeApi()
      .then((YT) => {
        if (disposed || !holder.current || player.current) return;
        player.current = new YT.Player(holder.current, {
          height: "100%",
          width: "100%",
          playerVars: {
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
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

  // Follow the shared state
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

    // Aplicar volumen
    instance.setVolume?.(volume);

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
  }, [current?.videoId, radio?.playing, radio?.positionSeconds, ready, unlocked, volume]);

  // Periodic drift correction
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

  if (minimized) {
    return (
      <div className="radio-minimized">
        <button
          className="radio-restore"
          onClick={() => setMinimized(false)}
          title="Restaurar radio"
        >
          🎵 {current?.title?.substring(0, 20) || "Radio"}
        </button>
      </div>
    );
  }

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
                ? `${radio?.playing ? "Sonando" : "En pausa"} · cola ${radio?.queue.length ?? 0}`
                : "Pega un enlace de YouTube para empezar"}
            </span>
          </div>

          {/* Controles de volumen */}
          <div className="radio-volume">
            <label htmlFor="radio-vol">🔊</label>
            <input
              id="radio-vol"
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="volume-slider"
              disabled={!unlocked}
            />
            <span className="volume-value">{volume}%</span>
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
              className="icon-btn"
              type="button"
              aria-label="Mezclar"
              onClick={() => onAction({ action: "shuffle" })}
            >
              🔀
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
              className={showPlaylists ? "icon-btn active" : "icon-btn"}
              type="button"
              aria-label="Playlists"
              onClick={() => setShowPlaylists((value) => !value)}
            >
              💾 {playlists.length}
            </button>
            <button
              className="icon-btn"
              type="button"
              aria-label="Minimizar"
              onClick={() => setMinimized(true)}
            >
              ━
            </button>
            <button
              className="icon-btn"
              type="button"
              aria-label="Cerrar"
              onClick={() => onMinimize?.()}
            >
              ✕
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

      {/* Cola */}
      {showQueue ? (
        <div className="radio-queue">
          {radio && radio.queue.length > 0 ? (
            <>
              <div className="radio-queue-header">
                <h4>Cola ({radio.queue.length})</h4>
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => setShowQueue(false)}
                >
                  ✕
                </button>
              </div>
              <ul className="radio-queue-list">
                {radio.queue.map((track, idx) => (
                  <li key={track.id} className="queue-item">
                    <span className="queue-number">{idx + 1}</span>
                    <span className="queue-title">{track.title}</span>
                    <button
                      type="button"
                      className="icon-btn-sm"
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
              <button
                className="ghost-btn full"
                type="button"
                onClick={saveCurrentPlaylist}
              >
                💾 Guardar como Playlist
              </button>
              {saveCurrentPlaylist && (
                <input
                  type="text"
                  placeholder="Nombre de la playlist…"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="playlist-name-input"
                />
              )}
            </>
          ) : (
            <p className="radio-empty">La cola está vacía.</p>
          )}
        </div>
      ) : null}

      {/* Playlists */}
      {showPlaylists ? (
        <div className="radio-playlists">
          <div className="playlists-header">
            <h4>Playlists ({playlists.length})</h4>
            <button
              className="icon-btn"
              type="button"
              onClick={() => setShowPlaylists(false)}
            >
              ✕
            </button>
          </div>
          {playlists.length > 0 ? (
            <ul className="playlists-list">
              {playlists.map((playlist) => (
                <li key={playlist.id} className="playlist-item">
                  <div className="playlist-info">
                    <span className="playlist-name">{playlist.name}</span>
                    <span className="playlist-count">{playlist.tracks.length} canciones</span>
                  </div>
                  <div className="playlist-actions">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => loadPlaylist(playlist)}
                    >
                      Cargar
                    </button>
                    <button
                      type="button"
                      className="icon-btn-sm"
                      onClick={() => deletePlaylist(playlist.id)}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="radio-empty">Sin playlists guardadas.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
