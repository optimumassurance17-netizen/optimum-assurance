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

function asText(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

function asOuiNon(value: unknown): OuiNon {
  return value === "oui" || value === "non" ? value : ""
}

/** Les champs date HTML n'acceptent que aaaa-mm-jj. Une autre valeur bloque l'envoi. */
function asDateInput(value: unknown): string {
  const text = asText(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})T/)
  if (iso) return iso[1]
  const fr = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`
  return ""
}

function asStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  return value.filter((item): item is string => typeof item === "string")
}

const EMPTY_LOT: DoEtudeQuestionnaireV1["lots"][number] = {
  lot: "",
  entreprise: "",
  assureur: "",
  police: "",
  siren: "",
  montant: "",
}

function asLots(value: unknown, fallback: DoEtudeQuestionnaireV1["lots"]): DoEtudeQuestionnaireV1["lots"] {
  if (!Array.isArray(value) || value.length === 0) return fallback
  return value.map((row) => {
    const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {}
    return {
      lot: asText(item.lot),
      entreprise: asText(item.entreprise),
      assureur: asText(item.assureur),
      police: asText(item.police),
      siren: asText(item.siren),
      montant: asText(item.montant),
    }
  })
}

function asChoice<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : ""
}

/** Garantit des chaînes et des tableaux : un JSON partiel ne doit pas faire planter le formulaire. */
export function sanitizeDoEtudeForm(form: DoEtudeQuestionnaireV1): DoEtudeQuestionnaireV1 {
  const empty = emptyDoEtudeQuestionnaire()
  const s = form.souscripteur ?? empty.souscripteur
  const o = form.operation ?? empty.operation
  const tp = form.typeProjet ?? empty.typeProjet
  const c = form.cout ?? empty.cout
  const t = form.tech ?? empty.tech
  const env = form.environnement ?? empty.environnement
  const ts = form.travauxSpecifiques ?? empty.travauxSpecifiques
  const g = form.garanties ?? empty.garanties
  const iv = form.intervenants ?? empty.intervenants
  const v = form.validation ?? empty.validation

  return {
    version: DO_ETUDE_VERSION,
    souscripteur: {
      nomRaisonSociale: asText(s.nomRaisonSociale),
      adresse: asText(s.adresse),
      codePostal: asText(s.codePostal),
      ville: asText(s.ville),
      telephone: asText(s.telephone),
      email: asText(s.email),
      maitreOuvrageEstSouscripteur: asOuiNon(s.maitreOuvrageEstSouscripteur),
      qualiteMaitreOuvrage: asChoice(s.qualiteMaitreOuvrage, ["particulier", "promoteur", "sci", "autre"] as const),
      qualiteAutre: asText(s.qualiteAutre),
    },
    operation: {
      adresseChantier: asText(o.adresseChantier),
      codePostal: asText(o.codePostal),
      ville: asText(o.ville),
      permisNumero: asText(o.permisNumero),
      dateDoc: asDateInput(o.dateDoc),
      dateDebutTravaux: asDateInput(o.dateDebutTravaux),
      dateFinTravaux: asDateInput(o.dateFinTravaux),
    },
    typeProjet: {
      typeBatiment: asChoice(tp.typeBatiment, ["maison", "immeuble", "autre"] as const),
      typeBatimentAutre: asText(tp.typeBatimentAutre),
      destination: asChoice(tp.destination, ["vente", "location", "personnel"] as const),
      superficieM2: asText(tp.superficieM2),
      nbBatiments: asText(tp.nbBatiments),
      nbEtages: asText(tp.nbEtages),
      nbGarages: asText(tp.nbGarages),
      nbCaves: asText(tp.nbCaves),
      piscine: asOuiNon(tp.piscine),
      photovoltaiques: asOuiNon(tp.photovoltaiques),
    },
    cout: {
      coutTotalTtc: asText(c.coutTotalTtc),
      dontTravaux: asText(c.dontTravaux),
      dontHonorairesMO: asText(c.dontHonorairesMO),
      dontEtudeSol: asText(c.dontEtudeSol),
      dontControleTechnique: asText(c.dontControleTechnique),
    },
    tech: {
      typeFondation: asChoice(t.typeFondation, ["semelles", "radier", "pieux", "autre"] as const),
      typeFondationAutre: asText(t.typeFondationAutre),
      etudeBetonArme: asOuiNon(t.etudeBetonArme),
      techniqueCourante: asOuiNon(t.techniqueCourante),
      produitsAtex: asOuiNon(t.produitsAtex),
      porteeSup7m: asOuiNon(t.porteeSup7m),
    },
    environnement: {
      zoneInondable: asOuiNon(env.zoneInondable),
      solRemblai: asOuiNon(env.solRemblai),
      argileGonflante: asOuiNon(env.argileGonflante),
      nappeElevee: asOuiNon(env.nappeElevee),
      penteSup15: asOuiNon(env.penteSup15),
    },
    travauxSpecifiques: {
      travauxSurExistant: asOuiNon(ts.travauxSurExistant),
      etancheiteSpecifique: asOuiNon(ts.etancheiteSpecifique),
      interventionStructure: asOuiNon(ts.interventionStructure),
      surelevation: asOuiNon(ts.surelevation),
      desamiantage: asOuiNon(ts.desamiantage),
    },
    garanties: {
      do: g.do === true,
      trc: g.trc === true,
      rcmo: g.rcmo === true,
      dommagesExistants: g.dommagesExistants === true,
    },
    intervenants: {
      maitriseOeuvreNom: asText(iv.maitriseOeuvreNom),
      maitriseOeuvreAssureur: asText(iv.maitriseOeuvreAssureur),
      maitriseOeuvrePolice: asText(iv.maitriseOeuvrePolice),
      maitriseOeuvreMontantMission: asText(iv.maitriseOeuvreMontantMission),
      bureauControleNom: asText(iv.bureauControleNom),
      etudeSolSociete: asText(iv.etudeSolSociete),
    },
    lots: asLots(form.lots, empty.lots.length ? empty.lots : [EMPTY_LOT]),
    documents: {
      avant: asStringList(form.documents?.avant, empty.documents.avant),
      apres: asStringList(form.documents?.apres, empty.documents.apres),
    },
    validation: {
      faitA: asText(v.faitA),
      le: asDateInput(v.le),
      nom: asText(v.nom),
    },
  }
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

  const g = Array.isArray(initial.garanties) ? initial.garanties.map(String) : []
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

  return sanitizeDoEtudeForm(e)
}

/** Fusion profonde superficielle : `saved` écrase `base` pour les champs définis. */
export function mergeDoEtudeForm(base: DoEtudeQuestionnaireV1, saved: Partial<DoEtudeQuestionnaireV1> | null): DoEtudeQuestionnaireV1 {
  if (!saved || saved.version !== DO_ETUDE_VERSION) return sanitizeDoEtudeForm(base)
  return sanitizeDoEtudeForm({
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
  })
}
