import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: baseUrl },
    { "@type": "ListItem", position: 2, name: "Devis assurance décennale", item: `${baseUrl}/devis` },
  ],
}

export const metadata: Metadata = {
  title: "Devis assurance décennale",
  description:
    "Obtenez votre devis d'assurance décennale BTP en 3 minutes. Tarification automatique, sans engagement. Plomberie, électricité, maçonnerie, peinture et plus.",
  alternates: {
    canonical: `${baseUrl}/devis`,
  },
  openGraph: {
    url: `${baseUrl}/devis`,
    title: "Devis assurance décennale | Optimum Assurance",
    description: "Devis gratuit en 3 minutes. Tarification immédiate pour tous les métiers du BTP.",
  },
}

export default function DevisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  )
}
