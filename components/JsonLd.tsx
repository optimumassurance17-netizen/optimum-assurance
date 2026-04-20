type Props = {
  /** Unique sur la page (ex. jsonld-home, jsonld-faq) */
  id: string
  data: object
}

/**
 * Script JSON-LD rendu côté serveur dans le HTML initial,
 * lisible immédiatement par les crawlers.
 */
export function JsonLd({ id, data }: Props) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
