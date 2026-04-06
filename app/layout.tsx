import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import { EQ_MENSUEL_MIN } from "@/lib/decennale-affichage-tarif";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ChatbotLazy } from "@/components/ChatbotLazy";
import { Footer } from "@/components/Footer";
import { CookieBanner, StickyMobileCta } from "@/components/LayoutDeferredUi";
import { ForceLightTheme } from "@/components/ForceLightTheme";
import { SITE_URL } from "@/lib/site-url";
import { truncateForDescription } from "@/lib/seo-metadata-utils";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  /** Réduit le délai d’affichage LCP (texte) vs police web — métriques de secours plus proches. */
  adjustFontFallback: true,
  preload: true,
});

const baseUrl = SITE_URL

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  applicationName: "Optimum Assurance",
  title: {
    default: "Assurance Décennale BTP en Ligne | Devis 3 min | Optimum Assurance",
    template: "%s | Optimum Assurance",
  },
  description: truncateForDescription(
    `Assurance décennale BTP obligatoire : devis en 3 minutes, attestation immédiate. Plombier, électricien, peintre, maçon. Dès ${EQ_MENSUEL_MIN} €/mois équivalent (min. 600 €/an), paiement trimestriel. Sans engagement. 100 % en ligne.`,
    158
  ),
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
    description: `Devis décennale en 3 minutes, attestation immédiate. Plombier, électricien, peintre. Dès ${EQ_MENSUEL_MIN} €/mois équivalent, prélèvement trimestriel. Sans engagement.`,
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance - Assurance décennale BTP" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Assurance Décennale BTP en Ligne | Optimum Assurance",
    description: `Devis en 3 minutes, attestation immédiate. Dès ${EQ_MENSUEL_MIN} €/mois équivalent, prélèvement trimestriel.`,
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    other: {
      "msvalidate.01": "598C36744C75A2CCE965C0F02D9BD0D4",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${plusJakarta.variable} font-sans antialiased`}>
        <Script id="force-light-theme" strategy="beforeInteractive">
          {`(function(){document.documentElement.classList.remove("dark");try{localStorage.removeItem("theme");}catch(e){}})();`}
        </Script>
        <ForceLightTheme />
        <a href="#main-content" className="skip-link">Aller au contenu principal</a>
        <SessionProvider>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <Footer />
          <ChatbotLazy />
          <CookieBanner />
          <StickyMobileCta />
        </SessionProvider>
      </body>
    </html>
  );
}
