import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Otimizador de Anúncios",
  description: "Analise e melhore seus anúncios do Google Ads",
  robots: { index: false, follow: false },
};

/** Só a casca HTML. Menu e dados da conta ficam em (app)/layout.tsx, que o login não usa. */
export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
