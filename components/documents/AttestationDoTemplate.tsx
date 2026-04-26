"use client"

import { QRCodeSVG } from "qrcode.react"
import { SITE_URL } from "@/lib/site-url"
import { DocumentBrandHeader } from "@/components/documents/DocumentBrandHeader"

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
          La société <strong>Optimum Assurance</strong> atteste que :
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
          <strong>Validité :</strong> unique de 10 ans à partir de la signature — du{" "}
          <strong>{data.dateSignature}</strong> au <strong>{data.dateEcheance}</strong>. Non résiliable.
        </p>
        <p className="mb-2 text-sm text-[#171717]">
          La garantie couvre les dommages matériels affectant la solidité du bâtiment pendant la construction et jusqu&apos;à 10 ans après réception.
        </p>
        <p>Prime : {data.primeAnnuelle.toLocaleString("fr-FR")} € TTC</p>
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
        Fait à Paris, le {new Date().toLocaleDateString("fr-FR")}
      </p>
      <p className="text-sm mt-4">Pour Optimum Assurance</p>
    </div>
  )
}
