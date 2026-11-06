import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { isDecennaleContractData, parseJsonObject } from "@/lib/decennale-contract-data"
import { parseActivitiesJson } from "@/lib/insurance-contract-activities"
import { resolveUserActivitiesHierarchy } from "@/lib/activity-hierarchy"
import { generateOptimizedExclusions } from "@/lib/optimized-exclusions"
import { alignUserAttestationsWithContract } from "@/lib/attestation-follows-contract-sync"
import { loadClientEcheances } from "@/lib/client-echeance-service"
import {
  choixActivitesAjoutables,
  chiffrerAjoutActivite,
  type ChoixActivite,
} from "@/lib/decennale-ajout-activite"

type ContractRow = {
  id: string
  numero: string
  status: string
  data: string
  createdAt: Date
}

function asActivities(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
}

function asPositive(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/\s/g, "").replace(",", ".")) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function asCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

function frenchDate(date = new Date()): string {
  return date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })
}

async function loadDecennaleContract(userId: string): Promise<ContractRow | null> {
  const documents = await prisma.document.findMany({
    where: { userId, type: "contrat", status: { not: "resilie" } },
    select: { id: true, numero: true, status: true, data: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  return documents.find((document) => isDecennaleContractData(document.data)) ?? null
}

function readContractFacts(document: ContractRow | null, platform: {
  activitiesJson: string | null
  premium: number
  clientName: string
  siret: string | null
  address: string
  contractNumber: string
} | null) {
  const data = document ? parseJsonObject(document.data) : {}
  const activites = asActivities(data.activites)
  const platformActivities = parseActivitiesJson(platform?.activitiesJson)
  return {
    data,
    activites: activites.length ? activites : platformActivities,
    chiffreAffaires: asPositive(data.chiffreAffaires),
    primeAnnuelle: asPositive(data.primeAnnuelle) ?? (platform && platform.premium > 0 ? platform.premium : null),
    sinistres: asCount(data.sinistres),
    jamaisAssure: data.jamaisAssure === true,
    resilieNonPaiement: data.resilieNonPaiement === true,
    reprisePasse: data.reprisePasse === true,
    raisonSociale:
      (typeof data.raisonSociale === "string" && data.raisonSociale.trim()) ||
      platform?.clientName ||
      "",
    numero: document?.numero || platform?.contractNumber || "",
  }
}

export async function lireAjoutActiviteClient(userId: string): Promise<
  | {
      available: true
      activites: string[]
      choix: ChoixActivite[]
      primeAnnuelle: number
      numero: string
    }
  | { available: false; message: string }
> {
  const [document, platform] = await Promise.all([
    loadDecennaleContract(userId),
    prisma.insuranceContract.findFirst({
      where: { userId, productType: "decennale", status: { not: "rejected" } },
      select: {
        activitiesJson: true,
        premium: true,
        clientName: true,
        siret: true,
        address: true,
        contractNumber: true,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
  ])
  if (!document && !platform) {
    return { available: false, message: "Aucun contrat décennale ne permet d'ajouter une activité." }
  }
  const facts = readContractFacts(document, platform)
  if (!facts.chiffreAffaires || !facts.primeAnnuelle || facts.activites.length === 0) {
    return {
      available: false,
      message: "Le contrat décennale ne contient pas encore les activités, le chiffre d'affaires et la cotisation.",
    }
  }
  return {
    available: true,
    activites: facts.activites,
    choix: choixActivitesAjoutables(facts.activites),
    primeAnnuelle: facts.primeAnnuelle,
    numero: facts.numero,
  }
}

export async function ajouterActiviteClient(input: {
  userId: string
  email: string
  activite: string
}): Promise<
  | {
      ok: true
      activite: string
      nouvellePrimeAnnuelle: number
      regularisation: number
      cotisationInchangee: boolean
      emailSent: boolean
    }
  | { ok: false; status: number; error: string }
> {
  const [document, platform, user] = await Promise.all([
    loadDecennaleContract(input.userId),
    prisma.insuranceContract.findFirst({
      where: { userId: input.userId, productType: "decennale", status: { not: "rejected" } },
      select: {
        id: true,
        activitiesJson: true,
        exclusionsJson: true,
        premium: true,
        clientName: true,
        siret: true,
        address: true,
        contractNumber: true,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, raisonSociale: true },
    }),
  ])
  if (!user) return { ok: false, status: 404, error: "Client introuvable." }
  if (!document && !platform) {
    return { ok: false, status: 404, error: "Aucun contrat décennale ne permet d'ajouter une activité." }
  }

  const facts = readContractFacts(document, platform)
  if (!facts.chiffreAffaires || !facts.primeAnnuelle) {
    return {
      ok: false,
      status: 400,
      error: "Le contrat ne permet pas de calculer la régularisation.",
    }
  }

  const echeances = await loadClientEcheances(input.userId)
  const trimestresDejaPayes = echeances.filter((row) => row.kind === "decennale" && row.paid).length
  const quote = chiffrerAjoutActivite({
    activites: facts.activites,
    activite: input.activite,
    chiffreAffaires: facts.chiffreAffaires,
    primeAnnuelle: facts.primeAnnuelle,
    sinistres: facts.sinistres,
    jamaisAssure: facts.jamaisAssure,
    resilieNonPaiement: facts.resilieNonPaiement,
    reprisePasse: facts.reprisePasse,
    trimestresDejaPayes,
  })
  if (!quote.ok) return { ok: false, status: 400, error: quote.error }

  const hierarchy = await resolveUserActivitiesHierarchy([...facts.activites, quote.activite], {
    userId: input.userId,
  })
  const activites = hierarchy.guaranteedHierarchyLines.length
    ? hierarchy.guaranteedHierarchyLines
    : [...facts.activites, quote.activite]
  const exclusions = generateOptimizedExclusions(
    hierarchy.guaranteedHierarchyLines.length ? hierarchy.guaranteedHierarchyLines : activites,
    { selections: hierarchy.selections }
  ).lines
  const primeMensuelle = Math.round((quote.nouvellePrimeAnnuelle / 12) * 100) / 100
  const primeTrimestrielle = Math.round((quote.nouvellePrimeAnnuelle / 4) * 100) / 100
  const nextData = {
    ...facts.data,
    activites,
    activitesNormalisees: hierarchy.guaranteedActivitiesFlat.length
      ? hierarchy.guaranteedActivitiesFlat
      : quote.activites,
    exclusionsOptimisees: exclusions,
    activityExclusions: exclusions,
    exclusions,
    primeAnnuelle: quote.nouvellePrimeAnnuelle,
    primeMensuelle,
    primeTrimestrielle,
    plafond: facts.chiffreAffaires * 2,
  }

  if (document) {
    await prisma.document.update({
      where: { id: document.id },
      data: { data: JSON.stringify(nextData) },
    })
  }
  if (platform) {
    await prisma.insuranceContract.update({
      where: { id: platform.id },
      data: {
        activitiesJson: JSON.stringify(activites),
        exclusionsJson: JSON.stringify(exclusions),
        premium: quote.nouvellePrimeAnnuelle,
      },
    })
  }
  await prisma.sepaSubscription.updateMany({
    where: { userId: input.userId },
    data: { primeAnnuelle: quote.nouvellePrimeAnnuelle },
  })

  const numeroContrat = facts.numero || platform?.contractNumber || document?.numero || ""
  await alignUserAttestationsWithContract({
    userId: input.userId,
    previousClientName: user.raisonSociale,
    snapshot: {
      product: "decennale",
      contractNumber: numeroContrat,
      raisonSociale: facts.raisonSociale || user.raisonSociale || user.email,
      siret: (typeof facts.data.siret === "string" ? facts.data.siret : platform?.siret) || undefined,
      adresse: (typeof facts.data.adresse === "string" ? facts.data.adresse : platform?.address) || undefined,
      codePostal: typeof facts.data.codePostal === "string" ? facts.data.codePostal : undefined,
      ville: typeof facts.data.ville === "string" ? facts.data.ville : undefined,
      activites,
      exclusions,
      primeAnnuelle: quote.nouvellePrimeAnnuelle,
      chiffreAffaires: facts.chiffreAffaires,
      franchise: typeof facts.data.franchise === "number" ? facts.data.franchise : undefined,
      plafond: facts.chiffreAffaires * 2,
    },
  })

  const avenant = await prisma.document.create({
    data: {
      userId: input.userId,
      type: "avenant",
      numero: await getNextNumero("avenant"),
      data: JSON.stringify({
        motifAvenant: "Ajout d'activité",
        activiteAjoutee: quote.activite,
        contractNumero: numeroContrat,
        dateAvenant: frenchDate(),
        primeAnnuelle: quote.nouvellePrimeAnnuelle,
        regularisation: quote.regularisation,
        raisonSociale: facts.raisonSociale || user.raisonSociale || user.email,
      }),
      status: "valide",
    },
    select: { id: true, numero: true },
  })
  if (quote.regularisation > 0) {
    await prisma.avenantFee.create({
      data: {
        userId: input.userId,
        documentId: avenant.id,
        amount: quote.regularisation,
        status: "pending",
      },
    })
  }

  const raisonSociale = facts.raisonSociale || user.raisonSociale || user.email
  const template = EMAIL_TEMPLATES.ajoutActiviteDecennale(
    raisonSociale,
    quote.activite,
    quote.nouvellePrimeAnnuelle,
    quote.regularisation
  )
  const emailSent = await sendEmail({
    to: user.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  })

  await logAdminActivity({
    adminEmail: input.email || user.email,
    action: "client_activite_ajoutee",
    targetType: "user",
    targetId: input.userId,
    details: {
      activite: quote.activite,
      numeroContrat,
      avenantNumero: avenant.numero,
      primeAnnuelle: quote.nouvellePrimeAnnuelle,
      regularisation: quote.regularisation,
      trimestresDejaPayes: quote.trimestresDejaPayes,
      emailSent,
    },
  })

  return {
    ok: true,
    activite: quote.activite,
    nouvellePrimeAnnuelle: quote.nouvellePrimeAnnuelle,
    regularisation: quote.regularisation,
    cotisationInchangee: quote.cotisationInchangee,
    emailSent,
  }
}
