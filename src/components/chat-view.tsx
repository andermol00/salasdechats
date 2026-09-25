"use client";

import { NoTraceBrand } from "@/components/no-trace-brand";
import { JoinCard } from "@/components/join-card";
import { SettingsPanel } from "@/components/settings-panel";
import {
  MAX_MEDIA_LEN,
  MAX_MESSAGE_LEN,
  QUICK_EMOJIS,
  REACTION_EMOJIS,
} from "@/lib/constants";
import {
  colorFor,
  extractBareImageUrl,
  formatClock,
  formatRemaining,
  getYoutubeEmbed,
  initials,
  isAllowedImageSrc,
  isValidUsername,
  normalizeCode,
  sanitizeUsername,
  splitMedia,
} from "@/lib/format";
import { RadioPanel, type RadioAction } from "@/components/radio-panel";
import { GifPicker } from "@/components/gif-picker";
import { LinkText } from "@/components/link-text";
import { PipChat } from "@/components/pip-chat";
import { GIF_PREFIX, getGif, isRemoteGifUrl, parseGif } from "@/lib/gifs";
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
  RadioPayload,
  ReactionPayload,
  RoomPayload,
  Settings,
  SyncPayload,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type DocumentPictureInPicture = {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  window: Window | null;
};

type Props = { code: string };



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
  const [reactions, setReactions] = useState<ReactionPayload[]>([]);
  const [draft, setDraft] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [radioOpen, setRadioOpen] = useState(false);
  const [radio, setRadio] = useState<RadioPayload | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [unread, setUnread] = useState(0);

  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const knownIds = useRef(new Set<string>());
  const primed = useRef(false);
  const identityRef = useRef<Identity | null>(null);
  const settingsRef = useRef(settings);
  const focused = useRef(true);
  const atBottom = useRef(true);
  const hasScrolledInitial = useRef(false);
  const lastReadSentAt = useRef(0);
  const lastTypingSentAt = useRef(0);
  const typingTimeout = useRef<number | null>(null);

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

  const applySync = useCallback((data: SyncPayload, selfId: string) => {
    setRoom(data.room);
    setMembers(data.members);
    setMessages(data.messages);
    setReactions(data.reactions ?? []);
    if (data.radio) setRadio(data.radio);
    setExpired(false);

    const incoming = data.messages.filter((message) => !knownIds.current.has(message.id));
    if (primed.current) {
      const fromOthers = incoming.filter((message) => message.userId !== selfId);
      if (fromOthers.length > 0) {
        const latest = fromOthers[fromOthers.length - 1];
        const preview = latest.content.startsWith("img:")
          ? "Envió una imagen"
          : latest.content.startsWith(GIF_PREFIX)
            ? "Envió un GIF"
            : latest.content;
        if (settingsRef.current.sound) playChime();
        if (settingsRef.current.desktop) {
          desktopNotify(`${latest.username} · ${data.room.code}`, preview);
        }
        if (!focused.current || !atBottom.current) {
          setUnread((count) => count + fromOthers.length);
        }
      }
    }
    for (const message of data.messages) knownIds.current.add(message.id);
    primed.current = true;
  }, []);

  const markRoomRead = useCallback(async () => {
    const current = identityRef.current;
    if (!current || Date.now() - lastReadSentAt.current < 1800) return;
    lastReadSentAt.current = Date.now();
    try {
      await fetch(`/api/rooms/${roomCode}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: current.userId }),
      });
    } catch {
      // A later sync retries the read receipt.
    }
  }, [roomCode]);

  const sendTyping = useCallback((typing: boolean) => {
    const current = identityRef.current;
    if (!current) return;
    const now = Date.now();
    if (typing && now - lastTypingSentAt.current < 900) return;
    lastTypingSentAt.current = now;
    void fetch(`/api/rooms/${roomCode}/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: current.userId, typing }),
    });
  }, [roomCode]);

  function handleDraftChange(value: string) {
    setDraft(value);
    if (!value.trim()) {
      sendTyping(false);
      return;
    }
    sendTyping(true);
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
    typingTimeout.current = window.setTimeout(() => sendTyping(false), 3000);
  }

  async function reactToMessage(messageId: string, emoji: string) {
    const current = identityRef.current;
    if (!current) return;
    try {
      const response = await fetch(`/api/rooms/${roomCode}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: current.userId, messageId, emoji }),
      });
      const data = (await response.json()) as {
        reactions?: ReactionPayload[];
        expired?: boolean;
      };
      if (data.expired) {
        setExpired(true);
        setInside(false);
        return;
      }
      if (response.ok && data.reactions) setReactions(data.reactions);
    } catch {
      showToast("No se pudo guardar la reacción");
    }
  }

  const join = useCallback(
    async (input: {
      username: string;
      color: string;
      userId: string;
      durationMinutes?: number;
    }) => {
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
            durationMinutes: input.durationMinutes,
          }),
        });
        const data = (await response.json()) as SyncPayload & {
          error?: string;
          detail?: string;
        };
        if (!response.ok) throw new Error(data.detail || data.error || "No se pudo entrar.");
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
        if (!response.ok) {
          if (response.status >= 500) {
            setServerError(
              (data as { detail?: string }).detail ||
                data.error ||
                "El servidor no pudo sincronizar la sala.",
            );
          }
          return;
        }
        setServerError(null);
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
    if (!node || (!atBottom.current && hasScrolledInitial.current)) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: hasScrolledInitial.current ? "smooth" : "auto",
    });
    hasScrolledInitial.current = true;
    if (document.visibilityState === "visible") {
      setUnread(0);
      void markRoomRead();
    }
  }, [markRoomRead, messages.length]);

  function handleThreadScroll() {
    const node = scroller.current;
    if (!node) return;
    atBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 42;
    if (atBottom.current && document.visibilityState === "visible") {
      setUnread(0);
      void markRoomRead();
    }
  }

  function jumpToLatest() {
    const node = scroller.current;
    if (!node) return;
    atBottom.current = true;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    setUnread(0);
    void markRoomRead();
  }

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    function onFocus() {
      focused.current = true;
      if (atBottom.current) {
        setUnread(0);
        void markRoomRead();
      }
    }
    function onBlur() {
      focused.current = false;
    }
    function onVisibilityChange() {
      focused.current = document.visibilityState === "visible";
      if (focused.current && atBottom.current) {
        setUnread(0);
        void markRoomRead();
      }
    }
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [markRoomRead]);

  useEffect(() => {
    const label = roomCode.toUpperCase();
    document.title = unread > 0 ? `(${unread}) No Trace · ${label}` : `No Trace · ${label}`;
    return () => {
      document.title = "No Trace — Salas temporales";
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
  const typingMembers = useMemo(
    () => members.filter((member) => member.typing && member.userId !== identity?.userId),
    [identity?.userId, members],
  );

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
    sendTyping(false);
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
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

  async function postMessage(content: string, onFail?: () => void) {
    const current = identityRef.current;
    if (!current) return;
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
        detail?: string;
        expired?: boolean;
      };
      if (response.status === 410 || data.expired) {
        setExpired(true);
        setInside(false);
        return;
      }
      if (!response.ok || !data.message) {
        onFail?.();
        showToast(data.detail || data.error || "No se pudo enviar");
        return;
      }
      knownIds.current.add(data.message.id);
      setMessages((prev) =>
        prev.some((item) => item.id === data.message!.id) ? prev : [...prev, data.message!],
      );
    } catch {
      onFail?.();
      showToast("Sin conexión");
    }
  }

  async function sendGif(idOrUrl: string) {
    const value = idOrUrl.trim();
    if (!value) return;
    // Remote GIF URL from the picker (validated) or a local pack id.
    if (value.startsWith("https://")) {
      if (!isRemoteGifUrl(value)) {
        showToast("GIF no válido");
        return;
      }
      await postMessage(`${GIF_PREFIX}${value}`);
      return;
    }
    if (!getGif(value)) {
      showToast("GIF no válido");
      return;
    }
    await postMessage(`${GIF_PREFIX}${value}`);
  }

  async function radioAction(payload: RadioAction) {
    const current = identityRef.current;
    if (!current) return;
    try {
      const response = await fetch(`/api/rooms/${roomCode}/radio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, userId: current.userId }),
      });
      const data = (await response.json()) as {
        radio?: RadioPayload;
        error?: string;
        expired?: boolean;
      };
      if (data.expired) {
        setExpired(true);
        setInside(false);
        return;
      }
      if (response.ok && data.radio) setRadio(data.radio);
      else if (data.error) showToast(data.error);
    } catch {
      showToast("No se pudo actualizar la radio");
    }
  }

  async function openPip() {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }
    const api = (window as unknown as { documentPictureInPicture?: DocumentPictureInPicture })
      .documentPictureInPicture;
    if (!api?.requestWindow) {
      showToast("Tu navegador no soporta ventana flotante. Usa Chrome o Edge.");
      return;
    }
    try {
      const pip = await api.requestWindow({ width: 400, height: 580 });
      document
        .querySelectorAll('link[rel="stylesheet"], style')
        .forEach((node) => pip.document.head.appendChild(node.cloneNode(true)));
      pip.document.body.className = "pip-body";
      pip.addEventListener("pagehide", () => setPipWindow(null));
      setPipWindow(pip);
    } catch {
      showToast("No se pudo abrir la ventana flotante");
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
        <NoTraceBrand compact />
      </main>
    );
  }

  if (!inside) {
    return (
      <main className="gate">
        <div className="gate-card">
          <NoTraceBrand />
          <p className="eyebrow">Sala {roomCode}</p>
          <h1>{expired ? "Esta sala expiró" : "Entra a la sala"}</h1>
          <p className="lede">
            {expired
              ? "La duración elegida terminó y se borró todo. Puedes encenderla de nuevo con el mismo código."
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
                durationMinutes: input.durationMinutes,
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
        <button className="brand-button" onClick={() => router.push("/")} aria-label="Inicio">
          <NoTraceBrand compact />
        </button>
        <div className="room-meta">
          <strong>{roomCode}</strong>
          <span>{formatRemaining(remainingMs)} restantes</span>
        </div>
        <div className="top-actions">
          <button
            className={radioOpen ? "icon-btn active" : "icon-btn"}
            onClick={() => setRadioOpen((value) => !value)}
            aria-label="Radio de la sala"
            title="Radio compartida"
          >
            📻
          </button>
          <button
            className={pipWindow ? "icon-btn active" : "icon-btn"}
            onClick={() => void openPip()}
            aria-label="Ventana flotante"
            title="Chat en ventana flotante"
          >
            ⧉
          </button>
          <button className="icon-btn" onClick={() => void copyInvite()} aria-label="Copiar enlace">
            🔗
          </button>
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Ajustes">
            ⚙️
          </button>
          <button className="ghost-btn leave-btn" onClick={() => void leave()}>
            Salir
          </button>
        </div>
      </header>

      {radioOpen ? (
        <RadioPanel
          radio={radio}
          roomCode={roomCode}
          onAction={(action) => void radioAction(action)}
          onMinimize={() => setRadioOpen(false)}
        />
      ) : null}

      {!radioOpen && radio?.current ? (
        <button
          className="radio-mini"
          type="button"
          onClick={() => setRadioOpen((value) => !value)}
        >
          <span>📻</span>
          <strong>{radio.current.title}</strong>
          <em>{radio.playing ? "en vivo" : "en pausa"}</em>
        </button>
      ) : null}

      <div className="participant-strip" aria-label="Personas en la sala">
        <span className="participant-title">{online.length} en la sala</span>
        <div className="participant-list">
          {members.map((member) => (
            <div className="participant" key={member.userId} title={`${member.username}${member.online ? " · en línea" : " · ausente"}`}>
              <i className={member.online ? "presence-avatar online" : "presence-avatar"} style={{ background: member.color }}>
                {initials(member.username)}
              </i>
              <span>{member.userId === identity.userId ? "Tú" : member.username}</span>
              {member.typing && member.userId !== identity.userId ? <em>…</em> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="chat-body">
        <section className="thread">
          <div className="scroller" ref={scroller} onScroll={handleThreadScroll}>
            {messages.length === 0 ? (
              <div className="empty">
                <p>La sala está lista.</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const mine = message.userId === identity.userId;
                const prev = messages[index - 1];
                const stacked = prev && prev.userId === message.userId;
                const media = splitMedia(message.content);
                const gif = parseGif(message.content);
                const hasGif = gif.gif !== null || gif.remoteUrl !== null;
                const youtubeEmbed = hasGif ? null : getYoutubeEmbed(media.text);
                const bareImage = !hasGif && !media.src ? extractBareImageUrl(media.text) : null;
                const bodyText = hasGif ? gif.text : media.text;
                const messageReactions = reactions.filter((reaction) => reaction.messageId === message.id);
                const wasRead =
                  mine &&
                  members.some(
                    (member) =>
                      member.userId !== identity.userId &&
                      member.lastReadAt &&
                      new Date(member.lastReadAt).getTime() >= new Date(message.createdAt).getTime(),
                  );
                return (
                  <article
                    key={message.id}
                    className={`message-wrap ${mine ? "mine" : ""} ${stacked ? "stacked" : ""}`}
                  >
                    <div className="bubble">
                      {!stacked ? (
                        <header>
                          <span className="msg-author">
                            <i className="msg-dot" style={{ background: message.color }} />
                            <b>{message.username || "Usuario"}</b>
                          </span>
                          {settings.timestamps ? <time>{formatClock(message.createdAt)}</time> : null}
                        </header>
                      ) : settings.timestamps ? (
                        <time className="tiny">{formatClock(message.createdAt)}</time>
                      ) : null}
                      {gif.gif ? (
                        <img
                          className="bubble-img gif-img"
                          src={gif.gif.src}
                          alt={gif.gif.label}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      {gif.remoteUrl ? (
                        <img
                          className="bubble-img gif-remote"
                          src={gif.remoteUrl}
                          alt="GIF"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      {media.src ? (
                        <img
                          className="bubble-img"
                          src={media.src}
                          alt=""
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      {bareImage ? (
                        <img
                          className="bubble-img gif-remote"
                          src={bareImage}
                          alt="GIF"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      {youtubeEmbed ? (
                        <div className="youtube-frame">
                          <iframe
                            src={youtubeEmbed}
                            title="Video de YouTube compartido"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                          />
                        </div>
                      ) : null}
                      {bodyText ? (
                        <p>
                          <LinkText text={bodyText} />
                        </p>
                      ) : null}
                      {mine ? <span className={wasRead ? "read-receipt read" : "read-receipt"}>{wasRead ? "✓✓ leído" : "✓ enviado"}</span> : null}
                    </div>
                    <div className="reaction-row">
                      {messageReactions.map((reaction) => (
                        <button
                          key={`${reaction.emoji}-${reaction.messageId}`}
                          type="button"
                          className={reaction.reactedByMe ? "reaction-pill active" : "reaction-pill"}
                          onClick={() => void reactToMessage(message.id, reaction.emoji)}
                        >
                          {reaction.emoji} <span>{reaction.count}</span>
                        </button>
                      ))}
                      <div className="reaction-add" aria-label="Reaccionar al mensaje">
                        {REACTION_EMOJIS.map((emoji) => (
                          <button key={emoji} type="button" onClick={() => void reactToMessage(message.id, emoji)}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
            {typingMembers.length > 0 ? (
              <div className="typing-indicator">
                <span>{typingMembers.map((member) => member.username).join(", ")} está escribiendo</span>
                <i /><i /><i />
              </div>
            ) : null}
          </div>
          {unread > 0 ? (
            <button className="unread-jump" type="button" onClick={jumpToLatest}>
              ↓ {unread} {unread === 1 ? "mensaje nuevo" : "mensajes nuevos"}
            </button>
          ) : null}

          {serverError ? (
            <p className="server-banner" role="alert">
              ⚠ {serverError}
            </p>
          ) : null}

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
                onClick={() => setGifOpen((value) => !value)}
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
              <GifPicker
                onPick={(id) => {
                  setGifOpen(false);
                  void sendGif(id);
                }}
              />
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
              onChange={(event) => handleDraftChange(event.target.value)}
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

      {pipWindow
        ? createPortal(
            <PipChat
              roomCode={roomCode}
              messages={messages}
              members={members}
              selfId={identity.userId}
              onSend={(text) => void postMessage(text)}
              onClose={() => {
                pipWindow.close();
                setPipWindow(null);
              }}
            />,
            pipWindow.document.body,
          )
        : null}
    </main>
  );
}

const ROOM_FALLBACK = 24 * 60 * 60 * 1000;
