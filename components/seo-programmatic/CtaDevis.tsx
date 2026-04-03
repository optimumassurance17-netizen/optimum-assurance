import Link from "next/link"

type Props = {
  href: string
  label?: string
  variant?: "primary" | "secondary"
  /** Paramètres UTM pour le suivi des pages SEO locales */
  utm?: { source?: string; medium?: string; campaign?: string }
}

function buildHref(base: string, utm?: Props["utm"]) {
  if (!utm?.source && !utm?.medium && !utm?.campaign) return base
  const p = new URLSearchParams()
  if (utm.source) p.set("utm_source", utm.source)
  if (utm.medium) p.set("utm_medium", utm.medium)
  if (utm.campaign) p.set("utm_campaign", utm.campaign)
  const sep = base.includes("?") ? "&" : "?"
  return `${base}${sep}${p.toString()}`
}

/**
 * CTA conversion vers le parcours devis (tracking UTM optionnel).
 */
export function CtaDevis({
  href,
  label = "Obtenir un devis en ligne",
  variant = "primary",
  utm = { source: "seo", medium: "programmatic" },
}: Props) {
  const finalHref = buildHref(href, utm)
  const cls =
    variant === "primary"
      ? "inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
      : "inline-flex items-center justify-center rounded-xl border-2 border-blue-600 px-6 py-3.5 text-base font-semibold text-blue-700 hover:bg-blue-50 transition-colors"

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-8 text-center">
      <p className="text-[#171717] mb-5 text-base leading-relaxed">
        Devis personnalisé, réponse rapide — sans engagement.
      </p>
      <Link href={finalHref} className={cls}>
        {label}
      </Link>
    </div>
  )
}
