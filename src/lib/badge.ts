"use client";

let badgeCanvas: HTMLCanvasElement | null = null;
let logoImage: HTMLImageElement | null = null;

function loadLogo() {
  if (logoImage?.complete) return Promise.resolve(logoImage);
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.onload = () => {
      logoImage = img;
      resolve(img);
    };
    img.onerror = () => resolve(img);
    img.src = "/logo.svg";
  });
}

/**
 * Draws the app logo plus a Telegram-style unread counter and swaps the favicon.
 * Runs only in the browser, so the tab shows the pending count when blurred.
 */
export async function setUnreadBadge(count: number) {
  if (typeof document === "undefined") return;
  const size = 64;
  if (!badgeCanvas) {
    badgeCanvas = document.createElement("canvas");
    badgeCanvas.width = size;
    badgeCanvas.height = size;
  }
  const ctx = badgeCanvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, size, size);
  const img = await loadLogo();
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, size, size);
  }

  if (count > 0) {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(47, 17, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 21px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(count > 9 ? "9+" : String(count), 47, 18);
  }

  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = badgeCanvas.toDataURL("image/png");
}
