import type { FaqEntry } from "@/lib/seo-programmatic/types"

type Props = {
  title?: string
  items: readonly FaqEntry[]
}

/**
 * FAQ structurée (JSON-LD fourni par la page parente).
 */
export function FaqSEO({ title = "Questions fréquentes", items }: Props) {
  if (!items.length) return null

  return (
    <section className="mt-12 border-t border-[#e5e5e5] pt-10" aria-labelledby="faq-seo-title">
      <h2 id="faq-seo-title" className="text-xl md:text-2xl font-bold text-[#0a0a0a] mb-6">
        {title}
      </h2>
      <dl className="space-y-6">
        {items.map((f, i) => (
          <div key={`${i}-${f.q.slice(0, 24)}`} className="rounded-xl border border-[#e5e5e5] bg-white p-5">
            <dt className="font-semibold text-[#0a0a0a] mb-2">{f.q}</dt>
            <dd className="text-[#171717] text-sm md:text-base leading-relaxed">{f.r}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
