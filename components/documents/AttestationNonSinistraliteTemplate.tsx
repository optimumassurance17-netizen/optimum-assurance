"use client"

import { DocumentBrandHeader } from "@/components/documents/DocumentBrandHeader"
import { COMPANY_BRAND } from "@/lib/legal-branding"

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
        {data.motif === "reprise_passe"
          ? "ATTESTATION SUR L'HONNEUR DE NON-SINISTRALITÉ"
          : "ATTESTATION DE NON SINISTRALITÉ"}
      </h2>
      <p className="text-center font-semibold mb-8 text-[#2563eb]">
        Responsabilité Civile Décennale
      </p>

      <p className="text-center mb-8">N° {numero}</p>

      <div className="border-2 border-[#E5E0D8] p-6 rounded-xl mb-8">
        {data.motif === "reprise_passe" ? (
          <p className="mb-4">
            Je soussigné, représentant de <strong>{data.raisonSociale}</strong>
            {data.siret ? <> (SIRET : {data.siret})</> : null}
            {data.adresse || data.codePostal || data.ville
              ? <>, { [data.adresse, data.codePostal, data.ville].filter(Boolean).join(" ") }</>
              : null}
            , déclare sur l&apos;honneur n&apos;avoir déclaré <strong>aucun sinistre</strong> au
            titre de l&apos;assurance responsabilité civile décennale du{" "}
            <strong>{dateDebutFr}</strong> au <strong>{dateFinFr}</strong>.
          </p>
        ) : (
          <>
            <p className="mb-4">
              La société <strong>{COMPANY_BRAND}</strong> atteste que :
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
          </>
        )}
        {data.motif === "jamais_assure" && (
          <p className="text-sm text-[#171717]">
            Cette attestation est délivrée à la demande de l&apos;assuré, qui n&apos;avait
            jamais souscrit de contrat d&apos;assurance décennale avant la date de prise
            d&apos;effet du présent contrat.
          </p>
        )}
        {data.motif === "reprise_passe" && (
          <p className="text-sm text-[#171717]">
            Date de reprise du passé : <strong>{dateDebutFr}</strong>. Cette déclaration
            couvre la reprise du passé, au plus 3 mois avant l&apos;autorisation.
          </p>
        )}
      </div>

      <p className="text-sm mb-4">
        {data.motif === "reprise_passe"
          ? "Cette déclaration sur l'honneur est conservée au dossier. Elle ne prouve pas l'absence de responsabilité, ni l'absence de sinistre déclaré à un autre assureur. Elle ne vaut pas attestation d'assurance au sens de l'article L.241-1 du Code des assurances. Une déclaration inexacte relève des articles L.113-8 et L.113-9."
          : "Cette attestation constate seulement les sinistres déclarés à Optimum Courtage pour la période indiquée. Elle ne prouve pas l'absence de responsabilité, ni l'absence de sinistre déclaré à un autre assureur. Elle ne vaut pas attestation d'assurance au sens de l'article L.241-1 du Code des assurances. Une déclaration inexacte relève des articles L.113-8 et L.113-9. La reprise de chantiers déjà ouverts n'est acquise que si le contrat l'accepte expressément."}
      </p>
      {data.motif === "reprise_passe" ? (
        <>
          <p className="text-sm">Fait le {new Date().toLocaleDateString("fr-FR")}</p>
          <p className="text-sm mt-4">Le déclarant : {data.raisonSociale}</p>
        </>
      ) : (
        <>
          <p className="text-sm">Fait à Cholet, le {new Date().toLocaleDateString("fr-FR")}</p>
          <p className="text-sm mt-4">Pour {COMPANY_BRAND}</p>
        </>
      )}
    </div>
  )
}
