import { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/espace-client/", "/gestion", "/confirmation", "/paiement", "/souscription", "/signature", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
