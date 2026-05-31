import { ASSURANCE_TITRE_RISQUE_OPTIONS } from "@/lib/assurance-titre-types"
import { DOC_TYPES_TITRE, UPLOAD_DOC_LABELS } from "@/lib/user-document-types"

type ReportListSection = {
  title: string
  items: string[]
  note?: string
}

type PolicyTypeRow = {
  police: string
  objet: string
  protege: string
  montant: string
  duree: string
  pointsClefs: string[]
}

type ComparisonRow = {
  theme: string
  standard: string
  renforcee: string
}

type CaseExample = {
  cas: string
  resultat: string
  explication: string
}

type RecommendationGroup = {
  audience: string
  items: string[]
}

type SummaryRow = {
  risque: string
  couvert: string
  exclu: string
  complementaire: string
}

type SourceLink = {
  label: string
  url: string
  note: string
}

const gedTitleDocuments = DOC_TYPES_TITRE.map((type) => UPLOAD_DOC_LABELS[type])
const trackedTitleRisks = ASSURANCE_TITRE_RISQUE_OPTIONS.map((option) => option.label)

export const ASSURANCE_TITRE_REFERENCE_REPORT = {
  title: "Référentiel Assurance titre — garanties, exclusions et points de vigilance",
  updatedAt: "31 mai 2026",
  disclaimer:
    "Ce rapport synthétise les documents internes actuellement disponibles dans la plateforme Assurance titre (questionnaires, GED, devoir de conseil, PDF contractuels) et les références sectorielles ALTA / CFPB / Fannie Mae. Il ne remplace ni la police effectivement émise, ni les conditions particulières signées, ni le Schedule B, ni les endorsements négociés, ni l'analyse d'un notaire ou d'un avocat.",
  executiveSummary: [
    "L'assurance titre est une assurance d'indemnisation contre des défauts de titre, privilèges, charges, erreurs de chaîne de propriété ou vices documentaires existant en principe avant la date de la police, mais découverts après la transaction.",
    "La police propriétaire protège l'acquéreur et sa valeur patrimoniale ; la police prêteur protège la priorité et l'opposabilité de la sûreté du financeur. Une police prêteur seule ne protège pas l'équité de l'acheteur.",
    "Les exclusions standards restent nombreuses (urbanisme, police des constructions, pollution, expropriation, faits connus non déclarés, faits créés par l'assuré, événements postérieurs à la police). Les exceptions particulières du Schedule B et les limitations de garantie sont aussi déterminantes que les risques couverts.",
  ],
  internalCorpus: [
    {
      title: "Corpus interne analysé",
      items: [
        "Formulaire public Assurance titre : qualification du dossier, type d'opération, actif, montant, calendrier et risques déjà identifiés.",
        "Questionnaire d'étude Assurance titre : parties prenantes, cadastre, occupation, contentieux, urgence de closing et liste des pièces disponibles.",
        `GED Assurance titre : ${gedTitleDocuments.join(", ")}.`,
        "PDF Assurance titre (conditions particulières et attestation) : rappel des limites, exclusions, plafonds et devoir de conseil, avec activation après validation assureur et paiement.",
        "Texte de devoir de conseil : confirmation par le client de la prise de connaissance des garanties, exclusions, plafonds et limites.",
      ],
      note:
        "Le dépôt décrit aujourd'hui un produit d'étude sur dossier et de contractualisation digitale ; il ne contient pas encore une bibliothèque exhaustive de clauses générales Assurance titre comparable aux clauses légales déjà codées pour d'autres produits.",
    },
    {
      title: "Points de vigilance suivis nativement dans le produit",
      items: trackedTitleRisks.map((risk) => `${risk}.`),
      note:
        "Ces risques structurent le questionnaire et le snapshot contractuel ; ils servent d'entrée de souscription mais ne valent pas, à eux seuls, garantie automatique.",
    },
  ] satisfies ReportListSection[],
  definition: [
    "L'assurance titre a pour objet de sécuriser une acquisition, un refinancement ou une opération immobilière complexe lorsqu'un défaut juridique du titre, de la chaîne de propriété, des inscriptions ou de l'opposabilité des droits peut porter atteinte à la propriété, à la valeur de l'actif ou à la sûreté du prêteur.",
    "À la différence d'une assurance dommages classique qui couvre un sinistre futur, l'assurance titre vise surtout des causes antérieures ou concomitantes à la date de la police, parfois inconnues au closing, mais produisant leurs effets après coup. Elle intervient typiquement en indemnisation, en défense juridique, en cure du titre ou par prise en charge de frais nécessaires pour préserver la propriété ou le rang de l'hypothèque.",
  ],
  policyTypes: [
    {
      police: "Police propriétaire (Owner's Policy)",
      objet: "Protège le propriétaire / l'acquéreur.",
      protege:
        "L'intérêt patrimonial du propriétaire, la validité de son droit de propriété, la valeur de revente et la marketability du titre.",
      montant: "En général aligné sur le prix d'acquisition ou l'assiette assurée au jour de l'émission.",
      duree:
        "Continue en principe tant que l'assuré conserve son intérêt sur l'actif, avec extensions possibles à certains héritiers, trustees ou affiliés selon la forme de police.",
      pointsClefs: [
        "Utile même si le prêteur impose déjà une police prêteur : elle couvre l'acheteur, pas la banque.",
        "Peut exister en version standard ou renforcée (Homeowner / Enhanced) selon l'actif, l'éligibilité et le marché.",
      ],
    },
    {
      police: "Police prêteur (Loan / Lender's Policy)",
      objet: "Protège la sûreté du financeur.",
      protege:
        "La validité, la priorité et l'opposabilité de l'hypothèque / mortgage ainsi que le rang du prêteur sur l'immeuble.",
      montant:
        "Au moins égal, en pratique, au principal initial du prêt ; le capital assuré décroît en général avec l'amortissement de la dette.",
      duree: "Prend fin lors du remboursement ou de l'extinction de la créance garantie.",
      pointsClefs: [
        "Protège le prêteur, pas l'acheteur.",
        "Les exigences du marché secondaire s'alignent souvent sur les formes ALTA Loan 2006/2021 ou leurs équivalents d'État.",
      ],
    },
    {
      police: "Police renforcée / Enhanced / Homeowner / Expanded",
      objet: "Étend le périmètre de garantie au-delà de la police standard.",
      protege:
        "Selon la forme retenue : certains risques hors registre public, certains faits postérieurs à la police, certains litiges de limites, d'accès, d'empiètement, de zoning ou de permis.",
      montant:
        "Souvent assorti de plafonds spécifiques, de sous-limites, de déductibles et parfois d'un mécanisme d'augmentation automatique du montant assuré.",
      duree: "Peut inclure des protections post-policy ciblées et des bénéfices additionnels (ex. inflation coverage).",
      pointsClefs: [
        "Le terme Enhanced ne doit pas être confondu avec une simple suppression d'exceptions standard.",
        "L'étendue exacte dépend de la forme ALTA / state form, des endorsements et des critères d'éligibilité de l'assureur.",
      ],
    },
  ] satisfies PolicyTypeRow[],
  coveredRiskSections: [
    {
      title: "1. Privilèges, hypothèques et dettes cachées",
      items: [
        "En standard, les polices propriétaires et prêteurs couvrent généralement les hypothèques antérieures non radiées, les privilèges ou encumbrances existant à la date de police et non exceptés au Schedule B.",
        "La police prêteur est particulièrement centrée sur le rang, la priorité et l'opposabilité de la sûreté ; c'est un point de contrôle majeur côté financeur.",
        "Les liens fiscaux existants, charges de copropriété/HOA et inscriptions enregistrées mais non traitées peuvent relever d'un risque couvert s'ils ne sont pas expressément exceptés.",
      ],
      note:
        "Point d'attention : les taxes et assessments qui deviennent dues après la date de police ne sont en principe pas couvertes en standard.",
    },
    {
      title: "2. Erreurs d'enregistrement, de publicité foncière et fautes administratives",
      items: [
        "Défectuosité de l'enregistrement, erreurs de transcription, indexing défaillant, acknowledgments irréguliers ou défaut de formalités sur les actes.",
        "Défaillances d'e-signature / notarization ou enregistrement défectueux : le marché ALTA 2021 les traite plus explicitement qu'auparavant.",
        "Ces garanties sont importantes lorsque le titre paraît formellement propre mais devient contestable à cause d'une erreur de registre ou de formalité.",
      ],
    },
    {
      title: "3. Actes frauduleux, falsifiés, usurpation et chaîne de propriété viciée",
      items: [
        "La fraude, la falsification, l'usurpation d'identité, la duress, l'incapacité ou l'incompétence affectant un acte de transfert figurent parmi les covered risks classiques.",
        "Une vente par faux propriétaire, un acte signé au nom d'une personne sans pouvoir valable ou un pouvoir falsifié peuvent déclencher la garantie si le vice remonte avant la date de police.",
        "Certaines polices renforcées étendent même la couverture à des fraudes postérieures à la police (par exemple post-policy forgery / impersonation).",
      ],
    },
    {
      title: "4. Héritiers inconnus, revendications de tiers et litiges de propriété",
      items: [
        "Les polices standard couvrent normalement le cas où le titre est finalement vested autrement qu'indiqué dans la police ou qu'un tiers revendique un droit de propriété supérieur.",
        "Un héritier inconnu, un conjoint omis, un trust mal documenté ou une chaîne successorale incomplète peut remettre en cause la propriété et relever d'une action couverte.",
        "L'assureur peut alors défendre le titre, négocier une cure, indemniser la perte ou prendre des mesures correctives pour restaurer la marketability.",
      ],
    },
    {
      title: "5. Actes de transfert défectueux, défauts de titre et inmarketability",
      items: [
        "Improper execution, défaut de delivery, acte non valablement créé, absence de pouvoir ou capacité : ces vices peuvent affecter la validité d'un transfert et donc le titre lui-même.",
        "La notion de unmarketability of title vise le caractère juridiquement difficilement cessible ou finançable du titre, et non l'état physique du bien.",
        "Un défaut de titre peut ainsi bloquer une revente, un refinancement ou un closing futur même sans éviction matérielle immédiate.",
      ],
    },
    {
      title: "6. Limites de propriété, servitudes, accès, empiètements et survey matters",
      items: [
        "Le manque de droit d'accès légal à et depuis le terrain est un risque standard fréquemment visé.",
        "Les servitudes enregistrées ou non enregistrées, les boundary disputes et les encroachments sont plus sensibles : la couverture standard est souvent limitée par les exceptions d'arpentage ou le Schedule B.",
        "Une police renforcée ou des endorsements (par ex. ALTA 9, 28.1, 34.1 selon le montage) peuvent réintroduire une couverture pour certains empiètements, restrictions, minéraux ou exceptions identifiées.",
      ],
      note:
        "En pratique, les conflits de limites et survey matters sont l'un des grands sujets où la lecture des exceptions particulières est aussi importante que la police elle-même.",
    },
    {
      title: "7. Frais de défense et frais juridiques pris en charge",
      items: [
        "Sur un sinistre relevant de la police, l'assureur prend généralement en charge les coûts, attorneys' fees et expenses de défense du titre conformément aux conditions de police.",
        "La défense n'est pas illimitée : elle s'exerce dans le périmètre du risque assuré, sous réserve des exclusions, exceptions et conditions de notification / coopération.",
        "L'assureur conserve souvent l'option de défendre, de transiger, de corriger le défaut ou de payer la perte, selon ce qui est le plus approprié contractuellement.",
      ],
    },
  ] satisfies ReportListSection[],
  exclusionSections: [
    {
      title: "Exclusions standards (générales et habituellement non supprimables)",
      items: [
        "Lois, ordonnances, permis et réglementations gouvernementales, notamment relatives au zoning, à l'urbanisme, au permis de construire, à la subdivision et à la protection de l'environnement.",
        "Pouvoirs publics de police, regulatory power, forfeiture et eminent domain / expropriation.",
        "Défauts, charges, revendications ou autres matters créés, soufferts, assumés ou acceptés par l'assuré.",
        "Défauts connus de l'assuré mais non connus de l'assureur et non divulgués par écrit avant l'émission.",
        "Faits ne causant aucune perte indemnisable ou aucune perte juridiquement mesurable.",
        "Défauts, charges ou revendications qui s'attachent ou sont créés après la date de police, sauf si une police renforcée prévoit expressément une carve-back.",
        "Fraudulent transfer / creditors' rights / bankruptcy issues affectant la transaction assurée, selon la forme de police.",
        "Taxes et assessments devenant exigibles après la date de police.",
        "Écart de surface, de square footage ou d'acreage en l'absence de garantie spéciale.",
      ],
      note:
        "Ces exclusions ne doivent pas être confondues avec les exceptions particulières : elles figurent dans le corps de la police et valent pour tous les risques, sous réserve de carve-backs express.",
    },
    {
      title: "Exceptions particulières (Schedule B / exceptions identifiées)",
      items: [
        "Servitudes de passage, utility easements, drainage easements et rights-of-way déjà identifiés.",
        "Restrictive covenants, CC&R, règlements de lotissement, party wall agreements ou conventions d'usage affectant le bien.",
        "Survey exception générale (off-record matters, facts a survey would disclose, encroachments, boundary disputes).",
        "Droits des occupants, baux, options, droits de préemption ou claims de parties en possession identifiés au dossier.",
        "Réserves minières, droits de surface, exceptions liées à des zones spéciales ou à des droits de rachat / redemption.",
        "Défauts précisément signalés par le title search mais laissés en exception faute de cure avant closing.",
      ],
      note:
        "Une exception du Schedule B n'est pas une exclusion théorique : c'est un carve-out propre à l'actif. Elle neutralise souvent la garantie sur un point pourtant couvert en principe par la police standard.",
    },
    {
      title: "Limitations de garantie",
      items: [
        "Montant d'assurance plafonné ; la perte n'est pas couverte au-delà de ce montant, même si la valeur du bien augmente.",
        "Sous-limites, caps et deductibles sur certaines garanties renforcées (zoning, subdivision, building permit, encroachment).",
        "Police prêteur limitée à l'intérêt du prêteur et généralement dégressive avec le remboursement du prêt.",
        "Qualité de l'assuré : la couverture ne suit pas toujours toute restructuration, cession ou mise en société si la police ne le prévoit pas.",
        "Obligation de notification, coopération, transmission des pièces et abstention de reconnaître un sinistre sans l'accord de l'assureur.",
        "L'assurance titre couvre un risque juridique sur le titre, non la qualité physique, technique, environnementale ou économique de l'actif.",
      ],
    },
  ] satisfies ReportListSection[],
  distinctions: {
    standardExclusions: [
      "S'appliquent par principe à toutes les polices d'une même forme et sont rarement supprimées en tant que telles.",
      "Portent sur des matières hors contrôle de l'assureur titre (réglementation publique, pollution, actes de l'assuré, événements futurs).",
    ],
    scheduleBExceptions: [
      "Spécifiques au bien, au closing et au résultat du title search.",
      "Peuvent parfois être supprimées, limitées, assurées différemment ou recarvées via un endorsement ciblé.",
    ],
    limitations: [
      "Réduisent l'indemnisation sans retirer entièrement le covered risk (caps, deductibles, période, insured status, amount of insurance).",
      "Essentielles dans les polices renforcées, qui étendent le champ mais pas nécessairement sans plafond.",
    ],
  },
  comparisonRows: [
    {
      theme: "Périmètre de base",
      standard:
        "Défauts de titre, charges, fraudes antérieures, défaut de right of access, unmarketability, actes défectueux, en principe jusqu'à la date de police.",
      renforcee:
        "Inclut la base standard et ajoute des protections pour certains off-record matters et certains risques postérieurs à la police.",
    },
    {
      theme: "Survey / limites / empiètements",
      standard:
        "Souvent limité ou neutralisé par les survey exceptions et off-record exceptions ; une simple police standard ne suffit pas toujours.",
      renforcee:
        "Peut couvrir des boundary disputes, unrecorded easements, encroachments et dommages liés à l'exercice d'une servitude, sous conditions.",
    },
    {
      theme: "Zoning, subdivision, building permits",
      standard: "Généralement exclus sans endorsement spécifique.",
      renforcee:
        "Certaines polices Homeowner / Enhanced couvrent partiellement les violations existantes au jour de la police, avec caps et deductibles.",
    },
    {
      theme: "Post-policy fraud / post-policy claims",
      standard: "En principe exclu en tant qu'événement futur.",
      renforcee:
        "Peut réintroduire certains cas ciblés : post-policy forgery, impersonation, neighbor encroachment, unauthorized leases/options.",
    },
    {
      theme: "Montant assuré",
      standard: "Montant fixe sauf avenant ultérieur.",
      renforcee:
        "Certaines formes prévoient une hausse automatique du montant assuré jusqu'à un plafond (ex. 150 % sur 5 ans).",
    },
    {
      theme: "Bénéfices annexes",
      standard: "Pas ou peu de benefits annexes.",
      renforcee:
        "Peut inclure substitute rent, relocation expenses, address mismatch coverage ou protections trust / heirs plus explicites.",
    },
  ] satisfies ComparisonRow[],
  coveredExamples: [
    {
      cas: "Après acquisition, un ancien prêt hypothécaire jamais radié réapparaît et compromet la revente.",
      resultat: "En principe couvert en standard si l'inscription existait à la date de police et n'était pas exceptée.",
      explication:
        "Il s'agit d'un lien / encumbrance antérieur affectant le titre. L'assureur peut financer la radiation, transiger ou indemniser la perte.",
    },
    {
      cas: "Un héritier inconnu attaque la chaîne de propriété et conteste la vente intervenue plusieurs années auparavant.",
      resultat: "Souvent couvert.",
      explication:
        "La revendication d'un tiers et le défaut de title vesting sont au coeur du risque titre classique.",
    },
    {
      cas: "Le registre a mal indexé un acte ; le prêteur découvre que son mortgage n'est pas au rang attendu.",
      resultat: "Souvent couvert par la police prêteur.",
      explication:
        "Le défaut d'enregistrement / priorité et l'atteinte à la sûreté du prêteur relèvent du périmètre fondamental de la police Loan.",
    },
    {
      cas: "Une fausse procuration ou une usurpation d'identité a affecté un transfert dans la chaîne antérieure.",
      resultat: "Souvent couvert.",
      explication:
        "Forgery, fraud, duress, impersonation et incapacity sont classiquement visés dans les covered risks.",
    },
    {
      cas: "Un empiètement latent apparaît sur survey et l'actif est couvert par une police renforcée avec garantie adaptée.",
      resultat: "Couvert sous conditions.",
      explication:
        "La prise en charge dépend du traitement de l'exception de survey et de l'existence d'une police renforcée / endorsement pertinent.",
    },
  ] satisfies CaseExample[],
  excludedExamples: [
    {
      cas: "Après l'achat, l'assuré construit une clôture qui empiète sur le terrain voisin.",
      resultat: "Non couvert.",
      explication:
        "Le problème est créé par l'assuré postérieurement à la date de police ; il relève des exclusions standards.",
    },
    {
      cas: "La mairie ordonne des travaux pour non-conformité urbanistique née d'un usage ou d'un aménagement postérieur au closing.",
      resultat: "Non couvert, sauf garantie spéciale très ciblée.",
      explication:
        "Les réglementations publiques et violations de zoning / building codes relèvent en principe des exclusions générales.",
    },
    {
      cas: "Le bien fait l'objet d'une dépollution environnementale coûteuse sans qu'un privilège environnemental prioritaire ne soit en cause.",
      resultat: "Non couvert.",
      explication:
        "La police titre ne couvre pas la pollution en elle-même ; un endorsement environnemental vise au mieux certains liens, pas le coût de remédiation complet.",
    },
    {
      cas: "L'assuré connaissait une convention occulte, un occupant revendiquant un droit ou une erreur majeure, mais ne l'a pas déclarée à l'assureur.",
      resultat: "Non couvert.",
      explication:
        "Les défauts connus mais non divulgués font partie des exclusions standards classiques.",
    },
    {
      cas: "Une taxe foncière devient due et payable après la date de police faute de paiement par le nouveau propriétaire.",
      resultat: "Non couvert.",
      explication:
        "Les impôts et assessments postérieurs à la date de police ne relèvent pas de la garantie titre standard.",
    },
  ] satisfies CaseExample[],
  consequences: [
    "Perte totale ou partielle de propriété, annulation / nullité / inopposabilité d'un transfert, baisse de rang hypothécaire ou impossibilité de réaliser une sûreté.",
    "Baisse de valeur de marché, blocage de revente, refus de refinancement, allongement ou rupture d'un closing ultérieur.",
    "Coûts de cure du titre : mainlevées, quitclaim deeds, indemnités, purge d'inscription, survey corrective, action en quiet title / revendication, transaction judiciaire.",
    "Coûts processuels et honoraires élevés lorsqu'aucune garantie n'est mobilisable ou lorsque le point litigieux était excepté.",
    "Risque opérationnel accru pour les prêteurs, investisseurs et asset managers : breach of reps & warranties, litige avec co-investisseurs, impossibilité de syndiquer ou céder l'actif.",
  ],
  recommendations: [
    {
      audience: "Acheteurs / propriétaires",
      items: [
        "Ne jamais confondre police prêteur et police propriétaire : si vous voulez protéger votre equity, vérifiez qu'une police propriétaire est bien émise.",
        "Demandez le commitment et lisez le Schedule B avant closing ; faites lever ou assurer les exceptions sensibles (survey, servitudes, occupants, minéraux, accès).",
        "Déclarez par écrit tout fait connu, occupant, litige, side letter, tolérance d'empiètement ou anomalie documentaire.",
        "Pour un résidentiel complexe, comparez police standard et police renforcée ; le surcoût peut être rationnel si les risques hors registre sont réels.",
      ],
    },
    {
      audience: "Prêteurs / banques / debt funds",
      items: [
        "Vérifiez la forme de police, le montant assuré, la date d'effet, la gap coverage et les endorsements requis par votre politique crédit.",
        "Contrôlez strictement les exceptions de survey et les minor impediments ; documentez l'analyse de marketability et les carve-backs obtenus.",
        "Pour les sujets environnementaux, ne surestimez pas ALTA 8.1 : il traite le risque de lien environnemental prioritaire, pas la dépollution intégrale.",
        "Sur les opérations complexes, envisagez des endorsements ciblés (ALTA 3.x, 9, 28.1, 34.1, 49, etc.) plutôt qu'une confiance abstraite dans la police standard.",
      ],
    },
    {
      audience: "Investisseurs / marchands de biens / asset managers",
      items: [
        "Calibrez la police sur la stratégie de sortie : revente rapide, refinancement, syndication, mise en portefeuille ou apport en société.",
        "Vérifiez les sujets de tenant rights, possession, accès réel, empiètements, subdivision et servitudes non enregistrées.",
        "Si le dossier comporte une anomalie identifiée, obtenez soit sa cure avant closing, soit un identified risk / identified exception coverage explicite.",
      ],
    },
    {
      audience: "Notaires, avocats, brokers et professionnels de l'immobilier",
      items: [
        "Présentez l'assurance titre comme un complément de gestion de risque, non comme un substitut au travail d'audit juridique ou notarial.",
        "Tracez la disclosure client : garanties, exclusions, plafonds, limites, exceptions et endorsements doivent être expliqués avant signature.",
        "Conservez une discipline documentaire forte dans la GED : titre, projet d'acte, état hypothécaire, plan cadastral, pièces d'identité et note du notaire restent centraux pour l'underwriting.",
      ],
    },
  ] satisfies RecommendationGroup[],
  summaryRows: [
    {
      risque: "Hypothèque / privilège non radié antérieur",
      couvert: "Oui, en standard si antérieur et non excepté.",
      exclu: "Taxe ou charge née après la date de police.",
      complementaire: "Search renforcé, cure préalable, carve-back ciblé.",
    },
    {
      risque: "Erreur d'enregistrement / publicité foncière",
      couvert: "Oui, souvent au coeur des covered risks.",
      exclu: "Erreur sans perte indemnisable.",
      complementaire: "Date-down, gap coverage, contrôle closing.",
    },
    {
      risque: "Fraude / faux acte / usurpation",
      couvert: "Oui en standard pour les faits antérieurs ; post-policy surtout en renforcé.",
      exclu: "Fraude créée ou acceptée par l'assuré.",
      complementaire: "ALTA 49, CPL, contrôles anti-fraude.",
    },
    {
      risque: "Héritier inconnu / revendication de tiers",
      couvert: "Oui, généralement.",
      exclu: "Claim connu de l'assuré mais caché à l'assureur.",
      complementaire: "Affidavits, curative deeds, probate review.",
    },
    {
      risque: "Servitude / easement / droit d'accès",
      couvert: "Accès légal : souvent oui ; servitudes : dépend du Schedule B.",
      exclu: "Servitude explicitement exceptée.",
      complementaire: "ALTA 9, 28.1, 34.1, survey, suppression d'exception.",
    },
    {
      risque: "Empiètement / boundary dispute",
      couvert: "Variable ; souvent limité en standard.",
      exclu: "Survey exception non levée ou empiètement créé après closing.",
      complementaire: "Survey à jour, police renforcée, endorsement encroachment.",
    },
    {
      risque: "Zoning / building permit / subdivision",
      couvert: "Souvent non en standard ; partiellement en renforcé.",
      exclu: "Violation purement réglementaire sans garantie spéciale.",
      complementaire: "ALTA 3.x, 26, police Homeowner / Enhanced.",
    },
    {
      risque: "Pollution / environnement",
      couvert: "Non pour la pollution elle-même.",
      exclu: "Remédiation environnementale, contamination, subsidence.",
      complementaire: "ALTA 8.1 (lien environnemental), due diligence environnementale séparée.",
    },
  ] satisfies SummaryRow[],
  complementaryGuarantees: [
    "ALTA 3 / 3.1 / 3.2 / 3.3 : zoning et completed structure / legal non-conforming use.",
    "ALTA 8.1 : environmental protection lien ; couvre le privilège environnemental prioritaire, pas la dépollution générale.",
    "ALTA 9 : restrictions, encroachments, minerals (prêteur).",
    "ALTA 26 : subdivision pour certains montages.",
    "ALTA 28 / 28.1 : damage or enforced removal, encroachment boundaries and easements.",
    "ALTA 34.1 : identified exception and identified risk coverage.",
    "ALTA 49 / 49.1 : forgery endorsements résidentiels.",
    "Closing Protection Letter (distinct de la police titre) : fraude ou mauvaise affectation des fonds par le closing / settlement agent.",
  ],
  sources: [
    {
      label: "ALTA — Policy Forms and Related Documents",
      url: "https://www.alta.org/policies-and-standards/policy-forms/",
      note:
        "Référence principale pour les formulaires ALTA 2021 (Owner's Policy, Loan Policy, Homeowner's Policy, Commitment) et les endorsements 3.x, 8.1, 9, 28.1, 34.1, 49, etc.",
    },
    {
      label: "CFPB — Shop for title insurance and other closing services",
      url: "https://www.consumerfinance.gov/owning-a-home/close/shop-for-title-insurance-and-other-closing-services/",
      note:
        "Source officielle de pédagogie consommateur : rôle des title services, possibilité de shop around, distinction pratique owner / lender policy au closing.",
    },
    {
      label: "CFPB — TRID Title Insurance Disclosures factsheet",
      url: "https://files.consumerfinance.gov/f/documents/cfpb_tila-respa_title-insurance-disclosures-factsheet.pdf",
      note:
        "Précise notamment que la police prêteur est généralement requise par le créancier tandis que la police propriétaire apparaît comme optional lorsqu'elle n'est pas imposée.",
    },
    {
      label: "Fannie Mae — B7-2-03 General Title Insurance Coverage",
      url: "https://selling-guide.fanniemae.com/sel/b7-2-03/general-title-insurance-coverage",
      note:
        "Exigences prêteur / marché secondaire : formes ALTA Loan 2006/2021, montant minimal, gap coverage des formulaires ALTA récents, endorsement environnemental 8.1.",
    },
    {
      label: "Fannie Mae — B7-2-05 Title Exceptions and Impediments",
      url: "https://guide-selling.fanniemae.com/sel/b7-2-05/title-exceptions-and-impediments",
      note:
        "Très utile pour distinguer exceptions inacceptables, minor impediments et traitement des survey exceptions / ALTA 9.",
    },
    {
      label: "Michigan Bar Journal — Explaining the ALTA Homeowner's Policy of Title Insurance",
      url: "https://www.michbar.org/journal/Details/Explaining-the-ALTA-homeowners-policy-of-title-insurance?ArticleID=4798",
      note:
        "Analyse juridique secondaire détaillant les covered risks renforcés, les caps/deductibles et les protections post-policy de la Homeowner's Policy 2021.",
    },
    {
      label: "Stewart Title — ALTA Policy Comparison",
      url: "https://www.stewart.com/en/customer-type/real-estate-closing-title-services/tools-and-resources/alta-policy-comparison",
      note:
        "Comparatif opérationnel clair entre police standard et police Homeowner / Enhanced ; à utiliser comme benchmark sectoriel, non comme substitut au wording de la police émise.",
    },
  ] satisfies SourceLink[],
} as const

export type AssuranceTitreReferenceReport = typeof ASSURANCE_TITRE_REFERENCE_REPORT
