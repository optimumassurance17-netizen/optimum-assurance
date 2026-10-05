"use client"

import { QRCodeSVG } from "qrcode.react"
import { SITE_URL } from "@/lib/site-url"
import { DocumentBrandHeader } from "@/components/documents/DocumentBrandHeader"
import { COMPANY_BRAND } from "@/lib/legal-branding"
import { DO_GARANTIES_LEGALES } from "@/lib/nomenclature-activites"
import { ConditionsParticulieresNotes } from "@/components/documents/ConditionsParticulieresNotes"
import { doCadreCompletLines } from "@/lib/conditions-particulieres"

interface AttestationDoTemplateProps {
  numero: string
  verificationUrl?: string
  data: {
    raisonSociale: string
    adresseOperation?: string
    codePostal?: string
    ville?: string
    closCouvert: boolean
    primeAnnuelle: number
    dateSignature: string
    dateEcheance: string
  }
}

export function AttestationDoTemplate({ numero, verificationUrl, data }: AttestationDoTemplateProps) {
  const typeGarantie = data.closCouvert ? "Clos et couvert" : "DO complète"

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-sans text-black print:p-0">
      <DocumentBrandHeader tagline="Assurance dommage ouvrage" className="border-b-2 border-[#2563eb] pb-4 mb-8" />

      <h2 className="text-xl font-semibold mb-2 text-center">ATTESTATION D&apos;ASSURANCE</h2>
      <p className="text-center font-semibold mb-8 text-[#2563eb]">Dommage Ouvrage</p>

      <p className="text-center mb-8">N° {numero}</p>

      <div className="border-2 border-[#E5E0D8] p-6 rounded-xl mb-8">
        <p className="mb-4">
          La société <strong>{COMPANY_BRAND}</strong> atteste que :
        </p>
        <p className="mb-2 font-semibold">{data.raisonSociale}</p>
        {(data.adresseOperation || data.codePostal || data.ville) && (
          <p className="mb-4">
            {[data.adresseOperation, data.codePostal, data.ville].filter(Boolean).join(", ")}
          </p>
        )}
        <p className="mb-4">
          est garantie au titre de l&apos;<strong>assurance dommage ouvrage</strong>.
        </p>
        <p className="mb-2">
          <strong>Type de garantie :</strong> {typeGarantie}
        </p>
        <p className="mb-2">
          <strong>Validité :</strong> du <strong>{data.dateSignature}</strong> au <strong>{data.dateEcheance}</strong>.
          La garantie obligatoire court dix ans à compter de la réception et n&apos;est pas résiliable.
        </p>
        <p className="mb-2 text-sm text-[#171717]">
          Habitation : indemnisation à hauteur du coût de réparation des dommages. Hors habitation : à hauteur du coût
          de réparation, dans la limite du coût total de construction déclaré.
        </p>
        {data.closCouvert && (
          <p className="mb-2 text-sm text-[#171717]">
            Garantie limitée au clos et couvert. Cette limitation est indiquée aux acquéreurs et figure sur les actes.
          </p>
        )}
        <p className="mb-2 text-sm">Franchise : aucune (garantie obligatoire)</p>
        <p>Prime : {data.primeAnnuelle.toLocaleString("fr-FR")} € TTC</p>
      </div>

      <div className="mb-8">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Garanties</h3>
        <p className="text-xs text-[#171717] mb-3">
          DOMMAGES – OUVRAGE : garantie obligatoire. Habitation : à hauteur du coût de réparation des dommages. Hors
          habitation : à hauteur du coût de réparation des dommages dans la limite du coût total de construction déclaré.
        </p>
        <p className="text-xs text-[#171717] mb-3">
          Protection juridique : défense/recours en cas de litige garanti, selon les conditions contractuelles applicables.
        </p>
        <table className="w-full border-collapse border border-[#e5e5e5]">
          <thead>
            <tr className="bg-[#dbeafe]">
              <th className="border border-[#e5e5e5] p-2 text-left text-xs">Garantie</th>
              <th className="border border-[#e5e5e5] p-2 text-left text-xs">Durée</th>
              <th className="border border-[#e5e5e5] p-2 text-left text-xs">Objet</th>
            </tr>
          </thead>
          <tbody>
            {(["I1", "I2", "I3"] as const).map((key) => (
              <tr key={key}>
                <td className="border border-[#e5e5e5] p-2 text-xs font-medium">{DO_GARANTIES_LEGALES[key].libelle}</td>
                <td className="border border-[#e5e5e5] p-2 text-xs">{DO_GARANTIES_LEGALES[key].duree}</td>
                <td className="border border-[#e5e5e5] p-2 text-xs text-[#171717]">{DO_GARANTIES_LEGALES[key].description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ConditionsParticulieresNotes lines={doCadreCompletLines()} />
      </div>

      <p className="text-sm text-[#171717] mb-6">
        La présente attestation est délivrée pour justifier de l&apos;assurance obligatoire prévue aux articles L. 242-1 et L. 242-2 du Code des assurances.
      </p>
      <p className="text-xs text-[#171717] mb-6">
        <a href={`${SITE_URL}/conditions-attestations`} className="text-[#2563eb] underline">
          Conditions d&apos;émission et de validité des attestations
        </a>
      </p>

      {verificationUrl && (
        <div className="flex items-center gap-4 mb-8 print:flex">
          <QRCodeSVG value={verificationUrl} size={80} level="M" />
          <div className="text-xs text-[#171717]">
            <p className="font-medium text-black">Vérification en ligne</p>
            <p>Scannez le QR code pour vérifier l&apos;authenticité de cette attestation</p>
          </div>
        </div>
      )}

      <p className="text-sm">
        Fait à Cholet, le {new Date().toLocaleDateString("fr-FR")}
      </p>
      <p className="text-sm mt-4">Pour {COMPANY_BRAND}</p>
    </div>
  )
}
