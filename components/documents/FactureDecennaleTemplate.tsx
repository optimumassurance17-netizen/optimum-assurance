"use client"

import { SITE_URL } from "@/lib/site-url"
import { DocumentBrandHeader } from "@/components/documents/DocumentBrandHeader"
import {
  COMPANY_BRAND,
  INSURER_NAME,
} from "@/lib/legal-branding"

/**
 * Facture acquittée — assurance décennale (1er trimestre CB + frais).
 * Parcours distinct du DO (`FactureDoTemplate`).
 */
export interface FactureDecennaleData {
  raisonSociale: string
  siret?: string
  email?: string
  adresse?: string
  codePostal?: string
  ville?: string
  primeAnnuelle: number
  fraisGestion: number
  montantPremierTrimestre: number
  montantTotalPaye: number
  datePaiement: string
}

interface FactureDecennaleTemplateProps {
  numero: string
  data: FactureDecennaleData
}

export function FactureDecennaleTemplate({ numero, data }: FactureDecennaleTemplateProps) {
  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-sans text-black print:p-0 text-sm">
      <DocumentBrandHeader tagline="Assurance décennale professionnelle" />

      <h2 className="text-xl font-semibold mb-2 text-center">FACTURE ACQUITTÉE</h2>
      <p className="text-center text-[#171717] mb-6">Premier trimestre et frais de gestion</p>

      <div className="flex justify-between mb-6">
        <div>
          <p className="font-semibold text-black">Facture n° {numero}</p>
          <p className="text-xs text-[#171717] mt-2">Date de paiement : {data.datePaiement}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-black">{data.raisonSociale}</p>
          {data.siret ? <p className="text-xs text-[#171717]">SIRET : {data.siret}</p> : null}
          {(data.adresse || data.codePostal || data.ville) && (
            <p className="text-xs text-[#171717]">
              {[data.adresse, data.codePostal, data.ville].filter(Boolean).join(", ")}
            </p>
          )}
          {data.email && <p className="text-xs text-[#171717]">{data.email}</p>}
        </div>
      </div>

      <div className="border-2 border-[#E5E0D8] rounded-xl overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="bg-[#dbeafe]">
              <th className="text-left p-3 font-semibold">Désignation</th>
              <th className="text-right p-3 font-semibold w-28">Montant TTC</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#E5E0D8]">
              <td className="p-3">
                <p className="font-medium">Assurance décennale — 1er trimestre (carte bancaire)</p>
                <p className="text-xs text-[#171717]">
                  Échéances suivantes : prélèvements SEPA trimestriels sur mandat
                </p>
              </td>
              <td className="p-3 text-right font-medium">
                {data.montantPremierTrimestre.toLocaleString("fr-FR")} €
              </td>
            </tr>
            <tr className="border-t border-[#E5E0D8]">
              <td className="p-3">Frais de gestion prélèvement (trimestriel)</td>
              <td className="p-3 text-right">{data.fraisGestion.toLocaleString("fr-FR")} €</td>
            </tr>
            <tr className="border-t-2 border-[#2563eb] bg-[#eff6ff]">
              <td className="p-3 font-bold">Total réglé</td>
              <td className="p-3 text-right font-bold text-lg">
                {data.montantTotalPaye.toLocaleString("fr-FR")} €
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#171717] mb-4">
        Prime annuelle de référence : {data.primeAnnuelle.toLocaleString("fr-FR")} €
      </p>

      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
        <span className="text-2xl">✓</span>
        <div>
          <p className="font-semibold text-green-800">Facture acquittée</p>
          <p className="text-sm text-green-700">
            Paiement reçu le {data.datePaiement}. Aucun montant restant dû sur cette facture.
          </p>
        </div>
      </div>

      <p className="text-xs text-[#171717]">
        TVA non applicable, article 293 B du CGI. {COMPANY_BRAND} — assurance décennale (Assureur : {INSURER_NAME}).
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
        En application du 2° de l&apos;article 261 C du CGI, sont exonérées de la taxe sur la valeur ajoutée (TVA) les
        opérations d&apos;assurance, de réassurance ainsi que les prestations de services afférentes à ces opérations
        effectuées par les courtiers et intermédiaires d&apos;assurance.
      </p>
      <p className="text-xs text-[#171717] mt-4">Fait à Paris, le {data.datePaiement}</p>
      <p className="text-xs font-medium mt-2">Pour {COMPANY_BRAND}</p>
    </div>
  )
}
