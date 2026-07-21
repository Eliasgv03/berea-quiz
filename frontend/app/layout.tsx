import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genesis Quiz",
  description: "Juego local de preguntas sobre el libro de Genesis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

