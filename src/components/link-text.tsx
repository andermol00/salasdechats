"use client";

import type { ReactNode } from "react";

const URL_PATTERN = /(https?:\/\/[^\s<]+)/g;

/** Renders plain text while turning bare URLs into safe links. */
export function LinkText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const pieces = text.split(URL_PATTERN);

  pieces.forEach((piece, index) => {
    if (!piece) return;
    if (URL_PATTERN.test(piece)) {
      nodes.push(
        <a
          key={`${piece}-${index}`}
          href={piece}
          target="_blank"
          rel="noreferrer noopener"
        >
          {piece.length > 48 ? `${piece.slice(0, 45)}…` : piece}
        </a>,
      );
    } else {
      nodes.push(<span key={`t-${index}`}>{piece}</span>);
    }
  });

  return <>{nodes}</>;
}
