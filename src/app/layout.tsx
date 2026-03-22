import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "World Status - Dashboard Global",
  description:
    "Estado del mundo en las últimas 24 horas: Clima, Desastres Naturales, Noticias Globales, Índices Financieros y Eventos Astronómicos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen flex`}
      >
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
