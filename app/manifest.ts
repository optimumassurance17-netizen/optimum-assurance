import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site-url"

export default function manifest(): MetadataRoute.Manifest {
  const base = SITE_URL.replace(/\/$/, "")
  return {
    id: `${base}/`,
    name: "Optimum Assurance - Espace client",
    short_name: "Optimum Assurance",
    description: "Assurance décennale BTP et dommage ouvrage. Accédez à vos documents et attestations.",
    lang: "fr",
    dir: "ltr",
    categories: ["finance", "business"],
    start_url: "/espace-client",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
