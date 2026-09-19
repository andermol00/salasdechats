import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans-face",
});

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Keeps the layout from jumping when the mobile keyboard opens.
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "No Trace — Salas temporales de 24 horas",
  description: "Salas de chat temporales. Nada queda guardado.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "No Trace — Salas temporales",
    description: "Salas de chat temporales. Nada queda guardado.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={outfit.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
