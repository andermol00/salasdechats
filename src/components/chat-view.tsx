"use client";

import { Brand } from "@/components/brand";
import { JoinCard } from "@/components/join-card";
import { LinkText } from "@/components/link-text";
import { SettingsPanel } from "@/components/settings-panel";
import {
  MAX_MEDIA_LEN,
  MAX_MESSAGE_LEN,
  MAX_SYNC_FAILURES,
  QUICK_EMOJIS,
  REACTION_EMOJIS,
  SYNC_MS,
} from "@/lib/constants";
import { setUnreadBadge } from "@/lib/badge";
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
import { extractYouTube, stripYouTube } from "@/lib/youtube";
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

type GifResult = { id: string; title: string; url: string; preview: string };

const BOTTOM_TOLERANCE = 160;

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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [offline, setOffline] = useState(false);
  const [draft, setDraft] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifConfigured, setGifConfigured] = useState(true);
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [focusedTab, setFocusedTab] = useState(true);
  const [reactionFor, setReactionFor] = useState<string | null>(null);
  const [readMarker, setReadMarker] = useState<string | null>(null);
  const [pendingBelow, setPendingBelow] = useState(0);

  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const knownIds = useRef(new Set<string>());
  const primed = useRef(false);
  const identityRef = useRef<Identity | null>(null);
  const settingsRef = useRef(settings);
  const focused = useRef(true);
  const lastStamp = useRef<string | null>(null);
  const typingRef = useRef(false);

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
    window.setTimeout(() => setToast(null), 2000);
  }, []);

  /** Scrolls to the newest message only when it is safe, so the view never jumps. */
  const maybeScroll = useCallback((force = false) => {
    const node = scroller.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (!force && distance > BOTTOM_TOLERANCE) return;
    requestAnimationFrame(() => {
      node.scrollTo({ top: node.scrollHeight });
    });
  }, []);

  const applySync = useCallback(
    (data: SyncPayload, selfId: string) => {
      setRoom(data.room);
      setMembers(data.members);
      setTypingUsers(data.typing ?? []);
      setExpired(false);

      const incoming = data.messages.filter((m) => !knownIds.current.has(m.id));
      if (primed.current && incoming.length > 0) {
        const fromOthers = incoming.filter((m) => m.userId !== selfId);
        if (fromOthers.length > 0) {
          const latest = fromOthers[fromOthers.length - 1];
          const preview = latest.content.startsWith("img:")
            ? "Envió una imagen"
            : latest.content.slice(0, 90);
          if (settingsRef.current.sound) playChime();
          if (settingsRef.current.desktop) {
            desktopNotify(`${latest.username} · ${data.room.code}`, preview);
          }
          if (!focused.current) {
            setPendingBelow((count) => count + fromOthers.length);
          }
        }
      }
      for (const message of data.messages) knownIds.current.add(message.id);

      if (data.incremental) {
        if (data.messages.length > 0) {
          setMessages((prev) => [...prev, ...data.messages].slice(-400));
          lastStamp.current = data.messages[data.messages.length - 1].createdAt;
        }
      } else {
        setMessages(data.messages);
        lastStamp.current =
          data.messages.length > 0 ? data.messages[data.messages.length - 1].createdAt : null;
      }
      primed.current = true;
      maybeScroll(false);
    },
    [maybeScroll],
  );

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
        setReadMarker(data.serverTime);
        requestAnimationFrame(() => maybeScroll(true));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
        setInside(false);
        return false;
      } finally {
        setJoining(false);
      }
    },
    [applySync, maybeScroll, persistIdentity, roomCode],
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
    let timer: number | undefined;
    let failures = 0;

    async function loop() {
      const current = identityRef.current;
      if (!current?.username || cancelled) return;
      try {
        const response = await fetch(`/api/rooms/${roomCode}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: current.userId,
            username: sanitizeUsername(current.username),
            color: current.color || colorFor(current.userId),
            typing: typingRef.current,
            read: focused.current,
            since: lastStamp.current,
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
          setOffline(false);
          return;
        }
        if (!response.ok) throw new Error("sync failed");
        failures = 0;
        setOffline(false);
        applySync(data, current.userId);
        if (focused.current && data.serverTime) {
          setReadMarker((prev) => (prev === data.serverTime ? prev : data.serverTime));
        }
      } catch {
        failures += 1;
        if (failures >= MAX_SYNC_FAILURES) setOffline(true);
      } finally {
        if (!cancelled) {
          const delay = failures === 0 ? SYNC_MS : Math.min(SYNC_MS * 2 ** failures, 12_000);
          timer = window.setTimeout(loop, delay);
        }
      }
    }

    void loop();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [applySync, identity, inside, roomCode]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    function onFocus() {
      focused.current = true;
      setFocusedTab(true);
      setPendingBelow(0);
      maybeScroll(true);
    }
    function onBlur() {
      focused.current = false;
      setFocusedTab(false);
    }
    function onVisibility() {
      const visible = document.visibilityState === "visible";
      focused.current = visible;
      setFocusedTab(visible);
      if (visible) {
        setPendingBelow(0);
        maybeScroll(true);
      }
    }
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [maybeScroll]);

  const unread = useMemo(
    () =>
      readMarker
        ? messages.filter((m) => m.userId !== identity?.userId && m.createdAt > readMarker)
        : [],
    [identity?.userId, messages, readMarker],
  );
  const firstUnreadId = unread[0]?.id ?? null;

  useEffect(() => {
    const label = roomCode.toUpperCase();
    const count = focusedTab ? 0 : unread.length;
    document.title = count > 0 ? `(${count}) No Trace · ${label}` : `No Trace · ${label}`;
    void setUnreadBadge(count);
  }, [focusedTab, roomCode, unread.length]);

  function handleScroll() {
    const node = scroller.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (distance <= BOTTOM_TOLERANCE && pendingBelow > 0) setPendingBelow(0);
  }

  const remainingMs = room ? new Date(room.expiresAt).getTime() - now : 24 * 60 * 60 * 1000;
  const remainingPct = room
    ? Math.max(
        0,
        Math.min(
          100,
          ((new Date(room.expiresAt).getTime() - now) /
            Math.max(
              1,
              new Date(room.expiresAt).getTime() - new Date(room.createdAt).getTime(),
            )) *
            100,
        ),
      )
    : 100;

  const online = useMemo(() => members.filter((m) => m.online), [members]);

  const searchGifs = useCallback(
    async (query: string) => {
      setGifLoading(true);
      try {
        const response = await fetch(`/api/gifs?q=${encodeURIComponent(query)}`);
        const data = (await response.json()) as { configured?: boolean; gifs?: GifResult[] };
        setGifConfigured(data.configured !== false);
        setGifResults(data.gifs ?? []);
      } catch {
        setGifResults([]);
        showToast("No se pudieron cargar los GIFs");
      } finally {
        setGifLoading(false);
      }
    },
    [showToast],
  );

  function chooseGif(url: string) {
    if (!isAllowedImageSrc(url)) {
      showToast("Enlace de GIF no válido");
      return;
    }
    setMediaPreview(url);
    setGifOpen(false);
    showToast("GIF listo para enviar");
  }

  function handleFile(file: File | null) {
    if (!file) return;
    const isGif = file.type === "image/gif";
    if (!file.type.startsWith("image/")) {
      showToast("Solo imágenes o GIF");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result);
      if (isGif) {
        if (file.size > 500 * 1024) {
          showToast("GIF muy pesado (máx. 500 KB)");
          return;
        }
        setMediaPreview(raw);
        return;
      }
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
      image.src = raw;
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
    typingRef.current = false;
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
      maybeScroll(true);
    } finally {
      setSending(false);
    }
  }

  async function react(messageId: string, emoji: string) {
    const current = identityRef.current;
    if (!current) return;

    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId) return message;
        const reactions = { ...(message.reactions ?? {}) };
        const list = new Set(reactions[emoji] ?? []);
        if (list.has(current.userId)) list.delete(current.userId);
        else list.add(current.userId);
        if (list.size > 0) reactions[emoji] = [...list];
        else delete reactions[emoji];
        return { ...message, reactions };
      }),
    );

    try {
      const response = await fetch(`/api/rooms/${roomCode}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: current.userId, messageId, emoji }),
      });
      const data = (await response.json()) as {
        messageId?: string;
        reactions?: Record<string, string[]>;
        error?: string;
      };
      if (!response.ok || !data.messageId || !data.reactions) {
        showToast(data.error || "No se pudo reaccionar");
        return;
      }
      setMessages((prev) =>
        prev.map((message) =>
          message.id === data.messageId
            ? { ...message, reactions: data.reactions as Record<string, string[]> }
            : message,
        ),
      );
    } catch {
      showToast("No se pudo reaccionar");
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
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "No Trace", text: `Sala: ${roomCode}`, url });
        return;
      } catch {
        // cancelled, fall back to clipboard
      }
    }
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
        <Brand />
      </main>
    );
  }

  if (!inside) {
    return (
      <main className="gate">
        <div className="gate-card">
          <Brand />
          <p className="eyebrow">Sala {roomCode}</p>
          <h1>{expired ? "Esta sala expiró" : "Entra a la sala"}</h1>
          <p className="lede">
            {expired
              ? "El tiempo terminó y se borró todo. Puedes abrirla de nuevo con el mismo código."
              : "Elige tu apodo y entra. Si recargas, sigues dentro."}
          </p>
          <JoinCard
            initialUsername={identity.username}
            initialCode={roomCode}
            color={identity.color || colorFor(identity.userId)}
            lockCode
            submitLabel={expired ? "Abrir de nuevo" : "Entrar"}
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
        <button className="brand-btn" onClick={() => router.push("/")}>
          <Brand compact />
        </button>
        <div className="room-meta">
          <strong>{roomCode}</strong>
          <span>
            {formatRemaining(remainingMs)} restantes · {online.length} en línea
          </span>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => void copyInvite()} aria-label="Compartir sala">
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
        <aside className="people">
          <div className="people-head">
            <h2>En la sala</h2>
            <span className="people-count">{online.length}</span>
          </div>
          <ul>
            {members.map((member) => (
              <li key={member.userId} className={member.online ? "online" : ""}>
                <i style={{ background: member.color }}>{initials(member.username)}</i>
                <div className="who">
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
          <div className="scroller" ref={scroller} onScroll={handleScroll}>
            {messages.length === 0 ? (
              <div className="empty">
                <p>Nadie ha escrito todavía. Tu primer mensaje abre la conversación.</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const mine = message.userId === identity.userId;
                const prev = messages[index - 1];
                const stacked = Boolean(prev && prev.userId === message.userId);
                const media = splitMedia(message.content);
                const ytId = media.text ? extractYouTube(media.text) : null;
                const body = media.text ? stripYouTube(media.text) : "";
                const reactions = message.reactions ?? {};
                const read =
                  mine &&
                  settings.readReceipts &&
                  members.some(
                    (m) =>
                      m.userId !== identity.userId &&
                      m.lastReadAt !== null &&
                      new Date(m.lastReadAt).getTime() >=
                        new Date(message.createdAt).getTime(),
                  );

                return (
                  <div key={message.id} className="msg-wrap">
                    {message.id === firstUnreadId ? (
                      <div className="unread-sep">
                        <span>Mensajes no leídos</span>
                      </div>
                    ) : null}

                    <article
                      className={`bubble ${mine ? "mine" : ""} ${stacked ? "stacked" : ""}`}
                      onDoubleClick={() => void react(message.id, "❤️")}
                    >
                      {!stacked ? (
                        <header>
                          <b style={{ color: message.color }}>{message.username}</b>
                          <span className="bubble-meta">
                            {settings.timestamps ? (
                              <time>{formatClock(message.createdAt)}</time>
                            ) : null}
                            {mine ? (
                              <i className={read ? "ticks read" : "ticks"} title={read ? "Leído" : "Enviado"}>
                                {read ? "✓✓" : "✓"}
                              </i>
                            ) : null}
                          </span>
                        </header>
                      ) : (
                        <span className="bubble-side">
                          {settings.timestamps ? <time>{formatClock(message.createdAt)}</time> : null}
                          {mine ? (
                            <i className={read ? "ticks read" : "ticks"}>{read ? "✓✓" : "✓"}</i>
                          ) : null}
                        </span>
                      )}

                      {media.src ? (
                        <img
                          className="bubble-img"
                          src={media.src}
                          alt=""
                          onLoad={() => maybeScroll(false)}
                        />
                      ) : null}

                      {ytId ? (
                        <div className="yt-frame">
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`}
                            title="YouTube"
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                          />
                        </div>
                      ) : null}

                      {body ? (
                        <p>
                          <LinkText text={body} />
                        </p>
                      ) : null}

                      {Object.keys(reactions).length > 0 ? (
                        <div className="reaction-row">
                          {Object.entries(reactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              type="button"
                              className={
                                Array.isArray(users) && users.includes(identity.userId)
                                  ? "chip mine"
                                  : "chip"
                              }
                              onClick={() => void react(message.id, emoji)}
                            >
                              {emoji} <b>{users.length}</b>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        className="react-btn"
                        aria-label="Reaccionar"
                        onClick={() =>
                          setReactionFor(reactionFor === message.id ? null : message.id)
                        }
                      >
                        😊
                      </button>

                      {reactionFor === message.id ? (
                        <div className="reaction-picker">
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setReactionFor(null);
                                void react(message.id, emoji);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  </div>
                );
              })
            )}
          </div>

          {pendingBelow > 0 ? (
            <button
              type="button"
              className="jump-btn"
              onClick={() => {
                setPendingBelow(0);
                maybeScroll(true);
              }}
            >
              ↓ {pendingBelow} nuevo{pendingBelow === 1 ? "" : "s"}
            </button>
          ) : null}

          <div className="status-row">
            {offline ? <span className="conn-flag">Reconectando…</span> : null}
            {typingUsers.length > 0 ? (
              <span className="typing-flag">
                <i className="dots" aria-hidden>
                  <b />
                  <b />
                  <b />
                </i>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} está escribiendo`
                  : `${typingUsers.slice(0, 2).join(", ")} están escribiendo`}
              </span>
            ) : null}
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
                        chooseGif(gifQuery.trim());
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
                    Pega un enlace directo de GIF. Para búsquedas añade
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
              onChange={(event) => {
                setDraft(event.target.value);
                typingRef.current = event.target.value.trim().length > 0;
              }}
              onKeyDown={(event) => {
                if (settings.enterToSend && event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <div className="composer-bar">
              <small>
                {draft.length}/{MAX_MESSAGE_LEN}
              </small>
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
              permission === "granted" ? "Avisos activados" : "El navegador bloqueó los avisos",
            );
          });
        }}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}
