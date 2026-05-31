import type { Metadata } from "next"
import Link from "next/link"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { AssuranceTitreClientGate } from "@/components/AssuranceTitreClientGate"
import { FormulaireAssuranceTitre } from "@/components/FormulaireAssuranceTitre"
import {
  seoBaseUrl,
  seoBreadcrumbListNode,
  seoJsonLdGraph,
  seoWebPageNode,
} from "@/lib/seo-jsonld-helpers"
import { truncateForDescription } from "@/lib/seo-metadata-utils"

const canonical = `${seoBaseUrl}/assurance-titre`
const pageDescription = truncateForDescription(
  "Assurance titre immobilière : étude confidentielle pour acquisition, refinancement ou transaction complexe avec risque sur le titre, charge, servitude ou fraude.",
  158
)

const assuranceTitreJsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Assurance titre", path: "/assurance-titre" },
  ]),
  seoWebPageNode({
    path: "/assurance-titre",
    name: "Assurance titre immobilière | Étude sur dossier",
    description: pageDescription,
  }),
])

export const metadata: Metadata = {
  title: "Assurance titre immobilière | Étude sur dossier | Optimum Assurance",
  description: pageDescription,
  alternates: { canonical },
  openGraph: {
    type: "website",
    url: canonical,
    title: "Assurance titre immobilière | Optimum Assurance",
    description:
      "Sécurisez une acquisition, un refinancement ou un closing complexe avec une étude assurance titre adaptée à votre dossier.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
  },
}

export default function AssuranceTitrePage() {
  return (
    <main className="min-h-screen bg-slate-50/80">
      <JsonLd id="jsonld-assurance-titre" data={assuranceTitreJsonLd} />
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Assurance titre" }]} />

        <div className="mt-4 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <section>
            <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-900">
              Étude manuelle & confidentielle
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Assurance titre immobilière
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700">
              L&apos;assurance titre vise à <strong>sécuriser certaines transactions immobilières</strong> quand un
              risque sur le titre, l&apos;opposabilité des droits, les charges ou la chaîne documentaire mérite une
              couverture complémentaire.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              Produit étudié au cas par cas, en complément des vérifications notariales et juridiques. La faisabilité,
              les garanties et les exclusions dépendent du dossier, de l&apos;actif concerné et du montage retenu.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Acquisition / refinancement</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Dossiers résidentiels, tertiaires ou actifs atypiques.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Points de risque ciblés</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Charges non radiées, servitudes, fraude, erreurs cadastrales, empiètements.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Retour rapide</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Première lecture du dossier en général sous 24 à 48 h ouvrées.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Quand solliciter une étude Assurance titre ?</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
                <li className="flex gap-3">
                  <span className="mt-0.5 text-violet-700">•</span>
                  <span>Avant signature d&apos;une acquisition avec une anomalie ou une zone d&apos;incertitude sur le titre.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-violet-700">•</span>
                  <span>Pour rassurer un prêteur, un comité d&apos;investissement ou un partenaire sur un closing complexe.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-violet-700">•</span>
                  <span>En cas de servitude non déclarée, d&apos;inscription non radiée, d&apos;empiètement ou d&apos;erreur de publicité foncière.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-violet-700">•</span>
                  <span>Lorsqu&apos;une fraude, une usurpation d&apos;identité ou une revendication d&apos;un tiers doit être anticipée.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Pour qui ?</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Acquéreurs, investisseurs, marchands de biens, foncières, prêteurs, notaires ou avocats sur dossier.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Ce qui est étudié</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Nature de l&apos;actif, historique documentaire, urgence de signature, montants engagés et risques déjà relevés.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Important</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  L&apos;assurance titre ne remplace pas le travail du notaire ou de l&apos;avocat : elle peut compléter la gestion du risque selon la police proposée.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Demande d&apos;étude</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Décrivez votre dossier</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Plus votre demande est précise, plus l&apos;analyse initiale sera rapide et exploitable. Après envoi,
                vous pourrez poursuivre le dossier dans votre espace client (questionnaire détaillé + dépôt de pièces).
              </p>
            </div>
            <AssuranceTitreClientGate>
              <FormulaireAssuranceTitre />
            </AssuranceTitreClientGate>
          </section>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Besoin d&apos;un autre produit ?{" "}
          <Link href="/devis" className="font-semibold text-blue-600 hover:underline">
            Devis décennale
          </Link>
          {" · "}
          <Link href="/devis-dommage-ouvrage" className="font-semibold text-blue-600 hover:underline">
            Dommage ouvrage
          </Link>
          {" · "}
          <Link href="/devis-rc-fabriquant" className="font-semibold text-blue-600 hover:underline">
            RC fabriquant
          </Link>
        </div>
      </div>
    </main>
  )
}
