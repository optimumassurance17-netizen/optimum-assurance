"use client"

import { SITE_URL } from "@/lib/site-url"
import { DocumentBrandHeader } from "@/components/documents/DocumentBrandHeader"

/**
 * Facture acquittée dommage ouvrage.
 * Générée après validation du paiement, détaille les options souscrites.
 */
interface FactureDoTemplateProps {
  numero: string
  data: {
    raisonSociale: string
    adresse?: string
    codePostal?: string
    ville?: string
    email?: string
    adresseOperation?: string
    typeConstruction?: string
    destination?: string
    closCouvert: boolean
    primeAnnuelle: number
    fraisGestion: number
    fraisCourtage: number
    totalTTC: number
    datePaiement: string
    numeroDevis?: string
  }
}

export function FactureDoTemplate({ numero, data }: FactureDoTemplateProps) {
  const typeGarantie = data.closCouvert ? "Clos et couvert" : "DO complète"

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-sans text-black print:p-0 text-sm">
      <DocumentBrandHeader tagline="Assurance dommage ouvrage" />

      <h2 className="text-xl font-semibold mb-2 text-center">FACTURE ACQUITTÉE</h2>
      <p className="text-center text-[#171717] mb-6">Dommage Ouvrage</p>

      <div className="flex justify-between mb-6">
        <div>
          <p className="font-semibold text-black">Facture n° {numero}</p>
          {data.numeroDevis && (
            <p className="text-xs text-[#171717]">Devis de référence : {data.numeroDevis}</p>
          )}
          <p className="text-xs text-[#171717] mt-2">Date de paiement : {data.datePaiement}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-black">{data.raisonSociale}</p>
          {(data.adresse || data.codePostal || data.ville) && (
            <p className="text-xs text-[#171717]">
              {[data.adresse, data.codePostal, data.ville].filter(Boolean).join(", ")}
            </p>
          )}
          {data.email && (
            <p className="text-xs text-[#171717]">{data.email}</p>
          )}
        </div>
      </div>

      <div className="border-2 border-[#E5E0D8] rounded-xl overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="bg-[#dbeafe]">
              <th className="text-left p-3 font-semibold">Désignation</th>
              <th className="text-right p-3 font-semibold w-24">Montant TTC</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#E5E0D8]">
              <td className="p-3">
                <p className="font-medium">Assurance dommage ouvrage</p>
                <p className="text-xs text-[#171717]">Garantie : {typeGarantie}</p>
                {data.adresseOperation && (
                  <p className="text-xs text-[#171717]">Opération : {data.adresseOperation}</p>
                )}
              </td>
              <td className="p-3 text-right font-medium">
                {data.primeAnnuelle.toLocaleString("fr-FR")} €
              </td>
            </tr>
            {data.fraisGestion > 0 && (
              <tr className="border-t border-[#E5E0D8]">
                <td className="p-3">Frais de gestion</td>
                <td className="p-3 text-right">{data.fraisGestion.toLocaleString("fr-FR")} €</td>
              </tr>
            )}
            {data.fraisCourtage > 0 && (
              <tr className="border-t border-[#E5E0D8]">
                <td className="p-3">Frais de courtage</td>
                <td className="p-3 text-right">{data.fraisCourtage.toLocaleString("fr-FR")} €</td>
              </tr>
            )}
            <tr className="border-t-2 border-[#2563eb] bg-[#eff6ff]">
              <td className="p-3 font-bold">Total TTC</td>
              <td className="p-3 text-right font-bold text-lg">
                {data.totalTTC.toLocaleString("fr-FR")} €
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
        <span className="text-2xl">✓</span>
        <div>
          <p className="font-semibold text-green-800">Facture acquittée</p>
          <p className="text-sm text-green-700">
            Paiement reçu le {data.datePaiement}. Aucun montant restant dû.
          </p>
        </div>
      </div>

      <p className="text-xs text-[#171717]">
        TVA non applicable, article 293 B du CGI. Optimum Assurance — Assurance dommage ouvrage.
      </p>
      <p className="text-xs text-[#171717] mt-3">
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
      <p className="text-xs text-[#171717] mt-4">
        Fait à Paris, le {data.datePaiement}
      </p>
      <p className="text-xs font-medium mt-2">Pour Optimum Assurance</p>
    </div>
  )
}
