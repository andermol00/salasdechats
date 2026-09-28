"use client";

import { parseGif } from "@/lib/gifs";
import { LinkText } from "@/components/link-text";
import { formatClock, initials, splitMedia } from "@/lib/format";
import type { MemberPayload, MessagePayload } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

type Props = {
  roomCode: string;
  messages: MessagePayload[];
  members: MemberPayload[];
  selfId: string;
  onSend: (text: string) => void;
  onClose: () => void;
  onReact?: (messageId: string, emoji: string) => void;
};

export function PipChat({
  roomCode,
  messages,
  members,
  selfId,
  onSend,
  onClose,
  onReact,
}: Props) {
  const [draft, setDraft] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const online = members.filter((member) => member.online);
  const typing = members.filter((member) => member.typing && member.userId !== selfId);

  // Emojis rápidos para reacciones
  const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "💯", "🎉"];

  useEffect(() => {
    const node = scroller.current;
    if (!node || !atBottom.current) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const handleReact = (messageId: string, emoji: string) => {
    onReact?.(messageId, emoji);
    setReactions((prev) => {
      const current = prev[messageId] || [];
      const newReactions = current.includes(emoji)
        ? current.filter((e) => e !== emoji)
        : [...current, emoji];
      return { ...prev, [messageId]: newReactions };
    });
    setReactingTo(null);
  };

  if (minimized) {
    return (
      <div className="pip pip-minimized">
        <button
          className="pip-restore"
          onClick={() => setMinimized(false)}
          title={`${roomCode.toUpperCase()} - Click para restaurar`}
        >
          <span className="pip-badge">{messages.length}</span>
          {roomCode.toUpperCase()}
        </button>
      </div>
    );
  }

  return (
    <div className="pip">
      <header className="pip-head">
        <div className="pip-head-info">
          <strong>{roomCode.toUpperCase()}</strong>
          <span className="pip-head-meta">
            {online.length} en línea{typing.length > 0 ? ` · ${typing[0].username} escribiendo…` : ""}
          </span>
        </div>
        <div className="pip-head-actions">
          <button
            type="button"
            className="pip-action-btn"
            onClick={() => setMinimized(true)}
            aria-label="Minimizar"
            title="Minimizar (M)"
          >
            ━
          </button>
          <button
            type="button"
            className="pip-action-btn"
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar (X)"
          >
            ✕
          </button>
        </div>
      </header>

      <div
        className="pip-thread"
        ref={scroller}
        onScroll={(event) => {
          const node = event.currentTarget;
          atBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
        }}
      >
        {messages.length === 0 ? (
          <p className="pip-empty">Sin mensajes todavía.</p>
        ) : null}
        
        {messages.map((message, index) => {
          const mine = message.userId === selfId;
          const prev = messages[index - 1];
          const stacked = prev && prev.userId === message.userId;
          const media = splitMedia(message.content);
          const gif = parseGif(message.content);
          const member = members.find((item) => item.userId === message.userId);
          const messageReactions = reactions[message.id] || [];

          return (
            <article
              key={message.id}
              className={`pip-msg ${mine ? "mine" : ""} ${stacked ? "stacked" : ""}`}
              onMouseEnter={() => setReactingTo(message.id)}
              onMouseLeave={() => setReactingTo(null)}
            >
              {!stacked ? (
                <span
                  className="pip-author"
                  style={{
                    color: member?.color ?? "#8ea0c9",
                    opacity: 0.85, // Más translúcido
                  }}
                >
                  {mine ? "Tú" : message.username || "Usuario"}
                </span>
              ) : null}

              {gif.gif ? (
                <div className="pip-media-container">
                  <img
                    className="pip-img gif-img"
                    src={gif.gif.src}
                    alt={gif.gif.label}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : null}

              {gif.remoteUrl ? (
                <div className="pip-media-container">
                  <img
                    className="pip-img"
                    src={gif.remoteUrl}
                    alt="GIF"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : null}

              {media.src ? (
                <div className="pip-media-container">
                  <img
                    className="pip-img"
                    src={media.src}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : null}

              {gif.gif || gif.remoteUrl ? (
                gif.text ? (
                  <p className="pip-text">
                    <LinkText text={gif.text} />
                  </p>
                ) : null
              ) : media.text ? (
                <p className="pip-text">
                  <LinkText text={media.text} />
                </p>
              ) : null}

              <div className="pip-msg-footer">
                <time className="pip-time">{formatClock(message.createdAt)}</time>

                {/* Reacciones */}
                {messageReactions.length > 0 ? (
                  <div className="pip-reactions">
                    {messageReactions.map((emoji) => (
                      <button
                        key={emoji}
                        className="pip-reaction-badge"
                        onClick={() => handleReact(message.id, emoji)}
                        type="button"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Botón flotante de reacciones */}
              {reactingTo === message.id ? (
                <div className="pip-reaction-picker">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      className="pip-emoji-quick"
                      onClick={() => handleReact(message.id, emoji)}
                      type="button"
                      title={`Reaccionar con ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <form
        className="pip-composer"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text) return;
          onSend(text);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escribe…"
          autoFocus
          className="pip-input"
        />
        <button
          type="submit"
          className="pip-send-btn primary-btn"
          disabled={!draft.trim()}
          title="Enviar (Enter)"
        >
          ➤
        </button>
      </form>

      <footer className="pip-foot">
        {members
          .slice(0, 6)
          .map((member) => (
            <i
              key={member.userId}
              className="pip-avatar"
              style={{
                background: member.color,
                opacity: member.online ? 1 : 0.5,
              }}
              title={`${member.username}${member.online ? " (online)" : " (offline)"}`}
            >
              {initials(member.username)}
            </i>
          ))}
      </footer>
    </div>
  );
}
