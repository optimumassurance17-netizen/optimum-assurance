"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ClientQuickSearch } from "@/components/gestion/ClientQuickSearch"
import { readResponseJson } from "@/lib/read-response-json"
import { fetchClientSireneLookup, normalizeSiretForLookup } from "@/lib/client-sirene"
import { Toast } from "@/components/Toast"

function prettyQuestionnaireJson(raw: string | null | undefined): string {
  if (!raw?.trim()) return ""
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

type ProfileForm = {
  email: string
  raisonSociale: string
  siret: string
  adresse: string
  codePostal: string
  ville: string
  telephone: string
}

type DevisAutonomyForm = {
  allowDevisEdition: boolean
  allowForcedActivities: boolean
  forcedActivitiesText: string
  note: string
}

type QuestionnaireProfilePrefill = ProfileForm & {
  sources: string[]
}

function parseQuestionnaireJson(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function nestedRecord(source: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  const value = source?.[key]
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function stringField(source: Record<string, unknown> | null, key: string): string {
  const value = source?.[key]
  return typeof value === "string" ? value.trim() : ""
}

function hasProfileValues(form: ProfileForm): boolean {
  return Object.values(form).some((value) => value.trim().length > 0)
}

function buildQuestionnaireProfilePrefill(user: ClientData["user"]): QuestionnaireProfilePrefill | null {
  const initial = parseQuestionnaireJson(user.doInitialQuestionnaireJson)
  const etude = parseQuestionnaireJson(user.doEtudeQuestionnaireJson)
  const souscripteurEtude = nestedRecord(etude, "souscripteur")

  const fromInitial: ProfileForm = {
    email: stringField(initial, "email"),
    raisonSociale: stringField(initial, "raisonSociale"),
    siret: stringField(initial, "siret").replace(/\s/g, ""),
    adresse: stringField(initial, "adresse"),
    codePostal: stringField(initial, "codePostal"),
    ville: stringField(initial, "ville"),
    telephone: stringField(initial, "telephone"),
  }
  const fromEtude: ProfileForm = {
    email: stringField(souscripteurEtude, "email"),
    raisonSociale: stringField(souscripteurEtude, "nomRaisonSociale"),
    siret: "",
    adresse: stringField(souscripteurEtude, "adresse"),
    codePostal: stringField(souscripteurEtude, "codePostal"),
    ville: stringField(souscripteurEtude, "ville"),
    telephone: stringField(souscripteurEtude, "telephone"),
  }

  const titleInitial = parseQuestionnaireJson(user.titleInitialQuestionnaireJson)
  const titleEtude = parseQuestionnaireJson(user.titleEtudeQuestionnaireJson)
  const fromTitle: ProfileForm = {
    email: stringField(titleEtude, "email") || stringField(titleInitial, "email"),
    raisonSociale:
      stringField(titleEtude, "raisonSociale") ||
      stringField(titleInitial, "raisonSociale") ||
      stringField(titleEtude, "nomComplet") ||
      stringField(titleInitial, "nomComplet"),
    siret: (stringField(titleEtude, "siret") || stringField(titleInitial, "siret")).replace(/\s/g, ""),
    adresse: stringField(titleEtude, "adresse") || stringField(titleInitial, "adresse"),
    codePostal: stringField(titleEtude, "codePostal") || stringField(titleInitial, "codePostal"),
    ville: stringField(titleEtude, "ville") || stringField(titleInitial, "ville"),
    telephone: stringField(titleEtude, "telephone") || stringField(titleInitial, "telephone"),
  }

  const sources = [
    hasProfileValues(fromInitial) ? "premier devis DO" : "",
    hasProfileValues(fromEtude) ? "questionnaire d'étude DO" : "",
    hasProfileValues(fromTitle) ? "questionnaire assurance titre" : "",
  ].filter(Boolean)
  if (sources.length === 0) return null

  const merged: QuestionnaireProfilePrefill = {
    email: fromEtude.email || fromTitle.email || fromInitial.email || user.email || "",
    raisonSociale: fromEtude.raisonSociale || fromTitle.raisonSociale || fromInitial.raisonSociale || "",
    siret: fromInitial.siret || fromTitle.siret,
    adresse: fromEtude.adresse || fromTitle.adresse || fromInitial.adresse || "",
    codePostal: fromEtude.codePostal || fromTitle.codePostal || fromInitial.codePostal || "",
    ville: fromEtude.ville || fromTitle.ville || fromInitial.ville || "",
    telephone: fromEtude.telephone || fromTitle.telephone || fromInitial.telephone || "",
    sources,
  }

  return merged
}

interface ClientData {
  user: {
    id: string
    email: string
    raisonSociale: string | null
    siret: string | null
    adresse?: string | null
    codePostal?: string | null
    ville?: string | null
    telephone?: string | null
    createdAt: string
    doInitialQuestionnaireJson?: string | null
    doEtudeQuestionnaireJson?: string | null
    titleInitialQuestionnaireJson?: string | null
    titleEtudeQuestionnaireJson?: string | null
  }
  documents: { id: string; type: string; numero: string; status: string; createdAt: string }[]
  insuranceContracts?: { id: string; contractNumber: string; productType: string; createdAt: string }[]
  canGenerateDecennaleAttestation?: boolean
  payments: {
    id: string
    amount: number
    status: string
    statusLabel?: string | null
    methodLabel?: string | null
    echeanceLabel?: string | null
    virementReference?: string | null
    paidAt: string | null
    createdAt: string
  }[]
  avenantFees: { id: string; amount: number; status: string; createdAt: string }[]
  echeances?: {
    id: string
    label: string
    amount: number
    dueDate: string | null
    paid: boolean
    paidAt: string | null
    cardLinkStatus?: "none" | "open" | "expired"
    checkoutUrl?: string | null
    cardLinkSentAt?: string | null
    sepaFailure?: string | null
    clientNotifiedAt?: string | null
  }[]
  sepa?: {
    present: boolean
    status: string | null
    mandatePresent: boolean
    nextDue: string | null
    lastError: string | null
    pendingPaymentId: string | null
    pendingLabel?: "aucun" | "Lien carte" | "Prélèvement SEPA"
    trimestresSepaPayes: number
    amount: number | null
    cronWouldCharge: boolean
    summary: string
  }
  notes?: { id: string; content: string; adminEmail: string; createdAt: string }[]
  sinistres?: { id: string; dateSinistre: string; montantIndemnisation: number | null; description: string | null; userDocument: { id: string; filename: string; type: string } | null }[]
  userDocuments?: { id: string; type: string; filename: string; size?: number; createdAt?: string }[]
  userDocumentReviews?: Record<
    string,
    { status: "valid" | "invalid"; reason: string | null; updatedAt: string }
  >
  devisAutonomy?: {
    allowDevisEdition: boolean
    allowForcedActivities: boolean
    forcedActivities: string[]
    note: string | null
    updatedAt: string | null
    updatedBy: string | null
  }
  dda?: {
    consents: {
      id: string
      page: string
      produit: string
      acceptedAt: string
      email: string | null
      userId: string | null
    }[]
    events: {
      id: string
      adminEmail: string
      action: string
      targetType: string | null
      targetId: string | null
      targetLabel: string | null
      details: Record<string, unknown>
      createdAt: string
    }[]
  }
}

function asMaybeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function ddaProductLabel(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase()
  if (["decennale"].includes(normalized)) return "Décennale"
  if (["dommage-ouvrage", "dommage_ouvrage", "do"].includes(normalized)) return "Dommage ouvrage"
  if (["rc-fabriquant", "rc_fabriquant"].includes(normalized)) return "RC fabricant"
  return value?.trim() || "—"
}

function ddaPageLabel(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized === "souscription") return "Souscription"
  if (normalized === "souscription_do") return "Souscription DO"
  if (normalized === "signature") return "Signature"
  if (normalized === "formulaire_do") return "Formulaire DO"
  if (normalized === "paiement_do") return "Paiement DO"
  if (normalized === "devis_rc_fabriquant") return "Devis RC fabricant"
  if (normalized === "proposition_rc_fabriquant") return "Proposition RC fabricant"
  if (normalized === "signature_rc_fabriquant") return "Signature RC fabricant"
  if (normalized === "avenant_create") return "Création avenant"
  if (normalized === "avenant_update") return "Mise à jour avenant"
  if (normalized === "rc_fabriquant_result") return "Résultat RC fabricant"
  return value?.trim() || "—"
}

const typeLabels: Record<string, string> = {
  devis: "Devis",
  devis_do: "Devis DO",
  contrat: "Contrat",
  attestation: "Attestation",
  attestation_nominative: "Attestation nominative",
  attestation_do: "Attestation DO",
  attestation_non_sinistralite: "Attestation non sinistralité",
  avenant: "Avenant",
  facture_do: "Facture acquittée DO",
  facture_decennale: "Facture acquittée décennale",
}

const gedTypeLabels: Record<string, string> = {
  kbis: "KBIS",
  piece_identite: "Pièce d'identité",
  justificatif_activite: "Justificatif d'activité",
  qualification: "Qualification",
  rib: "RIB",
  releve_sinistralite: "Relevé de sinistralité",
  permis_construire: "Permis de construire",
  doc_droc: "DOC / DROC",
  plans_construction: "Plans construction",
  convention_maitrise_oeuvre: "Convention maîtrise d'œuvre",
  convention_controle_technique: "Convention contrôle technique",
  rapport_etude_sol: "Rapport étude de sol",
}

function toDevisAutonomyForm(
  config: ClientData["devisAutonomy"] | null | undefined
): DevisAutonomyForm {
  return {
    allowDevisEdition: config?.allowDevisEdition === true,
    allowForcedActivities: config?.allowForcedActivities === true,
    forcedActivitiesText: Array.isArray(config?.forcedActivities)
      ? config!.forcedActivities.join("\n")
      : "",
    note: config?.note ?? "",
  }
}

export default function ClientDetailPage() {
  const params = useParams()
  const safeParams = params ?? {}
  const router = useRouter()
  const { status, data: authSession } = useSession()
  const clientId = typeof safeParams.id === "string" ? safeParams.id : ""
  const [data, setData] = useState<ClientData | null>(null)
  const [notes, setNotes] = useState<{ id: string; content: string; adminEmail: string; createdAt: string }[]>([])
  const [noteInput, setNoteInput] = useState("")
  const [noteLoading, setNoteLoading] = useState(false)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [emailPresetLabel, setEmailPresetLabel] = useState<string | null>(null)
  const [emailModal, setEmailModal] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [sinistreModal, setSinistreModal] = useState(false)
  const [sinistreLoading, setSinistreLoading] = useState(false)
  const [sinistres, setSinistres] = useState<{
    id: string
    dateSinistre: string
    montantIndemnisation: number | null
    description: string | null
    userDocument: { id: string; filename: string; type: string } | null
  }[]>([])
  const [userDocuments, setUserDocuments] = useState<{ id: string; type: string; filename: string; size?: number; createdAt?: string }[]>([])
  const [userDocumentReviews, setUserDocumentReviews] = useState<
    Record<string, { status: "valid" | "invalid"; reason: string | null; updatedAt: string }>
  >({})
  const [reviewReasonByDocumentId, setReviewReasonByDocumentId] = useState<Record<string, string>>({})
  const [reviewLoadingByDocumentId, setReviewLoadingByDocumentId] = useState<Record<string, boolean>>({})
  const [sinistreForm, setSinistreForm] = useState({ dateSinistre: "", montantIndemnisation: "", description: "", userDocumentId: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    email: "",
    raisonSociale: "",
    siret: "",
    adresse: "",
    codePostal: "",
    ville: "",
    telephone: "",
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSireneLoading, setProfileSireneLoading] = useState(false)
  const [profileSireneError, setProfileSireneError] = useState<string | null>(null)
  const [devisAutonomySaving, setDevisAutonomySaving] = useState(false)
  const [devisAutonomyForm, setDevisAutonomyForm] = useState<DevisAutonomyForm>({
    allowDevisEdition: false,
    allowForcedActivities: false,
    forcedActivitiesText: "",
    note: "",
  })
  const [attestationGenerating, setAttestationGenerating] = useState(false)
  const [suspendingQrId, setSuspendingQrId] = useState<string | null>(null)
  const [clientAccessLoading, setClientAccessLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type?: "success" | "warning" | "error" } | null>(null)
  const [echeanceBusy, setEcheanceBusy] = useState<string | null>(null)
  const [virementModal, setVirementModal] = useState<{ echeanceId: string; label: string; amountLabel: string } | null>(null)
  const [virementReference, setVirementReference] = useState("")
  const [virementError, setVirementError] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/gestion")
      return
    }
    if (status !== "authenticated") return

    const fetchData = async () => {
      if (!clientId) {
        setError("Client introuvable")
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/gestion/clients/${clientId}`)
        if (res.status === 403) {
          setError("Accès refusé")
          return
        }
        if (!res.ok) throw new Error("Erreur chargement")
        const json = await readResponseJson<ClientData>(res)
        setData(json)
        const u = json.user
        setProfileForm({
          email: u.email,
          raisonSociale: u.raisonSociale ?? "",
          siret: u.siret ?? "",
          adresse: u.adresse ?? "",
          codePostal: u.codePostal ?? "",
          ville: u.ville ?? "",
          telephone: u.telephone ?? "",
        })
        setNotes(json.notes ?? [])
        setSinistres(json.sinistres ?? [])
        setUserDocuments(json.userDocuments ?? [])
        setUserDocumentReviews(json.userDocumentReviews ?? {})
        setDevisAutonomyForm(toDevisAutonomyForm(json.devisAutonomy))
      } catch {
        setError("Client introuvable")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clientId, status, router])

  if (status === "loading" || loading) {
    return (
      <main className="gestion-app min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-200">Chargement...</p>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="gestion-app min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Client introuvable"}</p>
          <Link href="/gestion" className="text-[#2563eb] hover:underline">← Retour au dashboard</Link>
        </div>
      </main>
    )
  }

  const { user, documents, payments, avenantFees } = data
  const echeances = data.echeances ?? []

  const suspendAttestationQr = async (documentId: string, numero: string) => {
    const confirmed = window.confirm(
      `Suspendre l'attestation décennale ${numero} ? Le QR code affichera une attestation suspendue. Un email d'impayé sera envoyé au client.`
    )
    if (!confirmed) return
    setSuspendingQrId(documentId)
    try {
      const res = await fetch(`/api/gestion/documents/${documentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "suspendu" }),
      })
      const body = await readResponseJson<{ error?: string; warning?: string; emailSent?: boolean }>(res)
      if (!res.ok) throw new Error(body.error || "Impossible de suspendre l'attestation.")
      const reload = await fetch(`/api/gestion/clients/${clientId}`)
      if (reload.ok) {
        setData(await readResponseJson<ClientData>(reload))
      } else {
        setData((current) =>
          current
            ? {
                ...current,
                documents: current.documents.map((document) =>
                  document.id === documentId ? { ...document, status: "suspendu" } : document
                ),
              }
            : current
        )
      }
      setToast({
        message:
          body.emailSent === false
            ? body.warning || `QR code suspendu pour ${numero}. L'email d'impayé n'a pas pu être envoyé.`
            : `QR code suspendu pour ${numero}. Email d'impayé envoyé au client.`,
        type: body.emailSent === false ? "warning" : "success",
      })
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Impossible de suspendre l'attestation.",
        type: "error",
      })
    } finally {
      setSuspendingQrId(null)
    }
  }

  const handleEcheance = async (
    echeanceId: string,
    action: "carte" | "regler" | "virement" | "prevenir",
    reference?: string
  ) => {
    if (action === "virement" && !reference?.trim()) {
      setVirementError("Indiquez le libellé ou la date du virement.")
      return
    }
    setEcheanceBusy(`${echeanceId}:${action}`)
    try {
      const res = await fetch(`/api/gestion/clients/${clientId}/echeances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          echeanceId,
          action,
          ...(action === "virement" ? { virementReference: reference } : {}),
        }),
      })
      const body = await readResponseJson<{
        error?: string
        ok?: boolean
        alreadyPaid?: boolean
        reused?: boolean
        sentTo?: string
        checkoutUrl?: string
        emailSent?: boolean
        warning?: string
        echeances?: ClientData["echeances"]
      }>(res)
      if (!res.ok && !body.checkoutUrl) {
        throw new Error(body.error || "Action impossible")
      }
      if (body.echeances) {
        setData((current) => (current ? { ...current, echeances: body.echeances } : current))
      }
      const reload = await fetch(`/api/gestion/clients/${clientId}`)
      if (reload.ok) {
        setData(await readResponseJson<ClientData>(reload))
      }
      if (action === "prevenir") {
        setToast({
          message: body.emailSent === false
            ? body.warning || "Email non envoyé."
            : `Information envoyée à ${body.sentTo || user.email}.`,
          type: body.emailSent === false ? "warning" : "success",
        })
        return
      }
      if (action === "carte" && body.checkoutUrl && body.emailSent === false) {
        setToast({
          message: `Email non envoyé. Lien carte : ${body.checkoutUrl}`,
          type: "warning",
        })
        return
      }
      if (action === "regler" || action === "virement") {
        if (action === "virement") {
          setVirementModal(null)
          setVirementReference("")
          setVirementError(null)
        }
        if (body.alreadyPaid) {
          setToast({ message: "Cette échéance est déjà réglée.", type: "success" })
          return
        }
        const recorded = action === "virement" ? "Virement enregistré" : "Échéance marquée comme réglée"
        setToast({
          message: body.emailSent === false
            ? body.warning || `${recorded}. Le reçu n'a pas pu être envoyé.`
            : `${recorded}. Reçu envoyé à ${body.sentTo || user.email}.`,
          type: body.emailSent === false ? "warning" : "success",
        })
        return
      }
      setToast({
        message: body.alreadyPaid
          ? "Échéance marquée comme réglée."
          : body.reused
            ? `Lien déjà ouvert, renvoyé à ${body.sentTo || user.email}.`
            : `Lien de paiement carte envoyé à ${body.sentTo || user.email}.`,
        type: "success",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur sur l'échéance"
      if (action === "virement") setVirementError(message)
      setToast({
        message,
        type: "error",
      })
    } finally {
      setEcheanceBusy(null)
    }
  }
  const caTotal = payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0)
  const isOwnAdminAccount = authSession?.user?.id === clientId
  const ddaConsents = data.dda?.consents ?? []
  const ddaEvents = data.dda?.events ?? []
  const canGenerateDecennaleAttestation = data.canGenerateDecennaleAttestation === true
  const questionnaireProfilePrefill = buildQuestionnaireProfilePrefill(user)

  const handleProfileSireneFill = async () => {
    setProfileSireneError(null)
    setProfileSireneLoading(true)
    try {
      const siret = normalizeSiretForLookup(profileForm.siret)
      const sirene = await fetchClientSireneLookup(siret)
      setProfileForm((current) => ({
        ...current,
        siret,
        raisonSociale: sirene.raisonSociale || current.raisonSociale,
        adresse: sirene.adresse || current.adresse,
        codePostal: sirene.codePostal || current.codePostal,
        ville: sirene.ville || current.ville,
      }))
      setToast({
        message: "Coordonnées Sirene préremplies. Vérifiez puis enregistrez la fiche.",
        type: "success",
      })
    } catch (err) {
      setProfileSireneError(err instanceof Error ? err.message : "Erreur Sirene")
    } finally {
      setProfileSireneLoading(false)
    }
  }

  return (
    <main className="gestion-app min-h-screen bg-[#1a1a1a] text-gray-200">
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/gestion" className="text-gray-200 hover:text-white text-sm">← Dashboard</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-[#252525] rounded-xl p-6 border border-gray-700">
          <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
            <h1 className="text-xl font-semibold text-white">Fiche client</h1>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  setClientAccessLoading(true)
                  try {
                    const res = await fetch(`/api/gestion/clients/${clientId}/send-client-access`, {
                      method: "POST",
                    })
                    const json = await readResponseJson<{
                      error?: string
                      ok?: boolean
                      sentTo?: string
                      emailSent?: boolean
                      temporaryPassword?: string
                      warning?: string
                    }>(res)
                    if (!res.ok || !json.ok) {
                      throw new Error(json.error || "Impossible de créer l'accès client.")
                    }
                    const prefix =
                      json.warning?.trim() ||
                      `Accès espace client ${json.emailSent === false ? "généré" : "envoyé"} à ${json.sentTo || user.email}`
                    setToast({
                      message: json.temporaryPassword
                        ? `${prefix}${/[.!?]$/.test(prefix) ? "" : "."} Mot de passe temporaire : ${json.temporaryPassword}`
                        : prefix,
                      type: json.emailSent === false ? "warning" : "success",
                    })
                  } catch (err) {
                    setToast({
                      message: err instanceof Error ? err.message : "Erreur création accès client",
                      type: "error",
                    })
                  } finally {
                    setClientAccessLoading(false)
                  }
                }}
                disabled={clientAccessLoading}
                className="text-sm text-emerald-300 hover:text-emerald-200 font-medium disabled:opacity-50"
              >
                {clientAccessLoading ? "Création accès..." : "Créer / renvoyer accès client"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailPresetLabel(null)
                  setSinistreForm({ dateSinistre: "", montantIndemnisation: "", description: "", userDocumentId: "" })
                  setSinistreModal(true)
                }}
                className="text-sm text-[#2563eb] hover:text-[#1d4ed8] font-medium"
              >
                Sinistre
              </button>
              <button
                type="button"
                disabled={attestationGenerating || !canGenerateDecennaleAttestation}
                title={
                  canGenerateDecennaleAttestation
                    ? undefined
                    : "Aucun contrat décennale trouvé pour ce client."
                }
                onClick={async () => {
                  if (!canGenerateDecennaleAttestation) return
                  setAttestationGenerating(true)
                  try {
                    const res = await fetch(
                      `/api/gestion/clients/${clientId}/attestation-decennale`,
                      { method: "POST" }
                    )
                    const json = await readResponseJson<{
                      ok?: boolean
                      error?: string
                      warning?: string
                      emailSent?: boolean
                      document?: {
                        id: string
                        type: string
                        numero: string
                        status: string
                        createdAt: string
                      }
                    }>(res)
                    if (!res.ok || !json.ok || !json.document) {
                      throw new Error(
                        json.error ||
                          "Impossible de générer l'attestation décennale."
                      )
                    }
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            documents: [json.document!, ...prev.documents],
                          }
                        : prev
                    )
                    const emailInfo = json.emailSent
                      ? "Email client envoyé."
                      : "Attestation créée, mais email client non envoyé."
                    setToast({
                      message: json.warning
                        ? `${emailInfo} ${json.warning}`
                        : `Attestation ${json.document.numero} générée. ${emailInfo}`,
                      type: json.emailSent ? "success" : "warning",
                    })
                  } catch (err) {
                    setToast({
                      message:
                        err instanceof Error
                          ? err.message
                          : "Erreur génération attestation décennale",
                      type: "error",
                    })
                  } finally {
                    setAttestationGenerating(false)
                  }
                }}
                className="text-sm text-cyan-300 hover:text-cyan-200 font-medium disabled:opacity-50"
              >
                {attestationGenerating
                  ? "Génération attestation..."
                  : canGenerateDecennaleAttestation
                    ? "Générer attestation décennale"
                    : "Aucun contrat décennale"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const subject = "Demande de relevé de sinistralité"
                  const body = [
                    `Bonjour ${user.raisonSociale || user.email},`,
                    "",
                    "Merci de déposer votre relevé de sinistralité à jour dans votre espace client (rubrique GED).",
                    "Ce document est nécessaire pour finaliser l'analyse de votre dossier.",
                    "",
                    "Cordialement,",
                    "Service Gestion Optimum Assurance",
                  ].join("\n")
                  setEmailSubject(subject)
                  setEmailBody(body)
                  setEmailPresetLabel("Demande relevé de sinistralité")
                  setEmailModal(true)
                }}
                className="text-sm text-amber-300 hover:text-amber-200 font-medium"
              >
                Demander relevé sinistralité
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailPresetLabel(null)
                  setEmailModal(true)
                }}
                className="text-sm text-[#2563eb] hover:text-[#1d4ed8] font-medium"
              >
                Envoyer un email
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-200 mb-4">
            Client depuis le {new Date(user.createdAt).toLocaleDateString("fr-FR")} — modifiez les coordonnées compte
            (connexion, facturation) ci-dessous.
          </p>
          <div className="mb-4 rounded-xl border border-gray-700 bg-[#202020] p-4">
            <ClientQuickSearch
              label="Recherche rapide d'une autre fiche client"
              placeholder="Nom, email ou SIRET"
              helperText="Ouvre une autre fiche client sans revenir au dashboard."
            />
          </div>
          {questionnaireProfilePrefill && questionnaireProfilePrefill.sources.length > 0 ? (
            <div className="mb-4 rounded-lg border border-sky-800/60 bg-sky-950/20 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-sky-100">
                    Données déjà remplies détectées
                  </p>
                  <p className="mt-1 text-xs text-sky-200/80">
                    Source : {questionnaireProfilePrefill.sources.join(" + ")}. Cliquez pour préremplir la fiche client avec les coordonnées du questionnaire.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={profileSaving}
                  onClick={async () => {
                    const nextProfile = {
                      ...profileForm,
                      email: questionnaireProfilePrefill.email || profileForm.email,
                      raisonSociale: questionnaireProfilePrefill.raisonSociale || profileForm.raisonSociale,
                      siret: questionnaireProfilePrefill.siret || profileForm.siret,
                      adresse: questionnaireProfilePrefill.adresse || profileForm.adresse,
                      codePostal: questionnaireProfilePrefill.codePostal || profileForm.codePostal,
                      ville: questionnaireProfilePrefill.ville || profileForm.ville,
                      telephone: questionnaireProfilePrefill.telephone || profileForm.telephone,
                    }
                    setProfileSaving(true)
                    setProfileForm(nextProfile)
                    try {
                      const res = await fetch(`/api/gestion/clients/${clientId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(nextProfile),
                      })
                      const json = await readResponseJson<{
                        error?: string
                        user?: ClientData["user"]
                        syncedDocuments?: number
                      }>(res)
                      if (!res.ok) throw new Error(json.error || "Reprise automatique impossible")
                      if (json.user) {
                        setData((d) => (d ? { ...d, user: json.user! } : d))
                      }
                      const n = json.syncedDocuments ?? 0
                      setToast({
                        message:
                          n > 0
                            ? `Coordonnées reprises et enregistrées — ${n} contrat(s) / avenant(s) synchronisé(s)`
                            : "Coordonnées reprises et enregistrées.",
                        type: "success",
                      })
                    } catch (err) {
                      setToast({
                        message: err instanceof Error ? err.message : "Erreur reprise automatique",
                        type: "error",
                      })
                    } finally {
                      setProfileSaving(false)
                    }
                  }}
                  className="shrink-0 rounded-lg border border-sky-500/70 px-3 py-2 text-xs font-medium text-sky-100 hover:bg-sky-900/40 disabled:opacity-50"
                >
                  {profileSaving ? "Reprise..." : "Reprendre et enregistrer"}
                </button>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {questionnaireProfilePrefill.raisonSociale ? (
                  <div>
                    <dt className="text-sky-300/70">Raison sociale</dt>
                    <dd className="text-gray-100">{questionnaireProfilePrefill.raisonSociale}</dd>
                  </div>
                ) : null}
                {questionnaireProfilePrefill.siret ? (
                  <div>
                    <dt className="text-sky-300/70">SIRET</dt>
                    <dd className="font-mono text-gray-100">{questionnaireProfilePrefill.siret}</dd>
                  </div>
                ) : null}
                {questionnaireProfilePrefill.adresse || questionnaireProfilePrefill.codePostal || questionnaireProfilePrefill.ville ? (
                  <div className="sm:col-span-2">
                    <dt className="text-sky-300/70">Adresse</dt>
                    <dd className="text-gray-100">
                      {[questionnaireProfilePrefill.adresse, questionnaireProfilePrefill.codePostal, questionnaireProfilePrefill.ville]
                        .filter(Boolean)
                        .join(" ")}
                    </dd>
                  </div>
                ) : null}
                {questionnaireProfilePrefill.telephone ? (
                  <div>
                    <dt className="text-sky-300/70">Téléphone</dt>
                    <dd className="text-gray-100">{questionnaireProfilePrefill.telephone}</dd>
                  </div>
                ) : null}
                {questionnaireProfilePrefill.email ? (
                  <div>
                    <dt className="text-sky-300/70">Email</dt>
                    <dd className="text-gray-100">{questionnaireProfilePrefill.email}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setProfileSaving(true)
              try {
                const res = await fetch(`/api/gestion/clients/${clientId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: profileForm.email.trim(),
                    raisonSociale: profileForm.raisonSociale,
                    siret: profileForm.siret,
                    adresse: profileForm.adresse,
                    codePostal: profileForm.codePostal,
                    ville: profileForm.ville,
                    telephone: profileForm.telephone,
                  }),
                })
                const json = await readResponseJson<{
                  error?: string
                  user?: ClientData["user"]
                  syncedDocuments?: number
                }>(res)
                if (!res.ok) throw new Error(json.error || "Erreur")
                if (json.user) {
                  setData((d) => (d ? { ...d, user: json.user! } : d))
                  const n = json.syncedDocuments ?? 0
                  setToast({
                    message:
                      n > 0
                        ? `Fiche enregistrée — identité recopiée sur ${n} contrat(s) / avenant(s)`
                        : "Fiche enregistrée",
                    type: "success",
                  })
                }
              } catch (err) {
                setToast({ message: err instanceof Error ? err.message : "Erreur", type: "error" })
              } finally {
                setProfileSaving(false)
              }
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-200 mb-1">Raison sociale</label>
                <input
                  value={profileForm.raisonSociale}
                  onChange={(e) => setProfileForm((f) => ({ ...f, raisonSociale: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-200 mb-1">Email (connexion)</label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-200 mb-1">SIRET</label>
                <div className="space-y-2">
                  <input
                    value={profileForm.siret}
                    onChange={(e) => {
                      setProfileSireneError(null)
                      setProfileForm((f) => ({ ...f, siret: normalizeSiretForLookup(e.target.value) }))
                    }}
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleProfileSireneFill}
                      disabled={normalizeSiretForLookup(profileForm.siret).length !== 14 || profileSireneLoading}
                      className="rounded-lg border border-sky-500/70 px-3 py-2 text-xs font-medium text-sky-100 hover:bg-sky-900/40 disabled:opacity-50"
                    >
                      {profileSireneLoading ? "Recherche Sirene…" : "Remplir via Sirene"}
                    </button>
                    <span className="text-xs text-gray-400">
                      Préremplit la raison sociale et l&apos;adresse depuis le SIRET.
                    </span>
                  </div>
                  {profileSireneError ? <p className="text-xs text-red-400">{profileSireneError}</p> : null}
                </div>
              </div>
              <div>
                <label className="block text-gray-200 mb-1">Téléphone</label>
                <input
                  value={profileForm.telephone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, telephone: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-gray-200 mb-1">Adresse</label>
                <input
                  value={profileForm.adresse}
                  onChange={(e) => setProfileForm((f) => ({ ...f, adresse: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-200 mb-1">Code postal</label>
                <input
                  value={profileForm.codePostal}
                  onChange={(e) => setProfileForm((f) => ({ ...f, codePostal: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-200 mb-1">Ville</label>
                <input
                  value={profileForm.ville}
                  onChange={(e) => setProfileForm((f) => ({ ...f, ville: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="bg-[#2563eb] text-white px-5 py-2 rounded-lg hover:bg-[#1d4ed8] disabled:opacity-50 font-medium text-sm"
              >
                {profileSaving ? "Enregistrement…" : "Enregistrer la fiche"}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-[#252525] rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-2">
            Auto-autorisation devis & forçage activités
          </h2>
          <p className="text-xs text-gray-300 mb-4">
            Paramétrage par client: autoriser la modification devis/contrat en espace client et
            imposer des activités lors des sauvegardes du devis.
          </p>
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={devisAutonomyForm.allowDevisEdition}
                onChange={(e) =>
                  setDevisAutonomyForm((prev) => ({
                    ...prev,
                    allowDevisEdition: e.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-gray-500 bg-[#1a1a1a]"
              />
              <span>
                <span className="font-medium text-white">
                  Autoriser la modification devis/contrat côté client
                </span>
                <br />
                <span className="text-xs text-gray-400">
                  Active le déverrouillage des modifications de couverture pour ce client.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={devisAutonomyForm.allowForcedActivities}
                onChange={(e) =>
                  setDevisAutonomyForm((prev) => ({
                    ...prev,
                    allowForcedActivities: e.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-gray-500 bg-[#1a1a1a]"
              />
              <span>
                <span className="font-medium text-white">Activer le forçage d&apos;activités</span>
                <br />
                <span className="text-xs text-gray-400">
                  Les activités ci-dessous sont automatiquement ajoutées à la sauvegarde du devis.
                </span>
              </span>
            </label>

            <div>
              <label className="block text-gray-200 mb-1 text-sm">
                Activités forcées (une par ligne ou séparées par virgule)
              </label>
              <textarea
                rows={4}
                value={devisAutonomyForm.forcedActivitiesText}
                onChange={(e) =>
                  setDevisAutonomyForm((prev) => ({
                    ...prev,
                    forcedActivitiesText: e.target.value,
                  }))
                }
                disabled={!devisAutonomyForm.allowForcedActivities}
                placeholder="Ex: Maçonnerie&#10;Étanchéité"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-gray-200 mb-1 text-sm">Note interne (optionnelle)</label>
              <input
                type="text"
                value={devisAutonomyForm.note}
                onChange={(e) =>
                  setDevisAutonomyForm((prev) => ({ ...prev, note: e.target.value }))
                }
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="Motif de l'autoautorisation / forçage"
              />
            </div>

            {data.devisAutonomy?.updatedAt ? (
              <p className="text-xs text-gray-400">
                Dernière mise à jour: {new Date(data.devisAutonomy.updatedAt).toLocaleString("fr-FR")}
                {data.devisAutonomy.updatedBy ? ` par ${data.devisAutonomy.updatedBy}` : ""}
              </p>
            ) : (
              <p className="text-xs text-gray-400">Aucune règle personnalisée enregistrée.</p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={devisAutonomySaving}
                onClick={async () => {
                  if (
                    devisAutonomyForm.allowForcedActivities &&
                    !devisAutonomyForm.forcedActivitiesText.trim()
                  ) {
                    setToast({
                      message: "Renseignez au moins une activité forcée, ou décochez le forçage.",
                      type: "error",
                    })
                    return
                  }
                  setDevisAutonomySaving(true)
                  try {
                    const payload = {
                      devisAutonomy: {
                        allowDevisEdition: devisAutonomyForm.allowDevisEdition,
                        allowForcedActivities: devisAutonomyForm.allowForcedActivities,
                        forcedActivities: devisAutonomyForm.forcedActivitiesText,
                        note: devisAutonomyForm.note,
                      },
                    }
                    const res = await fetch(`/api/gestion/clients/${clientId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    })
                    const json = await readResponseJson<{
                      error?: string
                      devisAutonomy?: ClientData["devisAutonomy"]
                    }>(res)
                    if (!res.ok) {
                      throw new Error(json.error || "Erreur mise à jour autonomie devis")
                    }
                    if (json.devisAutonomy) {
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              devisAutonomy: json.devisAutonomy,
                            }
                          : prev
                      )
                      setDevisAutonomyForm(toDevisAutonomyForm(json.devisAutonomy))
                    }
                    setToast({
                      message: "Paramétrage autonomie devis enregistré pour ce client.",
                      type: "success",
                    })
                  } catch (err) {
                    setToast({
                      message:
                        err instanceof Error
                          ? err.message
                          : "Erreur enregistrement autonomie devis",
                      type: "error",
                    })
                  } finally {
                    setDevisAutonomySaving(false)
                  }
                }}
                className="bg-[#2563eb] text-white px-5 py-2 rounded-lg hover:bg-[#1d4ed8] disabled:opacity-50 font-medium text-sm"
              >
                {devisAutonomySaving ? "Enregistrement..." : "Enregistrer autonomie devis"}
              </button>
            </div>
          </div>
        </section>

        {(user.doInitialQuestionnaireJson?.trim() || user.doEtudeQuestionnaireJson?.trim()) && (
          <section className="bg-[#252525] rounded-xl p-6 border border-gray-700 space-y-4">
            <h2 className="text-lg font-semibold text-white">Questionnaires dommage ouvrage</h2>
            <p className="text-xs text-gray-400">
              Données issues du premier devis en ligne et du questionnaire d&apos;étude (espace client). Lecture seule.
            </p>
            {user.doInitialQuestionnaireJson?.trim() ? (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-[#93c5fd] hover:text-[#bfdbfe]">
                  Premier questionnaire (devis en ligne)
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-[#1a1a1a] p-3 text-xs text-gray-300 border border-gray-600 whitespace-pre-wrap break-words">
                  {prettyQuestionnaireJson(user.doInitialQuestionnaireJson)}
                </pre>
              </details>
            ) : null}
            {user.doEtudeQuestionnaireJson?.trim() ? (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-[#93c5fd] hover:text-[#bfdbfe]">
                  Questionnaire d&apos;étude (espace client)
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-[#1a1a1a] p-3 text-xs text-gray-300 border border-gray-600 whitespace-pre-wrap break-words">
                  {prettyQuestionnaireJson(user.doEtudeQuestionnaireJson)}
                </pre>
              </details>
            ) : null}
          </section>
        )}

        {(ddaConsents.length > 0 || ddaEvents.length > 0) && (
          <section className="bg-[#252525] rounded-xl p-6 border border-gray-700 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Conformité DDA</h2>
              <p className="text-xs text-gray-400 mt-1">
                Journal des consentements devoir de conseil et contrôles d&apos;adéquation produit.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-700 bg-[#1a1a1a] p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Consentements DDA</p>
                <p className="mt-1 text-xl font-semibold text-white">{ddaConsents.length}</p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-[#1a1a1a] p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Contrôles adéquation</p>
                <p className="mt-1 text-xl font-semibold text-white">{ddaEvents.length}</p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-[#1a1a1a] p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Dernière preuve</p>
                <p className="mt-1 text-sm font-medium text-gray-200">
                  {(() => {
                    const latest = [
                      ...ddaConsents.map((entry) => entry.acceptedAt),
                      ...ddaEvents.map((entry) => entry.createdAt),
                    ]
                      .sort()
                      .at(-1)
                    return latest ? new Date(latest).toLocaleString("fr-FR") : "—"
                  })()}
                </p>
              </div>
            </div>

            {ddaConsents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-sky-200 mb-2">Consentements devoir de conseil</h3>
                <div className="bg-[#1a1a1a] rounded-lg border border-gray-700 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-3 font-medium text-gray-300">Date</th>
                        <th className="text-left p-3 font-medium text-gray-300">Produit</th>
                        <th className="text-left p-3 font-medium text-gray-300">Étape</th>
                        <th className="text-left p-3 font-medium text-gray-300">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ddaConsents.map((row) => (
                        <tr key={row.id} className="border-b border-gray-800/80">
                          <td className="p-3 text-gray-200">{new Date(row.acceptedAt).toLocaleString("fr-FR")}</td>
                          <td className="p-3">
                            <span className="rounded bg-sky-900/40 px-2 py-1 text-sky-200">
                              {ddaProductLabel(row.produit)}
                            </span>
                          </td>
                          <td className="p-3 text-gray-200">{ddaPageLabel(row.page)}</td>
                          <td className="p-3 text-gray-400">{row.email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {ddaEvents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-emerald-200 mb-2">Preuves d&apos;adéquation et contrôles</h3>
                <div className="space-y-3">
                  {ddaEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border border-gray-700 bg-[#1a1a1a] p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-emerald-900/40 px-2 py-1 text-emerald-200">
                          {event.action}
                        </span>
                        <span className="text-gray-300">{new Date(event.createdAt).toLocaleString("fr-FR")}</span>
                        <span className="text-gray-400">
                          {event.targetType || "—"}
                          {event.targetId ? ` #${event.targetId.slice(-8)}` : ""}
                        </span>
                      </div>
                      {event.targetLabel ? (
                        <p className="mt-1 text-xs text-gray-400">
                          Cible : <span className="text-gray-300">{event.targetLabel}</span>
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-gray-300">
                        Produit :{" "}
                        <span className="text-white">
                          {ddaProductLabel(
                            asMaybeString(event.details.product) ||
                              asMaybeString(event.details.produit) ||
                              asMaybeString(event.details.recommendedProduct)
                          )}
                        </span>
                      </p>
                      {asMaybeString(event.details.needsSummary) && (
                        <p className="mt-1 text-xs text-gray-200">
                          <span className="text-gray-400">Besoins :</span> {asMaybeString(event.details.needsSummary)}
                        </p>
                      )}
                      {asMaybeString(event.details.suitability) && (
                        <p className="mt-1 text-xs text-gray-200">
                          <span className="text-gray-400">Adéquation :</span> {asMaybeString(event.details.suitability)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {(user.titleInitialQuestionnaireJson?.trim() || user.titleEtudeQuestionnaireJson?.trim()) && (
          <section className="bg-[#252525] rounded-xl p-6 border border-gray-700 space-y-4">
            <h2 className="text-lg font-semibold text-white">Questionnaires Assurance titre</h2>
            <p className="text-xs text-gray-400">
              Données issues du formulaire public et du questionnaire d’étude en espace client. Lecture seule.
            </p>
            <p className="text-xs text-violet-200">
              <Link href="/assurance-titre/referentiel-couverture" className="font-medium hover:underline">
                Ouvrir le référentiel couverture / exclusions Assurance titre
              </Link>
            </p>
            {user.titleInitialQuestionnaireJson?.trim() ? (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-[#c4b5fd] hover:text-[#ddd6fe]">
                  Premier questionnaire (page publique)
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-[#1a1a1a] p-3 text-xs text-gray-300 border border-gray-600 whitespace-pre-wrap break-words">
                  {prettyQuestionnaireJson(user.titleInitialQuestionnaireJson)}
                </pre>
              </details>
            ) : null}
            {user.titleEtudeQuestionnaireJson?.trim() ? (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-[#c4b5fd] hover:text-[#ddd6fe]">
                  Questionnaire d&apos;étude (espace client)
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-[#1a1a1a] p-3 text-xs text-gray-300 border border-gray-600 whitespace-pre-wrap break-words">
                  {prettyQuestionnaireJson(user.titleEtudeQuestionnaireJson)}
                </pre>
              </details>
            ) : null}
          </section>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-200 text-sm">Documents</p>
            <p className="text-2xl font-bold text-white">{documents.length}</p>
          </div>
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-200 text-sm">Paiements</p>
            <p className="text-2xl font-bold text-white">{payments.length}</p>
          </div>
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-200 text-sm">CA total</p>
            <p className="text-2xl font-bold text-green-400">{caTotal.toLocaleString("fr-FR")} €</p>
          </div>
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-200 text-sm">Frais avenant en attente</p>
            <p className="text-2xl font-bold text-sky-400">{avenantFees.filter((f) => f.status === "pending").length}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Documents</h2>
          <div className="bg-[#252525] rounded-xl overflow-hidden border border-gray-700">
            {documents.length === 0 ? (
              <p className="p-4 text-gray-200">Aucun document</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">N°</th>
                    <th className="text-left p-4 font-medium">Statut</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id} className="border-b border-gray-700/50">
                      <td className="p-4">{typeLabels[d.type] || d.type}</td>
                      <td className="p-4 font-mono">{d.numero}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          d.status === "valide" ? "bg-green-900/50 text-green-300" :
                          d.status === "suspendu" ? "bg-red-900/50 text-red-300" :
                          d.status === "resilie" ? "bg-gray-700 text-gray-200" :
                          "bg-blue-900/50 text-sky-200"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            href={`/gestion/documents/${d.id}`}
                            className="text-[#2563eb] hover:text-[#1d4ed8] text-sm"
                          >
                            Voir
                          </Link>
                          {(d.type === "attestation" || d.type === "attestation_nominative") && d.status === "valide" ? (
                            <button
                              type="button"
                              disabled={suspendingQrId !== null}
                              onClick={() => void suspendAttestationQr(d.id, d.numero)}
                              className="rounded-lg border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-200 hover:border-red-300 disabled:opacity-50"
                            >
                              {suspendingQrId === d.id ? "Suspension…" : "Suspendre le QR code"}
                            </button>
                          ) : null}
                          {(d.type === "attestation" || d.type === "attestation_nominative") && d.status === "suspendu" ? (
                            <span className="text-xs font-semibold text-red-300">QR suspendu</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Documents GED déposés par le client</h2>
          <div className="bg-[#252525] rounded-xl overflow-hidden border border-gray-700">
            {userDocuments.length === 0 ? (
              <p className="p-4 text-gray-200">Aucun document GED déposé</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Type GED</th>
                    <th className="text-left p-4 font-medium">Fichier</th>
                    <th className="text-left p-4 font-medium">Date dépôt</th>
                    <th className="text-left p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userDocuments.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-700/50">
                      <td className="p-4">{gedTypeLabels[doc.type] || doc.type}</td>
                      <td className="p-4">{doc.filename}</td>
                      <td className="p-4">
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <a
                            href={`/api/gestion/clients/${clientId}/documents/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2563eb] hover:text-[#1d4ed8] text-sm"
                          >
                            Ouvrir
                          </a>
                          <button
                            type="button"
                            disabled={!!reviewLoadingByDocumentId[doc.id]}
                            onClick={async () => {
                              setReviewLoadingByDocumentId((prev) => ({ ...prev, [doc.id]: true }))
                              try {
                                const res = await fetch(
                                  `/api/gestion/clients/${clientId}/documents/${doc.id}/review`,
                                  {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: "valid" }),
                                  }
                                )
                                const json = await readResponseJson<{
                                  error?: string
                                  review?: { status: "valid" | "invalid"; reason: string | null; updatedAt: string }
                                }>(res)
                                if (!res.ok || !json.review) {
                                  throw new Error(json.error || "Impossible de valider le document.")
                                }
                                setUserDocumentReviews((prev) => ({ ...prev, [doc.id]: json.review! }))
                                setReviewReasonByDocumentId((prev) => ({ ...prev, [doc.id]: "" }))
                                setToast({ message: "Document GED validé", type: "success" })
                              } catch (error) {
                                setToast({
                                  message:
                                    error instanceof Error
                                      ? error.message
                                      : "Impossible de valider le document.",
                                  type: "error",
                                })
                              } finally {
                                setReviewLoadingByDocumentId((prev) => ({ ...prev, [doc.id]: false }))
                              }
                            }}
                            className="px-2 py-1 rounded bg-emerald-900/40 text-emerald-200 text-xs hover:bg-emerald-900/60 disabled:opacity-50"
                          >
                            Valide
                          </button>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={reviewReasonByDocumentId[doc.id] ?? userDocumentReviews[doc.id]?.reason ?? ""}
                              onChange={(e) =>
                                setReviewReasonByDocumentId((prev) => ({
                                  ...prev,
                                  [doc.id]: e.target.value,
                                }))
                              }
                              placeholder="Motif refus"
                              className="bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-white w-40"
                            />
                            <button
                              type="button"
                              disabled={!!reviewLoadingByDocumentId[doc.id]}
                              onClick={async () => {
                                const reason = (reviewReasonByDocumentId[doc.id] ?? "").trim()
                                if (!reason) {
                                  setToast({
                                    message: "Le motif est obligatoire pour marquer un document invalide.",
                                    type: "error",
                                  })
                                  return
                                }
                                setReviewLoadingByDocumentId((prev) => ({ ...prev, [doc.id]: true }))
                                try {
                                  const res = await fetch(
                                    `/api/gestion/clients/${clientId}/documents/${doc.id}/review`,
                                    {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ status: "invalid", reason }),
                                    }
                                  )
                                  const json = await readResponseJson<{
                                    error?: string
                                    review?: { status: "valid" | "invalid"; reason: string | null; updatedAt: string }
                                  }>(res)
                                  if (!res.ok || !json.review) {
                                    throw new Error(json.error || "Impossible de marquer le document en invalide.")
                                  }
                                  setUserDocumentReviews((prev) => ({ ...prev, [doc.id]: json.review! }))
                                  setToast({ message: "Document GED marqué invalide", type: "success" })
                                } catch (error) {
                                  setToast({
                                    message:
                                      error instanceof Error
                                        ? error.message
                                        : "Impossible de marquer le document en invalide.",
                                    type: "error",
                                  })
                                } finally {
                                  setReviewLoadingByDocumentId((prev) => ({ ...prev, [doc.id]: false }))
                                }
                              }}
                              className="px-2 py-1 rounded bg-red-900/40 text-red-200 text-xs hover:bg-red-900/60 disabled:opacity-50"
                            >
                              Invalide
                            </button>
                          </div>
                          {userDocumentReviews[doc.id] && (
                            <span
                              className={`text-xs ${
                                userDocumentReviews[doc.id].status === "valid"
                                  ? "text-emerald-300"
                                  : "text-red-300"
                              }`}
                            >
                              {userDocumentReviews[doc.id].status === "valid"
                                ? "Validé"
                                : `Invalide${
                                    userDocumentReviews[doc.id].reason
                                      ? `: ${userDocumentReviews[doc.id].reason}`
                                      : ""
                                  }`}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Sinistres</h2>
          <div className="bg-[#252525] rounded-xl overflow-hidden border border-gray-700">
            {sinistres.length === 0 ? (
              <p className="p-4 text-gray-200">Aucun sinistre enregistré</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Montant indemnisé</th>
                    <th className="text-left p-4 font-medium">Description</th>
                    <th className="text-left p-4 font-medium">Relevé lié</th>
                  </tr>
                </thead>
                <tbody>
                  {sinistres.map((s) => (
                    <tr key={s.id} className="border-b border-gray-700/50">
                      <td className="p-4">{new Date(s.dateSinistre).toLocaleDateString("fr-FR")}</td>
                      <td className="p-4">{s.montantIndemnisation != null ? `${s.montantIndemnisation.toLocaleString("fr-FR")} €` : "—"}</td>
                      <td className="p-4">{s.description || "—"}</td>
                      <td className="p-4">{s.userDocument?.filename || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Notes internes</h2>
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700 space-y-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!noteInput.trim()) return
                setNoteLoading(true)
                try {
                  const res = await fetch(`/api/gestion/clients/${clientId}/notes`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: noteInput }),
                  })
                  const note = await readResponseJson<{
                    id?: string
                    content?: string
                    adminEmail?: string
                    createdAt?: string
                    error?: string
                  }>(res)
                  if (!res.ok || !note.id || !note.content || !note.adminEmail || !note.createdAt) {
                    throw new Error(note.error || "Impossible d’ajouter la note.")
                  }
                  setNotes((n) => [
                    {
                      id: note.id!,
                      content: note.content!,
                      adminEmail: note.adminEmail!,
                      createdAt: note.createdAt!,
                    },
                    ...n,
                  ])
                  setNoteInput("")
                  setToast({ message: "Note ajoutée", type: "success" })
                } catch (error) {
                  setToast({
                    message: error instanceof Error ? error.message : "Impossible d’ajouter la note.",
                    type: "error",
                  })
                } finally {
                  setNoteLoading(false)
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Ajouter une note..."
                className="flex-1 bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={noteLoading || !noteInput.trim()}
                className="bg-[#2563eb] text-white px-4 py-2 rounded-lg hover:bg-[#1d4ed8] disabled:opacity-50 font-medium"
              >
                {noteLoading ? "..." : "Ajouter"}
              </button>
            </form>
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-gray-200 text-sm">Aucune note</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
                    <p className="text-white text-sm">{n.content}</p>
                    <p className="text-gray-200 text-xs mt-1">{n.adminEmail} — {new Date(n.createdAt).toLocaleString("fr-FR")}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Échéances</h2>
          <p className="text-sm text-gray-300 mb-4">
            Chaque échéance peut être envoyée en règlement par carte bancaire, marquée réglée, ou validée
            lorsqu’un virement est arrivé sur le compte en dehors de Mollie. Un lien carte encore ouvert est renvoyé,
            sans créer un second paiement. Après 7 jours, le lien déjà enregistré s’affiche comme expiré. Valider le
            virement demande le libellé ou la date de la banque, ferme un lien carte encore ouvert et n’appelle pas
            Mollie pour encaisser.
          </p>
          {data.sepa ? (
            <div className="mb-4 rounded-xl border border-gray-700 bg-[#252525] p-4 text-sm text-gray-200">
              <p className="font-medium text-white">Prélèvement SEPA</p>
              <p className="mt-1 text-gray-300">
                Lecture en base uniquement. Aucun prélèvement n&apos;est lancé depuis cette fiche.
              </p>
              <p className="mt-2 text-white">{data.sepa.summary}</p>
              {data.sepa.present ? (
                <ul className="mt-3 space-y-1 text-gray-300">
                  <li>Mandat : {data.sepa.mandatePresent ? "enregistré" : "absent"}</li>
                  <li>
                    Prochaine échéance :{" "}
                    {data.sepa.nextDue ? new Date(data.sepa.nextDue).toLocaleDateString("fr-FR") : "—"}
                    {data.sepa.amount != null ? ` · ${data.sepa.amount.toLocaleString("fr-FR")} €` : ""}
                  </li>
                  <li>Trimestres déjà prélevés : {data.sepa.trimestresSepaPayes}</li>
                  <li>Paiement en attente : {data.sepa.pendingLabel ?? "aucun"}</li>
                  <li className="break-words">Dernier incident : {data.sepa.lastError ?? "aucun"}</li>
                  <li>Le cron prélèverait maintenant : {data.sepa.cronWouldCharge ? "oui" : "non"}</li>
                </ul>
              ) : null}
            </div>
          ) : null}
          <div className="bg-[#252525] rounded-xl overflow-hidden border border-gray-700">
            {echeances.length === 0 ? (
              <p className="p-4 text-gray-200">Aucune échéance sur cette fiche.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Échéance</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Montant</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {echeances.map((echeance) => (
                    <tr key={echeance.id} className="border-b border-gray-700/50">
                      <td className="p-4 text-white">
                        <div>{echeance.label}</div>
                        {echeance.sepaFailure ? (
                          <p className="mt-1 max-w-sm text-xs text-red-300">Prélèvement refusé — {echeance.sepaFailure}</p>
                        ) : null}
                        {echeance.sepaFailure && echeance.clientNotifiedAt ? (
                          <p className="mt-1 text-xs text-amber-100">
                            Prévenu le {new Date(echeance.clientNotifiedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        ) : null}
                      </td>
                      <td className="p-4">
                        {echeance.dueDate ? new Date(echeance.dueDate).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="p-4">{echeance.amount.toLocaleString("fr-FR")} €</td>
                      <td className="p-4">
                        {echeance.paid ? (
                          <span className="inline-flex rounded-lg bg-green-900/50 px-3 py-1.5 text-xs font-semibold text-green-200">
                            Réglé
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={echeanceBusy !== null}
                              title={echeance.cardLinkStatus === "open" ? "Renvoyer le lien déjà ouvert" : "Envoyer un lien de paiement par carte"}
                              onClick={() => void handleEcheance(echeance.id, "carte")}
                              className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                            >
                              {echeanceBusy === `${echeance.id}:carte`
                                ? "Envoi…"
                                : echeance.cardLinkStatus === "open"
                                  ? "Lien envoyé"
                                  : "Règlement par carte bancaire"}
                            </button>
                            {echeance.cardLinkStatus === "open" && echeance.cardLinkSentAt ? (
                              <span className="self-center text-xs text-sky-200">
                                Envoyé le {new Date(echeance.cardLinkSentAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                              </span>
                            ) : null}
                            {echeance.cardLinkStatus === "expired" ? (
                              <span className="self-center text-xs text-amber-200">
                                Lien expiré
                                {echeance.cardLinkSentAt
                                  ? ` · envoyé le ${new Date(echeance.cardLinkSentAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}`
                                  : ""}
                              </span>
                            ) : null}
                            {echeance.sepaFailure ? (
                              <button
                                type="button"
                                disabled={echeanceBusy !== null}
                                onClick={() => void handleEcheance(echeance.id, "prevenir")}
                                className="rounded-lg border border-red-400 px-3 py-1.5 text-xs font-semibold text-red-100 hover:border-red-300 disabled:opacity-50"
                              >
                                {echeanceBusy === `${echeance.id}:prevenir` ? "Envoi…" : "Prévenir le client"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={echeanceBusy !== null}
                              title="Le virement est arrivé sur le compte, en dehors de Mollie"
                              onClick={() => {
                                setVirementReference("")
                                setVirementError(null)
                                setVirementModal({
                                  echeanceId: echeance.id,
                                  label: echeance.label,
                                  amountLabel: `${echeance.amount.toLocaleString("fr-FR")} €`,
                                })
                              }}
                              className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:border-emerald-400 disabled:opacity-50"
                            >
                              {echeanceBusy === `${echeance.id}:virement` ? "…" : "Virement reçu"}
                            </button>
                            <button
                              type="button"
                              disabled={echeanceBusy !== null}
                              onClick={() => void handleEcheance(echeance.id, "regler")}
                              className="rounded-lg border border-gray-500 px-3 py-1.5 text-xs font-semibold text-white hover:border-green-400 disabled:opacity-50"
                            >
                              {echeanceBusy === `${echeance.id}:regler` ? "…" : "Régler"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Paiements</h2>
          <div className="bg-[#252525] rounded-xl overflow-hidden border border-gray-700">
            {payments.length === 0 ? (
              <p className="p-4 text-gray-200">Aucun paiement</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Échéance</th>
                    <th className="text-left p-4 font-medium">Mode</th>
                    <th className="text-left p-4 font-medium">Montant</th>
                    <th className="text-left p-4 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-700/50">
                      <td className="p-4">{new Date(p.paidAt || p.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-4">{p.echeanceLabel || "—"}</td>
                      <td className="p-4">
                        <div>{p.methodLabel || "—"}</div>
                        {p.virementReference ? (
                          <div className="mt-1 text-xs text-gray-300">Réf. {p.virementReference}</div>
                        ) : null}
                      </td>
                      <td className="p-4">{p.amount.toLocaleString("fr-FR")} €</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          p.status === "paid"
                            ? "bg-green-900/50 text-green-300"
                            : p.status === "failed"
                              ? "bg-red-900/50 text-red-200"
                              : "bg-blue-900/50 text-sky-200"
                        }`}>
                          {p.statusLabel || (p.status === "paid" ? "Payé" : p.status === "pending" ? "Lien envoyé" : p.status === "failed" ? "Échoué" : p.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="border border-red-900/60 rounded-xl p-6 bg-red-950/20">
          <h2 className="text-lg font-semibold text-red-200 mb-2">Zone sensible</h2>
          <p className="text-sm text-gray-200 mb-4">
            Supprime définitivement le compte, l’accès à l’espace client, les documents décennale / DO, les paiements
            enregistrés, le mandat SEPA en base et les fichiers déposés dans la GED. Les contrats assurance plateforme
            (dossier SaaS) restent conservés sans lien vers ce compte.
          </p>
          {isOwnAdminAccount ? (
            <p className="text-sm text-amber-200">Impossible de supprimer votre propre compte depuis cette fiche.</p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmEmail("")
                setDeleteError(null)
                setDeleteModal(true)
              }}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-red-900/80 text-white hover:bg-red-800 border border-red-700"
            >
              Supprimer la fiche et l’espace client
            </button>
          )}
        </section>
      </div>

      {sinistreModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSinistreModal(false)}>
          <div className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Lier un sinistre à un relevé de sinistralité</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!sinistreForm.dateSinistre) return
                setSinistreLoading(true)
                try {
                  const res = await fetch(`/api/gestion/clients/${clientId}/sinistres`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      dateSinistre: sinistreForm.dateSinistre,
                      montantIndemnisation: sinistreForm.montantIndemnisation ? Number(sinistreForm.montantIndemnisation) : undefined,
                      description: sinistreForm.description || undefined,
                      userDocumentId: sinistreForm.userDocumentId || undefined,
                    }),
                  })
                  const created = await readResponseJson<{
                    id?: string
                    dateSinistre?: string
                    montantIndemnisation?: number | null
                    description?: string | null
                    userDocument?: { id: string; filename: string; type: string } | null
                    error?: string
                  }>(res)
                  if (!res.ok || !created.id || !created.dateSinistre) {
                    throw new Error(created.error || "Impossible d’enregistrer le sinistre.")
                  }
                  setSinistres((prev) => [
                    {
                      id: created.id!,
                      dateSinistre: created.dateSinistre!,
                      montantIndemnisation: created.montantIndemnisation ?? null,
                      description: created.description ?? null,
                      userDocument: created.userDocument ?? null,
                    },
                    ...prev,
                  ])
                  setSinistreModal(false)
                  setSinistreForm({ dateSinistre: "", montantIndemnisation: "", description: "", userDocumentId: "" })
                  setToast({ message: "Sinistre enregistré", type: "success" })
                } catch (error) {
                  setToast({
                    message: error instanceof Error ? error.message : "Impossible d’enregistrer le sinistre.",
                    type: "error",
                  })
                } finally {
                  setSinistreLoading(false)
                }
              }}
              className="space-y-4 mb-6"
            >
              <div>
                <label className="block text-sm text-gray-200 mb-1">Date du sinistre *</label>
                <input
                  type="date"
                  required
                  value={sinistreForm.dateSinistre}
                  onChange={(e) => setSinistreForm((f) => ({ ...f, dateSinistre: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-200 mb-1">Montant indemnisé (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sinistreForm.montantIndemnisation}
                  onChange={(e) => setSinistreForm((f) => ({ ...f, montantIndemnisation: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-200 mb-1">Description</label>
                <textarea
                  value={sinistreForm.description}
                  onChange={(e) => setSinistreForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optionnel"
                  rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-200 mb-1">Relevé de sinistralité</label>
                <select
                  value={sinistreForm.userDocumentId}
                  onChange={(e) => setSinistreForm((f) => ({ ...f, userDocumentId: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">— Aucun —</option>
                  {userDocuments.filter((d) => d.type === "releve_sinistralite").map((d) => (
                    <option key={d.id} value={d.id}>{d.filename}</option>
                  ))}
                  {userDocuments.filter((d) => d.type === "releve_sinistralite").length === 0 && (
                    <option value="" disabled>Le client n&apos;a pas encore uploadé de relevé</option>
                  )}
                </select>
                <p className="text-xs text-gray-200 mt-1">Le client doit avoir déposé un relevé dans son espace GED</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setSinistreModal(false)} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sinistreLoading || !sinistreForm.dateSinistre}
                  className="px-4 py-2 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                >
                  {sinistreLoading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal && data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => !deleteLoading && setDeleteModal(false)}
        >
          <div
            className="bg-[#252525] border border-red-900/50 rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-red-200 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-gray-200 mb-4">
              Cette action est irréversible. Saisissez l’email du client pour confirmer :{" "}
              <span className="text-white font-mono text-xs break-all">{data.user.email}</span>
            </p>
            <input
              type="email"
              autoComplete="off"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder="Email du client"
              className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white mb-4"
            />
            {deleteError ? <p className="mb-4 text-sm text-red-300">{deleteError}</p> : null}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={
                  deleteLoading ||
                  deleteConfirmEmail.trim().toLowerCase() !== data.user.email.toLowerCase()
                }
                onClick={async () => {
                  setDeleteLoading(true)
                  try {
                    const res = await fetch(`/api/gestion/clients/${clientId}`, {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ confirmEmail: deleteConfirmEmail }),
                    })
                    const json = await readResponseJson<{ error?: string }>(res)
                    if (!res.ok) {
                      const message = json.error || "Suppression impossible"
                      setDeleteError(message)
                      setToast({ message, type: "error" })
                      return
                    }
                    setDeleteModal(false)
                    router.replace("/gestion")
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : "Erreur lors de la suppression de la fiche."
                    setDeleteError(message)
                    setToast({
                      message,
                      type: "error",
                    })
                  } finally {
                    setDeleteLoading(false)
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleteLoading ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {emailModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEmailModal(false)}>
          <div className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Envoyer un email à {data.user.email}</h3>
            {emailPresetLabel ? (
              <p className="mb-3 inline-flex rounded border border-amber-700/60 bg-amber-950/30 px-2 py-1 text-xs text-amber-200">
                Modèle: {emailPresetLabel}
              </p>
            ) : null}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-200 mb-1">Objet</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Objet de l'email"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-200 mb-1">Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Votre message..."
                  rows={4}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => {
                setEmailPresetLabel(null)
                setEmailModal(false)
              }} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!emailSubject.trim() || !emailBody.trim()) return
                  setEmailLoading(true)
                  try {
                    const res = await fetch("/api/gestion/clients/send-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: data.user.id, subject: emailSubject, body: emailBody }),
                    })
                    const json = await readResponseJson<{
                      ok?: boolean
                      sentTo?: string
                      error?: string
                      emailSent?: boolean
                      warning?: string
                    }>(res)
                    if (res.ok && json.emailSent === false) {
                      setToast({
                        message: json.warning || "Email non envoyé.",
                        type: "warning",
                      })
                    } else if (res.ok && json.ok) {
                      setEmailModal(false)
                      setEmailSubject("")
                      setEmailBody("")
                      setEmailPresetLabel(null)
                      setToast({
                        message: `Email envoyé à ${json.sentTo ?? data.user.email}`,
                        type: "success",
                      })
                    } else {
                      setToast({
                        message: json.error || "Échec de l’envoi",
                        type: "error",
                      })
                    }
                  } catch (error) {
                    setToast({
                      message:
                        error instanceof Error
                          ? error.message
                          : "Erreur lors de l’envoi de l’email.",
                      type: "error",
                    })
                  } finally {
                    setEmailLoading(false)
                  }
                }}
                disabled={emailLoading || !emailSubject.trim() || !emailBody.trim()}
                className="px-4 py-2 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {emailLoading ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {virementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setVirementModal(null)}>
          <div className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Virement reçu</h3>
            <p className="text-sm text-gray-300 mb-4">
              {virementModal.label} · {virementModal.amountLabel}. Aucun paiement Mollie ne sera créé.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void handleEcheance(virementModal.echeanceId, "virement", virementReference)
              }}
            >
              <label className="block text-sm text-gray-200 mb-2" htmlFor="virement-reference">
                Libellé ou date de la banque
              </label>
              <input
                id="virement-reference"
                type="text"
                maxLength={80}
                value={virementReference}
                onChange={(event) => {
                  setVirementReference(event.target.value)
                  setVirementError(null)
                }}
                placeholder="Ex. VIR SEPA 08/10/2026"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                autoFocus
              />
              {virementError ? <p className="mt-2 text-sm text-red-300">{virementError}</p> : null}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVirementModal(null)}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={echeanceBusy !== null || !virementReference.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {echeanceBusy === `${virementModal.echeanceId}:virement` ? "…" : "Valider le virement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </main>
  )
}
