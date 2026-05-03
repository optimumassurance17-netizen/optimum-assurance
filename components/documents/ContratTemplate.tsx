"use client"

import { SITE_URL } from "@/lib/site-url"
import { getDevoirConseilContent } from "@/lib/devoir-conseil"
import { DECENNALE_EXCLUSIONS_AND_DECHEANCE_CLAUSE_TEXT } from "@/lib/decennale-legal-clauses"
import { extractStructuredActivities } from "@/lib/activity-hierarchy-format"
import { extractOptimizedExclusionLines } from "@/lib/optimized-exclusions"
import { DocumentBrandHeader } from "@/components/documents/DocumentBrandHeader"
import { INSURER_NAME } from "@/lib/legal-branding"

interface ContratTemplateProps {
  numero: string
  data: {
    raisonSociale: string
    siret: string
    adresse?: string
    codePostal?: string
    ville?: string
    email: string
    representantLegal?: string
    civilite?: string
    activites: string[]
    chiffreAffaires: number
    primeAnnuelle: number
    primeMensuelle?: number
    primeTrimestrielle?: number
    modePaiement?: "unique" | "prelevement"
    periodicitePrelevement?: "trimestriel"
    fraisGestionPrelevement?: number
    franchise: number
    plafond: number
    dateEffet: string
    dateEcheance: string
  }
}

export function ContratTemplate({ numero, data }: ContratTemplateProps) {
  const devoirConseil = getDevoirConseilContent("decennale")
  const activities = extractStructuredActivities(data)
  const optimizedExclusions = extractOptimizedExclusionLines(data)
  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-sans text-black print:p-0">
      <DocumentBrandHeader tagline="Assurance décennale professionnelle" className="border-b-2 border-[#2563eb] pb-4 mb-6" />

      <h2 className="text-xl font-semibold mb-6">CONTRAT D&apos;ASSURANCE DÉCENNALE</h2>
      <p className="font-semibold mb-6">N° {numero}</p>

      <div className="space-y-6 text-sm">
        <section>
          <h3 className="font-semibold mb-2">Article 1 - Parties</h3>
          <p><strong>L&apos;Assureur :</strong> {INSURER_NAME}</p>
          <p className="mt-2"><strong>L&apos;Assuré :</strong> {data.raisonSociale}</p>
          <p>SIRET : {data.siret}</p>
          {data.adresse && <p>{data.adresse}</p>}
          {(data.codePostal || data.ville) && <p>{data.codePostal} {data.ville}</p>}
          <p>Représenté par : {data.civilite || ""} {data.representantLegal || "—"}</p>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 2 - Objet</h3>
          <p className="whitespace-pre-line">
            Le présent contrat garantit la responsabilité civile décennale de l&apos;assuré pour les activités suivantes :{" "}
            {activities.join("\n")}.
          </p>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 3 - Période de garantie</h3>
          <p>Du {data.dateEffet} au {data.dateEcheance}</p>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 4 - Conditions financières</h3>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-2">Prime annuelle</td>
                <td className="text-right">{(data.primeAnnuelle ?? 0).toLocaleString("fr-FR")} € TTC</td>
              </tr>
              {data.modePaiement === "prelevement" && (
                <>
                  <tr className="border-b">
                    <td className="py-2">Mode de paiement</td>
                    <td className="text-right">Prélèvement trimestriel</td>
                  </tr>
                  {data.fraisGestionPrelevement != null && (
                    <tr className="border-b">
                      <td className="py-2">Frais de gestion (1er prélèvement)</td>
                      <td className="text-right">{data.fraisGestionPrelevement} €</td>
                    </tr>
                  )}
                  {(data.primeTrimestrielle != null || data.primeAnnuelle != null) && (
                    <tr className="border-b">
                      <td className="py-2">Montant par échéance trimestrielle</td>
                      <td className="text-right">
                        {(
                          data.primeTrimestrielle ??
                          (data.primeAnnuelle != null ? Math.round((data.primeAnnuelle / 4) * 100) / 100 : 0)
                        ).toLocaleString("fr-FR")}{" "}
                        €
                      </td>
                    </tr>
                  )}
                  {data.primeAnnuelle != null && (
                    <tr className="border-b">
                      <td className="py-2">Équivalent mensuel (indicatif)</td>
                      <td className="text-right">
                        {Math.round((data.primeAnnuelle / 12) * 100) / 100} €
                      </td>
                    </tr>
                  )}
                </>
              )}
              <tr className="border-b">
                <td className="py-2">Franchise</td>
                <td className="text-right">{(data.franchise ?? 0).toLocaleString("fr-FR")} €</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Plafond de garantie</td>
                <td className="text-right">{(data.plafond ?? 0).toLocaleString("fr-FR")} €</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 5 - Déclaration</h3>
          <p>Chiffre d&apos;affaires annuel déclaré : {data.chiffreAffaires.toLocaleString("fr-FR")} €</p>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 6 - Protection juridique</h3>
          <p>
            Une garantie de protection juridique est incluse, selon les conditions générales et particulières applicables.
          </p>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 7 - Résiliation</h3>
          <p>Les demandes de résiliation doivent être adressées par lettre recommandée au plus tard 2 mois avant la date d&apos;échéance (31 décembre). Un minimum d&apos;un an de contrat est requis avant toute résiliation à l&apos;échéance.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 8 - Exclusions et déchéance de garantie</h3>
          <p className="text-xs text-[#171717] whitespace-pre-line">
            {DECENNALE_EXCLUSIONS_AND_DECHEANCE_CLAUSE_TEXT}
          </p>
          {optimizedExclusions.length > 0 && (
            <div className="mt-3">
              <p className="font-semibold text-xs text-[#171717]">Ne sont pas couverts :</p>
              <ul className="list-disc list-inside text-xs text-[#171717] mt-1 space-y-1">
                {optimizedExclusions.map((line, index) => (
                  <li key={`optimized-exclusion-${index}`}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section>
          <h3 className="font-semibold mb-2">Article 9 - Devoir de conseil</h3>
          <p>{devoirConseil.contenu}</p>
          <p className="mt-2">
            Références :{" "}
            <a href={`${SITE_URL}${devoirConseil.lienCgv}`} className="text-[#2563eb] underline">
              CGV
            </a>
            {" — "}
            <a href={`${SITE_URL}${devoirConseil.lienAttestations}`} className="text-[#2563eb] underline">
              Conditions d&apos;émission et de validité des attestations
            </a>
            {" — "}
            <a href={`${SITE_URL}${devoirConseil.lienFaq}`} className="text-[#2563eb] underline">
              FAQ
            </a>
            {" — "}
            <a href={`${SITE_URL}${devoirConseil.lienGuide}`} className="text-[#2563eb] underline">
              Guide obligation
            </a>
          </p>
        </section>

        <p className="text-xs text-[#171717] mt-8">
          Les conditions générales du contrat sont annexées et font partie intégrante du présent contrat.
        </p>
        <p className="text-xs text-[#171717] mt-2">
          <a href={`${SITE_URL}/cgv`} className="text-[#2563eb] underline">
            CGV
          </a>
          {" — "}
          <a href={`${SITE_URL}/conditions-attestations`} className="text-[#2563eb] underline">
            Conditions d&apos;émission et de validité des attestations
          </a>
        </p>
        <p className="text-[10px] text-[#333333] mt-4 leading-tight">
          En application du 2° de l&apos;article 261 C du CGI, sont exonérées de la taxe sur la valeur ajoutée (TVA) les opérations d&apos;assurance, de réassurance ainsi que les prestations de services afférentes à ces opérations effectuées par les courtiers et intermédiaires d&apos;assurance.
        </p>
      </div>
    </div>
  )
}
