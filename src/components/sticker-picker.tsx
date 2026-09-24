"use client";

import { STICKERS } from "@/lib/stickers";

type Props = {
  onPick: (id: string) => void;
};

export function StickerPicker({ onPick }: Props) {
  return (
    <div className="sticker-picker">
      <p className="sticker-hint">
        Stickers animados incluidos · sin API key ni conexión externa
      </p>
      <div className="sticker-grid">
        {STICKERS.map((sticker) => (
          <button
            key={sticker.id}
            type="button"
            className="sticker-btn"
            title={sticker.label}
            aria-label={sticker.label}
            onClick={() => onPick(sticker.id)}
          >
            <span
              className="sticker-art"
              dangerouslySetInnerHTML={{ __html: sticker.svg }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function StickerBubble({ svg }: { svg: string }) {
  return (
    <span className="sticker-art big" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
