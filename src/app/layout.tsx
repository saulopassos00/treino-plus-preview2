import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Treino Plus — Bem-estar e treinos",
  description:
    "Treinos, lives gravadas, nutrição, planejamento semanal e loja. Experiência demonstrativa mobile-first.",
  manifest: "/treino-plus-preview2/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Treino Plus",
  },
  icons: {
    icon: "/treino-plus-preview2/icons/icon-192.svg",
    apple: "/treino-plus-preview2/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f5f5f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
