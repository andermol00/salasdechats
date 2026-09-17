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
  themeColor: "#070504",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "VELA — Salas temporales de 24 horas",
  description: "Un espacio breve para lo que quieres decir hoy.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "VELA — Salas temporales de 24 horas",
    description: "Un espacio breve para lo que quieres decir hoy.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable} ${fraunces.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
