import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/Header"
import { SITE_URL } from "@/lib/site-url"
import { truncateForDescription } from "@/lib/seo-metadata-utils"

const PAGE_TITLE = "Assurance titre | Protection des titres de propriété"
const PAGE_DESCRIPTION = truncateForDescription(
  "Assurance titre pour sécuriser vos transactions immobilières et protéger vos droits de propriété. Étude personnalisée par nos équipes.",
  158
)

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/assurance-titre` },
  openGraph: {
    title: `${PAGE_TITLE} | Optimum Assurance`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${SITE_URL}/assurance-titre`,
    siteName: "Optimum Assurance",
  },
}

export default function AssuranceTitrePage() {
  return (
    <main className="min-h-screen bg-slate-50/50">
      <Header />
      <section className="px-4 sm:px-6 md:px-8 py-16">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xl shadow-slate-900/5 md:p-12">
          <span className="mb-4 inline-flex rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
            Nouveau produit
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Assurance titre
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 md:text-lg">
            L&apos;assurance titre protège l&apos;acquéreur, le propriétaire ou le prêteur contre certains risques liés
            à la validité du titre de propriété (anomalie documentaire, contestation juridique, vice antérieur).
            Notre équipe réalise une étude sur dossier pour proposer une solution adaptée.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Pour qui ?
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Acquéreurs, investisseurs, professionnels de l&apos;immobilier et prêteurs souhaitant sécuriser
                juridiquement une opération.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Comment démarrer ?
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Demande en ligne puis étude par nos équipes. Vous recevez un retour personnalisé avec le périmètre de
                couverture et les conditions applicables.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact?sujet=Assurance%20titre"
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700"
            >
              Faire une demande
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Contacter un conseiller
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
