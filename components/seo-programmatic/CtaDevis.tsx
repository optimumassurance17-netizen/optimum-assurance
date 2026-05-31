import Link from "next/link"
import { buildTrackedHref } from "@/lib/conversion-tracking"

type Props = {
  href: string
  label?: string
  variant?: "primary" | "secondary"
  showDecennaleAcceptanceHint?: boolean
  /** Paramètres UTM pour le suivi des pages SEO locales */
  utm?: { source?: string; medium?: string; campaign?: string }
  entryPath?: string
}

/**
 * CTA conversion vers le parcours devis (tracking UTM optionnel).
 */
export function CtaDevis({
  href,
  label = "Obtenir un devis en ligne",
  variant = "primary",
  showDecennaleAcceptanceHint = false,
  utm = { source: "seo", medium: "programmatic" },
  entryPath,
}: Props) {
  const finalHref = buildTrackedHref(href, {
    utmSource: utm.source,
    utmMedium: utm.medium,
    utmCampaign: utm.campaign,
    entryPath,
  })
  const cls =
    variant === "primary"
      ? "inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
      : "inline-flex items-center justify-center rounded-xl border-2 border-blue-600 px-6 py-3.5 text-base font-semibold text-blue-700 hover:bg-blue-50 transition-colors"

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-8 text-center">
      <p className="text-[#171717] mb-5 text-base leading-relaxed">
        Devis personnalisé, réponse rapide — sans engagement.
      </p>
      {showDecennaleAcceptanceHint ? (
        <p className="text-sm text-[#0f172a] mb-4">
          Profils pris en charge : <strong>résilié non-paiement</strong>,{" "}
          <strong>sinistralité élevée</strong> et <strong>sans assurance depuis plus de 2 ans</strong>.
        </p>
      ) : null}
      <Link href={finalHref} className={cls}>
        {label}
      </Link>
    </div>
  )
}
