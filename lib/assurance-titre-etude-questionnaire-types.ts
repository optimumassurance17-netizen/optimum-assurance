import type {
  AssuranceTitreBesoinPrincipal,
  AssuranceTitreData,
  AssuranceTitreProfilSouscripteur,
  AssuranceTitreRisqueIdentifie,
  AssuranceTitreTypeBien,
  AssuranceTitreTypeOperation,
} from "@/lib/assurance-titre-types"

export const ASSURANCE_TITRE_ETUDE_VERSION = "assurance_titre_etude_v1"

export type OuiNon = "oui" | "non"

export type AssuranceTitreEtudeQuestionnaireV1 = {
  version: typeof ASSURANCE_TITRE_ETUDE_VERSION
  contact: {
    nomComplet: string
    raisonSociale: string
    email: string
    telephone: string
    siret: string
  }
  operation: {
    profilSouscripteur: AssuranceTitreProfilSouscripteur | ""
    typeOperation: AssuranceTitreTypeOperation | ""
    typeBien: AssuranceTitreTypeBien | ""
    besoinPrincipal: AssuranceTitreBesoinPrincipal | ""
    montantOperation: string
    dateSignaturePrevue: string
    financementExterne: OuiNon
  }
  bien: {
    adresseBien: string
    codePostalBien: string
    villeBien: string
    referenceCadastrale: string
    numeroLot: string
    occupationBien: "" | "libre" | "occupe" | "loue" | "vacant"
    commentaireBien: string
  }
  parties: {
    notaireNom: string
    notaireEmail: string
    vendeurNom: string
    banqueNom: string
    banqueContact: string
    avocatConseil: string
  }
  risque: {
    risquesIdentifies: AssuranceTitreRisqueIdentifie[]
    detailsAnomalies: string
    contentieuxConnu: OuiNon
    contentieuxDetails: string
    urgenceClosing: OuiNon
    delaiCible: string
  }
  documents: {
    piecesDisponibles: string[]
    commentairePieces: string
  }
  validation: {
    exactitudeDeclarations: boolean
    acceptationSuiviDigital: boolean
  }
}

export const ASSURANCE_TITRE_ETUDE_DOCUMENTS = [
  "titre_propriete",
  "projet_acte",
  "etat_hypothecaire",
  "plan_cadastral",
  "piece_identite_titre",
  "note_notaire",
] as const

export const ASSURANCE_TITRE_ETUDE_DOCUMENT_LABELS: Record<
  (typeof ASSURANCE_TITRE_ETUDE_DOCUMENTS)[number],
  string
> = {
  titre_propriete: "Titre de propriété / origine de propriété",
  projet_acte: "Projet d'acte / compromis / promesse",
  etat_hypothecaire: "État hypothécaire / inscriptions",
  plan_cadastral: "Plan cadastral / extrait parcellaire",
  piece_identite_titre: "Pièce d'identité des parties",
  note_notaire: "Note du notaire / observations juridiques",
}

export function emptyAssuranceTitreEtudeQuestionnaire(): AssuranceTitreEtudeQuestionnaireV1 {
  return {
    version: ASSURANCE_TITRE_ETUDE_VERSION,
    contact: {
      nomComplet: "",
      raisonSociale: "",
      email: "",
      telephone: "",
      siret: "",
    },
    operation: {
      profilSouscripteur: "",
      typeOperation: "",
      typeBien: "",
      besoinPrincipal: "",
      montantOperation: "",
      dateSignaturePrevue: "",
      financementExterne: "non",
    },
    bien: {
      adresseBien: "",
      codePostalBien: "",
      villeBien: "",
      referenceCadastrale: "",
      numeroLot: "",
      occupationBien: "",
      commentaireBien: "",
    },
    parties: {
      notaireNom: "",
      notaireEmail: "",
      vendeurNom: "",
      banqueNom: "",
      banqueContact: "",
      avocatConseil: "",
    },
    risque: {
      risquesIdentifies: [],
      detailsAnomalies: "",
      contentieuxConnu: "non",
      contentieuxDetails: "",
      urgenceClosing: "non",
      delaiCible: "",
    },
    documents: {
      piecesDisponibles: [],
      commentairePieces: "",
    },
    validation: {
      exactitudeDeclarations: false,
      acceptationSuiviDigital: false,
    },
  }
}

export function prefillAssuranceTitreEtudeFromInitial(
  initial: Partial<AssuranceTitreData> & { email?: string | null }
): AssuranceTitreEtudeQuestionnaireV1 {
  const base = emptyAssuranceTitreEtudeQuestionnaire()
  return {
    ...base,
    contact: {
      ...base.contact,
      nomComplet: initial.nomComplet?.trim() || "",
      raisonSociale: initial.raisonSociale?.trim() || "",
      email: initial.email?.trim() || "",
      telephone: initial.telephone?.trim() || "",
      siret: initial.siret?.trim() || "",
    },
    operation: {
      ...base.operation,
      profilSouscripteur: initial.profilSouscripteur ?? "",
      typeOperation: initial.typeOperation ?? "",
      typeBien: initial.typeBien ?? "",
      besoinPrincipal: initial.besoinPrincipal ?? "",
      montantOperation:
        initial.montantOperation != null && Number.isFinite(initial.montantOperation)
          ? String(initial.montantOperation)
          : "",
      dateSignaturePrevue: initial.dateSignaturePrevue?.trim() || "",
      financementExterne: initial.financementExterne ? "oui" : "non",
    },
    bien: {
      ...base.bien,
      adresseBien: initial.adresseBien?.trim() || "",
      codePostalBien: initial.codePostalBien?.trim() || "",
      villeBien: initial.villeBien?.trim() || "",
    },
    risque: {
      ...base.risque,
      risquesIdentifies: Array.isArray(initial.risquesIdentifies)
        ? [...new Set(initial.risquesIdentifies)]
        : [],
      detailsAnomalies: initial.message?.trim() || "",
    },
  }
}

export function mergeAssuranceTitreEtudeForm(
  base: AssuranceTitreEtudeQuestionnaireV1,
  saved?: Partial<AssuranceTitreEtudeQuestionnaireV1> | null
): AssuranceTitreEtudeQuestionnaireV1 {
  if (!saved) return base
  return {
    ...base,
    ...saved,
    version: ASSURANCE_TITRE_ETUDE_VERSION,
    contact: { ...base.contact, ...(saved.contact ?? {}) },
    operation: { ...base.operation, ...(saved.operation ?? {}) },
    bien: { ...base.bien, ...(saved.bien ?? {}) },
    parties: { ...base.parties, ...(saved.parties ?? {}) },
    risque: {
      ...base.risque,
      ...(saved.risque ?? {}),
      risquesIdentifies: Array.isArray(saved.risque?.risquesIdentifies)
        ? [...new Set(saved.risque.risquesIdentifies)]
        : base.risque.risquesIdentifies,
    },
    documents: {
      ...base.documents,
      ...(saved.documents ?? {}),
      piecesDisponibles: Array.isArray(saved.documents?.piecesDisponibles)
        ? [...new Set(saved.documents.piecesDisponibles)]
        : base.documents.piecesDisponibles,
    },
    validation: { ...base.validation, ...(saved.validation ?? {}) },
  }
}
