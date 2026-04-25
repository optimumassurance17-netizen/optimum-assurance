"use client"

import { QRCodeSVG } from "qrcode.react"
import { SITE_URL } from "@/lib/site-url"
import { extractStructuredActivities } from "@/lib/activity-hierarchy-format"
import { extractOptimizedExclusionLines } from "@/lib/optimized-exclusions"

interface AttestationTemplateProps {
  numero: string
  verificationUrl?: string
  data: {
    raisonSociale: string
    siret: string
    adresse?: string
    codePostal?: string
    ville?: string
    activites: string[]
    primeAnnuelle: number
    dateEffet: string
    dateEcheance: string
  }
}

export function AttestationTemplate({ numero, verificationUrl, data }: AttestationTemplateProps) {
  const activities = extractStructuredActivities(data)
  const optimizedExclusions = extractOptimizedExclusionLines(data)
  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-sans text-black print:p-0">
      <div className="border-b-2 border-[#2563eb] pb-4 mb-8">
        <h1 className="text-2xl font-bold text-[#2563eb]">Optimum Assurance</h1>
        <p className="text-sm text-[#171717]">Assurance décennale professionnelle</p>
      </div>

      <h2 className="text-xl font-semibold mb-2 text-center">ATTESTATION D&apos;ASSURANCE</h2>
      <p className="text-center font-semibold mb-8 text-[#2563eb]">Responsabilité Civile Décennale</p>

      <p className="text-center mb-8">N° {numero}</p>

      <div className="border-2 border-[#E5E0D8] p-6 rounded-xl mb-8">
        <p className="mb-4">
          La société <strong>Optimum Assurance</strong> atteste que :
        </p>
        <p className="mb-2 font-semibold">{data.raisonSociale}</p>
        <p className="mb-2">SIRET : {data.siret}</p>
        {data.adresse && <p className="mb-2">{data.adresse}</p>}
        {(data.codePostal || data.ville) && <p className="mb-4">{data.codePostal} {data.ville}</p>}
        <p className="mb-4">
          est garantie au titre de l&apos;<strong>assurance responsabilité civile décennale</strong> pour les activités de :
        </p>
        <p className="font-medium mb-4 whitespace-pre-line">{activities.join("\n")}</p>
        {optimizedExclusions.length > 0 && (
          <>
            <p className="mb-2 font-medium">Ne sont pas couverts :</p>
            <ul className="list-disc list-inside text-sm text-[#171717] mb-3 space-y-1">
              {optimizedExclusions.map((line, index) => (
                <li key={`optimized-exclusion-${index}`}>{line}</li>
              ))}
            </ul>
          </>
        )}
        <p className="mb-2">Période de validité : du <strong>{data.dateEffet}</strong> au <strong>{data.dateEcheance}</strong></p>
        <p className="mb-2 text-sm text-[#171717]">Renouvelable automatiquement du 01/01 au 31/12 des années suivantes.</p>
        <p>Prime annuelle : {data.primeAnnuelle.toLocaleString("fr-FR")} € TTC</p>
      </div>

      <p className="text-sm text-[#171717] mb-6">
        La présente attestation est délivrée pour justifier de l&apos;assurance obligatoire prévue à l&apos;article L. 241-1 du Code des assurances.
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
      <p className="text-sm mt-4">
        Pour Optimum Assurance
      </p>
    </div>
  )
}
