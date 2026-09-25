"use client";

import { parseGif } from "@/lib/gifs";
import { formatClock, initials, splitMedia } from "@/lib/format";
import { REACTION_EMOJIS } from "@/lib/constants";
import type { MemberPayload, MessagePayload, ReactionPayload } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

type Props = {
  roomCode: string;
  messages: MessagePayload[];
  members: MemberPayload[];
  selfId: string;
  reactions?: ReactionPayload[];
  onSend: (text: string) => void;
  onClose: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
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
  reactions = [],
  onSend,
  onClose,
  onMinimize,
  isMinimized = false,
  onReact,
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
        <div className="pip-controls">
          {onMinimize ? (
            <button type="button" className="pip-minimize" onClick={onMinimize} aria-label="Minimizar">
              {isMinimized ? "□" : "−"}
            </button>
          ) : null}
          <button type="button" className="pip-close" onClick={onClose} aria-label="Cerrar">
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
        {messages.length === 0 ? <p className="pip-empty">Sin mensajes todavía.</p> : null}
        {messages.map((message, index) => {
          const mine = message.userId === selfId;
          const prev = messages[index - 1];
          const stacked = prev && prev.userId === message.userId;
          const media = splitMedia(message.content);
          const gif = parseGif(message.content);
          const member = members.find((item) => item.userId === message.userId);
          const messageReactions = reactions.filter((reaction) => reaction.messageId === message.id);
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
              {gif.gif ? (
                <img className="pip-img gif-img" src={gif.gif.src} alt={gif.gif.label} />
              ) : gif.klippyUrl ? (
                <img className="pip-img gif-img" src={gif.klippyUrl} alt="Klippy GIF" />
              ) : null}
              {media.src ? <img className="pip-img" src={media.src} alt="" /> : null}
              {gif.gif ? (
                gif.text ? <p>{gif.text}</p> : null
              ) : media.text ? (
                <p>{media.text}</p>
              ) : null}
              <time>{formatClock(message.createdAt)}</time>
              {onReact && messageReactions.length > 0 ? (
                <div className="pip-reactions">
                  {messageReactions.map((reaction) => (
                    <button
                      key={`${reaction.emoji}-${reaction.messageId}`}
                      type="button"
                      className={reaction.reactedByMe ? "reaction-pill active" : "reaction-pill"}
                      onClick={() => onReact(message.id, reaction.emoji)}
                    >
                      {reaction.emoji} {reaction.count > 1 ? reaction.count : ""}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="reaction-add-btn"
                    onClick={() => {
                      const emoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
                      onReact(message.id, emoji);
                    }}
                    title="Reaccionar"
                  >
                    +
                  </button>
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
