import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import { PublicLanding } from "@/components/PublicLanding";
import "./public-site.css";

// Fontes só da página pública. O painel interno continua com a Geist do layout.
const displayFont = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap", style: ["normal", "italic"] });
const textFont = Public_Sans({ subsets: ["latin"], variable: "--font-text", display: "swap" });

export const metadata: Metadata = {
  title: "Conquistar | Cuidado e atenção em saúde",
  description:
    "Conheça a Conquistar. Um espaço de cuidado, acolhimento e acompanhamento em saúde.",
};

export default function HomePage() {
  return <PublicLanding fontClassName={`${displayFont.variable} ${textFont.variable}`} />;
}
