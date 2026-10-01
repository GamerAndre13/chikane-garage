import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CookieConsent } from "@/components/cookie-consent";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: { default: "Chikane Garage | Viaturas", template: "%s | Chikane Garage" },
  description: "Consulta o catálogo de viaturas Chikane Garage e pede informações sobre disponibilidade, características e condições.",
  openGraph: { type: "website", locale: "pt_PT", siteName: "Chikane Garage", title: "Chikane Garage | Viaturas", description: "Consulta o catálogo de viaturas Chikane Garage." },
  twitter: { card: "summary_large_image", title: "Chikane Garage | Viaturas", description: "Consulta o catálogo de viaturas Chikane Garage." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${oswald.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
