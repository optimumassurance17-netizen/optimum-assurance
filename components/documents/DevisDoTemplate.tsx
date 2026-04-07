"use client"

import { SITE_URL } from "@/lib/site-url"
import {
  DO_GARANTIES_LEGALES,
  DO_EXCLUSIONS,
  DO_OUVRAGES_EXCLUS_ABSOLUS,
  DO_OUVRAGES_EXCLUS_RELATIFS,
  DO_LOTS_CLOS_COUVERT,
  DO_LOTS_EXCLUS_CLOS_COUVERT,
  ELEMENTS_DISSOCIABLES_NOTE,
} from "@/lib/nomenclature-activites"
import { COMPANY_BRAND, INSURER_NAME, LEGAL_ORIAS_LINE } from "@/lib/legal-branding"
import { PROTECTION_JURIDIQUE_GARANTIE_EUR } from "@/lib/legal-protection"

/**
 * Template de proposition d'assurance dommage ouvrage.
 * Référence : docs/reference/Proposition-853957.pdf (modèle Optimum DO)
 */

interface DevisDoTemplateProps {
  numero: string
  data: {
    raisonSociale?: string
    email?: string
    telephone?: string
    adresseOperation?: string
    primeAnnuelle: number
    coutConstruction?: number
    tranche?: string
    dateCreation?: string
    // Optionnels (modèle type Optimum DO)
    typeConstruction?: string
    destination?: string
    closCouvert?: boolean
    fraisGestion?: number
    fraisCourtage?: number
  }
}

const COURTIER = {
  nom: COMPANY_BRAND,
  email: "contact@optimum-assurance.fr",
  adresse: "14 Rue Amboise",
  codePostal: "49300",
  ville: "CHOLET",
} as const

export function DevisDoTemplate({ numero, data }: DevisDoTemplateProps) {
  const dateCreation = data.dateCreation || new Date().toLocaleDateString("fr-FR")
  const fraisGestion = data.fraisGestion ?? 0
  const fraisCourtage = data.fraisCourtage ?? 0
  const totalTTC = data.primeAnnuelle + fraisGestion + fraisCourtage

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-sans text-black print:p-0 text-sm">
      {/* En-tête */}
      <div className="border-b-2 border-[#2563eb] pb-4 mb-6">
        <h1 className="text-xl font-bold text-[#2563eb]">PROPOSITION D&apos;ASSURANCE</h1>
        <p className="text-lg font-semibold text-[#171717] mt-1">Dommage Ouvrage</p>
        <p className="font-medium text-black mt-2">
          Proposition n° {numero} — valable 90 jours à partir du {dateCreation}
        </p>
        <p className="text-xs text-[#171717] mt-1 uppercase">Assurance dommages - ouvrage</p>
        <p className="text-xs text-[#171717] mt-0.5">
          Assureur : {INSURER_NAME} — Courtier : {LEGAL_ORIAS_LINE} — {COURTIER.email}
        </p>
      </div>

      {/* Objet */}
      <div className="mb-6 text-xs text-[#171717]">
        <p>
          Cette proposition d&apos;assurance a pour objet de répondre conformément à la loi, à l&apos;obligation d&apos;assurance
          édictée aux articles L.242-1 et L.242-2 du Code des assurances exclusivement pour l&apos;ouvrage désigné ci-dessous.
        </p>
        <p className="mt-2">
          La garantie est conditionnée cumulativement : à la remise du questionnaire d&apos;étude complet, au retour des
          Conditions particulières signées ainsi qu&apos;à l&apos;encaissement effectif de la prime.
        </p>
      </div>

      {/* Conditions */}
      <div className="mb-6">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Conditions de la proposition</h3>
        <ul className="list-disc list-inside text-xs text-[#171717] space-y-1">
          <li>Le coût total de la construction ne dépasse pas 1 000 000 € TTC (honoraires et existants inclus)</li>
          <li>La souscription du contrat se réalise avant la réception de l&apos;ouvrage</li>
        </ul>
      </div>

      {/* Caractéristiques du risque */}
      <div className="mb-6">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Caractéristiques du risque</h3>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1 pr-4 text-[#171717]">Souscripteur</td>
              <td className="font-medium">{data.raisonSociale || data.email || "—"}</td>
            </tr>
            {data.telephone && (
              <tr>
                <td className="py-1 pr-4 text-[#171717]">Téléphone</td>
                <td>{data.telephone}</td>
              </tr>
            )}
            {data.email && (
              <tr>
                <td className="py-1 pr-4 text-[#171717]">Email</td>
                <td>{data.email}</td>
              </tr>
            )}
            {data.adresseOperation && (
              <tr>
                <td className="py-1 pr-4 text-[#171717]">Adresse de l&apos;opération</td>
                <td>{data.adresseOperation}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Opération de construction */}
      {(data.coutConstruction != null && data.coutConstruction > 0) && (
        <div className="mb-6">
          <h3 className="font-bold text-black mb-2 uppercase text-xs">Opération de construction</h3>
          <table className="w-full text-sm border-collapse border border-[#e5e5e5]">
            <tbody>
              <tr>
                <td className="border border-[#e5e5e5] p-2 text-[#171717]">Type de construction</td>
                <td className="border border-[#e5e5e5] p-2">{data.typeConstruction || "—"}</td>
              </tr>
              <tr>
                <td className="border border-[#e5e5e5] p-2 text-[#171717]">Clos et couvert</td>
                <td className="border border-[#e5e5e5] p-2">{data.closCouvert != null ? (data.closCouvert ? "Oui" : "Non") : "—"}</td>
              </tr>
              <tr>
                <td className="border border-[#e5e5e5] p-2 text-[#171717]">Destination</td>
                <td className="border border-[#e5e5e5] p-2">{data.destination || "—"}</td>
              </tr>
              <tr>
                <td className="border border-[#e5e5e5] p-2 text-[#171717]">Montant prévisionnel des travaux (TTC)</td>
                <td className="border border-[#e5e5e5] p-2 font-medium">{data.coutConstruction.toLocaleString("fr-FR")} €</td>
              </tr>
              {data.tranche && (
                <tr>
                  <td className="border border-[#e5e5e5] p-2 text-[#171717]">Tranche tarifaire</td>
                  <td className="border border-[#e5e5e5] p-2">{data.tranche}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Prime proposée */}
      <div className="bg-[#dbeafe] p-6 rounded-xl mb-6">
        <h3 className="font-bold text-black mb-4">Prime proposée</h3>
        <p className="text-xs text-[#171717] mb-3">Récapitulatif Tarif TTC</p>
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2">Dommages-ouvrage (DO)</td>
              <td className="text-right font-medium">{data.primeAnnuelle.toLocaleString("fr-FR")} €</td>
            </tr>
            {fraisGestion > 0 && (
              <tr>
                <td className="py-2">Frais de gestion</td>
                <td className="text-right">{fraisGestion.toLocaleString("fr-FR")} €</td>
              </tr>
            )}
            {fraisCourtage > 0 && (
              <tr>
                <td className="py-2">Frais de courtage</td>
                <td className="text-right">{fraisCourtage.toLocaleString("fr-FR")} €</td>
              </tr>
            )}
            <tr className="border-t-2 border-[#2563eb]/50">
              <td className="py-3 font-bold">Montant total de l&apos;offre TTC</td>
              <td className="text-right font-bold text-lg">{totalTTC.toLocaleString("fr-FR")} €</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Garanties proposées */}
      <div className="mb-6">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Garanties proposées</h3>
        <p className="text-xs text-[#171717] mb-3">
          DOMMAGES – OUVRAGE : Garantie obligatoire DO — Habitation : à hauteur du coût de réparation des dommages.
          Hors habitation : à hauteur du coût de réparation des dommages dans la limite du coût total de construction déclaré.
        </p>
        <p className="text-xs text-[#171717] mb-3">
          Protection juridique : défense/recours en cas de litige garanti, à hauteur de{" "}
          {PROTECTION_JURIDIQUE_GARANTIE_EUR.toLocaleString("fr-FR")} €.
        </p>
        <p className="text-xs text-[#171717] mb-3">Franchise : aucune (garantie obligatoire)</p>
        <p className="text-xs text-[#171717] mb-3">Validité : unique de 10 ans à partir de la signature. Non résiliable.</p>
        <table className="w-full border-collapse border border-[#e5e5e5] mb-3">
          <thead>
            <tr className="bg-[#dbeafe]">
              <th className="border border-[#e5e5e5] p-2 text-left text-xs">Garantie</th>
              <th className="border border-[#e5e5e5] p-2 text-left text-xs">Durée</th>
              <th className="border border-[#e5e5e5] p-2 text-left text-xs">Objet</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#e5e5e5] p-2 text-xs font-medium">{DO_GARANTIES_LEGALES.I1.libelle}</td>
              <td className="border border-[#e5e5e5] p-2 text-xs">{DO_GARANTIES_LEGALES.I1.duree}</td>
              <td className="border border-[#e5e5e5] p-2 text-xs text-[#171717]">{DO_GARANTIES_LEGALES.I1.description}</td>
            </tr>
            <tr>
              <td className="border border-[#e5e5e5] p-2 text-xs font-medium">{DO_GARANTIES_LEGALES.I2.libelle}</td>
              <td className="border border-[#e5e5e5] p-2 text-xs">{DO_GARANTIES_LEGALES.I2.duree}</td>
              <td className="border border-[#e5e5e5] p-2 text-xs text-[#171717]">{DO_GARANTIES_LEGALES.I2.description}</td>
            </tr>
            <tr>
              <td className="border border-[#e5e5e5] p-2 text-xs font-medium">{DO_GARANTIES_LEGALES.I3.libelle}</td>
              <td className="border border-[#e5e5e5] p-2 text-xs">{DO_GARANTIES_LEGALES.I3.duree}</td>
              <td className="border border-[#e5e5e5] p-2 text-xs text-[#171717]">{DO_GARANTIES_LEGALES.I3.description}</td>
            </tr>
          </tbody>
        </table>
        {data.closCouvert === true && (
          <div className="text-xs text-[#171717] mb-2 p-2 bg-[#dbeafe] rounded">
            <p className="font-medium mb-1">Option clos et couvert : lots couverts</p>
            <p>{DO_LOTS_CLOS_COUVERT.map((l) => l.lot).join(", ")}</p>
            <p className="mt-1 text-[#333333]">Lots non couverts : {DO_LOTS_EXCLUS_CLOS_COUVERT.join(", ")}</p>
          </div>
        )}
        <p className="text-xs text-[#171717] italic">{ELEMENTS_DISSOCIABLES_NOTE}</p>
      </div>

      {/* Ajustement prime */}
      <div className="mb-6 text-xs text-[#171717]">
        <p>
          Lors de l&apos;arrêté définitif des comptes, le montant de la prime pourra faire l&apos;objet d&apos;un ajustement au même
          taux en cas de dépassement de plus de 10 % du coût total de construction prévisionnel déclaré lors de la souscription.
        </p>
      </div>

      {/* Exclusions */}
      <div className="mb-6">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Exclusions</h3>
        <p className="text-xs text-[#171717] mb-2">Sont notamment exclus :</p>
        <ul className="list-disc list-inside text-xs text-[#171717] space-y-1 mb-3">
          {DO_EXCLUSIONS.map((ex, i) => (
            <li key={i}>{ex}</li>
          ))}
          <li>Sinistres ayant pour origine des faits ou circonstances connus du souscripteur, antérieurs à la date d&apos;effet</li>
          <li>Travaux réalisés sur des ouvrages inscrits ou classés monuments historiques</li>
        </ul>
        <p className="text-xs text-[#171717] mb-1 font-medium">Ouvrages exclus du champ obligatoire (ord. 8 juin 2005) :</p>
        <ul className="list-disc list-inside text-xs text-[#171717] space-y-1 mb-2">
          {DO_OUVRAGES_EXCLUS_ABSOLUS.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
        <p className="text-xs text-[#171717] mb-1">Exclusions relatives (sauf si accessoires à un ouvrage couvert) :</p>
        <ul className="list-disc list-inside text-xs text-[#171717] space-y-1">
          {DO_OUVRAGES_EXCLUS_RELATIFS.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </div>

      {/* Territorialité */}
      <div className="mb-6 text-xs text-[#171717]">
        <p>
          L&apos;assurance s&apos;applique aux dommages concernant des opérations de construction situées en France
          métropolitaine, Guadeloupe, Martinique, la Guyane et la Réunion.
        </p>
      </div>

      {/* Contact */}
      <div className="mb-6">
        <h3 className="font-bold text-black mb-2 uppercase text-xs">Contact</h3>
        <p className="text-xs text-[#171717]">
          Toute correspondance devra être adressée à votre courtier : {COURTIER.nom} — {COURTIER.adresse} — {COURTIER.codePostal} {COURTIER.ville} — {COURTIER.email}
        </p>
      </div>

      {/* Mentions légales */}
      <div className="mb-6 text-xs text-[#171717]">
        <h3 className="font-bold text-black mb-2 uppercase">Mentions légales</h3>
        <p>
          Assureur : {INSURER_NAME}. Distribution : {COMPANY_BRAND} ({LEGAL_ORIAS_LINE}). Siège social courtier :{" "}
          {COURTIER.adresse}, {COURTIER.codePostal} {COURTIER.ville}.
        </p>
      </div>

      {/* Déclarations */}
      <div className="mb-6 text-xs text-[#171717]">
        <h3 className="font-bold text-black mb-2 uppercase">Déclarations du souscripteur</h3>
        <p className="mb-2">
          Pour l&apos;établissement de cette proposition, vous reconnaissez agir en qualité de Maître d&apos;ouvrage et que les
          déclarations faites sont conformes à la réalité. Ces éléments sont essentiels et déterminants du consentement
          de l&apos;Assureur.
        </p>
        <p>
          Le candidat déclare avoir reçu et pris connaissance des{" "}
          <a href={`${SITE_URL}/conditions-generales-dommage-ouvrage`} className="text-[#2563eb] underline">
            conditions générales dommage ouvrage
          </a>{" "}
          et des{" "}
          <a href={`${SITE_URL}/cgv`} className="text-[#2563eb] underline">
            CGV
          </a>{" "}
          (modalités de distribution).
        </p>
      </div>

      {/* Conditions de validité */}
      <div className="border-t border-[#e5e5e5] pt-4 text-xs text-[#171717]">
        <h3 className="font-bold text-black mb-2 uppercase">Conditions de validité</h3>
        <p className="mb-2">
          Cette proposition est valable 90 jours. Si cette offre vous satisfait, merci de nous la retourner datée et signée
          avec la mention « BON POUR ACCORD », accompagnée du règlement à l&apos;ordre de OPTIMUM COURTAGE.
        </p>
        <p>
          Dès réception du règlement et des pièces constituant le dossier de base, nous vous adresserons la (les) note(s)
          de couverture.
        </p>
        <p className="mt-2">
          <a href={`${SITE_URL}/conditions-generales-dommage-ouvrage`} className="text-[#2563eb] underline">
            Conditions générales dommage ouvrage
          </a>
          {" — "}
          <a href={`${SITE_URL}/cgv`} className="text-[#2563eb] underline">
            CGV
          </a>
          {" — "}
          <a href={`${SITE_URL}/conditions-attestations`} className="text-[#2563eb] underline">
            Conditions d&apos;émission et de validité des attestations
          </a>
        </p>
      </div>
      <p className="text-[10px] text-[#333333] mt-4 leading-tight">
        En application du 2° de l&apos;article 261 C du CGI, sont exonérées de la taxe sur la valeur ajoutée (TVA) les opérations d&apos;assurance, de réassurance ainsi que les prestations de services afférentes à ces opérations effectuées par les courtiers et intermédiaires d&apos;assurance.
      </p>
    </div>
  )
}
