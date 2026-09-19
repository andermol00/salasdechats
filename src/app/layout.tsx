import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans-face",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-face",
});

export const viewport: Viewport = {
  themeColor: "#0b0c12",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "No Trace — Salas temporales",
  description: "Salas de chat temporales con duración configurable.",
  icons: { icon: "/no-trace-logo.png" },
  openGraph: {
    title: "No Trace — Salas temporales",
    description: "Salas de chat temporales con duración configurable.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable} ${fraunces.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
