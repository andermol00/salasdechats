"use client";

/** Loads the YouTube IFrame API once and resolves when it is ready. */

type YTGlobal = {
  Player: new (element: HTMLElement | string, options: Record<string, unknown>) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

export type YTPlayer = {
  loadVideoById: (options: { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (options: { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loader: Promise<YTGlobal> | null = null;

export function loadYoutubeApi(): Promise<YTGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no-window"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loader) return loader;

  loader = new Promise<YTGlobal>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-yt-iframe-api="true"]',
    );
    const previous = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
    };

    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.ytIframeApi = "true";
      script.onerror = () => reject(new Error("youtube-api-failed"));
      document.head.appendChild(script);
    }

    // Safety net in case the callback never fires.
    window.setTimeout(() => {
      if (window.YT?.Player) resolve(window.YT);
    }, 4000);
  });

  return loader;
}
