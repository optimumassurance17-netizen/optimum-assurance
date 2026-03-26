"use client"

import {
  garantiesDecennale,
} from "@/lib/garanties-data"
import {
  EXCLUSIONS_LEGALES_COMMUNES,
  DECHANCE_REGLE_ART,
  OUVRAGES_EXCLUS_DECENNALE,
  TRAVAUX_ACCESSOIRES_NOTE,
} from "@/lib/nomenclature-activites"

interface DevisTemplateProps {
  numero: string
  data: {
    raisonSociale: string
    siret: string
    adresse?: string
    codePostal?: string
    ville?: string
    activites: string[]
    chiffreAffaires: number
    primeAnnuelle: number
    /** Si absent, dérivé prime annuelle ÷ 12 */
    primeMensuelle?: number
    /** Si absent (anciens devis), dérivé de la prime annuelle */
    primeTrimestrielle?: number
    franchise: number
    plafond: number
    dateCreation?: string
    // Champs optionnels (modèle type Optimum)
    telephone?: string
    email?: string
    representantLegal?: string
    civilite?: string
    sinistres?: number
    jamaisAssure?: boolean
    resilieNonPaiement?: boolean
    reprisePasse?: boolean
  }
}

const COURTIER = {
  nom: "Optimum Courtage",
  orias: "21001707",
  email: "contact@optimum-assurance.fr",
  adresse: "14 Rue Amboise",
  codePostal: "49300",
  ville: "CHOLET",
}

export function DevisTemplate({ numero, data }: DevisTemplateProps) {
  const primeTrimestrielle =
    data.primeTrimestrielle ?? Math.round((data.primeAnnuelle / 4) * 100) / 100
  const primeMensuelle =
    data.primeMensuelle ?? Math.round((data.primeAnnuelle / 12) * 100) / 100
  const dateCreation = data.dateCreation || new Date().toLocaleDateString("fr-FR")
  const dateEffet = new Date().toLocaleDateString("fr-FR")
  const dateEcheance = new Date(new Date().getFullYear(), 11, 31).toLocaleDateString("fr-FR")

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-sans text-black print:p-0 text-sm">
      {/* En-tête */}
      <div className="border-b-2 border-[#C65D3B] pb-4 mb-6">
        <h1 className="text-xl font-bold text-[#C65D3B]">PROPOSITION D&apos;ASSURANCE</h1>
        <p className="text-sm font-semibold text-[#171717] mt-1">PRODUIT RCD</p>
        <p className="text-xs text-[#171717] mt-0.5">
          (Responsabilité Civile Décennale, Responsabilité Civile Professionnelle)
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-[#171717]">
          <span>Date d&apos;effet souhaitée : {dateEffet}</span>
          <span>Durée : 1 an avec tacite reconduction 01/01</span>
        </div>
        <p className="text-xs text-[#171717] mt-1">{`Dossier n° ${numero}`}</p>
      </div>

      {/* Proposition */}
      <div className="mb-6">
        <p className="font-semibold text-black">
          Proposition n° {numero} valable 2 mois à partir du {dateCreation}
        </p>
        <p className="text-xs text-[#171717] mt-0.5">
          Courtier de proximité : {COURTIER.nom} — ORIAS n° {COURTIER.orias} — {COURTIER.email}
        </p>
        <p className="text-xs text-[#171717]">
          {COURTIER.adresse} — {COURTIER.codePostal} {COURTIER.ville}
        </p>
      </div>

      {/* Informations du souscripteur */}
      <div className="mb-6">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Informations du souscripteur</h3>
        <p className="font-medium">{data.raisonSociale}</p>
        <p>SIRET : {data.siret}</p>
        {(data.adresse || data.codePostal || data.ville) && (
          <p>{[data.adresse, data.codePostal, data.ville].filter(Boolean).join(" — ")}</p>
        )}
        {data.telephone && <p>Téléphone : {data.telephone}</p>}
        {data.email && <p>Email : {data.email}</p>}
        {(data.representantLegal || data.civilite) && (
          <p>Identité du représentant légal : {[data.civilite, data.representantLegal].filter(Boolean).join(" ")}</p>
        )}
      </div>

      {/* Déclarations */}
      <div className="mb-6">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Déclarations du souscripteur</h3>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1 pr-4">Chiffre d&apos;affaires HT du dernier exercice fiscal</td>
              <td className="text-right font-medium">{data.chiffreAffaires.toLocaleString("fr-FR")} €</td>
            </tr>
            <tr>
              <td className="py-1 pr-4">Contrat d&apos;assurance RCD/RCP en cours</td>
              <td className="text-right">{data.jamaisAssure ? "Non" : "Oui"}</td>
            </tr>
            {data.sinistres != null && data.sinistres > 0 && (
              <tr>
                <td className="py-1 pr-4">Sinistres déclarés (24 derniers mois)</td>
                <td className="text-right">{data.sinistres} sinistre(s)</td>
              </tr>
            )}
            {data.resilieNonPaiement && (
              <tr>
                <td className="py-1 pr-4">Résilié pour non-paiement (24 derniers mois)</td>
                <td className="text-right">Oui</td>
              </tr>
            )}
            {data.reprisePasse && (
              <tr>
                <td className="py-1 pr-4">Reprise du passé</td>
                <td className="text-right">Oui</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Activités professionnelles */}
      <div className="mb-6">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Activités professionnelles exercées</h3>
        <p>{data.activites.join(", ")}</p>
      </div>

      {/* Garanties proposées */}
      <div className="mb-6">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Objet des garanties, montants & franchises</h3>
        <p className="text-xs text-[#171717] mb-3">
          La présente proposition a pour objet d&apos;offrir la garantie de la responsabilité décennale du souscripteur
          conformément aux articles L.241-1 et L.241-2 du Code des assurances.
        </p>
        <table className="w-full border-collapse border border-[#e5e5e5]">
          <thead>
            <tr className="bg-[#F5E8E3]">
              <th className="border border-[#e5e5e5] p-2 text-left text-xs">Garanties</th>
              <th className="border border-[#e5e5e5] p-2 text-left text-xs">Description</th>
              <th className="border border-[#e5e5e5] p-2 text-right text-xs">Plafond</th>
              <th className="border border-[#e5e5e5] p-2 text-right text-xs">Franchise</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#e5e5e5] p-2 text-xs font-medium">{garantiesDecennale[0].nom}</td>
              <td className="border border-[#e5e5e5] p-2 text-xs text-[#171717]">{garantiesDecennale[0].description}</td>
              <td className="border border-[#e5e5e5] p-2 text-right font-medium">{data.plafond.toLocaleString("fr-FR")} €</td>
              <td className="border border-[#e5e5e5] p-2 text-right">{data.franchise.toLocaleString("fr-FR")} €</td>
            </tr>
            <tr>
              <td className="border border-[#e5e5e5] p-2 text-xs font-medium">{garantiesDecennale[1].nom}</td>
              <td className="border border-[#e5e5e5] p-2 text-xs text-[#171717]">{garantiesDecennale[1].description}</td>
              <td className="border border-[#e5e5e5] p-2 text-right">{garantiesDecennale[1].plafond}</td>
              <td className="border border-[#e5e5e5] p-2 text-right">{garantiesDecennale[1].franchise}</td>
            </tr>
            <tr>
              <td className="border border-[#e5e5e5] p-2 text-xs font-medium">{garantiesDecennale[2].nom}</td>
              <td className="border border-[#e5e5e5] p-2 text-xs text-[#171717]">{garantiesDecennale[2].description}</td>
              <td className="border border-[#e5e5e5] p-2 text-right">{garantiesDecennale[2].plafond}</td>
              <td className="border border-[#e5e5e5] p-2 text-right">{garantiesDecennale[2].franchise}</td>
            </tr>
            <tr>
              <td className="border border-[#e5e5e5] p-2 text-xs font-medium">{garantiesDecennale[3].nom}</td>
              <td className="border border-[#e5e5e5] p-2 text-xs text-[#171717]">{garantiesDecennale[3].description}</td>
              <td className="border border-[#e5e5e5] p-2 text-right">{garantiesDecennale[3].plafond}</td>
              <td className="border border-[#e5e5e5] p-2 text-right">{garantiesDecennale[3].franchise}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Exclusions */}
      <div className="mb-6">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Exclusions de garantie</h3>
        <p className="text-xs text-[#171717] mb-2">
          Conformément à l&apos;article A243-1 du Code des assurances, seules les exclusions suivantes sont opposables au tiers :
        </p>
        <ul className="list-disc list-inside text-xs text-[#171717] space-y-1 mb-3">
          {EXCLUSIONS_LEGALES_COMMUNES.map((ex, i) => (
            <li key={i}>{ex}</li>
          ))}
        </ul>
        <p className="text-xs text-[#171717] mb-2 font-medium">{DECHANCE_REGLE_ART}</p>
        <p className="text-xs text-[#171717] mb-2">Ouvrages exclus de la garantie décennale obligatoire (art. L.243-1-1) :</p>
        <ul className="list-disc list-inside text-xs text-[#171717] space-y-1 mb-2">
          {OUVRAGES_EXCLUS_DECENNALE.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
        <p className="text-xs text-[#171717] italic">{TRAVAUX_ACCESSOIRES_NOTE}</p>
      </div>

      {/* Prime annuelle */}
      <div className="bg-[#F5E8E3] p-6 rounded-xl mb-6">
        <h3 className="font-bold text-black mb-4">Prime annuelle</h3>
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2">Prime annuelle TTC</td>
              <td className="text-right font-bold text-lg">{data.primeAnnuelle.toLocaleString("fr-FR")} €</td>
            </tr>
            <tr>
              <td className="py-2">Équivalent mensuel TTC (prime ÷ 12)</td>
              <td className="text-right font-semibold">{primeMensuelle.toLocaleString("fr-FR")} €</td>
            </tr>
            <tr>
              <td className="py-2">Prime trimestrielle TTC — montant par échéance (hors 1er paiement CB + frais)</td>
              <td className="text-right font-semibold">{primeTrimestrielle.toLocaleString("fr-FR")} €</td>
            </tr>
            <tr>
              <td className="py-2">Période de garantie</td>
              <td className="text-right">{dateEffet} — {dateEcheance}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-[#171717] mt-4">
          * La prime est révisable chaque année en fonction de l&apos;évolution du chiffre d&apos;affaires déclaré.
        </p>
      </div>

      {/* Pièces à fournir */}
      <div className="mb-6">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Pièces à fournir</h3>
        <ul className="list-disc list-inside text-xs text-[#171717] space-y-1">
          <li>KBIS ou extrait de la chambre des métiers</li>
          <li>Pièce d&apos;identité du représentant légal</li>
          <li>Attestation de non-sinistralité (si applicable)</li>
          <li>RIB pour le prélèvement SEPA</li>
        </ul>
      </div>

      {/* Validité */}
      <p className="text-xs text-[#171717] border-t border-[#e5e5e5] pt-4 mt-6">
        Ce devis est valable 2 mois à compter de sa date d&apos;émission. Les conditions générales sont disponibles sur demande.
        La prise d&apos;effet des garanties est conditionnée à l&apos;encaissement de la première cotisation et au retour
        de la proposition signée.
      </p>
      <p className="text-[10px] text-[#333333] mt-4 leading-tight">
        En application du 2° de l&apos;article 261 C du CGI, sont exonérées de la taxe sur la valeur ajoutée (TVA) les opérations d&apos;assurance, de réassurance ainsi que les prestations de services afférentes à ces opérations effectuées par les courtiers et intermédiaires d&apos;assurance.
      </p>
    </div>
  )
}
