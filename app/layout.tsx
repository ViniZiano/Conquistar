import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  applicationName: "Conquistar",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg" },
  title: "Conquistar | Cuidado e atenção em saúde",
  description: "Conheça a Conquistar. Um espaço de cuidado, acolhimento e acompanhamento em saúde.",
  openGraph: {
    title: "Conquistar | Cuidado e atenção em saúde",
    description: "Com trabalho se conquista",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Conquistar — Com trabalho se conquista" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Conquistar | Cuidado e atenção em saúde",
    description: "Com trabalho se conquista",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
