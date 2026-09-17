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
  title: "VELA — Chat temporal de 24 horas",
  description:
    "Salas de chat temporales. Enciende un código, habla con quien lo conozca y deja que todo se apague en 24 horas.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "VELA — Chat temporal de 24 horas",
    description:
      "Habla ahora. Mañana no queda rastro. Salas compartidas por código, sin cuentas y sin archivo.",
    images: ["/images/og.jpg"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable} ${fraunces.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
