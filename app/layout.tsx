import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lucianos · Pedidos y caja",
  description: "Mesas, pedidos, carta del día y caja de Lucianos.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
