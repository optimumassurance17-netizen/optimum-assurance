import type { DevisDommageOuvrageData } from "@/lib/dommage-ouvrage-types"
import {
  DO_ETUDE_VERSION,
  emptyDoEtudeQuestionnaire,
  type DoEtudeQuestionnaireV1,
  type OuiNon,
} from "@/lib/do-etude-questionnaire-types"

function boolToOuiNon(v: boolean | undefined): OuiNon {
  if (v === true) return "oui"
  if (v === false) return "non"
  return ""
}

function mapQualite(
  q: DevisDommageOuvrageData["qualiteMaitreOuvrage"],
  autre?: string
): { qualite: DoEtudeQuestionnaireV1["souscripteur"]["qualiteMaitreOuvrage"]; qualiteAutre: string } {
  if (q === "promoteur") return { qualite: "promoteur", qualiteAutre: "" }
  if (q?.startsWith("particulier")) return { qualite: "particulier", qualiteAutre: "" }
  if (q === "autre" && autre?.toLowerCase().includes("sci")) return { qualite: "sci", qualiteAutre: autre ?? "" }
  if (q === "autre") return { qualite: "autre", qualiteAutre: autre ?? "" }
  if (q === "mandataire") return { qualite: "autre", qualiteAutre: "Mandataire" }
  return { qualite: "", qualiteAutre: autre ?? "" }
}

function mapTypeBatiment(
  t: DevisDommageOuvrageData["typeOuvrage"]
): { typeBatiment: DoEtudeQuestionnaireV1["typeProjet"]["typeBatiment"]; autre: string } {
  if (t === "maison_individuelle" || t === "maison_jumelee") return { typeBatiment: "maison", autre: "" }
  if (
    t === "immeuble_logements" ||
    t === "immeuble_logements_commerces" ||
    t === "immeuble_bureaux"
  ) {
    return { typeBatiment: "immeuble", autre: "" }
  }
  return { typeBatiment: "autre", autre: t ?? "" }
}

function mapDestination(
  d: DevisDommageOuvrageData["destinationConstruction"]
): DoEtudeQuestionnaireV1["typeProjet"]["destination"] {
  if (d === "vente") return "vente"
  if (d === "location") return "location"
  if (d === "exploitation_directe") return "personnel"
  return ""
}

/** Fusionne les données du 1er questionnaire DO dans le formulaire d’étude. */
export function prefillDoEtudeFromInitial(initial: Partial<DevisDommageOuvrageData>): DoEtudeQuestionnaireV1 {
  const e = emptyDoEtudeQuestionnaire()
  const { qualite, qualiteAutre } = mapQualite(
    initial.qualiteMaitreOuvrage as DevisDommageOuvrageData["qualiteMaitreOuvrage"],
    initial.qualiteAutre
  )
  const { typeBatiment, autre: typeBatAutre } = mapTypeBatiment(
    initial.typeOuvrage as DevisDommageOuvrageData["typeOuvrage"]
  )

  e.souscripteur = {
    nomRaisonSociale: initial.raisonSociale ?? "",
    adresse: initial.adresse ?? "",
    codePostal: initial.codePostal ?? "",
    ville: initial.ville ?? "",
    telephone: initial.telephone ?? "",
    email: initial.email ?? "",
    maitreOuvrageEstSouscripteur: boolToOuiNon(initial.maitreOuvrageEstSouscripteur),
    qualiteMaitreOuvrage: qualite,
    qualiteAutre: qualiteAutre || initial.qualiteAutre || "",
  }

  e.operation = {
    adresseChantier: initial.adresseConstruction ?? "",
    codePostal: initial.codePostalConstruction ?? "",
    ville: initial.villeConstruction ?? "",
    permisNumero: initial.permisConstruireNumero ?? "",
    dateDoc: initial.dateDroc ?? "",
    dateDebutTravaux: initial.dateDebutTravaux ?? "",
    dateFinTravaux: initial.dateAchevementTravaux ?? "",
  }

  e.typeProjet = {
    typeBatiment,
    typeBatimentAutre: typeBatiment === "autre" ? typeBatAutre : "",
    destination: mapDestination(
      initial.destinationConstruction as DevisDommageOuvrageData["destinationConstruction"]
    ),
    superficieM2: String(initial.superficieOuvrage ?? initial.surfaceConstruction ?? ""),
    nbBatiments: String(initial.nbBatiments ?? ""),
    nbEtages: String(initial.nbEtages ?? ""),
    nbGarages: initial.garages ? "1" : "0",
    nbCaves: initial.caves ? "1" : "0",
    piscine: boolToOuiNon(initial.piscines),
    photovoltaiques: boolToOuiNon(initial.photovoltaiques),
  }

  const total =
    (Number(initial.coutTravauxVrd) || 0) +
    (Number(initial.coutMateriauxMaitreOuvrage) || 0) +
    (Number(initial.coutControleTechnique) || 0) +
    (Number(initial.coutEtudeSol) || 0) +
    (Number(initial.coutMaitriseOeuvre) || 0)

  e.cout = {
    coutTotalTtc: total > 0 ? String(total) : "",
    dontTravaux: initial.coutTravauxVrd != null ? String(initial.coutTravauxVrd) : "",
    dontHonorairesMO: initial.coutMaitriseOeuvre != null ? String(initial.coutMaitriseOeuvre) : "",
    dontEtudeSol: initial.coutEtudeSol != null ? String(initial.coutEtudeSol) : "",
    dontControleTechnique: initial.coutControleTechnique != null ? String(initial.coutControleTechnique) : "",
  }

  e.tech = {
    typeFondation: "",
    typeFondationAutre: "",
    etudeBetonArme: boolToOuiNon(initial.etudeBetonArme),
    techniqueCourante: boolToOuiNon(initial.techniqueCourante),
    produitsAtex: boolToOuiNon(initial.produitsAvisTechnique),
    porteeSup7m: "",
  }

  e.environnement = {
    zoneInondable: "",
    solRemblai: boolToOuiNon(initial.solRemblaiRecent || initial.solRemblaisInstables),
    argileGonflante: boolToOuiNon(initial.solArgileGonflante),
    nappeElevee: "",
    penteSup15:
      initial.penteTerrain === "sup15" || initial.penteTerrain === "sup30"
        ? "oui"
        : initial.penteTerrain === "inf15"
          ? "non"
          : boolToOuiNon(initial.terrainEnPente),
  }

  e.travauxSpecifiques = {
    travauxSurExistant: boolToOuiNon(initial.travauxNeufsAvecExistants),
    etancheiteSpecifique: boolToOuiNon(initial.existantsTravauxEtancheite),
    interventionStructure: boolToOuiNon(initial.existantsFondationsOssature),
    surelevation: boolToOuiNon(initial.existantsSurelevation),
    desamiantage: boolToOuiNon(initial.existantsRetraitAmiantePlomb),
  }

  const g = (initial.garanties as string[]) || []
  e.garanties = {
    do: g.includes("do"),
    trc: g.includes("trc"),
    rcmo: g.includes("rcmo"),
    dommagesExistants: !!initial.dommagesExistants,
  }

  e.intervenants = {
    maitriseOeuvreNom: initial.maitriseOeuvreNom ?? "",
    maitriseOeuvreAssureur: "",
    maitriseOeuvrePolice: "",
    maitriseOeuvreMontantMission: "",
    bureauControleNom: initial.controleTechniqueNom ?? "",
    etudeSolSociete: initial.etudeSol ? "Oui (à préciser)" : "",
  }

  return e
}

/** Fusion profonde superficielle : `saved` écrase `base` pour les champs définis. */
export function mergeDoEtudeForm(base: DoEtudeQuestionnaireV1, saved: Partial<DoEtudeQuestionnaireV1> | null): DoEtudeQuestionnaireV1 {
  if (!saved || saved.version !== DO_ETUDE_VERSION) return base
  return {
    ...base,
    version: DO_ETUDE_VERSION,
    souscripteur: { ...base.souscripteur, ...saved.souscripteur },
    operation: { ...base.operation, ...saved.operation },
    typeProjet: { ...base.typeProjet, ...saved.typeProjet },
    cout: { ...base.cout, ...saved.cout },
    tech: { ...base.tech, ...saved.tech },
    environnement: { ...base.environnement, ...saved.environnement },
    travauxSpecifiques: { ...base.travauxSpecifiques, ...saved.travauxSpecifiques },
    garanties: { ...base.garanties, ...saved.garanties },
    intervenants: { ...base.intervenants, ...saved.intervenants },
    lots: saved.lots?.length ? saved.lots : base.lots,
    documents: {
      avant: saved.documents?.avant ?? base.documents.avant,
      apres: saved.documents?.apres ?? base.documents.apres,
    },
    validation: { ...base.validation, ...saved.validation },
  }
}
