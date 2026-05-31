import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { Breadcrumb } from "@/components/Breadcrumb"
import { Header } from "@/components/Header"
import { ASSURANCE_TITRE_REFERENCE_REPORT } from "@/lib/assurance-titre-reference-report"
import { seoBaseUrl } from "@/lib/seo-jsonld-helpers"

const canonical = `${seoBaseUrl}/assurance-titre/referentiel-couverture`

export const metadata: Metadata = {
  title: "Référentiel Assurance titre : garanties, exclusions et normes ALTA | Optimum Assurance",
  description:
    "Rapport détaillé sur l'assurance titre : police propriétaire, police prêteur, garanties de couverture, exclusions standard, exceptions Schedule B, enhanced policies et meilleures pratiques.",
  alternates: { canonical },
}

function SectionShell(props: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{props.title}</h2>
        {props.description ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{props.description}</p>
        ) : null}
      </div>
      {props.children}
    </section>
  )
}

export default function AssuranceTitreCoverageReferencePage() {
  const report = ASSURANCE_TITRE_REFERENCE_REPORT

  return (
    <main className="min-h-screen bg-slate-50/80">
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Assurance titre", href: "/assurance-titre" },
            { label: "Référentiel couverture" },
          ]}
        />

        <section className="mt-4 rounded-[2rem] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-900">
              Assurance titre
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Mise à jour : {report.updatedAt}
            </span>
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {report.title}
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-relaxed text-slate-700">
            Ce document a vocation à servir de <strong>référentiel métier et documentaire</strong> pour lire les
            garanties de couverture, les exclusions, les exceptions et les limites de police en Assurance titre.
            Il recroise le corpus actuellement disponible dans la plateforme avec les standards de marché ALTA et
            des sources juridiques / sectorielles de référence.
          </p>
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            {report.disclaimer}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {report.executiveSummary.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm leading-relaxed text-slate-700">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/espace-client/assurance-titre"
              className="inline-flex items-center rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
            >
              Ouvrir le dossier digital
            </Link>
            <Link
              href="/espace-client"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Retour à l&apos;espace client
            </Link>
          </div>
        </section>

        <div className="mt-8 space-y-8">
          <SectionShell
            title="1. Corpus analysé et définition du produit"
            description="Périmètre de l'analyse et rappel de l'objectif de l'assurance titre dans notre parcours produit."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {report.internalCorpus.map((section) => (
                <div key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-0.5 text-violet-700">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {section.note ? <p className="mt-3 text-xs leading-relaxed text-slate-500">{section.note}</p> : null}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">Définition et objectif</h3>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
                {report.definition.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            title="2. Les différents types de polices"
            description="Lecture synthétique des polices propriétaire, prêteur et renforcée."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-900">
                    <th className="pb-3 pr-4 font-semibold">Police</th>
                    <th className="pb-3 pr-4 font-semibold">Objet</th>
                    <th className="pb-3 pr-4 font-semibold">Protège</th>
                    <th className="pb-3 pr-4 font-semibold">Montant</th>
                    <th className="pb-3 font-semibold">Durée / remarques</th>
                  </tr>
                </thead>
                <tbody>
                  {report.policyTypes.map((row) => (
                    <tr key={row.police} className="align-top border-b border-slate-100">
                      <td className="py-4 pr-4 font-semibold text-slate-900">{row.police}</td>
                      <td className="py-4 pr-4 text-slate-700">{row.objet}</td>
                      <td className="py-4 pr-4 text-slate-700">{row.protege}</td>
                      <td className="py-4 pr-4 text-slate-700">{row.montant}</td>
                      <td className="py-4 text-slate-700">
                        <p>{row.duree}</p>
                        <ul className="mt-2 space-y-1 text-xs text-slate-600">
                          {row.pointsClefs.map((point) => (
                            <li key={point} className="flex gap-2">
                              <span className="mt-0.5 text-violet-700">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionShell>

          <SectionShell
            title="3. Description détaillée des risques couverts"
            description="Lecture par familles de risques, avec attention particulière aux conditions et dépendances au Schedule B."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {report.coveredRiskSections.map((section) => (
                <article key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-0.5 text-violet-700">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {section.note ? <p className="mt-3 text-xs leading-relaxed text-slate-500">{section.note}</p> : null}
                </article>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            title="4. Exclusions, exceptions particulières et limitations de garantie"
            description="Ce triptyque doit toujours être lu ensemble avant signature."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {report.exclusionSections.map((section) => (
                <article key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-0.5 text-rose-600">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {section.note ? <p className="mt-3 text-xs leading-relaxed text-slate-500">{section.note}</p> : null}
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">Exclusions standards</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {report.distinctions.standardExclusions.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-0.5 text-slate-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">Exceptions particulières</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {report.distinctions.scheduleBExceptions.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-0.5 text-slate-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">Limitations</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {report.distinctions.limitations.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-0.5 text-slate-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            title="5. Comparaison police standard vs police renforcée (Enhanced / Homeowner)"
            description="Comparatif de synthèse ; la portée exacte dépend toujours de la forme de police et de l'assureur."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-900">
                    <th className="pb-3 pr-4 font-semibold">Thème</th>
                    <th className="pb-3 pr-4 font-semibold">Standard</th>
                    <th className="pb-3 font-semibold">Renforcée</th>
                  </tr>
                </thead>
                <tbody>
                  {report.comparisonRows.map((row) => (
                    <tr key={row.theme} className="align-top border-b border-slate-100">
                      <td className="py-4 pr-4 font-semibold text-slate-900">{row.theme}</td>
                      <td className="py-4 pr-4 text-slate-700">{row.standard}</td>
                      <td className="py-4 text-slate-700">{row.renforcee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionShell>

          <SectionShell
            title="6. Exemples concrets de sinistres couverts et non couverts"
            description="Les scénarios ci-dessous sont des illustrations pédagogiques, à relire au prisme du wording de la police."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="text-base font-semibold text-emerald-900">Exemples généralement couverts</h3>
                <div className="mt-4 space-y-4">
                  {report.coveredExamples.map((example) => (
                    <article key={example.cas} className="rounded-2xl border border-emerald-100 bg-white p-4">
                      <p className="font-medium text-slate-900">{example.cas}</p>
                      <p className="mt-2 text-sm font-semibold text-emerald-800">{example.resultat}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">{example.explication}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <h3 className="text-base font-semibold text-rose-900">Exemples généralement non couverts</h3>
                <div className="mt-4 space-y-4">
                  {report.excludedExamples.map((example) => (
                    <article key={example.cas} className="rounded-2xl border border-rose-100 bg-white p-4">
                      <p className="font-medium text-slate-900">{example.cas}</p>
                      <p className="mt-2 text-sm font-semibold text-rose-800">{example.resultat}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">{example.explication}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            title="7. Conséquences juridiques et financières des défauts non couverts"
            description="Pourquoi l'analyse des exclusions et exceptions est centrale avant émission de la police."
          >
            <ul className="space-y-3 text-sm leading-relaxed text-slate-700">
              {report.consequences.map((item) => (
                <li key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mt-0.5 text-violet-700">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </SectionShell>

          <SectionShell
            title="8. Recommandations opérationnelles"
            description="Recommandations adaptées aux acheteurs, prêteurs, investisseurs et professionnels."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {report.recommendations.map((group) => (
                <article key={group.audience} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">{group.audience}</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-0.5 text-violet-700">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            title="9. Tableau récapitulatif"
            description="Vue consolidée : risques couverts, risques exclus et garanties complémentaires envisageables."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-900">
                    <th className="pb-3 pr-4 font-semibold">Risque / famille</th>
                    <th className="pb-3 pr-4 font-semibold">Risques couverts</th>
                    <th className="pb-3 pr-4 font-semibold">Risques exclus / limites</th>
                    <th className="pb-3 font-semibold">Garanties complémentaires possibles</th>
                  </tr>
                </thead>
                <tbody>
                  {report.summaryRows.map((row) => (
                    <tr key={row.risque} className="align-top border-b border-slate-100">
                      <td className="py-4 pr-4 font-semibold text-slate-900">{row.risque}</td>
                      <td className="py-4 pr-4 text-slate-700">{row.couvert}</td>
                      <td className="py-4 pr-4 text-slate-700">{row.exclu}</td>
                      <td className="py-4 text-slate-700">{row.complementaire}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-900">Garanties complémentaires / outils à envisager</h3>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {report.complementaryGuarantees.map((item) => (
                  <li key={item} className="flex gap-3 rounded-xl bg-white p-3 text-sm text-slate-700 border border-slate-200">
                    <span className="mt-0.5 text-violet-700">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </SectionShell>

          <SectionShell
            title="10. Sources et références"
            description="Normes ALTA, sources juridiques et meilleures pratiques du secteur utilisées pour cette synthèse."
          >
            <div className="space-y-3">
              {report.sources.map((source) => (
                <article key={source.url} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    {source.label}
                  </a>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{source.note}</p>
                </article>
              ))}
            </div>
          </SectionShell>
        </div>
      </div>
    </main>
  )
}
