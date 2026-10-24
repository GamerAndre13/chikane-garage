import type { Metadata, Viewport } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CookieConsent } from "@/components/cookie-consent";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: { default: "Chikane Garage | Viaturas", template: "%s | Chikane Garage" },
  description:
    "Boutique de viaturas de performance: unidades escolhidas à mão, inspeccionadas em 140 pontos e entregues com garantia Chikane. Novos, usados e loja de acessórios.",
  keywords: ["Chikane Garage", "chikane garage", "viaturas", "carros usados", "automóveis", "stand de automóveis", "comprar carro"],
  applicationName: "Chikane Garage",
  authors: [{ name: "Chikane Garage" }],
  // Verificação do Google Search Console (opcional): define
  // NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION nas variáveis de build do worker.
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  openGraph: {
    type: "website",
    locale: "pt_PT",
    siteName: "Chikane Garage",
    title: "Chikane Garage | Viaturas de performance",
    description: "Viaturas de performance escolhidas à mão, inspeccionadas em 140 pontos e entregues com garantia Chikane.",
  },
  twitter: { card: "summary_large_image", title: "Chikane Garage | Viaturas de performance", description: "Viaturas de performance escolhidas à mão, inspeccionadas em 140 pontos e entregues com garantia Chikane." },
};

// Dados estruturados base da organização (o AutoDealer completo, com contactos
// e redes sociais, é emitido na homepage a partir das definições do site).
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Chikane Garage",
  url: siteUrl?.replace(/\/$/, "") || undefined,
  logo: siteUrl ? `${siteUrl.replace(/\/$/, "")}/opengraph-image` : undefined,
};

// Meta viewport: cor do tema do browser a acompanhar o tema escuro do site
export const viewport: Viewport = {
  themeColor: "#090909",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={`${oswald.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* D1: ligação "saltar para o conteúdo" (visível só com foco de teclado) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-copper focus:px-4 focus:py-2 focus:font-display focus:text-xs focus:font-semibold focus:uppercase focus:tracking-widest focus:text-white"
        >
          Saltar para o conteúdo
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Header />
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
