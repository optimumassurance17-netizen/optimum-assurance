import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ChatbotLazy } from "@/components/ChatbotLazy";
import { CookieBanner } from "@/components/CookieBanner";
import { Footer } from "@/components/Footer";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Assurance Décennale BTP en Ligne | Devis 3 min | Optimum Assurance",
    template: "%s | Optimum Assurance",
  },
  description:
    "Assurance décennale BTP obligatoire : devis en 3 minutes, attestation immédiate. Plombier, électricien, peintre, maçon. Tarifs dès 70 €/mois. Sans engagement. 100 % en ligne.",
  keywords: [
    "assurance décennale",
    "assurance décennale BTP",
    "devis assurance décennale",
    "attestation décennale immédiate",
    "décennale plombier",
    "décennale électricien",
    "décennale peintre",
    "assurance professionnelle BTP",
    "souscription décennale en ligne",
    "dommage ouvrage",
    "assurance dommage ouvrage",
    "dommage ouvrage auto-construction",
    "garantie clos et couvert",
    "assurance construction",
  ],
  authors: [{ name: "Optimum Assurance", url: baseUrl }],
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: baseUrl,
    siteName: "Optimum Assurance",
    title: "Assurance Décennale BTP en Ligne | Devis 3 min | Optimum Assurance",
    description: "Devis décennale en 3 minutes, attestation immédiate. Plombier, électricien, peintre. Dès 70 €/mois. Sans engagement.",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance - Assurance décennale BTP" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Assurance Décennale BTP en Ligne | Optimum Assurance",
    description: "Devis en 3 minutes, attestation immédiate. Dès 70 €/mois.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: "index, follow",
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${plusJakarta.variable} font-sans antialiased`}>
        <SessionProvider>
          {children}
          <Footer />
          <ChatbotLazy />
          <CookieBanner />
        </SessionProvider>
      </body>
    </html>
  );
}
