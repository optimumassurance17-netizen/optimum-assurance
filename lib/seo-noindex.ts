import type { Metadata } from "next"

/**
 * Pages de tunnel, compte et administration :
 * utiles à l'utilisateur connecté, mais sans valeur SEO.
 */
export const noindexMetadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
}

export function buildNoindexMetadata(title?: string, description?: string): Metadata {
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...noindexMetadata,
  }
}
