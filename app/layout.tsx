import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { ToastProvider } from "@/components/ui/toast";
import { DialogProvider } from "@/components/ui/dialogs";
import { CookieConsent } from "@/components/cookie-consent";
import { TestDriveResponseModal } from "@/components/test-drive-response-modal";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: { default: "Chikane Garage | Viaturas", template: "%s | Chikane Garage" },
  description:
    "Chikane Garage — catálogo de viaturas de performance com garantia. Consulta disponibilidade, características e condições de venda.",
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
    title: "Chikane Garage | Viaturas",
    description: "Catálogo de viaturas de performance com garantia — Chikane Garage.",
  },
  twitter: { card: "summary_large_image", title: "Chikane Garage | Viaturas", description: "Catálogo de viaturas de performance com garantia — Chikane Garage." },
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
        <ScrollToTop />
        {/* O email de remarcação do test drive abre a home com ?testdrive=<token>;
            o popup de resposta é montado aqui para funcionar em qualquer página. */}
        <Suspense fallback={null}>
          <TestDriveResponseModal />
        </Suspense>
        <ToastProvider>
          <DialogProvider>
            <main id="main-content" className="flex-1">{children}</main>
          </DialogProvider>
        </ToastProvider>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
