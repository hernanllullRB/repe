import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { config } from "@/lib/config";
import "./globals.css";

// Fuentes incluidas en el repo (licencia OFL): no dependen de internet al compilar.
const inter = localFont({
  variable: "--font-inter",
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
});
const grotesk = localFont({
  variable: "--font-grotesk",
  src: "./fonts/space-grotesk-latin-wght-normal.woff2",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: {
    default: "Repe · Cómo hacer cada ejercicio bien",
    template: "%s · Repe",
  },
  description: "Buscá un ejercicio y mirá cómo se hace: video, técnica, qué trabaja y errores comunes.",
  openGraph: { siteName: "Repe", locale: "es_AR", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#121427" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${grotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
