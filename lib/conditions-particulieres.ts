import { decennaleGarantieRows } from "@/lib/decennale-garanties-affichage"
import { DO_GARANTIES_LEGALES } from "@/lib/nomenclature-activites"
import { DEFAULT_PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact-email"
import { SITE_URL } from "@/lib/site-url"

/**
 * Rubriques que les conditions particulières du marché indiquent toujours
 * (activités, zone, franchise, plafonds, durée, paiement).
 * Texte propre à Optimum : les conditions générales des concurrents ne sont pas reprises.
 */

export const DECENNALE_CP_CADRE = [
  "En cas de divergence, les conditions particulières prévalent sur les conditions générales.",
  "Seules les activités inscrites au contrat sont garanties. Une activité exercée mais absente de cette liste n'est pas couverte.",
  "Zone d'intervention : France métropolitaine, pour les travaux qui correspondent aux activités déclarées.",
  "La franchise s'applique par sinistre. Pour la garantie décennale obligatoire, elle reste à la charge de l'assuré et n'est pas opposable au maître d'ouvrage.",
  "Le plafond de la responsabilité civile décennale s'applique par sinistre. Lorsqu'un chiffre d'affaires annuel est déclaré, ce plafond est égal à deux fois ce chiffre d'affaires.",
  "Les techniques non courantes et les procédés qui s'écartent des activités déclarées doivent être signalés avant le début des travaux. À défaut, ils restent hors garantie.",
  "Les travaux confiés en sous-traitance ne sont couverts que s'ils entrent dans les activités déclarées.",
  "Durée : contrat annuel, reconduit sauf résiliation dans les formes prévues, au plus tard deux mois avant l'échéance, après une première année.",
  "Paiement : prime annuelle TTC, fractionnée par trimestre. Le premier règlement suit le parcours de souscription, les échéances suivantes le prélèvement SEPA.",
] as const

/** Validité des propositions DO émises par Optimum (devis dommage ouvrage). */
export const DO_QUOTE_VALIDITY_DAYS = 90

/** Plafond de coût déjà retenu sur les propositions générées (honoraires et existants inclus). */
export const DO_COUT_MAX_PROPOSITION_LABEL = "1 000 000 EUR TTC (honoraires et existants inclus)"

/** Mentions déjà publiées par Optimum (mentions légales, CGV, Code des assurances). */
export const DO_MENTIONS_JURIDIQUES = [
  "Courtier : Optimum Courtage, RCS Angers 450 788 278, ORIAS LPS 28931947 (libre prestation de services), siège 14 rue d'Amboise, 49300 Cholet. Assurance de responsabilité civile professionnelle et garantie financière conformes aux articles L.512-6 et L.512-7 du Code des assurances.",
  "Contrôle : Autorité de contrôle prudentiel et de résolution (ACPR), 4 place de Budapest, CS 92459, 75436 Paris Cedex 09.",
  `Déclaration de sinistre : l'assuré la transmet par écrit à ${DEFAULT_PUBLIC_CONTACT_EMAIL}, avec la description des dommages, leur date d'apparition et les pièces du chantier. Au titre de l'article L.242-1 du Code des assurances, l'assureur notifie sa décision sur le principe de la garantie dans les 60 jours de la réception de la déclaration, puis présente une offre d'indemnité dans les 90 jours lorsque la garantie est acquise.`,
  "Réclamation : elle est d'abord adressée au courtier. Sans réponse satisfaisante, le souscripteur peut saisir gratuitement La Médiation de l'Assurance, TSA 50110, 75441 Paris Cedex 09, www.mediation-assurance.org, sans préjudice d'une action en justice.",
  "Prescription : deux ans à compter de l'événement qui y donne naissance, selon l'article L.114-1 du Code des assurances, sous réserve des causes d'interruption de l'article L.114-2.",
  "Lorsqu'une personne physique souscrit à distance ou hors établissement en dehors de son activité professionnelle, elle peut renoncer au contrat pendant quatorze jours calendaires, dans les conditions de l'article L.112-2-1 du Code des assurances. La demande d'exécution immédiate avant la fin de ce délai laisse due la prime correspondant à la période déjà courue.",
  `Données personnelles : traitement pour l'étude du risque, la souscription et la gestion du contrat. Droits d'accès, de rectification, d'effacement, d'opposition, de limitation et de portabilité auprès de ${DEFAULT_PUBLIC_CONTACT_EMAIL}. Politique : ${SITE_URL}/confidentialite.`,
  "Lutte contre le blanchiment : des justificatifs d'identité et d'origine des fonds peuvent être demandés. Le refus de les transmettre bloque le dossier.",
] as const

export const DO_CP_CADRE = [
  "En cas de divergence, les conditions particulières prévalent sur les conditions générales.",
  "Le contrat est composé des présentes conditions particulières, du questionnaire d'étude du risque et des conditions générales remises au souscripteur.",
  "La garantie dommages-ouvrage est attachée à l'ouvrage désigné, pour les travaux décrits aux présentes. Seule l'assurance obligatoire des articles L.242-1 et L.242-2 du Code des assurances est acquise, sauf mention contraire.",
  "L'assurance s'applique aux opérations situées en France métropolitaine, en Corse, en Guadeloupe, en Martinique, en Guyane et à La Réunion, à l'adresse de chantier indiquée.",
  "Franchise : aucune sur la garantie obligatoire dommages-ouvrage.",
  "Habitation : indemnisation à hauteur du coût de réparation des dommages. Hors habitation : à hauteur du coût de réparation, dans la limite du coût total de construction déclaré.",
  "Les garanties sont conditionnées au coût total de construction déclaré, honoraires et existants inclus, et à une souscription antérieure à la réception de l'ouvrage.",
  "La prise d'effet est conditionnée à l'encaissement de la prime et au retour des conditions particulières signées.",
  "Si le coût définitif dépasse de plus de 10 % le coût prévisionnel déclaré, la prime est ajustée au même taux et un avenant est établi.",
  "Lorsque la prime a été calculée hors taxes, les indemnités sont réglées hors taxes jusqu'à l'avenant qui intègre la TVA.",
  "En cas de vente de l'ouvrage, l'assuré en informe l'assureur et l'acquéreur. Si la garantie est limitée au clos et couvert, cette limitation est indiquée aux acquéreurs et figure sur les actes.",
  "Seuls les intervenants déclarés au questionnaire, avec le lot qu'ils réalisent, sont des réalisateurs. Tout intervenant nouveau est déclaré avant son intervention.",
  "Dans le mois qui suit la fin des travaux, l'assuré remet la déclaration d'achèvement, le décompte définitif signé par le maître d'ouvrage, les procès-verbaux de réception signés, la levée des réserves, les factures des intervenants et les attestations de responsabilité civile décennale valables à l'ouverture du chantier. À défaut de remise, la garantie est suspendue en cas de sinistre.",
  "Le maître d'ouvrage déclare que chaque intervenant justifie de l'assurance prévue aux articles L.241-1 et L.241-2 du Code des assurances, et qu'il n'exécute pas lui-même une mission de maîtrise d'œuvre ni les travaux, sauf mention acceptée.",
  "Les déclarations du questionnaire sont déterminantes du consentement de l'assureur. Toute omission ou inexactitude relève des articles L.113-8 et L.113-9 du Code des assurances.",
  "Le souscripteur déclare ne pas être une personne politiquement exposée au sens de l'article R.561-18 du Code monétaire et financier, ni l'être son conjoint, ses enfants ou ses parents.",
  "Sont notamment exclus les sinistres connus du souscripteur avant la date d'effet et les travaux sur un ouvrage inscrit ou classé monument historique.",
  "Durée : garantie unique de dix ans à compter de la réception pour la garantie obligatoire. Cette garantie obligatoire n'est pas résiliable.",
  "Tout litige relatif au contrat relève du droit français et des tribunaux français.",
  "Protection juridique : défense et recours selon les conditions contractuelles applicables. L'indemnisation du sinistre incombe à l'assureur. Le courtier distribue le contrat et transmet la déclaration.",
  ...DO_MENTIONS_JURIDIQUES,
] as const

export const DO_GARANTIE_OBLIGATOIRE_LIGNE =
  "Garantie obligatoire dommages-ouvrage : souscrite, sans franchise. Habitation : à hauteur du coût de réparation des dommages. Hors habitation : à hauteur du coût de réparation, dans la limite du coût total de construction déclaré."

/** Garanties facultatives : absentes tant qu'elles ne sont pas cochées sur la proposition. */
export const DO_GARANTIES_NON_SOUSCRITES = [
  "Garanties complémentaires (bon fonctionnement des éléments d'équipement et dommages immatériels) : non souscrites, sauf mention expresse. Lorsqu'elles sont souscrites, leur plafond est de 15 % du coût total de la construction, épuisable.",
  "Garantie des dommages causés aux existants : non souscrite, sauf mention expresse. Lorsqu'elle est souscrite, elle est limitée au montant déclaré des existants, dans la limite de 250 000 EUR, épuisable.",
  "Constructeur non réalisateur, tous risques chantier et responsabilité civile du maître d'ouvrage : non souscrits, sauf mention expresse sur la proposition.",
] as const

export const DO_MISSIONS_OBLIGATOIRES = [
  "Étude de sol G2 AVP : construction neuve de plus de 300 000 EUR ; extension dont la surface créée dépasse de plus de 50 % la surface existante ; pente du terrain comprise entre 15 % et 30 % ; présence ou construction d'une piscine. Une pente supérieure à 30 % n'est pas garantie.",
  "Maître d'œuvre ou architecte en mission complète : à partir de 300 000 EUR de travaux.",
  "Contrôleur technique L, ou LE lorsqu'il existe des ouvrages existants : à partir de 500 000 EUR de travaux.",
  "Bureau d'études structure : à partir de R+3 en construction neuve, et en réhabilitation ou rénovation lorsqu'il y a atteinte à la structure porteuse.",
] as const

export const DO_PIECES_AVANT_CHANTIER = [
  "Proposition datée, paraphée et signée avec la mention « Bon pour accord ».",
  "Permis de construire ou déclaration préalable, plans, devis descriptif et planning des travaux.",
  "Extrait Kbis du maître d'ouvrage lorsqu'il s'agit d'une société.",
  "Étude de sol, convention et attestation décennale du maître d'œuvre, rapport et convention de contrôle technique, lorsque ces missions sont exigées.",
  "Attestations de responsabilité civile décennale, valables à l'ouverture du chantier, de tous les intervenants liés par un contrat de louage d'ouvrage.",
] as const

export const DO_PIECES_APRES_RECEPTION = [
  "Déclaration d'achèvement des travaux.",
  "Décompte définitif signé par le maître d'ouvrage, ventilé par corps d'état, honoraires inclus.",
  "Procès-verbaux de réception signés par le maître d'ouvrage et par l'entreprise, ainsi que la levée des réserves.",
  "Factures des intervenants et attestations de responsabilité civile décennale valables à l'ouverture du chantier.",
  "Rapport final du contrôle technique lorsque cette mission est exigée.",
] as const

export function doPropositionDetailLines(input?: {
  activities?: readonly string[]
  mode?: "proposition" | "contrat"
}): string[] {
  const mode = input?.mode ?? "proposition"
  const activities = (input?.activities ?? []).map((line) => line.trim()).filter(Boolean)
  const intro =
    mode === "contrat"
      ? "Le présent contrat répond à l'obligation d'assurance des articles L.242-1 et L.242-2 du Code des assurances pour l'ouvrage désigné. Seule l'assurance obligatoire est acquise, sauf mention contraire. La prise d'effet reste subordonnée à l'encaissement de la prime et à la signature des conditions particulières."
      : "Cette proposition répond à l'obligation d'assurance des articles L.242-1 et L.242-2 du Code des assurances pour l'ouvrage désigné. Seule l'assurance obligatoire est proposée, sauf mention contraire. Elle ne vaut pas garantie : la garantie suppose le questionnaire d'étude complet, le retour des conditions particulières signées et l'encaissement de la prime."

  return [
    intro,
    `Le coût total de la construction ne dépasse pas ${DO_COUT_MAX_PROPOSITION_LABEL}. La souscription intervient avant la réception de l'ouvrage.`,
    ...activities,
    DO_GARANTIE_OBLIGATOIRE_LIGNE,
    ...DO_GARANTIES_NON_SOUSCRITES,
    ...DO_MISSIONS_OBLIGATOIRES.map((mission) => `Mission exigée lorsque le chantier y répond : ${mission}`),
    "Lors de l'arrêté définitif des comptes, la prime est ajustée au même taux si le coût définitif dépasse de plus de 10 % le coût prévisionnel déclaré.",
    "Sont notamment exclus les sinistres connus avant la date d'effet et les travaux sur un ouvrage inscrit ou classé monument historique.",
    `Pièces à remettre avant l'ouverture du chantier : ${DO_PIECES_AVANT_CHANTIER.join(" ")}`,
    `Pièces de fin de chantier, dans le mois suivant l'achèvement : ${DO_PIECES_APRES_RECEPTION.join(" ")}`,
    mode === "contrat"
      ? "Les parties signent les conditions particulières. Le contrat et l'attestation émis font foi."
      : "Pour accepter l'offre, retournez la proposition datée et signée, chaque page paraphée, avec la mention « Bon pour accord ».",
  ]
}

export function decennaleGarantieClauseLines(data: {
  franchise?: unknown
  plafond?: unknown
  chiffreAffaires?: unknown
}): string[] {
  return decennaleGarantieRows(data).map(
    (row) => `${row.nom} — plafond ${row.plafond}, franchise ${row.franchise}. ${row.description}`
  )
}

export function doGarantieClauseLines(): string[] {
  return [DO_GARANTIES_LEGALES.I1, DO_GARANTIES_LEGALES.I2, DO_GARANTIES_LEGALES.I3].map(
    (row) => `${row.libelle} — ${row.duree}. ${row.description}`
  )
}

export function decennaleConditionsParticulieresLines(data: {
  franchise?: unknown
  plafond?: unknown
  chiffreAffaires?: unknown
} = {}): string[] {
  return [...DECENNALE_CP_CADRE, ...decennaleGarantieClauseLines(data)]
}

export function doConditionsParticulieresLines(): string[] {
  return [...DO_CP_CADRE, ...doGarantieClauseLines()]
}
