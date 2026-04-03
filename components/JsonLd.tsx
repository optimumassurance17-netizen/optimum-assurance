import Script from "next/script"

type Props = {
  /** Unique sur la page (ex. jsonld-home, jsonld-faq) */
  id: string
  data: object
}

/**
 * JSON-LD via `next/script` : évite l’erreur React 19 sur les balises &lt;script&gt; natives
 * dans l’arbre (notamment près des pages client).
 */
export function JsonLd({ id, data }: Props) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
