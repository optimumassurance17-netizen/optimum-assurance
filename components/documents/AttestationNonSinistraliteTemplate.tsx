"use client"

import { DocumentBrandHeader } from "@/components/documents/DocumentBrandHeader"

interface AttestationNonSinistraliteTemplateProps {
  numero: string
  data: {
    raisonSociale: string
    siret: string
    adresse?: string
    codePostal?: string
    ville?: string
    dateDebut: string
    dateFin: string
    motif: "jamais_assure" | "reprise_passe"
  }
}

/** Formate une date AAAA-MM-JJ en JJ/MM/AAAA */
function formatDateFr(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return [d, m, y].filter(Boolean).join("/")
}

export function AttestationNonSinistraliteTemplate({
  numero,
  data,
}: AttestationNonSinistraliteTemplateProps) {
  const dateDebutFr = formatDateFr(data.dateDebut)
  const dateFinFr = formatDateFr(data.dateFin)

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-sans text-black print:p-0">
      <DocumentBrandHeader tagline="Assurance décennale professionnelle" className="border-b-2 border-[#2563eb] pb-4 mb-8" />

      <h2 className="text-xl font-semibold mb-2 text-center">
        ATTESTATION DE NON SINISTRALITÉ
      </h2>
      <p className="text-center font-semibold mb-8 text-[#2563eb]">
        Responsabilité Civile Décennale
      </p>

      <p className="text-center mb-8">N° {numero}</p>

      <div className="border-2 border-[#E5E0D8] p-6 rounded-xl mb-8">
        <p className="mb-4">
          La société <strong>Optimum Assurance</strong> atteste que :
        </p>
        <p className="mb-2 font-semibold">{data.raisonSociale}</p>
        <p className="mb-2">SIRET : {data.siret}</p>
        {data.adresse && <p className="mb-2">{data.adresse}</p>}
        {(data.codePostal || data.ville) && (
          <p className="mb-4">
            {data.codePostal} {data.ville}
          </p>
        )}
        <p className="mb-4">
          n&apos;a déclaré <strong>aucun sinistre</strong> au titre de
          l&apos;assurance responsabilité civile décennale sur la période du{" "}
          <strong>{dateDebutFr}</strong> au <strong>{dateFinFr}</strong>.
        </p>
        {data.motif === "jamais_assure" && (
          <p className="text-sm text-[#171717]">
            Cette attestation est délivrée à la demande de l&apos;assuré, qui n&apos;avait
            jamais souscrit de contrat d&apos;assurance décennale avant la date de prise
            d&apos;effet du présent contrat.
          </p>
        )}
        {data.motif === "reprise_passe" && (
          <p className="text-sm text-[#171717]">
            Cette attestation concerne la période de reprise du passé (3 mois
            rétroactifs) prévue au contrat.
          </p>
        )}
      </div>

      <p className="text-sm">
        Fait à Paris, le {new Date().toLocaleDateString("fr-FR")}
      </p>
      <p className="text-sm mt-4">Pour Optimum Assurance</p>
    </div>
  )
}
