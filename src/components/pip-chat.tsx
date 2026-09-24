"use client";

import { parseGifMessage } from "@/lib/gifs";
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
};

/**
 * Compact chat rendered inside the Document Picture-in-Picture window, so the
 * conversation stays visible on top of other Chrome tabs.
 */
export function PipChat({
  roomCode,
  messages,
  members,
  selfId,
  onSend,
  onClose,
}: Props) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const online = members.filter((member) => member.online);
  const typing = members.filter((member) => member.typing && member.userId !== selfId);

  useEffect(() => {
    const node = scroller.current;
    if (!node || !atBottom.current) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  return (
    <div className="pip">
      <header className="pip-head">
        <div>
          <strong>{roomCode.toUpperCase()}</strong>
          <span>
            {online.length} en línea{typing.length > 0 ? ` · ${typing[0].username} escribiendo…` : ""}
          </span>
        </div>
        <button type="button" className="pip-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </header>

      <div
        className="pip-thread"
        ref={scroller}
        onScroll={(event) => {
          const node = event.currentTarget;
          atBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
        }}
      >
        {messages.length === 0 ? <p className="pip-empty">Sin mensajes todavía.</p> : null}
        {messages.map((message, index) => {
          const mine = message.userId === selfId;
          const prev = messages[index - 1];
          const stacked = prev && prev.userId === message.userId;
          const parsedGif = parseGifMessage(message.content);
          const media = parsedGif.gif
            ? { src: parsedGif.gif.src, text: parsedGif.text }
            : splitMedia(message.content);
          const member = members.find((item) => item.userId === message.userId);
          return (
            <article
              key={message.id}
              className={`pip-msg ${mine ? "mine" : ""} ${stacked ? "stacked" : ""}`}
            >
              {!stacked ? (
                <span className="pip-author" style={{ color: member?.color ?? "#8ea0c9" }}>
                  {mine ? "Tú" : message.username || "Usuario"}
                </span>
              ) : null}
              {media.src ? (
                <img
                  className="pip-img"
                  src={media.src}
                  alt={parsedGif.gif ? `GIF: ${parsedGif.gif.label}` : "Imagen"}
                  loading="lazy"
                />
              ) : null}
              {media.text ? <p>{media.text}</p> : null}
              <time>{formatClock(message.createdAt)}</time>
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
        />
        <button type="submit" className="primary-btn" disabled={!draft.trim()}>
          ➤
        </button>
      </form>

      <footer className="pip-foot">
        {members
          .slice(0, 6)
          .map((member) => (
            <i
              key={member.userId}
              style={{ background: member.color }}
              title={member.username}
            >
              {initials(member.username)}
            </i>
          ))}
      </footer>
    </div>
  );
}
