"use client";

import { FlameMark } from "@/components/flame-mark";
import { JoinCard } from "@/components/join-card";
import { SettingsPanel } from "@/components/settings-panel";
import { MAX_MEDIA_LEN, MAX_MESSAGE_LEN, QUICK_EMOJIS } from "@/lib/constants";
import {
  colorFor,
  formatClock,
  formatRemaining,
  initials,
  isAllowedImageSrc,
  isValidUsername,
  normalizeCode,
  sanitizeUsername,
  splitMedia,
} from "@/lib/format";
import { desktopNotify, playChime, requestDesktopPermission } from "@/lib/notify";
import {
  clearRoomFromIdentity,
  ensureUserId,
  loadIdentity,
  loadSettings,
  saveIdentity,
  saveSettings,
} from "@/lib/session";
import type {
  Identity,
  MemberPayload,
  MessagePayload,
  RoomPayload,
  Settings,
  SyncPayload,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = { code: string };

type GifResult = {
  id: string;
  title: string;
  url: string;
  preview: string;
};

export function ChatView({ code }: Props) {
  const router = useRouter();
  const roomCode = normalizeCode(code);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [hydrated, setHydrated] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inside, setInside] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [room, setRoom] = useState<RoomPayload | null>(null);
  const [messages, setMessages] = useState<MessagePayload[]>([]);
  const [members, setMembers] = useState<MemberPayload[]>([]);
  const [draft, setDraft] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifConfigured, setGifConfigured] = useState(true);
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [unread, setUnread] = useState(0);

  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const knownIds = useRef(new Set<string>());
  const primed = useRef(false);
  const identityRef = useRef<Identity | null>(null);
  const settingsRef = useRef(settings);
  const focused = useRef(true);

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const stored = loadIdentity();
    setSettings(loadSettings());
    setIdentity(
      stored ?? {
        userId: ensureUserId(),
        username: "",
        color: colorFor(ensureUserId()),
        roomCode: null,
      },
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const persistIdentity = useCallback((next: Identity) => {
    setIdentity(next);
    saveIdentity(next);
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const searchGifs = useCallback(async (query: string) => {
    setGifLoading(true);
    try {
      const response = await fetch(`/api/gifs?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as {
        configured?: boolean;
        gifs?: GifResult[];
      };
      setGifConfigured(data.configured !== false);
      setGifResults(data.gifs ?? []);
    } catch {
      setGifResults([]);
      showToast("No se pudieron cargar los GIFs");
    } finally {
      setGifLoading(false);
    }
  }, [showToast]);

  function chooseGif(url: string) {
    if (!isAllowedImageSrc(url)) {
      showToast("Enlace de GIF no válido");
      return;
    }
    setMediaPreview(url);
    setGifOpen(false);
    showToast("GIF listo para enviar");
  }

  function useGifLink() {
    const url = gifQuery.trim();
    if (!url) return;
    chooseGif(url);
  }

  const applySync = useCallback((data: SyncPayload, selfId: string) => {
    setRoom(data.room);
    setMembers(data.members);
    setMessages(data.messages);
    setExpired(false);

    const incoming = data.messages.filter((message) => !knownIds.current.has(message.id));
    if (primed.current) {
      const fromOthers = incoming.filter((message) => message.userId !== selfId);
      if (fromOthers.length > 0) {
        const latest = fromOthers[fromOthers.length - 1];
        const preview = latest.content.startsWith("img:") ? "Envió una imagen" : latest.content;
        if (settingsRef.current.sound) playChime();
        if (settingsRef.current.desktop) {
          desktopNotify(`${latest.username} · ${data.room.code}`, preview);
        }
        if (!focused.current) {
          setUnread((count) => count + fromOthers.length);
        }
      }
    }
    for (const message of data.messages) knownIds.current.add(message.id);
    primed.current = true;
  }, []);

  const join = useCallback(
    async (input: { username: string; color: string; userId: string }) => {
      const username = sanitizeUsername(input.username);
      if (!isValidUsername(username)) {
        setError("El apodo debe tener entre 2 y 20 caracteres.");
        return false;
      }
      setJoining(true);
      setError(null);
      try {
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: input.userId,
            username,
            color: input.color,
            code: roomCode,
          }),
        });
        const data = (await response.json()) as SyncPayload & { error?: string };
        if (!response.ok) throw new Error(data.error || "No se pudo entrar.");
        persistIdentity({
          userId: input.userId,
          username,
          color: input.color,
          roomCode: data.room.code,
        });
        applySync(data, input.userId);
        setInside(true);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
        setInside(false);
        return false;
      } finally {
        setJoining(false);
      }
    },
    [applySync, persistIdentity, roomCode],
  );

  useEffect(() => {
    if (!hydrated || !identity) return;
    if (identity.username && isValidUsername(identity.username)) {
      void join({
        username: identity.username,
        color: identity.color || colorFor(identity.userId),
        userId: identity.userId,
      });
    }
    // Auto-rejoin once after hydration using the persisted nickname.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!inside || !identity) return;

    let cancelled = false;

    async function sync() {
      const current = identityRef.current;
      if (!current?.username) return;
      try {
        const response = await fetch(`/api/rooms/${roomCode}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: current.userId,
            username: sanitizeUsername(current.username),
            color: current.color || colorFor(current.userId),
          }),
        });
        const data = (await response.json()) as SyncPayload & {
          error?: string;
          expired?: boolean;
        };
        if (cancelled) return;
        if (response.status === 410 || data.expired) {
          setExpired(true);
          setInside(false);
          return;
        }
        if (!response.ok) return;
        applySync(data, current.userId);
      } catch {
        // keep last snapshot if the network blips
      }
    }

    void sync();
    const timer = window.setInterval(sync, 1400);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applySync, identity, inside, roomCode]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: primed.current ? "smooth" : "auto" });
  }, [messages.length]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    function onFocus() {
      focused.current = true;
      setUnread(0);
    }
    function onBlur() {
      focused.current = false;
    }
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", () => {
      focused.current = document.visibilityState === "visible";
      if (focused.current) setUnread(0);
    });
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    const label = roomCode.toUpperCase();
    document.title = unread > 0 ? `(${unread}) VELA · ${label}` : `VELA · ${label}`;
    return () => {
      document.title = "VELA — Chat temporal de 24 horas";
    };
  }, [roomCode, unread]);

  const remainingMs = room ? new Date(room.expiresAt).getTime() - now : ROOM_FALLBACK;
  const remainingPct = room
    ? Math.max(
        0,
        Math.min(
          100,
          ((new Date(room.expiresAt).getTime() - now) /
            (new Date(room.expiresAt).getTime() - new Date(room.createdAt).getTime())) *
            100,
        ),
      )
    : 100;

  const online = useMemo(() => members.filter((member) => member.online), [members]);

  function handleFile(file: File | null) {
    if (!file) return;
    const isGif = file.type === "image/gif";
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      showToast("Solo imágenes o GIF");
      return;
    }
    if (isGif) {
      if (file.size > 500 * 1024) {
        showToast("GIF muy pesado (máx. 500 KB)");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setMediaPreview(String(reader.result));
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 720;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        if (dataUrl.length > MAX_MEDIA_LEN) {
          showToast("Imagen muy grande, prueba otra");
          return;
        }
        setMediaPreview(dataUrl);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function send(text = draft) {
    const current = identityRef.current;
    if (!current || sending) return;
    const caption = text.trim();
    if (!caption && !mediaPreview) return;

    let content = caption;
    if (mediaPreview) {
      if (!isAllowedImageSrc(mediaPreview)) {
        showToast("Imagen no válida");
        return;
      }
      content = `img:${mediaPreview}` + (caption ? `\n${caption}` : "");
      if (content.length > MAX_MEDIA_LEN) {
        showToast("Imagen muy grande, prueba otra");
        return;
      }
    }

    setSending(true);
    setDraft("");
    setMediaPreview(null);
    try {
      const response = await fetch(`/api/rooms/${roomCode}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: current.userId,
          username: sanitizeUsername(current.username),
          color: current.color || colorFor(current.userId),
          content,
        }),
      });
      const data = (await response.json()) as {
        message?: MessagePayload;
        error?: string;
        expired?: boolean;
      };
      if (response.status === 410 || data.expired) {
        setExpired(true);
        setInside(false);
        return;
      }
      if (!response.ok || !data.message) {
        setDraft(caption);
        showToast(data.error || "No se pudo enviar");
        return;
      }
      knownIds.current.add(data.message.id);
      setMessages((prev) =>
        prev.some((item) => item.id === data.message!.id) ? prev : [...prev, data.message!],
      );
    } finally {
      setSending(false);
    }
  }

  async function leave() {
    const current = identityRef.current;
    if (current) {
      try {
        await fetch(`/api/rooms/${roomCode}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: current.userId }),
        });
      } catch {
        // ignore
      }
      clearRoomFromIdentity();
    }
    router.push("/");
  }

  async function copyInvite() {
    const url = `${window.location.origin}/sala/${roomCode}`;
    await navigator.clipboard.writeText(url);
    showToast("Enlace copiado");
  }

  function patchIdentity(patch: Partial<Identity>) {
    if (!identity) return;
    const next = {
      ...identity,
      ...patch,
      username: sanitizeUsername(patch.username ?? identity.username),
    };
    persistIdentity(next);
  }

  if (!hydrated || !identity) {
    return (
      <main className="boot">
        <FlameMark />
      </main>
    );
  }

  if (!inside) {
    return (
      <main className="gate">
        <div className="gate-card">
          <div className="brand">
            <FlameMark />
            <span>VELA</span>
          </div>
          <p className="eyebrow">Sala {roomCode}</p>
          <h1>{expired ? "Esta sala expiró" : "Entra a la sala"}</h1>
          <p className="lede">
            {expired
              ? "Pasaron 24 horas y se borró todo. Puedes encenderla de nuevo con el mismo código."
              : "Elige tu apodo y entra. Si recargas, sigues dentro."}
          </p>
          <JoinCard
            initialUsername={identity.username}
            initialCode={roomCode}
            color={identity.color || colorFor(identity.userId)}
            lockCode
            submitLabel={expired ? "Encender de nuevo" : "Entrar"}
            busy={joining}
            error={error}
            onSubmit={(input) =>
              void join({
                username: input.username,
                color: input.color,
                userId: identity.userId,
              })
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className={`chat font-${settings.fontSize}`}>
      <div className="life-bar" style={{ width: `${remainingPct}%` }} />

      <header className="chat-top">
        <button className="brand quiet" onClick={() => router.push("/")}>
          <FlameMark />
          <span>VELA</span>
        </button>
        <div className="room-meta">
          <strong>{roomCode}</strong>
          <span>
            {formatRemaining(remainingMs)} · {online.length} en línea
          </span>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => setPeopleOpen(true)} aria-label="Personas">
            👥
          </button>
          <button className="icon-btn" onClick={() => void copyInvite()} aria-label="Copiar enlace">
            🔗
          </button>
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Ajustes">
            ⚙️
          </button>
          <button className="ghost-btn" onClick={() => void leave()}>
            Salir
          </button>
        </div>
      </header>

      <div className="chat-body">
        <aside className={`people ${peopleOpen ? "open" : ""}`}>
          <div className="people-head">
            <h2>En la sala</h2>
            <button className="icon-btn mobile-only" onClick={() => setPeopleOpen(false)}>
              ✕
            </button>
          </div>
          <ul>
            {members.map((member) => (
              <li key={member.userId}>
                <i style={{ background: member.color }}>{initials(member.username)}</i>
                <div>
                  <strong>
                    {member.username}
                    {member.userId === identity.userId ? " · tú" : ""}
                  </strong>
                  <span className={member.online ? "on" : "off"}>
                    {member.online ? "en línea" : "ausente"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="thread">
          <div className="scroller" ref={scroller}>
            {messages.length === 0 ? (
              <div className="empty">
                <p>Nadie ha escrito todavía. Tu primer mensaje enciende la sala.</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const mine = message.userId === identity.userId;
                const prev = messages[index - 1];
                const stacked = prev && prev.userId === message.userId;
                const media = splitMedia(message.content);
                return (
                  <article
                    key={message.id}
                    className={`bubble ${mine ? "mine" : ""} ${stacked ? "stacked" : ""}`}
                  >
                    {!stacked ? (
                      <header>
                        <b style={{ color: message.color }}>{message.username}</b>
                        {settings.timestamps ? <time>{formatClock(message.createdAt)}</time> : null}
                      </header>
                    ) : settings.timestamps ? (
                      <time className="tiny">{formatClock(message.createdAt)}</time>
                    ) : null}
                    {media.src ? <img className="bubble-img" src={media.src} alt="" /> : null}
                    {media.text ? <p>{media.text}</p> : null}
                  </article>
                );
              })
            )}
          </div>

          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <div className="emoji-row">
              <button
                type="button"
                className="attach-btn"
                onClick={() => fileInput.current?.click()}
                aria-label="Adjuntar imagen"
              >
                🖼️
              </button>
              <button
                type="button"
                className={gifOpen ? "attach-btn active" : "attach-btn"}
                onClick={() => {
                  const next = !gifOpen;
                  setGifOpen(next);
                  if (next && gifResults.length === 0) void searchGifs("");
                }}
                aria-label="Elegir GIF"
              >
                GIF
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden-input"
                onChange={(event) => {
                  handleFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setDraft((value) => `${value}${emoji}`)}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {gifOpen ? (
              <div className="gif-picker">
                <div className="gif-search">
                  <input
                    value={gifQuery}
                    onChange={(event) => setGifQuery(event.target.value)}
                    placeholder="Busca un GIF o pega su enlace…"
                    aria-label="Buscar GIF"
                  />
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() => {
                      if (/^https:\/\//i.test(gifQuery.trim())) {
                        useGifLink();
                      } else {
                        void searchGifs(gifQuery.trim());
                      }
                    }}
                  >
                    Buscar
                  </button>
                </div>
                {!gifConfigured ? (
                  <p className="gif-hint">
                    Pega un enlace directo de GIF. Para activar la búsqueda añade
                    <code>GIPHY_API_KEY</code> en Render.
                  </p>
                ) : null}
                {gifLoading ? <p className="gif-status">Cargando GIFs…</p> : null}
                {!gifLoading && gifConfigured && gifResults.length === 0 ? (
                  <p className="gif-status">Busca algo como “hola”, “risa” o “fiesta”.</p>
                ) : null}
                {gifResults.length > 0 ? (
                  <div className="gif-grid">
                    {gifResults.map((gif) => (
                      <button
                        key={gif.id}
                        type="button"
                        className="gif-card"
                        onClick={() => chooseGif(gif.url)}
                        title={gif.title}
                      >
                        <img src={gif.preview || gif.url} alt={gif.title} loading="lazy" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {mediaPreview ? (
              <div className="media-preview">
                <img src={mediaPreview} alt="" />
                <button type="button" onClick={() => setMediaPreview(null)}>
                  Quitar
                </button>
              </div>
            ) : null}

            <textarea
              value={draft}
              maxLength={MAX_MESSAGE_LEN}
              placeholder="Escribe un mensaje…"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (settings.enterToSend && event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <div className="composer-bar">
              <small>{draft.length}/{MAX_MESSAGE_LEN}</small>
              <button
                className="primary-btn"
                disabled={sending || (!draft.trim() && !mediaPreview)}
                type="submit"
              >
                Enviar
              </button>
            </div>
          </form>
        </section>
      </div>

      {peopleOpen ? (
        <div className="drawer-backdrop mobile-only" onClick={() => setPeopleOpen(false)} />
      ) : null}

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        identity={identity}
        onClose={() => setSettingsOpen(false)}
        onSettings={setSettings}
        onIdentity={patchIdentity}
        onRequestNotifications={() => {
          void requestDesktopPermission().then((permission) => {
            showToast(
              permission === "granted"
                ? "Avisos activados"
                : "El navegador bloqueó los avisos",
            );
          });
        }}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

const ROOM_FALLBACK = 24 * 60 * 60 * 1000;
