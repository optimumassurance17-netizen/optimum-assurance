"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

function mapTypeOuvrageToConstruction(typeOuvrage?: string): string {
  const map: Record<string, string> = {
    maison_individuelle: "Maison unifamiliale",
    maison_jumelee: "Maison jumelée",
    immeuble_logements: "Immeuble logements",
    immeuble_logements_commerces: "Immeuble logements",
    immeuble_bureaux: "Immeuble de bureaux",
    etablissement_soins_sportif_culturel: "Établissement de soins, sportif ou culturel",
    batiment_industriel: "Bâtiment industriel",
  }
  return typeOuvrage ? (map[typeOuvrage] ?? "Construction neuve") : ""
}

function mapDestinationConstruction(dest?: string): string {
  const map: Record<string, string> = {
    location: "Location",
    vente: "Vente",
    exploitation_directe: "Exploitation directe",
  }
  return dest ? (map[dest] ?? "Usage personnel") : ""
}
import { calculerTarifDommageOuvrage } from "@/lib/tarification-dommage-ouvrage"
import { FRANCHISE_DECENNALE_EUR } from "@/lib/tarification"
import { ACTIVITES_BTP } from "@/lib/activites-btp"
import { getSession, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Toast } from "@/components/Toast"
import { InsuranceContractsGestionBlock } from "@/components/gestion/InsuranceContractsGestionBlock"
import { readResponseJson } from "@/lib/read-response-json"
import {
  RC_FABRIQUANT_LEAD_STATUT_LABELS,
  RC_FABRIQUANT_LEAD_STATUT_VALUES,
  normalizeRcFabriquantLeadStatut,
} from "@/lib/rc-fabriquant-lead-statuts"

function getRcFabLeadDraft(
  d: { id: string; statut?: string; notesInternes?: string | null },
  drafts: Record<string, { statut: string; notes: string }>
) {
  const draft = drafts[d.id]
  if (draft) return draft
  return {
    statut: normalizeRcFabriquantLeadStatut(d.statut),
    notes: d.notesInternes ?? "",
  }
}

/** Formulaire édition contrat / avenant (données JSON document) */
type EditContratForm = {
  raisonSociale: string
  email: string
  siret: string
  telephone: string
  adresse: string
  codePostal: string
  ville: string
  civilite: string
  representantLegal: string
  chiffreAffaires: string
  primeAnnuelle: string
  primeMensuelle: string
  primeTrimestrielle: string
  franchise: string
  plafond: string
  modePaiement: string
  periodicitePrelevement: string
  fraisGestionPrelevement: string
  activites: string
  motifAvenant: string
  dateEffet: string
  dateEcheance: string
}

type RcFabLeadStructuredData = {
  raisonSociale?: string
  activiteFabrication?: string
  siret?: string
}

function parseRcFabLeadData(raw: string): RcFabLeadStructuredData {
  try {
    const parsed = JSON.parse(raw || "{}") as Record<string, unknown>
    return {
      raisonSociale:
        typeof parsed.raisonSociale === "string" ? parsed.raisonSociale.trim() : undefined,
      activiteFabrication:
        typeof parsed.activiteFabrication === "string" ? parsed.activiteFabrication.trim() : undefined,
      siret: typeof parsed.siret === "string" ? parsed.siret.trim() : undefined,
    }
  } catch {
    return {}
  }
}

function getSlaBadge(hours: number): { label: string; className: string } {
  if (hours >= 72) {
    return {
      label: "SLA dépassé",
      className: "bg-red-900/40 text-red-200 border border-red-700/60",
    }
  }
  if (hours >= 24) {
    return {
      label: "À traiter",
      className: "bg-amber-900/40 text-amber-200 border border-amber-700/60",
    }
  }
  return {
    label: "Dans SLA",
    className: "bg-emerald-900/40 text-emerald-200 border border-emerald-700/60",
  }
}

function editFormFromDocData(parsed: Record<string, unknown>): EditContratForm {
  return {
    raisonSociale: String(parsed.raisonSociale ?? ""),
    email: String(parsed.email ?? ""),
    siret: String(parsed.siret ?? ""),
    telephone: String(parsed.telephone ?? ""),
    adresse: String(parsed.adresse ?? ""),
    codePostal: String(parsed.codePostal ?? ""),
    ville: String(parsed.ville ?? ""),
    civilite: String(parsed.civilite ?? ""),
    representantLegal: String(parsed.representantLegal ?? ""),
    chiffreAffaires: parsed.chiffreAffaires != null ? String(parsed.chiffreAffaires) : "",
    primeAnnuelle: parsed.primeAnnuelle != null ? String(parsed.primeAnnuelle) : "",
    primeMensuelle: parsed.primeMensuelle != null ? String(parsed.primeMensuelle) : "",
    primeTrimestrielle: parsed.primeTrimestrielle != null ? String(parsed.primeTrimestrielle) : "",
    franchise: parsed.franchise != null ? String(parsed.franchise) : "",
    plafond: parsed.plafond != null ? String(parsed.plafond) : "",
    modePaiement: String(parsed.modePaiement ?? ""),
    periodicitePrelevement: String(parsed.periodicitePrelevement ?? ""),
    fraisGestionPrelevement: parsed.fraisGestionPrelevement != null ? String(parsed.fraisGestionPrelevement) : "",
    activites: Array.isArray(parsed.activites)
      ? (parsed.activites as string[]).join(", ")
      : String(parsed.activites ?? ""),
    motifAvenant: String(parsed.motifAvenant ?? ""),
    dateEffet: String(parsed.dateEffet ?? ""),
    dateEcheance: String(parsed.dateEcheance ?? ""),
  }
}

interface DashboardData {
  users: {
    id: string
    email: string
    raisonSociale: string | null
    siret: string | null
    createdAt: string
    doQuestionnaireInitial?: boolean
    doQuestionnaireEtude?: boolean
  }[]
  devisDoLeads?: { id: string; email: string; data?: string; coutTotal: number | null; createdAt: string }[]
  devisRcFabriquantLeads?: {
    id: string
    email: string
    data: string
    statut: string
    notesInternes: string | null
    primeProposee: number | null
    propositionEnvoyeeAt: string | null
    createdAt: string
    updatedAt: string
    userId: string | null
    lastWhatsappClickAt?: string | null
    lastWhatsappSource?: string | null
    lastWhatsappRef?: string | null
    copyTrace?: {
      proposition: { copySent: boolean; sentAt: string } | null
      signature: { copySent: boolean; sentAt: string } | null
    } | null
    slaHours?: number
    slaLevel?: "ok" | "warning" | "critical"
  }[]
  devisEtudeLeads?: { id: string; email: string; raisonSociale: string | null; siret: string | null; data: string; statut: string; createdAt: string }[]
  documents: {
    id: string
    userId: string
    type: string
    numero: string
    status: string
    data?: string
    createdAt: string
    user: { email: string; raisonSociale: string | null }
  }[]
  payments: {
    id: string
    userId: string
    molliePaymentId: string
    amount: number
    status: string
    paidAt: string | null
    createdAt: string
    user: { email: string; raisonSociale: string | null }
  }[]
  avenantFees?: {
    id: string
    userId: string
    amount: number
    user: { email: string; raisonSociale: string | null }
  }[]
  resiliationLogs?: {
    id: string
    adminEmail: string
    motif: string | null
    createdAt: string
    document: {
      type: string
      numero: string
      user: { email: string; raisonSociale: string | null }
    }
  }[]
  resiliationRequests?: {
    id: string
    motif: string | null
    createdAt: string
    document: {
      id: string
      type: string
      numero: string
      user: { email: string; raisonSociale: string | null }
    }
  }[]
  adminActivityLogs?: {
    id: string
    adminEmail: string
    action: string
    targetType: string | null
    targetId: string | null
    createdAt: string
  }[]
  doStats?: {
    attestationsCount: number
    facturesCount: number
    primesTotal: number
    closCouvertCount: number
    doCompletCount: number
  }
  devisLeads?: {
    id: string
    email: string
    raisonSociale: string | null
    siret: string | null
    primeAnnuelle: number | null
    rappelSentAt: string | null
    createdAt: string
    slaHours?: number
    slaLevel?: "ok" | "warning" | "critical"
  }[]
  devisDrafts?: {
    id: string
    token: string
    email: string
    produit: string
    expiresAt: string
    createdAt: string
  }[]
  pendingSignatures?: {
    id: string
    signatureRequestId: string
    contractNumero: string
    createdAt: string
    userId: string
    user: { id: string; email: string; raisonSociale: string | null } | null
    signatureFlow: "custom_pdf" | "decennale"
    signatureFlowLabel?: string
    ageHours?: number
    repairEligible?: boolean
  }[]
  insuranceContractsCount?: number
  insuranceContracts?: {
    id: string
    contractNumber: string
    productType: string
    clientName: string
    userId: string | null
    premium: number
    status: string
    paidAt: string | null
    validUntil: string | null
    createdAt: string
    user: { id: string; email: string; raisonSociale: string | null } | null
    lifecyclePayments: {
      id: string
      amount: number
      status: string
      paidAt: string | null
      createdAt: string
    }[]
  }[]
  dashboardActions?: {
    id: string
    kind:
      | "signature_pending"
      | "approved_unpaid_contract"
      | "decennale_lead_followup"
      | "do_etude_pending"
      | "rc_fabriquant_pending"
    priority: "high" | "medium"
    title: string
    description: string
    href: string
    ageHours: number
  }[]
  dashboardActionsSummary?: {
    total: number
    high: number
    medium: number
    overdue72h: number
    dismissedToday?: number
  }
}

export default function GestionPage() {
  const { status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [avenantForm, setAvenantForm] = useState({
    userId: "",
    contractNumero: "",
    chiffreAffaires: "",
    primeAnnuelle: "",
    activites: "",
    motif: "",
  })
  const [devisDoForm, setDevisDoForm] = useState({
    leadId: "",
    userId: "",
    primeAnnuelle: "",
    coutConstruction: "",
    telephone: "",
    adresseOperation: "",
    typeConstruction: "",
    destination: "",
    closCouvert: "",
    fraisGestion: "",
    fraisCourtage: "",
  })
  const [avenantSubmitting, setAvenantSubmitting] = useState(false)
  const [devisDoSubmitting, setDevisDoSubmitting] = useState(false)
  const [devisDecForm, setDevisDecForm] = useState({
    userId: "",
    activites: [] as string[],
    chiffreAffaires: "",
    primeAnnuelle: "",
    franchise: "",
    plafond: "100000",
    representantLegal: "",
    civilite: "M",
    jamaisAssure: false,
    reprisePasse: false,
    dateCreationSociete: "",
  })
  const [devisDecActivitePick, setDevisDecActivitePick] = useState("")
  const [devisDecUserFilter, setDevisDecUserFilter] = useState("")
  const [devisDecSubmitting, setDevisDecSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all")
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null)
  const [resiliationModal, setResiliationModal] = useState<{ docId: string; motif: string } | null>(null)
  const [editModal, setEditModal] = useState<{
    docId: string
    type: "contrat" | "avenant"
    numero: string
    form: EditContratForm
  } | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [etudeMiseModal, setEtudeMiseModal] = useState<{
    id: string
    email: string
    raisonSociale: string | null
    primeAnnuelle: string
  } | null>(null)
  const [etudeMiseSubmitting, setEtudeMiseSubmitting] = useState(false)
  const [cancellingSignatureId, setCancellingSignatureId] = useState<string | null>(null)
  const [repairingSignatureId, setRepairingSignatureId] = useState<string | null>(null)
  const [dismissingActionId, setDismissingActionId] = useState<string | null>(null)
  const [dashboardLoadKey, setDashboardLoadKey] = useState(0)
  const customDevisPdfInputRef = useRef<HTMLInputElement>(null)
  const [customDevisUserFilter, setCustomDevisUserFilter] = useState("")
  const [customDevisUserId, setCustomDevisUserId] = useState("")
  const [customDevisPrime, setCustomDevisPrime] = useState("")
  const [customDevisPrimeHt, setCustomDevisPrimeHt] = useState("")
  const [customDevisPeriodicity, setCustomDevisPeriodicity] = useState("trimestriel")
  const [customDevisRef, setCustomDevisRef] = useState("")
  const [customDevisLabel, setCustomDevisLabel] = useState("RC Fabriquant — proposition")
  const [customDevisNextPath, setCustomDevisNextPath] = useState("/espace-client")
  const [customDevisSending, setCustomDevisSending] = useState(false)
  const leadSlaBadge = (ageHours: number) => {
    const badge = getSlaBadge(ageHours)
    return (
      <span className={`inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${badge.className}`}>
        {badge.label} ({ageHours}h)
      </span>
    )
  }

  const customDevisUserOptions = useMemo(() => {
    if (!data?.users) return []
    const q = customDevisUserFilter.trim().toLowerCase()
    let list = [...data.users]
    if (q) {
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.raisonSociale || "").toLowerCase().includes(q) ||
          (u.siret || "").toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => a.email.localeCompare(b.email))
    return list.slice(0, 300)
  }, [data?.users, customDevisUserFilter])

  const devisDecUserOptions = useMemo(() => {
    if (!data?.users) return []
    const q = devisDecUserFilter.trim().toLowerCase()
    let list = [...data.users]
    if (q) {
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.raisonSociale || "").toLowerCase().includes(q) ||
          (u.siret || "").toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => a.email.localeCompare(b.email))
    return list.slice(0, 300)
  }, [data?.users, devisDecUserFilter])

  const [rcFabDrafts, setRcFabDrafts] = useState<Record<string, { statut: string; notes: string }>>({})
  const [rcFabSavingId, setRcFabSavingId] = useState<string | null>(null)
  const [rcFabPropositionModal, setRcFabPropositionModal] = useState<{
    id: string
    email: string
    raisonSociale: string
  } | null>(null)
  const [rcFabPropositionPrime, setRcFabPropositionPrime] = useState("")
  const [rcFabPropositionMessage, setRcFabPropositionMessage] = useState("")
  const [rcFabPropositionSubmitting, setRcFabPropositionSubmitting] = useState(false)
  const [rcFabEtudeModal, setRcFabEtudeModal] = useState<{
    leadId: string
    userId: string
    email: string
    raisonSociale: string
    devisReference: string
    primeAnnuelleTtc: string
    primeAnnuelleHt: string
    periodicite: "mensuel" | "trimestriel" | "semestriel" | "annuel"
    produitLabel: string
  } | null>(null)
  const [rcFabEtudeSubmitting, setRcFabEtudeSubmitting] = useState(false)

  const openEditModal = useCallback((doc: { id: string; type: string; numero: string; data?: string }) => {
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(doc.data || "{}") as Record<string, unknown>
    } catch {
      /* ignore */
    }
    setEditModal({
      docId: doc.id,
      type: doc.type as "contrat" | "avenant",
      numero: doc.numero,
      form: editFormFromDocData(parsed),
    })
  }, [])

  const handleSaveEdit = async () => {
    if (!editModal) return
    setEditSubmitting(true)
    try {
      const f = editModal.form
      const parseMoney = (label: string, raw: string): number | undefined => {
        const t = raw.trim()
        if (!t) return undefined
        const n = Number(t.replace(/\s/g, "").replace(",", "."))
        if (!Number.isFinite(n)) throw new Error(`${label} : montant invalide`)
        return n
      }

      const modifications: Record<string, unknown> = {
        raisonSociale: f.raisonSociale.trim(),
        email: f.email.trim(),
        siret: f.siret.trim(),
        telephone: f.telephone.trim(),
        adresse: f.adresse.trim(),
        codePostal: f.codePostal.trim(),
        ville: f.ville.trim(),
        civilite: f.civilite.trim(),
        representantLegal: f.representantLegal.trim(),
        dateEffet: f.dateEffet.trim(),
        dateEcheance: f.dateEcheance.trim(),
        motifAvenant: f.motifAvenant.trim(),
      }

      const ca = parseMoney("Chiffre d'affaires", f.chiffreAffaires)
      if (ca !== undefined) modifications.chiffreAffaires = ca
      const pa = parseMoney("Prime annuelle", f.primeAnnuelle)
      if (pa !== undefined) modifications.primeAnnuelle = pa
      const pm = parseMoney("Prime mensuelle", f.primeMensuelle)
      if (pm !== undefined) modifications.primeMensuelle = pm
      const pt = parseMoney("Prime trimestrielle", f.primeTrimestrielle)
      if (pt !== undefined) modifications.primeTrimestrielle = pt
      const fr = parseMoney("Franchise", f.franchise)
      if (fr !== undefined) modifications.franchise = fr
      const pl = parseMoney("Plafond de garantie", f.plafond)
      if (pl !== undefined) modifications.plafond = pl
      const fg = parseMoney("Frais de gestion prélèvement", f.fraisGestionPrelevement)
      if (fg !== undefined) modifications.fraisGestionPrelevement = fg

      if (f.modePaiement === "unique" || f.modePaiement === "prelevement") {
        modifications.modePaiement = f.modePaiement
      }
      if (f.periodicitePrelevement.trim()) {
        modifications.periodicitePrelevement = f.periodicitePrelevement.trim()
      }

      modifications.activites = f.activites.split(",").map((a) => a.trim()).filter(Boolean)

      const res = await fetch(`/api/gestion/documents/${editModal.docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: modifications }),
      })
      const patchBody = await readResponseJson<{ error?: string }>(res)
      if (!res.ok) throw new Error(patchBody.error || "Erreur")
      setEditModal(null)
      setToast({ message: "Modification enregistrée", type: "success" })
      const dashRes = await fetch("/api/gestion/dashboard")
      if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erreur", type: "error" })
    } finally {
      setEditSubmitting(false)
    }
  }

  const filterBySearch = <T extends { user: { email: string; raisonSociale: string | null }; numero?: string }>(
    items: T[],
    q: string
  ): T[] => {
    if (!q.trim()) return items
    const lower = q.toLowerCase()
    return items.filter((i) => {
      if (i.user.email?.toLowerCase().includes(lower)) return true
      if (i.user.raisonSociale?.toLowerCase().includes(lower)) return true
      if (i.numero?.toLowerCase().includes(lower)) return true
      return false
    })
  }
  const filterUsersBySearch = <
    T extends { email: string; raisonSociale: string | null; siret: string | null },
  >(
    items: T[],
    q: string
  ): T[] => {
    if (!q.trim()) return items
    const lower = q.toLowerCase()
    const qDigits = q.trim().replace(/\s/g, "").toLowerCase()
    return items.filter((i) => {
      if (i.email?.toLowerCase().includes(lower)) return true
      if (i.raisonSociale?.toLowerCase().includes(lower)) return true
      if (i.siret && i.siret.replace(/\s/g, "").toLowerCase().includes(qDigits)) return true
      return false
    })
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/gestion")
      return
    }
    if (status !== "authenticated") return

    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchData = async () => {
      const s = await getSession()
      if (cancelled) return
      if (!s?.user?.email) {
        if (!cancelled) setLoading(false)
        router.replace("/connexion?callbackUrl=/gestion")
        return
      }

      const attempts = 3
      try {
        for (let i = 0; i < attempts; i++) {
          try {
            const res = await fetch("/api/gestion/dashboard", { credentials: "include" })
            if (cancelled) return
            if (res.status === 403) {
              setError("Accès refusé (compte non autorisé dans ADMIN_EMAILS).")
              return
            }
            const json = await readResponseJson<
              DashboardData & { error?: string; prismaCode?: string; debugMessage?: string }
            >(res)
            if (cancelled) return
            if (!res.ok) {
              const msg =
                json.error ||
                `Erreur serveur (${res.status}). Souvent : base inaccessible ou migration Prisma non appliquée — voir les logs Vercel.`
              const detail =
                json.prismaCode != null
                  ? ` Code Prisma : ${json.prismaCode}.`
                  : ""
              const dev =
                json.debugMessage != null ? `\n${json.debugMessage}` : ""
              if (i < attempts - 1) {
                await new Promise((r) => setTimeout(r, 700 * (i + 1)))
                if (cancelled) return
                continue
              }
              setError(`${msg}${detail}${dev}`)
              return
            }
            setData(json)
            return
          } catch (e) {
            if (cancelled) return
            if (i < attempts - 1) {
              await new Promise((r) => setTimeout(r, 700 * (i + 1)))
              if (cancelled) return
              continue
            }
            setError(e instanceof Error ? e.message : "Erreur de chargement")
            return
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [status, router, dashboardLoadKey])

  /** Ouvre le modal d'édition si l'URL contient ?editDoc= (lien depuis /gestion/documents/[id]) */
  useEffect(() => {
    if (!data || typeof window === "undefined") return
    const editDocId = new URLSearchParams(window.location.search).get("editDoc")
    if (!editDocId) return
    const doc = data.documents.find((d) => d.id === editDocId)
    if (doc && (doc.type === "contrat" || doc.type === "avenant")) {
      openEditModal(doc)
      router.replace("/gestion", { scroll: false })
    }
  }, [data, router, openEditModal])

  const handleResendImpayeEmail = async (docId: string) => {
    try {
      const res = await fetch(`/api/gestion/documents/${docId}/resend-impaye-email`, { method: "POST" })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(body.error || "")
      setToast({ message: "Email de relance impayé (décennale) envoyé au client", type: "success" })
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Erreur lors de l’envoi de l’email",
        type: "error",
      })
    }
  }

  const handleStatusChange = async (docId: string, newStatus: "valide" | "suspendu" | "resilie", motif?: string) => {
    try {
      const res = await fetch(`/api/gestion/documents/${docId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, motif: motif || undefined }),
      })
      if (!res.ok) throw new Error()
      if (data) {
        setData({
          ...data,
          documents: data.documents.map((d) =>
            d.id === docId ? { ...d, status: newStatus } : d
          ),
        })
      }
      setResiliationModal(null)
      setToast({ message: newStatus === "resilie" ? "Résiliation enregistrée. Email envoyé au client." : "Statut mis à jour", type: "success" })
    } catch {
      setToast({ message: "Erreur lors de la mise à jour", type: "error" })
    }
  }


  const handleCreateDevisDecennale = async (e: React.FormEvent) => {
    e.preventDefault()
    setDevisDecSubmitting(true)
    try {
      const selectedUser = data?.users.find((u) => u.id === devisDecForm.userId)
      if (!selectedUser) {
        throw new Error("Choisissez un client")
      }
      const activites = devisDecForm.activites.filter(Boolean)
      if (!devisDecForm.representantLegal.trim()) {
        throw new Error("Représentant légal obligatoire (pour la signature électronique ensuite)")
      }
      if (!activites.length) {
        throw new Error("Ajoutez au moins une activité depuis la liste (comme sur le tarificateur /devis)")
      }
      const pa = Number(devisDecForm.primeAnnuelle)
      if (!Number.isFinite(pa) || pa <= 0) {
        throw new Error("Prime annuelle invalide")
      }
      const res = await fetch("/api/gestion/documents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: devisDecForm.userId,
          type: "devis",
          data: {
            raisonSociale: selectedUser.raisonSociale || "",
            siret: selectedUser.siret || "",
            email: selectedUser.email,
            activites,
            chiffreAffaires: Number(devisDecForm.chiffreAffaires) || 0,
            primeAnnuelle: pa,
            franchise:
              devisDecForm.franchise.trim() !== ""
                ? Number(devisDecForm.franchise)
                : FRANCHISE_DECENNALE_EUR,
            plafond: Number(devisDecForm.plafond) || 100_000,
            representantLegal: devisDecForm.representantLegal.trim(),
            civilite: devisDecForm.civilite.trim() || "M",
            jamaisAssure: devisDecForm.jamaisAssure,
            reprisePasse: devisDecForm.reprisePasse,
            dateCreationSociete: devisDecForm.dateCreationSociete.trim() || undefined,
            dateCreation: new Date().toLocaleDateString("fr-FR"),
          },
        }),
      })
      const result = await readResponseJson<{ error?: string; numero?: string; id?: string }>(res)
      if (!res.ok) throw new Error(result.error || "Erreur")
      setToast({
        message: `Devis décennale ${result.numero} créé. Ouvrez la fiche document pour envoyer le lien de signature.`,
        type: "success",
      })
      setDevisDecForm({
        userId: "",
        activites: [],
        chiffreAffaires: "",
        primeAnnuelle: "",
        franchise: "",
        plafond: "100000",
        representantLegal: "",
        civilite: "M",
        jamaisAssure: false,
        reprisePasse: false,
        dateCreationSociete: "",
      })
      setDevisDecActivitePick("")
      setDevisDecUserFilter("")
      const dashRes = await fetch("/api/gestion/dashboard")
      if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Erreur création devis décennale",
        type: "error",
      })
    } finally {
      setDevisDecSubmitting(false)
    }
  }

  const handleCreateDevisDo = async (e: React.FormEvent) => {
    e.preventDefault()
    setDevisDoSubmitting(true)
    try {
      const selectedUser = data?.users.find((u) => u.id === devisDoForm.userId)
      const res = await fetch("/api/gestion/documents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: devisDoForm.userId,
          type: "devis_do",
          data: (() => {
            const cout = Number(devisDoForm.coutConstruction) || 0
            const tarif = cout > 0 ? calculerTarifDommageOuvrage(cout) : null
            return {
              raisonSociale: selectedUser?.raisonSociale || undefined,
              email: selectedUser?.email || undefined,
              primeAnnuelle: Number(devisDoForm.primeAnnuelle),
              coutConstruction: cout || undefined,
              tranche: tarif?.tranche,
              produit: "dommage_ouvrage",
              telephone: devisDoForm.telephone || undefined,
              adresseOperation: devisDoForm.adresseOperation || undefined,
              typeConstruction: devisDoForm.typeConstruction || undefined,
              destination: devisDoForm.destination || undefined,
              closCouvert: devisDoForm.closCouvert === "oui" ? true : devisDoForm.closCouvert === "non" ? false : undefined,
              fraisGestion: Number(devisDoForm.fraisGestion) || undefined,
              fraisCourtage: Number(devisDoForm.fraisCourtage) || undefined,
              dateCreation: new Date().toLocaleDateString("fr-FR"),
            }
          })(),
        }),
      })
      const result = await readResponseJson<{ error?: string; numero?: string }>(res)
      if (!res.ok) throw new Error(result.error || "Erreur")
      setToast({ message: `Devis DO ${result.numero} créé. Email envoyé au client.`, type: "success" })
      setDevisDoForm({ leadId: "", userId: "", primeAnnuelle: "", coutConstruction: "", telephone: "", adresseOperation: "", typeConstruction: "", destination: "", closCouvert: "", fraisGestion: "", fraisCourtage: "" })
      const dashRes = await fetch("/api/gestion/dashboard")
      if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erreur création devis DO", type: "error" })
    } finally {
      setDevisDoSubmitting(false)
    }
  }

  const handleCreateAvenant = async (e: React.FormEvent) => {
    e.preventDefault()
    setAvenantSubmitting(true)
    try {
      const modifications: Record<string, unknown> = {}
      if (avenantForm.chiffreAffaires) modifications.chiffreAffaires = Number(avenantForm.chiffreAffaires)
      if (avenantForm.primeAnnuelle) modifications.primeAnnuelle = Number(avenantForm.primeAnnuelle)
      if (avenantForm.activites) modifications.activites = avenantForm.activites.split(",").map((a) => a.trim()).filter(Boolean)

      const res = await fetch("/api/gestion/avenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: avenantForm.userId,
          contractNumero: avenantForm.contractNumero,
          modifications,
          motif: avenantForm.motif || undefined,
        }),
      })
      const result = await readResponseJson<{ error?: string; numero?: string }>(res)
      if (!res.ok) throw new Error(result.error || "Erreur")
      setToast({ message: `Avenant ${result.numero} créé`, type: "success" })
      setAvenantForm({ userId: "", contractNumero: "", chiffreAffaires: "", primeAnnuelle: "", activites: "", motif: "" })
      const dashRes = await fetch("/api/gestion/dashboard")
      if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erreur création avenant", type: "error" })
    } finally {
      setAvenantSubmitting(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="gestion-app min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-200">Chargement...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="gestion-app min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-red-400 mb-4">{error}</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              type="button"
              className="text-[#2563eb] hover:underline"
              onClick={() => {
                setDashboardLoadKey((k) => k + 1)
              }}
            >
              Réessayer
            </button>
            <Link href="/" className="text-gray-400 hover:underline">
              Retour
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (!data) return null

  const attestations = data.documents.filter((d) => {
    if (docTypeFilter === "attestation") {
      return d.type === "attestation" || d.type === "attestation_nominative"
    }
    if (docTypeFilter === "attestation_do") return d.type === "attestation_do"
    return (
      d.type === "attestation" ||
      d.type === "attestation_nominative" ||
      d.type === "attestation_do"
    )
  })
  const contrats = data.documents.filter((d) => d.type === "contrat")

  return (
    <main className="gestion-app min-h-screen bg-[#1a1a1a] text-gray-200">
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-white">Gestion CRM</h1>
          <div className="flex gap-4">
            <button
              onClick={() => {
                if (!data) return
                const csv = [
                  ["Type", "Client", "Montant", "Statut", "Date"].join(";"),
                  ...data.payments.map((p) =>
                    ["Paiement", p.user.raisonSociale || p.user.email, p.amount, p.status, new Date(p.paidAt || p.createdAt).toLocaleDateString("fr-FR")].join(";")
                  ),
                ].join("\n")
                const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `export-paiements-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="text-sm text-gray-200 hover:text-white"
            >
              Export paiements
            </button>
            <button
              type="button"
              onClick={() => {
                if (!data) return
                const csv = [
                  ["Raison sociale", "Email", "SIRET", "Inscription"].join(";"),
                  ...data.users.map((u) =>
                    [
                      u.raisonSociale ?? "",
                      u.email,
                      u.siret ?? "",
                      new Date(u.createdAt).toLocaleDateString("fr-FR"),
                    ].join(";")
                  ),
                ].join("\n")
                const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `export-clients-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="text-sm text-gray-200 hover:text-white"
            >
              Export clients
            </button>
            {data.devisDoLeads && data.devisDoLeads.length > 0 && (
              <button
                onClick={() => {
                  if (!data?.devisDoLeads) return
                  const csv = [
                    ["Email", "Coût construction (€)", "Date"].join(";"),
                    ...data.devisDoLeads.map((d) =>
                      [d.email, d.coutTotal ?? "", new Date(d.createdAt).toLocaleDateString("fr-FR")].join(";")
                    ),
                  ].join("\n")
                  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `export-devis-do-${new Date().toISOString().slice(0, 10)}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="text-sm text-gray-200 hover:text-white"
              >
                Export devis DO
              </button>
            )}
            {data.devisRcFabriquantLeads && data.devisRcFabriquantLeads.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (!data?.devisRcFabriquantLeads?.length) return
                  const csv = [
                    [
                      "Email",
                      "Raison sociale",
                      "Téléphone",
                      "Activité",
                      "Statut",
                      "Notes internes",
                      "Prime proposée",
                      "Proposition envoyée le",
                      "Date demande",
                    ].join(";"),
                    ...data.devisRcFabriquantLeads.map((d) => {
                      let rs = ""
                      let tel = ""
                      let act = ""
                      try {
                        const j = JSON.parse(d.data || "{}") as {
                          raisonSociale?: string
                          telephone?: string
                          activiteFabrication?: string
                        }
                        rs = j.raisonSociale ?? ""
                        tel = j.telephone ?? ""
                        act = (j.activiteFabrication ?? "").replace(/\r?\n/g, " ").slice(0, 500)
                      } catch {
                        /* ignore */
                      }
                      const st = RC_FABRIQUANT_LEAD_STATUT_LABELS[normalizeRcFabriquantLeadStatut(d.statut)]
                      const notes = (d.notesInternes ?? "").replace(/\r?\n/g, " ").replace(/;/g, ",").slice(0, 2000)
                      const prime =
                        d.primeProposee != null && d.primeProposee > 0
                          ? String(d.primeProposee).replace(".", ",")
                          : ""
                      const propAt = d.propositionEnvoyeeAt
                        ? new Date(d.propositionEnvoyeeAt).toLocaleString("fr-FR")
                        : ""
                      return [
                        d.email,
                        rs,
                        tel,
                        act,
                        st,
                        notes,
                        prime,
                        propAt,
                        new Date(d.createdAt).toLocaleDateString("fr-FR"),
                      ].join(";")
                    }),
                  ].join("\n")
                  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `export-devis-rc-fabriquant-${new Date().toISOString().slice(0, 10)}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="text-sm text-gray-200 hover:text-white"
              >
                Export RC Fabriquant
              </button>
            )}
            {(data.devisLeads?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (!data?.devisLeads?.length) return
                  const csv = [
                    ["Email", "Raison sociale", "SIRET", "Prime annuelle (€)", "Date"].join(";"),
                    ...data.devisLeads.map((d) =>
                      [
                        d.email,
                        d.raisonSociale ?? "",
                        d.siret ?? "",
                        d.primeAnnuelle != null ? String(d.primeAnnuelle) : "",
                        new Date(d.createdAt).toLocaleDateString("fr-FR"),
                      ].join(";")
                    ),
                  ].join("\n")
                  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `export-leads-devis-decennale-${new Date().toISOString().slice(0, 10)}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="text-sm text-gray-200 hover:text-white"
              >
                Export leads décennale
              </button>
            )}
            <Link href="/admin" className="text-sm text-amber-200/90 hover:text-amber-100">
              Admin contrats →
            </Link>
            <Link href="/" className="text-sm text-gray-200 hover:text-white">← Retour site</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {data && (
          <>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <input
                type="search"
                placeholder="Rechercher (email, raison sociale, SIRET, n° contrat / attestation)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#252525] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 w-full sm:w-80"
              />
            </div>
            <nav
              className="flex flex-wrap gap-2 items-center rounded-xl border border-gray-700 bg-[#222] px-4 py-3"
              aria-label="Accès rapide sections gestion"
            >
              <span className="text-xs text-gray-500 w-full sm:w-auto sm:mr-1">Accès rapide</span>
              <a
                href="#devis-pdf-perso"
                className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
              >
                Devis PDF perso
              </a>
              <a
                href="#stats-gestion"
                className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
              >
                Indicateurs
              </a>
              <a
                href="#clients"
                className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
              >
                Clients
              </a>
              <a
                href="#signatures-attente"
                className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
              >
                Signatures
              </a>
              <a
                href="#devis-decennale-manuel"
                className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
              >
                Devis déc. manuel
              </a>
              <a
                href="#devis-do-manuel"
                className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
              >
                Devis DO
              </a>
              <a
                href="#paiements"
                className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
              >
                Paiements
              </a>
              <a
                href="#attestations"
                className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
              >
                Attestations
              </a>
              <a
                href="#contrats"
                className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
              >
                Contrats
              </a>
              {(data.devisLeads?.length ?? 0) > 0 && (
                <a
                  href="#leads-decennale"
                  className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
                >
                  Leads déc.
                </a>
              )}
              {(data.devisDrafts?.length ?? 0) > 0 && (
                <a
                  href="#brouillons-devis"
                  className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
                >
                  Brouillons
                </a>
              )}
              {data.devisEtudeLeads && data.devisEtudeLeads.length > 0 && (
                <a
                  href="#demandes-etude"
                  className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
                >
                  Études
                </a>
              )}
              {data.devisRcFabriquantLeads && data.devisRcFabriquantLeads.length > 0 && (
                <a
                  href="#rc-fab-leads"
                  className="text-xs sm:text-sm px-2.5 py-1 rounded-md bg-[#2d2d2d] text-gray-200 border border-gray-600 hover:bg-[#383838] hover:text-white"
                >
                  RC Fab
                </a>
              )}
            </nav>
            <section
              id="devis-pdf-perso"
              className="bg-[#252525] rounded-xl p-6 border border-gray-700 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg font-semibold text-white">Devis PDF personnalisé → signature → paiement</h2>
              <p className="text-sm text-gray-400">
                Joignez un PDF (devis ou proposition), choisissez le client et le montant TTC. Après signature électronique, un contrat RC Fabriquant est créé (statut approuvé) et le client peut payer depuis son espace.
              </p>
              <p className="text-xs text-amber-200/80 border border-amber-900/40 rounded-lg px-3 py-2 bg-amber-950/20">
                Une seule demande de signature à la fois par client. Si l&apos;envoi est refusé, vérifiez la section{" "}
                <a href="#signatures-attente" className="text-amber-100 underline hover:no-underline">
                  Signatures en attente
                </a>{" "}
                ou la fiche client avant de renvoyer.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Filtrer les clients</label>
                  <input
                    type="search"
                    value={customDevisUserFilter}
                    onChange={(e) => setCustomDevisUserFilter(e.target.value)}
                    placeholder="Email, raison sociale, SIRET…"
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <label className="text-sm text-gray-300">Client destinataire</label>
                  <select
                    value={customDevisUserId}
                    onChange={(e) => setCustomDevisUserId(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="">— Choisir un client —</option>
                    {customDevisUserOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email}
                        {u.raisonSociale ? ` — ${u.raisonSociale}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Fichier PDF</label>
                  <input
                    ref={customDevisPdfInputRef}
                    type="file"
                    accept="application/pdf"
                    className="block w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#2563eb] file:text-white"
                  />
                  <label className="text-sm text-gray-300">Prime TTC (€)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={customDevisPrime}
                    onChange={(e) => setCustomDevisPrime(e.target.value)}
                    placeholder="ex. 2400 (annuel TTC)"
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <label className="text-sm text-gray-300">Prime annuelle HT (€) — optionnel</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={customDevisPrimeHt}
                    onChange={(e) => setCustomDevisPrimeHt(e.target.value)}
                    placeholder="ex. 2000"
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <label className="text-sm text-gray-300">Échéancier RC Fabriquant</label>
                  <select
                    value={customDevisPeriodicity}
                    onChange={(e) => setCustomDevisPeriodicity(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="mensuel">Mensuel (12 échéances)</option>
                    <option value="trimestriel">Trimestriel (4 échéances)</option>
                    <option value="semestriel">Semestriel (2 échéances)</option>
                    <option value="annuel">Annuel (1 échéance)</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Référence devis (optionnel)</label>
                  <input
                    value={customDevisRef}
                    onChange={(e) => setCustomDevisRef(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Libellé produit (email)</label>
                  <input
                    value={customDevisLabel}
                    onChange={(e) => setCustomDevisLabel(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Après signature (redirection)</label>
                  <input
                    value={customDevisNextPath}
                    onChange={(e) => setCustomDevisNextPath(e.target.value)}
                    placeholder="/espace-client"
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={customDevisSending}
                onClick={async () => {
                  const file = customDevisPdfInputRef.current?.files?.[0]
                  if (!customDevisUserId) {
                    setError("Choisissez un client pour le devis PDF.")
                    return
                  }
                  if (!file) {
                    setError("Sélectionnez un fichier PDF.")
                    return
                  }
                  const primeTtcAnnuel = Number(customDevisPrime.replace(",", "."))
                  if (!Number.isFinite(primeTtcAnnuel) || primeTtcAnnuel <= 0) {
                    setError("Indiquez une prime annuelle TTC valide (> 0).")
                    return
                  }
                  const primeHtTrim = customDevisPrimeHt.trim()
                  const primeHtAnnuel =
                    primeHtTrim.length > 0 ? Number(primeHtTrim.replace(",", ".")) : undefined
                  if (primeHtAnnuel != null && (!Number.isFinite(primeHtAnnuel) || primeHtAnnuel <= 0)) {
                    setError("Prime annuelle HT invalide.")
                    return
                  }
                  setCustomDevisSending(true)
                  setError(null)
                  try {
                    const fd = new FormData()
                    fd.append("pdf", file)
                    fd.append("userId", customDevisUserId)
                    fd.append("primeTtc", String(primeTtcAnnuel))
                    if (primeHtAnnuel != null) fd.append("primeHtAnnuel", String(primeHtAnnuel))
                    fd.append("periodicite", customDevisPeriodicity)
                    if (customDevisRef.trim()) fd.append("devisReference", customDevisRef.trim())
                    if (customDevisLabel.trim()) fd.append("produitLabel", customDevisLabel.trim())
                    if (customDevisNextPath.trim()) fd.append("afterSignNextPath", customDevisNextPath.trim())
                    const res = await fetch("/api/gestion/sign/send-custom-devis-pdf", {
                      method: "POST",
                      body: fd,
                    })
                    const j = await res.json().catch(() => ({}))
                    if (!res.ok) throw new Error(j.error || res.statusText)
                    setToast({ message: j.message || "Invitation envoyée.", type: "success" })
                    if (customDevisPdfInputRef.current) customDevisPdfInputRef.current.value = ""
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Envoi impossible.")
                  } finally {
                    setCustomDevisSending(false)
                  }
                }}
                className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-medium disabled:opacity-50"
              >
                {customDevisSending ? "Envoi…" : "Envoyer l’invitation de signature"}
              </button>
            </section>
            <section id="stats-gestion" className="grid grid-cols-2 md:grid-cols-6 gap-4 scroll-mt-24">
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Clients</p>
                <Link href="#clients" className="text-2xl font-bold text-white hover:text-[#2563eb] block">
                  {filterUsersBySearch(data.users, searchQuery).length}
                </Link>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Paiements</p>
                <p className="text-2xl font-bold text-white">{filterBySearch(data.payments, searchQuery).length}</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">CA (paiements)</p>
                <p className="text-2xl font-bold text-green-400">{filterBySearch(data.payments, searchQuery).filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0).toLocaleString("fr-FR")} €</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Décennale suspendue (impayé)</p>
                <p className="text-2xl font-bold text-red-400">{filterBySearch(data.documents.filter((d) => d.type === "attestation"), searchQuery).filter((d) => d.status === "suspendu").length}</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Résiliés</p>
                <p className="text-2xl font-bold text-gray-200">{filterBySearch(data.documents.filter((d) => d.type === "attestation" || d.type === "contrat"), searchQuery).filter((d) => d.status === "resilie").length}</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Frais avenant en attente</p>
                <p className="text-2xl font-bold text-sky-400">{data.avenantFees?.length ?? 0}</p>
                <p className="text-xs text-gray-200 mt-1">{(data.avenantFees?.reduce((a, f) => a + f.amount, 0) ?? 0).toLocaleString("fr-FR")} € à reporter</p>
              </div>
              {(data.devisEtudeLeads?.length ?? 0) > 0 && (
                <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-200 text-sm">Demandes d&apos;étude</p>
                  <p className="text-2xl font-bold text-[#2563eb]">{data.devisEtudeLeads?.length ?? 0}</p>
                  <p className="text-xs text-gray-200 mt-1">À traiter (remise personnalisée)</p>
                </div>
              )}
              {(data.devisRcFabriquantLeads?.length ?? 0) > 0 && (
                <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-200 text-sm">RC Fabriquant</p>
                  <p className="text-2xl font-bold text-teal-300">{data.devisRcFabriquantLeads?.length ?? 0}</p>
                  <p className="text-xs text-gray-200 mt-1">
                    {(data.devisRcFabriquantLeads ?? []).filter(
                      (l) => normalizeRcFabriquantLeadStatut(l.statut) === "a_traiter"
                    ).length}{" "}
                    à traiter — 50 derniers
                  </p>
                </div>
              )}
              {data.doStats && (
                <>
                  <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                    <p className="text-gray-200 text-sm">Attestations DO</p>
                    <p className="text-2xl font-bold text-white">{data.doStats.attestationsCount}</p>
                    <p className="text-xs text-gray-200 mt-1">Clos/couv. {data.doStats.closCouvertCount} — DO complète {data.doStats.doCompletCount}</p>
                  </div>
                  <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                    <p className="text-gray-200 text-sm">CA DO (primes)</p>
                    <p className="text-2xl font-bold text-emerald-400">{data.doStats.primesTotal.toLocaleString("fr-FR")} €</p>
                  </div>
                </>
              )}
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Leads devis décennale</p>
                <p className="text-2xl font-bold text-amber-300">{data.devisLeads?.length ?? 0}</p>
                <p className="text-xs text-gray-200 mt-1">100 derniers</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Brouillons devis</p>
                <p className="text-2xl font-bold text-cyan-300">{data.devisDrafts?.length ?? 0}</p>
                <p className="text-xs text-gray-200 mt-1">Liens de reprise</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Signatures en attente</p>
                <p className="text-2xl font-bold text-violet-300">{data.pendingSignatures?.length ?? 0}</p>
                <p className="text-xs text-gray-200 mt-1">Non finalisées (PDF / sign)</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-amber-900/40">
                <p className="text-gray-200 text-sm">Contrats plateforme</p>
                <Link href="#contrats-plateforme" className="text-2xl font-bold text-amber-200 hover:text-amber-100 block">
                  {data.insuranceContractsCount ?? 0}
                </Link>
                <p className="text-xs text-gray-200 mt-1">Tableau manuel + lien admin</p>
              </div>
            </section>

            {data.dashboardActionsSummary && (data.dashboardActionsSummary.total ?? 0) > 0 && (
              <section id="actions-du-jour" className="scroll-mt-24 bg-[#252525] rounded-xl p-5 border border-amber-700/60">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-white">Actions du jour (automatique)</h2>
                  <div className="text-xs text-gray-200 flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded bg-red-900/40 text-red-200 border border-red-700/50">
                      Urgent 72h+ : {data.dashboardActionsSummary.overdue72h}
                    </span>
                    <span className="px-2 py-1 rounded bg-amber-900/40 text-amber-200 border border-amber-700/50">
                      Priorité haute : {data.dashboardActionsSummary.high}
                    </span>
                    <span className="px-2 py-1 rounded bg-blue-900/40 text-blue-200 border border-blue-700/50">
                      Priorité moyenne : {data.dashboardActionsSummary.medium}
                    </span>
                    <span className="px-2 py-1 rounded bg-gray-800 text-gray-200 border border-gray-600">
                      Traitées aujourd&apos;hui : {data.dashboardActionsSummary.dismissedToday ?? 0}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {(data.dashboardActions ?? []).map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-gray-700 bg-[#1f1f1f] px-3 py-2"
                    >
                      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3">
                        <a href={a.href} className="block min-w-0 flex-1 hover:text-[#2563eb] transition-colors">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
                                a.priority === "high"
                                  ? "bg-red-900/40 text-red-200 border border-red-700/50"
                                  : "bg-amber-900/40 text-amber-200 border border-amber-700/50"
                              }`}
                            >
                              {a.priority === "high" ? "Haute" : "Moyenne"}
                            </span>
                            <span className="text-sm font-medium text-white">{a.title}</span>
                            <span className="text-xs text-gray-400">{a.ageHours}h</span>
                          </div>
                          <p className="text-xs text-gray-300 mt-1">{a.description}</p>
                        </a>
                        <button
                          type="button"
                          disabled={dismissingActionId === a.id}
                          onClick={async () => {
                            setDismissingActionId(a.id)
                            try {
                              const res = await fetch("/api/gestion/actions-du-jour/dismiss", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ actionId: a.id }),
                              })
                              const j = await readResponseJson<{ error?: string }>(res)
                              if (!res.ok) throw new Error(j.error || "Impossible de marquer l'action comme traitée.")

                              const dashRes = await fetch("/api/gestion/dashboard", { credentials: "include" })
                              if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                              setToast({ message: "Action marquée comme traitée.", type: "success" })
                            } catch (err) {
                              setToast({
                                message: err instanceof Error ? err.message : "Erreur lors de la mise à jour",
                                type: "error",
                              })
                            } finally {
                              setDismissingActionId(null)
                            }
                          }}
                          className="shrink-0 text-xs px-2.5 py-1.5 rounded border border-gray-600 text-gray-100 hover:border-[#2563eb] hover:text-[#60a5fa] disabled:opacity-50"
                        >
                          {dismissingActionId === a.id ? "…" : "Marquer traité"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {data && Array.isArray(data.insuranceContracts) && (
          <InsuranceContractsGestionBlock
            contracts={data.insuranceContracts}
            searchQuery={searchQuery}
            onRefresh={async () => {
              const dashRes = await fetch("/api/gestion/dashboard")
              if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
            }}
            setToast={setToast}
          />
        )}

        {/* Liste clients - accès fiche détaillée */}
        {data && (
          <section id="clients" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-white mb-4">Clients</h2>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 sm:p-4 font-medium">Client</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Email</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">SIRET</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden md:table-cell">DO</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filterUsersBySearch(data.users, searchQuery).length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-gray-200">Aucun client</td></tr>
                  ) : (
                    filterUsersBySearch(data.users, searchQuery).map((u) => (
                      <tr key={u.id} className="border-b border-gray-700/50">
                        <td className="p-3 sm:p-4">{u.raisonSociale || "—"}</td>
                        <td className="p-3 sm:p-4">{u.email}</td>
                        <td className="p-3 sm:p-4 font-mono text-gray-200 hidden sm:table-cell">{u.siret || "—"}</td>
                        <td className="p-3 sm:p-4 hidden md:table-cell">
                          {u.doQuestionnaireInitial || u.doQuestionnaireEtude ? (
                            <span className="flex flex-wrap gap-1">
                              {u.doQuestionnaireInitial ? (
                                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-900/50 text-sky-200 border border-sky-700/50" title="Premier questionnaire DO enregistré">
                                  1er
                                </span>
                              ) : null}
                              {u.doQuestionnaireEtude ? (
                                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-200 border border-amber-700/50" title="Questionnaire d’étude espace client">
                                  Étude
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4">
                          <Link
                            href={`/gestion/clients/${u.id}`}
                            className="text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium"
                          >
                            Fiche client →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data && (data.devisLeads?.length ?? 0) > 0 && (
          <section id="leads-decennale" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-white mb-4">Leads devis décennale (tarificateur)</h2>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 sm:p-4 font-medium">Date</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Email</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden md:table-cell">Raison sociale</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden lg:table-cell">SIRET</th>
                      <th className="text-right p-3 sm:p-4 font-medium">Prime / SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devisLeads!.map((l) => (
                    <tr key={l.id} className="border-b border-gray-700/50">
                      <td className="p-3 sm:p-4 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("fr-FR")}</td>
                      <td className="p-3 sm:p-4">{l.email}</td>
                      <td className="p-3 sm:p-4 hidden md:table-cell">{l.raisonSociale || "—"}</td>
                      <td className="p-3 sm:p-4 font-mono text-gray-200 hidden lg:table-cell">{l.siret || "—"}</td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span>{l.primeAnnuelle != null ? `${l.primeAnnuelle.toLocaleString("fr-FR")} €` : "—"}</span>
                          {typeof l.slaHours === "number" ? leadSlaBadge(l.slaHours) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data && (data.devisDrafts?.length ?? 0) > 0 && (
          <section id="brouillons-devis" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-white mb-4">Brouillons devis (liens de reprise)</h2>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 sm:p-4 font-medium">Créé</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Produit</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Email</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Expire</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Reprendre</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devisDrafts!.map((d) => {
                    const resumeHref = `/devis/resume/${d.token}`
                    const expired = new Date(d.expiresAt) < new Date()
                    return (
                      <tr key={d.id} className="border-b border-gray-700/50">
                        <td className="p-3 sm:p-4 whitespace-nowrap">{new Date(d.createdAt).toLocaleString("fr-FR")}</td>
                        <td className="p-3 sm:p-4">{d.produit === "dommage-ouvrage" ? "DO" : "Décennale"}</td>
                        <td className="p-3 sm:p-4">{d.email}</td>
                        <td className="p-3 sm:p-4 text-amber-200/90">{expired ? "Expiré" : new Date(d.expiresAt).toLocaleDateString("fr-FR")}</td>
                        <td className="p-3 sm:p-4">
                          <a
                            href={resumeHref}
                            target="_blank"
                            rel="noreferrer"
                            className={`text-sm font-medium ${expired ? "text-gray-500 pointer-events-none" : "text-[#2563eb] hover:underline"}`}
                          >
                            Ouvrir le lien
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-200">
              Le flux de reprise côté site cible le devis décennale ; les brouillons DO listés ici restent identifiables par produit.
            </p>
          </section>
        )}

        {data && (
          <section id="signatures-attente" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-white mb-2">Signatures électroniques en attente</h2>
            <p className="text-sm text-gray-400 mb-4 max-w-2xl">
              Décennale (contrat généré depuis un devis) ou <strong className="text-gray-200">PDF personnalisé</strong> (RC
              après signature). Tant qu&apos;une ligne est présente, le client ne peut pas recevoir une nouvelle invitation
              sur le même compte.
            </p>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 sm:p-4 font-medium">Date</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Flux</th>
                    <th className="text-left p-3 sm:p-4 font-medium">N° / ref.</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Client</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">ID demande</th>
                    <th className="text-left p-3 sm:p-4 font-medium">CRM</th>
                    <th className="text-left p-3 sm:p-4 font-medium w-[5.5rem]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.pendingSignatures?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-gray-200">
                        Aucune signature en attente.
                      </td>
                    </tr>
                  ) : (
                    data.pendingSignatures!.map((s) => {
                      const flow = s.signatureFlow ?? "decennale"
                      return (
                        <tr key={s.id} className="border-b border-gray-700/50">
                          <td className="p-3 sm:p-4 whitespace-nowrap">{new Date(s.createdAt).toLocaleString("fr-FR")}</td>
                          <td className="p-3 sm:p-4 align-top">
                            {flow === "custom_pdf" ? (
                              <span className="inline-block text-xs font-medium uppercase tracking-wide bg-teal-900/50 text-teal-200 px-2 py-0.5 rounded">
                                PDF perso
                              </span>
                            ) : (
                              <span className="inline-block text-xs font-medium uppercase tracking-wide bg-violet-900/50 text-violet-200 px-2 py-0.5 rounded">
                                Décennale
                              </span>
                            )}
                            {s.signatureFlowLabel ? (
                              <div className="text-xs text-gray-400 mt-1 max-w-[14rem] line-clamp-2" title={s.signatureFlowLabel}>
                                {s.signatureFlowLabel}
                              </div>
                            ) : null}
                          </td>
                          <td className="p-3 sm:p-4 font-mono text-white text-xs">{s.contractNumero}</td>
                          <td className="p-3 sm:p-4">
                            {s.user ? s.user.raisonSociale || s.user.email : "—"}
                          </td>
                          <td
                            className="p-3 sm:p-4 font-mono text-xs text-gray-200 hidden sm:table-cell max-w-[12rem] truncate"
                            title={s.signatureRequestId}
                          >
                            {s.signatureRequestId}
                          </td>
                          <td className="p-3 sm:p-4">
                            {s.user ? (
                              <Link href={`/gestion/clients/${s.userId}`} className="text-[#2563eb] hover:underline text-sm">
                                Fiche →
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 sm:p-4 align-top">
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                disabled={cancellingSignatureId === s.signatureRequestId}
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      "Annuler cette demande de signature ? Le lien envoyé au client ne fonctionnera plus ; vous pourrez en envoyer une nouvelle."
                                    )
                                  ) {
                                    return
                                  }
                                  setCancellingSignatureId(s.signatureRequestId)
                                  try {
                                    const res = await fetch(
                                      `/api/gestion/pending-signatures/${encodeURIComponent(s.signatureRequestId)}`,
                                      { method: "DELETE" }
                                    )
                                    const j = (await readResponseJson(res)) as { error?: string; message?: string }
                                    if (!res.ok) throw new Error(j.error || res.statusText)
                                    setToast({ message: j.message || "Demande annulée.", type: "success" })
                                    const dashRes = await fetch("/api/gestion/dashboard", { credentials: "include" })
                                    if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                                  } catch (e) {
                                    setToast({
                                      message: e instanceof Error ? e.message : "Annulation impossible.",
                                      type: "error",
                                    })
                                  } finally {
                                    setCancellingSignatureId(null)
                                  }
                                }}
                                className="text-red-400 hover:text-red-300 text-sm disabled:opacity-40 whitespace-nowrap text-left"
                              >
                                {cancellingSignatureId === s.signatureRequestId ? "…" : "Annuler"}
                              </button>
                              {s.repairEligible ? (
                                <button
                                  type="button"
                                  disabled={repairingSignatureId === s.signatureRequestId}
                                  onClick={async () => {
                                    if (
                                      !window.confirm(
                                        "Relancer la finalisation de cette signature bloquée ?"
                                      )
                                    ) {
                                      return
                                    }
                                    setRepairingSignatureId(s.signatureRequestId)
                                    try {
                                      const res = await fetch("/api/gestion/signatures/repair", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ signatureRequestId: s.signatureRequestId }),
                                      })
                                      const j = (await readResponseJson(res)) as { error?: string; message?: string }
                                      if (!res.ok) throw new Error(j.error || res.statusText)
                                      setToast({ message: j.message || "Finalisation relancée.", type: "success" })
                                      const dashRes = await fetch("/api/gestion/dashboard", { credentials: "include" })
                                      if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                                    } catch (e) {
                                      setToast({
                                        message: e instanceof Error ? e.message : "Relance impossible.",
                                        type: "error",
                                      })
                                    } finally {
                                      setRepairingSignatureId(null)
                                    }
                                  }}
                                  className="text-amber-300 hover:text-amber-200 text-sm disabled:opacity-40 whitespace-nowrap text-left"
                                >
                                  {repairingSignatureId === s.signatureRequestId ? "…" : "Réparer"}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data?.resiliationRequests && data.resiliationRequests.length > 0 && (
          <div className="p-4 bg-blue-950/40 border border-blue-600 rounded-xl">
            <p className="font-medium text-sky-300">Demandes de résiliation en attente</p>
            <div className="mt-3 space-y-2">
              {data.resiliationRequests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 bg-[#252525] rounded-lg p-3 border border-blue-600/50">
                  <div>
                    <span className="font-mono text-white">{r.document.numero}</span>
                    <span className="text-gray-200 ml-2">— {r.document.user.raisonSociale || r.document.user.email}</span>
                    {r.motif && <span className="block text-sm text-gray-200 mt-1">Motif : {r.motif}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/gestion/resiliation-requests/${r.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "approve" }),
                          })
                          if (!res.ok) throw new Error()
                          setToast({ message: "Résiliation autorisée. Email envoyé au client.", type: "success" })
                          const dashRes = await fetch("/api/gestion/dashboard")
                          if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                        } catch {
                          setToast({ message: "Erreur", type: "error" })
                        }
                      }}
                      className="text-sm px-3 py-1.5 rounded bg-green-900/50 text-green-300 hover:bg-green-900/70"
                    >
                      Autoriser
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/gestion/resiliation-requests/${r.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "reject" }),
                          })
                          if (!res.ok) throw new Error()
                          setToast({ message: "Demande refusée", type: "success" })
                          const dashRes = await fetch("/api/gestion/dashboard")
                          if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                        } catch {
                          setToast({ message: "Erreur", type: "error" })
                        }
                      }}
                      className="text-sm px-3 py-1.5 rounded bg-red-900/50 text-red-300 hover:bg-red-900/70"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {data && data.documents.some((d) => d.type === "attestation" && d.status === "suspendu") && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl">
            <p className="font-medium text-red-300">⚠ Impayés décennale</p>
            <p className="text-sm text-red-200 mt-1">
              {data.documents.filter((d) => d.type === "attestation" && d.status === "suspendu").length} attestation(s){" "}
              <strong>décennale</strong> suspendue(s). Le DO n’est pas concerné (paiement unique avant attestation). Utilisez « Relancer email » pour renvoyer le lien de régularisation.
            </p>
          </div>
        )}
        {data && (data.avenantFees?.length ?? 0) > 0 && (
          <div className="p-4 bg-blue-950/40 border border-blue-600 rounded-xl">
            <p className="font-medium text-sky-300">Frais d&apos;avenant en attente</p>
            <p className="text-sm text-sky-200 mt-1">
              {(data.avenantFees?.length ?? 0)} frais à reporter sur le prochain prélèvement ({(data.avenantFees?.reduce((a, f) => a + f.amount, 0) ?? 0).toLocaleString("fr-FR")} € total).
            </p>
            <p className="text-xs text-sky-200/80 mt-2">
              Clients : {data.avenantFees?.map((f) => f.user.raisonSociale || f.user.email).join(", ")}
            </p>
          </div>
        )}
        {/* Paiements */}
        <section id="paiements" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-4">Paiements</h2>
          <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 sm:p-4 font-medium">Date</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Client</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Montant</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Statut</th>
                  <th className="text-left p-3 sm:p-4 font-medium w-[4.5rem]">CRM</th>
                  <th className="text-left p-3 sm:p-4 font-medium hidden md:table-cell">Mollie ID</th>
                </tr>
              </thead>
              <tbody>
                {filterBySearch(data.payments, searchQuery).length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-gray-200">Aucun paiement</td></tr>
                ) : (
                  filterBySearch(data.payments, searchQuery).map((p) => (
                    <tr key={p.id} className="border-b border-gray-700/50">
                      <td className="p-3 sm:p-4">{new Date(p.paidAt || p.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3 sm:p-4">{p.user.raisonSociale || p.user.email}</td>
                      <td className="p-3 sm:p-4">{p.amount.toLocaleString("fr-FR")} €</td>
                      <td className="p-3 sm:p-4">
                        <span className={`px-2 py-1 rounded text-xs ${p.status === "paid" ? "bg-green-900/50 text-green-300" : "bg-blue-900/50 text-sky-300"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4">
                        <Link
                          href={`/gestion/clients/${p.userId}`}
                          className="text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium whitespace-nowrap"
                          title="Ouvrir la fiche client"
                        >
                          →
                        </Link>
                      </td>
                      <td className="p-3 sm:p-4 font-mono text-xs text-gray-200 hidden md:table-cell">{p.molliePaymentId}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Attestations et suspension */}
        <section id="attestations" className="scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-white">Attestations</h2>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="all">Toutes (décennale + DO)</option>
              <option value="attestation">Décennale uniquement</option>
              <option value="attestation_do">DO uniquement</option>
            </select>
          </div>
          <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 sm:p-4 font-medium">Type</th>
                  <th className="text-left p-3 sm:p-4 font-medium">N°</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Client</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Statut</th>
                  <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">Date</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterBySearch(attestations, searchQuery).length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-gray-200">Aucune attestation</td></tr>
                ) : (
                  filterBySearch(attestations, searchQuery).map((d) => (
                    <tr key={d.id} className="border-b border-gray-700/50">
                      <td className="p-3 sm:p-4">
                        <span className="text-xs text-gray-200">
                          {d.type === "attestation_do"
                            ? "DO"
                            : d.type === "attestation_nominative"
                              ? "Décennale nominative"
                              : "Décennale"}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 font-mono">{d.numero}</td>
                      <td className="p-3 sm:p-4">{d.user.raisonSociale || d.user.email}</td>
                      <td className="p-3 sm:p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          d.status === "valide" ? "bg-green-900/50 text-green-300" :
                          d.status === "suspendu" ? "bg-red-900/50 text-red-300" :
                          d.status === "resilie" ? "bg-gray-700 text-gray-200" :
                          "bg-blue-900/50 text-sky-300"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 hidden sm:table-cell">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3 sm:p-4">
                        <Link href={`/gestion/documents/${d.id}`} className="text-[#2563eb] hover:text-[#1d4ed8] text-sm mr-2">
                          Voir
                        </Link>
                        <Link
                          href={`/gestion/clients/${d.userId}`}
                          className="text-gray-200 hover:text-white text-sm mr-2"
                        >
                          Client
                        </Link>
                        {d.type === "attestation" && d.status === "valide" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(d.id, "suspendu")}
                              className="text-red-400 hover:text-red-300 text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Suspendre
                            </button>
                            <button
                              onClick={() => setResiliationModal({ docId: d.id, motif: "" })}
                              className="text-gray-200 hover:text-white text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Résilier
                            </button>
                          </>
                        )}
                        {d.type === "attestation" && d.status === "suspendu" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleResendImpayeEmail(d.id)}
                              className="text-sky-400 hover:text-sky-300 text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                              title="Renvoyer l’email de régularisation (décennale)"
                            >
                              Relancer email
                            </button>
                            <button
                              onClick={() => handleStatusChange(d.id, "valide")}
                              className="text-green-400 hover:text-green-300 text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Restaurer
                            </button>
                            <button
                              onClick={() => setResiliationModal({ docId: d.id, motif: "" })}
                              className="text-gray-200 hover:text-white text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Résilier
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Contrats - autorisation annulation */}
        <section id="contrats" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-4">Contrats</h2>
          <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 sm:p-4 font-medium">N°</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Client</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Statut</th>
                  <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">Date</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterBySearch(contrats, searchQuery).length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-gray-200">Aucun contrat</td></tr>
                ) : (
                  filterBySearch(contrats, searchQuery).map((d) => (
                    <tr key={d.id} className="border-b border-gray-700/50">
                      <td className="p-3 sm:p-4 font-mono">{d.numero}</td>
                      <td className="p-3 sm:p-4">{d.user.raisonSociale || d.user.email}</td>
                      <td className="p-3 sm:p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          d.status === "valide" ? "bg-green-900/50 text-green-300" :
                          d.status === "resilie" ? "bg-gray-700 text-gray-200" :
                          "bg-blue-900/50 text-sky-300"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 hidden sm:table-cell">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3 sm:p-4">
                        <Link
                          href={`/gestion/clients/${d.userId}`}
                          className="text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium mr-3"
                        >
                          CRM →
                        </Link>
                        {d.status === "valide" && (
                          <>
                            <button
                              onClick={() => openEditModal(d)}
                              className="text-sky-400 hover:text-sky-300 text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => setResiliationModal({ docId: d.id, motif: "" })}
                              className="text-gray-200 hover:text-white text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2 ml-2"
                            >
                              Autoriser annulation
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Demandes d'étude approfondie - remise personnalisée */}
        {data?.devisEtudeLeads && data.devisEtudeLeads.length > 0 && (
          <section id="etudes-do" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-white mb-4">Demandes d&apos;étude (remise personnalisée)</h2>
            <p className="text-sm text-gray-200 mb-4">
              Dossiers sinistres (&gt;1 sinistre) ou <strong className="text-gray-200">activité non listée</strong> (/etude/domaine). Faire une remise pour envoyer une proposition avec prime personnalisée.
            </p>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0 mb-10">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 sm:p-4 font-medium">Email</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Raison sociale</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">SIRET</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Date</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devisEtudeLeads.map((lead) => {
                    let parsed: {
                      type?: string
                      chiffreAffaires?: number
                      sinistres?: number
                      activites?: string[]
                      descriptionActivite?: string
                      chiffreAffairesApprox?: number
                    } = {}
                    try {
                      parsed = JSON.parse(lead.data) as typeof parsed
                    } catch {
                      /* ignore */
                    }
                    const estDomaine = parsed.type === "domaine_non_liste"
                    const resume = estDomaine
                      ? (parsed.descriptionActivite ?? "").slice(0, 80) + ((parsed.descriptionActivite?.length ?? 0) > 80 ? "…" : "")
                      : `CA ${parsed.chiffreAffaires?.toLocaleString("fr-FR") ?? "—"} € · ${parsed.sinistres ?? 0} sinistre(s)`
                    return (
                      <tr key={lead.id} className="border-b border-gray-700/50">
                        <td className="p-3 sm:p-4">
                          {lead.email}
                          {estDomaine && (
                            <span className="ml-2 inline-block text-[10px] uppercase tracking-wide bg-blue-900/50 text-sky-200 px-1.5 py-0.5 rounded">
                              Domaine
                            </span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4">{lead.raisonSociale || "—"}</td>
                        <td className="p-3 sm:p-4 font-mono text-gray-200 hidden sm:table-cell">{lead.siret || "—"}</td>
                        <td className="p-3 sm:p-4">{new Date(lead.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="p-3 sm:p-4">
                          <button
                            onClick={() => setEtudeMiseModal({
                              id: lead.id,
                              email: lead.email,
                              raisonSociale: lead.raisonSociale,
                              primeAnnuelle: "",
                            })}
                            className="text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium"
                          >
                            Faire une remise
                          </button>
                          <span className="text-gray-200 text-xs ml-2 block sm:inline mt-1 sm:mt-0" title={estDomaine ? parsed.descriptionActivite : undefined}>
                            {resume}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Devis décennale — saisie manuelle puis envoi lien /sign depuis la fiche document */}
        <section id="devis-decennale-manuel" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-4">Devis décennale (manuel)</h2>
          <p className="text-sm text-gray-200 mb-4 max-w-2xl">
            Créez un devis pour un client existant. Ensuite, ouvrez le document depuis le tableau des documents
            (ou la fiche client) et cliquez sur <strong className="text-white">Envoyer pour signature</strong> : le
            contrat PDF est généré, le client reçoit un lien de signature par email (même flux que la souscription en
            ligne).
          </p>
          <form onSubmit={handleCreateDevisDecennale} className="bg-[#252525] rounded-xl p-6 border border-gray-700 space-y-4 max-w-xl mb-10">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200 mb-1">Filtrer les clients</label>
              <input
                type="search"
                value={devisDecUserFilter}
                onChange={(e) => setDevisDecUserFilter(e.target.value)}
                placeholder="Email, raison sociale, SIRET…"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
              <label className="block text-sm font-medium text-gray-200 mb-1">Client</label>
              <select
                required
                value={devisDecForm.userId}
                onChange={(e) => setDevisDecForm((f) => ({ ...f, userId: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="">— Sélectionner —</option>
                {devisDecUserOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email}
                    {u.raisonSociale ? ` — ${u.raisonSociale}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Activités à assurer (liste tarificateur, max. 8)
              </label>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <select
                  value={devisDecActivitePick}
                  onChange={(e) => setDevisDecActivitePick(e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white text-sm"
                >
                  <option value="">— Choisir une activité —</option>
                  {ACTIVITES_BTP.map((act) => (
                    <option key={act} value={act} disabled={devisDecForm.activites.includes(act)}>
                      {act}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!devisDecActivitePick || devisDecForm.activites.length >= 8) return
                    if (devisDecForm.activites.includes(devisDecActivitePick)) return
                    setDevisDecForm((f) => ({
                      ...f,
                      activites: [...f.activites, devisDecActivitePick],
                    }))
                    setDevisDecActivitePick("")
                  }}
                  disabled={!devisDecActivitePick || devisDecForm.activites.length >= 8}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#374151] text-white text-sm font-medium hover:bg-[#4b5563] disabled:opacity-40 disabled:pointer-events-none"
                >
                  Ajouter
                </button>
              </div>
              {devisDecForm.activites.length === 0 ? (
                <p className="text-sm text-amber-400/90 mb-2">Au moins une activité est requise pour créer le devis.</p>
              ) : (
                <ul className="space-y-2 mb-2">
                  {devisDecForm.activites.map((act, index) => (
                    <li
                      key={`${act}-${index}`}
                      className="flex justify-between items-center gap-2 bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100"
                    >
                      <span className="min-w-0 break-words">{act}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDevisDecForm((f) => ({
                            ...f,
                            activites: f.activites.filter((_, i) => i !== index),
                          }))
                        }
                        className="shrink-0 text-[#60a5fa] text-sm hover:underline"
                      >
                        Retirer
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-gray-400">
                Même liste que le devis en ligne. Activité absente ?{" "}
                <Link href="/etude/domaine" className="text-[#60a5fa] hover:underline">
                  Demande d&apos;étude
                </Link>
                .
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Chiffre d&apos;affaires (€)</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={devisDecForm.chiffreAffaires}
                  onChange={(e) => setDevisDecForm((f) => ({ ...f, chiffreAffaires: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Prime annuelle TTC (€)</label>
                <input
                  required
                  type="number"
                  min={0}
                  step={0.01}
                  value={devisDecForm.primeAnnuelle}
                  onChange={(e) => setDevisDecForm((f) => ({ ...f, primeAnnuelle: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Franchise (€) — défaut barème</label>
                <input
                  type="number"
                  min={0}
                  value={devisDecForm.franchise}
                  onChange={(e) => setDevisDecForm((f) => ({ ...f, franchise: e.target.value }))}
                  placeholder={String(FRANCHISE_DECENNALE_EUR)}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Plafond (€)</label>
                <input
                  type="number"
                  min={0}
                  value={devisDecForm.plafond}
                  onChange={(e) => setDevisDecForm((f) => ({ ...f, plafond: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-200 mb-1">Représentant légal (signataire)</label>
                <input
                  required
                  value={devisDecForm.representantLegal}
                  onChange={(e) => setDevisDecForm((f) => ({ ...f, representantLegal: e.target.value }))}
                  placeholder="Prénom Nom"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Civilité</label>
                <select
                  value={devisDecForm.civilite}
                  onChange={(e) => setDevisDecForm((f) => ({ ...f, civilite: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="M">M</option>
                  <option value="Mme">Mme</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-gray-200">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={devisDecForm.jamaisAssure}
                  onChange={(e) => setDevisDecForm((f) => ({ ...f, jamaisAssure: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                Jamais assuré (attestation non-sinistralité si besoin)
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={devisDecForm.reprisePasse}
                  onChange={(e) => setDevisDecForm((f) => ({ ...f, reprisePasse: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                Reprise du passé
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Date de création société (si jamais assuré)</label>
              <input
                type="date"
                value={devisDecForm.dateCreationSociete}
                onChange={(e) => setDevisDecForm((f) => ({ ...f, dateCreationSociete: e.target.value }))}
                className="w-full sm:w-auto bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <button
              type="submit"
              disabled={devisDecSubmitting}
              className="bg-[#2563eb] text-white px-4 py-2.5 rounded-lg font-medium hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              {devisDecSubmitting ? "Création…" : "Créer le devis décennale"}
            </button>
          </form>
        </section>

        {/* Devis dommage ouvrage - ajout manuel */}
        <section id="devis-do-manuel" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-4">Ajouter un devis dommage ouvrage</h2>
          <p className="text-sm text-gray-200 mb-4 max-w-2xl">
            Le devis est ajouté à l&apos;espace client. Paiement :{" "}
            <strong className="text-white">uniquement virement bancaire via Mollie</strong> (aucune carte sur ce produit).
          </p>
          <form onSubmit={handleCreateDevisDo} className="bg-[#252525] rounded-xl p-6 border border-gray-700 space-y-4 max-w-xl mb-10">
            {data.devisDoLeads && data.devisDoLeads.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Préremplir depuis une demande</label>
                <select
                  value={devisDoForm.leadId}
                  onChange={(e) => {
                    const leadId = e.target.value
                    setDevisDoForm((f) => {
                      const next = { ...f, leadId }
                      if (!leadId) return next
                      const lead = data.devisDoLeads?.find((l) => l.id === leadId)
                      if (!lead) return next
                      const matchingUser = data.users.find((u) => u.email.toLowerCase() === lead.email.toLowerCase())
                      const tarif = lead.coutTotal && lead.coutTotal > 0 ? calculerTarifDommageOuvrage(lead.coutTotal) : null
                      let adresseOp = ""
                      let tel = ""
                      let typeConstruction = ""
                      let destination = ""
                      let closCouvert = ""
                      try {
                        const leadData = JSON.parse(lead.data || "{}") as {
                          adresseConstruction?: string
                          codePostalConstruction?: string
                          villeConstruction?: string
                          telephone?: string
                          typeOuvrage?: string
                          destinationConstruction?: string
                          operationClosCouvert?: boolean
                        }
                        adresseOp = [leadData.adresseConstruction, leadData.codePostalConstruction, leadData.villeConstruction].filter(Boolean).join(" ") || ""
                        tel = leadData.telephone || ""
                        typeConstruction = mapTypeOuvrageToConstruction(leadData.typeOuvrage)
                        destination = mapDestinationConstruction(leadData.destinationConstruction)
                        closCouvert = leadData.operationClosCouvert === true ? "oui" : leadData.operationClosCouvert === false ? "non" : ""
                      } catch {
                        /* ignore */
                      }
                      return {
                        ...next,
                        userId: matchingUser?.id ?? "",
                        coutConstruction: lead.coutTotal ? String(lead.coutTotal) : "",
                        primeAnnuelle: tarif ? String(tarif.primeAnnuelle) : f.primeAnnuelle,
                        adresseOperation: adresseOp || f.adresseOperation,
                        telephone: tel || f.telephone,
                        typeConstruction: typeConstruction || f.typeConstruction,
                        destination: destination || f.destination,
                        closCouvert: closCouvert || f.closCouvert,
                      }
                    })
                  }}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">— Aucune —</option>
                  {data.devisDoLeads.map((l) => {
                    const match = data.users.find((u) => u.email.toLowerCase() === l.email.toLowerCase())
                    return (
                      <option key={l.id} value={l.id}>
                        {l.email} — {l.coutTotal ? `${l.coutTotal.toLocaleString("fr-FR")} €` : "—"} {match ? "✓" : ""}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Client (doit avoir un compte)</label>
              <select
                value={devisDoForm.userId}
                onChange={(e) => setDevisDoForm((f) => ({ ...f, userId: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="">Sélectionner...</option>
                {filterUsersBySearch(data.users, searchQuery).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.raisonSociale || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Prime annuelle (€)</label>
                <input
                  type="number"
                  value={devisDoForm.primeAnnuelle}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, primeAnnuelle: e.target.value }))}
                  required
                  min={1}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Coût construction (€)</label>
                <input
                  type="number"
                  value={devisDoForm.coutConstruction}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, coutConstruction: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Téléphone du souscripteur</label>
              <input
                type="tel"
                value={devisDoForm.telephone}
                onChange={(e) => setDevisDoForm((f) => ({ ...f, telephone: e.target.value }))}
                placeholder="Optionnel"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Adresse de l&apos;opération</label>
              <input
                type="text"
                value={devisDoForm.adresseOperation}
                onChange={(e) => setDevisDoForm((f) => ({ ...f, adresseOperation: e.target.value }))}
                placeholder="Optionnel"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Type de construction</label>
                <select
                  value={devisDoForm.typeConstruction}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, typeConstruction: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">—</option>
                  <option value="Maison unifamiliale">Maison unifamiliale</option>
                  <option value="Maison jumelée">Maison jumelée</option>
                  <option value="Immeuble logements">Immeuble logements</option>
                  <option value="Construction neuve">Construction neuve</option>
                  <option value="Extension">Extension</option>
                  <option value="Rénovation">Rénovation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Clos et couvert</label>
                <select
                  value={devisDoForm.closCouvert}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, closCouvert: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">—</option>
                  <option value="oui">Oui</option>
                  <option value="non">Non</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Destination</label>
              <select
                value={devisDoForm.destination}
                onChange={(e) => setDevisDoForm((f) => ({ ...f, destination: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="">—</option>
                <option value="Usage personnel">Usage personnel</option>
                <option value="Location">Location</option>
                <option value="Vente">Vente</option>
                <option value="Exploitation directe">Exploitation directe</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Frais de gestion (€)</label>
                <input
                  type="number"
                  value={devisDoForm.fraisGestion}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, fraisGestion: e.target.value }))}
                  placeholder="0"
                  min={0}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Frais de courtage (€)</label>
                <input
                  type="number"
                  value={devisDoForm.fraisCourtage}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, fraisCourtage: e.target.value }))}
                  placeholder="0"
                  min={0}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={devisDoSubmitting}
              className="bg-[#2563eb] text-white px-6 py-2 rounded-xl hover:bg-[#1d4ed8] disabled:opacity-50 font-medium"
            >
              {devisDoSubmitting ? "Création..." : "Ajouter le devis à l'espace client"}
            </button>
          </form>
        </section>

        {/* Demandes devis DO en attente */}
        {data.devisRcFabriquantLeads && data.devisRcFabriquantLeads.length > 0 && (
          <section id="rc-fabriquant-leads" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-white mb-2">Demandes RC Fabriquant</h2>
            <p className="text-sm text-gray-200 mb-4 max-w-3xl">
              Statut et notes sont visibles uniquement en gestion. Aucun refus ni tarif n’est communiqué automatiquement au
              prospect — tout passe par votre action. Vous pouvez créer l’espace client puis lancer un dossier étude natif
              (devis + contrat + attestation selon paiement) directement depuis cette table.
            </p>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 sm:p-4 font-medium">Email</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Société</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden lg:table-cell">Activité</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Statut</th>
                    <th className="text-left p-3 sm:p-4 font-medium min-w-[200px]">Notes internes</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">Reçu</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Suivi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devisRcFabriquantLeads.map((d) => {
                    const leadData = parseRcFabLeadData(d.data || "{}")
                    const rs = leadData.raisonSociale || ""
                    const act = leadData.activiteFabrication || ""
                    const draft = getRcFabLeadDraft(d, rcFabDrafts)
                    const serverSt = normalizeRcFabriquantLeadStatut(d.statut)
                    const serverNotes = d.notesInternes ?? ""
                    const dirty =
                      draft.statut !== serverSt || draft.notes.trim() !== serverNotes.trim()
                    const matchedUser =
                      d.userId && d.userId.trim().length > 0
                        ? data.users.find((u) => u.id === d.userId) ?? null
                        : data.users.find((u) => u.email.toLowerCase() === d.email.toLowerCase()) ?? null
                    const propositionCopy = d.copyTrace?.proposition
                    const signatureCopy = d.copyTrace?.signature
                    const leadAgeHours = typeof d.slaHours === "number" ? d.slaHours : null
                    const leadSla = leadAgeHours != null ? getSlaBadge(leadAgeHours) : null
                    return (
                      <tr key={d.id} className="border-b border-gray-700/50 align-top">
                        <td className="p-3 sm:p-4">{d.email}</td>
                        <td className="p-3 sm:p-4">{rs || "—"}</td>
                        <td className="p-3 sm:p-4 hidden lg:table-cell max-w-[220px]">
                          <span className="line-clamp-3" title={act}>
                            {act || "—"}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4">
                          <select
                            value={draft.statut}
                            onChange={(e) =>
                              setRcFabDrafts((p) => ({
                                ...p,
                                [d.id]: { ...getRcFabLeadDraft(d, p), statut: e.target.value },
                              }))
                            }
                            className="w-full max-w-[11rem] rounded-lg border border-gray-600 bg-[#1a1a1a] text-gray-100 px-2 py-2 text-xs sm:text-sm"
                            aria-label={`Statut pour ${d.email}`}
                          >
                            {RC_FABRIQUANT_LEAD_STATUT_VALUES.map((v) => (
                              <option key={v} value={v}>
                                {RC_FABRIQUANT_LEAD_STATUT_LABELS[v]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 sm:p-4">
                          <textarea
                            value={draft.notes}
                            onChange={(e) =>
                              setRcFabDrafts((p) => ({
                                ...p,
                                [d.id]: { ...getRcFabLeadDraft(d, p), notes: e.target.value },
                              }))
                            }
                            rows={2}
                            placeholder="Mémo interne…"
                            className="w-full min-w-[180px] rounded-lg border border-gray-600 bg-[#1a1a1a] text-gray-100 px-2 py-2 text-xs sm:text-sm placeholder:text-gray-500"
                            aria-label={`Notes internes pour ${d.email}`}
                          />
                        </td>
                        <td className="p-3 sm:p-4 hidden sm:table-cell whitespace-nowrap text-gray-200">
                          <div className="flex flex-col gap-1">
                            <span>{new Date(d.createdAt).toLocaleDateString("fr-FR")}</span>
                            {leadSla ? (
                              <span
                                className={`inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded w-fit ${leadSla.className}`}
                              >
                                {leadSla.label} ({leadAgeHours}h)
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex flex-col gap-2 max-w-[11rem]">
                            <button
                              type="button"
                              disabled={!dirty || rcFabSavingId === d.id}
                              onClick={async () => {
                                const cur = getRcFabLeadDraft(d, rcFabDrafts)
                                setRcFabSavingId(d.id)
                                try {
                                  const res = await fetch(`/api/gestion/rc-fabriquant-lead/${d.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      statut: cur.statut,
                                      notesInternes: cur.notes.trim() === "" ? null : cur.notes.trim(),
                                    }),
                                  })
                                  const json = await readResponseJson<{ error?: string }>(res)
                                  if (!res.ok) throw new Error(json.error || "Erreur")
                                  setRcFabDrafts((p) => {
                                    const next = { ...p }
                                    delete next[d.id]
                                    return next
                                  })
                                  setToast({ message: "Suivi RC Fabriquant enregistré", type: "success" })
                                  const dashRes = await fetch("/api/gestion/dashboard")
                                  if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                                } catch (err) {
                                  setToast({
                                    message: err instanceof Error ? err.message : "Erreur",
                                    type: "error",
                                  })
                                } finally {
                                  setRcFabSavingId(null)
                                }
                              }}
                              className="text-sm font-medium min-h-[44px] px-3 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-600 disabled:opacity-40 disabled:pointer-events-none"
                            >
                              {rcFabSavingId === d.id ? "…" : "Enregistrer"}
                            </button>
                            <button
                              type="button"
                              disabled={
                                normalizeRcFabriquantLeadStatut(d.statut) === "refuse" ||
                                rcFabEtudeSubmitting
                              }
                              title={
                                matchedUser
                                  ? "Créer un devis étude RC Fabriquant avec signature électronique"
                                  : "Créez d’abord l’espace client"
                              }
                              onClick={() => {
                                if (!matchedUser) return
                                const defaultPrime =
                                  d.primeProposee != null && d.primeProposee > 0
                                    ? Math.round(d.primeProposee * 100) / 100
                                    : 0
                                const defaultPrimeHt =
                                  defaultPrime > 0 ? Math.round((defaultPrime / 1.2) * 100) / 100 : 0
                                setRcFabEtudeModal({
                                  leadId: d.id,
                                  userId: matchedUser.id,
                                  email: d.email,
                                  raisonSociale: rs || d.email,
                                  devisReference: `RCFAB-${d.id.slice(-8).toUpperCase()}`,
                                  primeAnnuelleTtc: defaultPrime > 0 ? String(defaultPrime) : "",
                                  primeAnnuelleHt: defaultPrimeHt > 0 ? String(defaultPrimeHt) : "",
                                  periodicite: "trimestriel",
                                  produitLabel: "RC Fabriquant — étude personnalisée",
                                })
                              }}
                              className="text-sm font-medium min-h-[44px] px-3 py-2 rounded-lg border border-emerald-500/70 text-emerald-100 hover:bg-emerald-900/40 disabled:opacity-40 disabled:pointer-events-none"
                            >
                              Créer dossier étude
                            </button>
                            <button
                              type="button"
                              disabled={
                                normalizeRcFabriquantLeadStatut(d.statut) === "refuse" ||
                                rcFabPropositionSubmitting
                              }
                              title={
                                normalizeRcFabriquantLeadStatut(d.statut) === "refuse"
                                  ? "Lead refusé — pas d’envoi"
                                  : "Envoyer l’e-mail de proposition au prospect"
                              }
                              onClick={() => {
                                setRcFabPropositionPrime(
                                  d.primeProposee != null && d.primeProposee > 0
                                    ? String(d.primeProposee)
                                    : ""
                                )
                                setRcFabPropositionMessage("")
                                setRcFabPropositionModal({
                                  id: d.id,
                                  email: d.email,
                                  raisonSociale: rs || d.email,
                                })
                              }}
                              className="text-sm font-medium min-h-[44px] px-3 py-2 rounded-lg border border-teal-500/70 text-teal-100 hover:bg-teal-900/40 disabled:opacity-40 disabled:pointer-events-none"
                            >
                              E-mail proposition
                            </button>
                            {matchedUser ? (
                              <Link
                                href={`/gestion/clients/${matchedUser.id}`}
                                className="text-sm font-medium min-h-[44px] px-3 py-2 rounded-lg border border-[#2563eb]/60 text-[#93c5fd] hover:bg-[#2563eb]/20 inline-flex items-center justify-center"
                              >
                                Fiche client
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const res = await fetch("/api/gestion/users/create-from-lead", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ leadId: d.id, leadType: "rc_fabriquant" }),
                                    })
                                    const json = await readResponseJson<{ error?: string; email?: string }>(res)
                                    if (!res.ok) throw new Error(json.error || "Erreur")
                                    setToast({
                                      message: `Espace client créé pour ${json.email || d.email}`,
                                      type: "success",
                                    })
                                    const dashRes = await fetch("/api/gestion/dashboard")
                                    if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                                  } catch (err) {
                                    setToast({
                                      message: err instanceof Error ? err.message : "Erreur",
                                      type: "error",
                                    })
                                  }
                                }}
                                className="text-sm font-medium min-h-[44px] px-3 py-2 rounded-lg border border-sky-500/70 text-sky-200 hover:bg-sky-900/30"
                              >
                                Créer espace client
                              </button>
                            )}
                            {(propositionCopy || signatureCopy) && (
                              <div className="pt-1 text-[11px] text-gray-300 space-y-1">
                                {propositionCopy ? (
                                  <p>
                                    Copie proposition :{" "}
                                    <span className={propositionCopy.copySent ? "text-emerald-300" : "text-amber-300"}>
                                      {propositionCopy.copySent ? "envoyée" : "non envoyée"}
                                    </span>{" "}
                                    ({new Date(propositionCopy.sentAt).toLocaleDateString("fr-FR")})
                                  </p>
                                ) : null}
                                {signatureCopy ? (
                                  <p>
                                    Copie signature :{" "}
                                    <span className={signatureCopy.copySent ? "text-emerald-300" : "text-amber-300"}>
                                      {signatureCopy.copySent ? "envoyée" : "non envoyée"}
                                    </span>{" "}
                                    ({new Date(signatureCopy.sentAt).toLocaleDateString("fr-FR")})
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data.devisDoLeads && data.devisDoLeads.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Demandes devis dommage ouvrage (en attente)</h2>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 sm:p-4 font-medium">Email</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Coût</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">Date</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Client</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devisDoLeads.map((d) => {
                    const matchingUser = data.users.find((u) => u.email.toLowerCase() === d.email.toLowerCase())
                    return (
                      <tr key={d.id} className="border-b border-gray-700/50">
                        <td className="p-3 sm:p-4">{d.email}</td>
                        <td className="p-3 sm:p-4">{d.coutTotal ? `${d.coutTotal.toLocaleString("fr-FR")} €` : "—"}</td>
                        <td className="p-3 sm:p-4 hidden sm:table-cell">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="p-3 sm:p-4">
                          {matchingUser ? (
                            <span className="text-green-400">✓ Compte existant</span>
                          ) : (
                            <span className="text-sky-400">Créer le compte</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4">
                          {!matchingUser ? (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const res = await fetch("/api/gestion/users/create-from-lead", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ leadId: d.id }),
                                  })
                                  const json = await readResponseJson<{ error?: string; email?: string }>(res)
                                  if (!res.ok) throw new Error(json.error || "Erreur")
                                  setToast({ message: `Compte créé pour ${json.email}`, type: "success" })
                                  const dashRes = await fetch("/api/gestion/dashboard")
                                  if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                                } catch (err) {
                                  setToast({ message: err instanceof Error ? err.message : "Erreur", type: "error" })
                                }
                              }}
                              className="text-sm text-[#2563eb] hover:text-[#1d4ed8] font-medium min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-2 -m-1"
                            >
                              Créer le compte
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Avenants */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Créer un avenant</h2>
          <form onSubmit={handleCreateAvenant} className="bg-[#252525] rounded-xl p-6 border border-gray-700 space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Client (userId)</label>
              <select
                value={avenantForm.userId}
                onChange={(e) => setAvenantForm((f) => ({ ...f, userId: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="">Sélectionner...</option>
                {filterUsersBySearch(data.users, searchQuery).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.raisonSociale || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">N° contrat</label>
              <select
                value={avenantForm.contractNumero}
                onChange={(e) => setAvenantForm((f) => ({ ...f, contractNumero: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="">Sélectionner...</option>
                {contrats.filter((c) => !avenantForm.userId || c.userId === avenantForm.userId).map((c) => (
                  <option key={c.id} value={c.numero}>{c.numero}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Nouveau CA (€)</label>
                <input
                  type="number"
                  value={avenantForm.chiffreAffaires}
                  onChange={(e) => setAvenantForm((f) => ({ ...f, chiffreAffaires: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Nouvelle prime (€)</label>
                <input
                  type="number"
                  value={avenantForm.primeAnnuelle}
                  onChange={(e) => setAvenantForm((f) => ({ ...f, primeAnnuelle: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Nouvelles activités (séparées par des virgules)</label>
              <input
                type="text"
                value={avenantForm.activites}
                onChange={(e) => setAvenantForm((f) => ({ ...f, activites: e.target.value }))}
                placeholder="Optionnel"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Motif</label>
              <input
                type="text"
                value={avenantForm.motif}
                onChange={(e) => setAvenantForm((f) => ({ ...f, motif: e.target.value }))}
                placeholder="Modification contractuelle"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <p className="text-sm text-sky-400/90">
              Frais d&apos;avenant : 60 € — reportés automatiquement sur la prochaine échéance de prélèvement.
            </p>
            <button
              type="submit"
              disabled={avenantSubmitting}
              className="bg-[#2563eb] text-white px-6 py-2 rounded-xl hover:bg-[#1d4ed8] disabled:opacity-50 font-medium"
            >
              {avenantSubmitting ? "Création..." : "Créer l'avenant"}
            </button>
          </form>
        </section>

        {/* Liste des avenants - historique par client */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Historique des avenants</h2>
          <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 font-medium">N° avenant</th>
                  <th className="text-left p-4 font-medium">Client</th>
                  <th className="text-left p-4 font-medium">Contrat modifié</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterBySearch(data.documents.filter((d) => d.type === "avenant"), searchQuery).length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-gray-200">Aucun avenant</td></tr>
                ) : (
                  filterBySearch(data.documents.filter((d) => d.type === "avenant"), searchQuery)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((d) => {
                      let avenantData: { contractNumero?: string } = {}
                      if (d.data) {
                        try {
                          avenantData = JSON.parse(d.data) as { contractNumero?: string }
                        } catch {
                          /* ignore */
                        }
                      }
                      return (
                        <tr key={d.id} className="border-b border-gray-700/50">
                          <td className="p-4 font-mono">{d.numero}</td>
                          <td className="p-4">{d.user.raisonSociale || d.user.email}</td>
                          <td className="p-4 font-mono text-gray-200">{avenantData.contractNumero || "—"}</td>
                          <td className="p-4">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                          <td className="p-4">
                            <button
                              onClick={() => openEditModal(d)}
                              className="text-sky-400 hover:text-sky-300 text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Modifier
                            </button>
                          </td>
                        </tr>
                      )
                    })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Historique des résiliations */}
        {data?.adminActivityLogs && data.adminActivityLogs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Journal d&apos;audit admin (100 derniers)</h2>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Admin</th>
                    <th className="text-left p-4 font-medium">Action</th>
                    <th className="text-left p-4 font-medium">Cible</th>
                  </tr>
                </thead>
                <tbody>
                  {data.adminActivityLogs.map((l) => (
                    <tr key={l.id} className="border-b border-gray-700/50">
                      <td className="p-4">{new Date(l.createdAt).toLocaleString("fr-FR")}</td>
                      <td className="p-4 text-gray-200">{l.adminEmail}</td>
                      <td className="p-4">{l.action}</td>
                      <td className="p-4 text-gray-200">{l.targetType} {l.targetId ? `#${l.targetId.slice(-6)}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data?.resiliationLogs && data.resiliationLogs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Historique des résiliations</h2>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Document</th>
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-left p-4 font-medium">Admin</th>
                    <th className="text-left p-4 font-medium">Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {data.resiliationLogs.map((r) => (
                    <tr key={r.id} className="border-b border-gray-700/50">
                      <td className="p-4">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-4 font-mono">{r.document.numero} ({r.document.type})</td>
                      <td className="p-4">{r.document.user.raisonSociale || r.document.user.email}</td>
                      <td className="p-4 text-gray-200">{r.adminEmail}</td>
                      <td className="p-4 text-gray-200">{r.motif || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Modal modification contrat / avenant — données alignées sur le JSON contrat / PDF */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-6 px-2" onClick={() => setEditModal(null)}>
          <div
            className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-3xl w-full mx-2 my-auto max-h-[92vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="edit-contrat-title"
          >
            <h3 id="edit-contrat-title" className="text-lg font-semibold text-white mb-1">
              Modifier {editModal.type === "contrat" ? "le contrat" : "l'avenant"}{" "}
              <span className="font-mono text-sky-300">{editModal.numero}</span>
            </h3>
            <p className="text-xs text-gray-200 mb-6 leading-relaxed">
              Les montants laissés vides ne sont pas modifiés. Les champs texte vident effacent la valeur dans le dossier
              (assuré, adresse, etc.). Les activités : saisir la <strong className="text-gray-200">liste complète</strong> à
              chaque enregistrement (séparées par des virgules).
            </p>

            <div className="space-y-6 mb-6 text-sm">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-400/90 mb-3">Identité assuré</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-gray-200 mb-1">Raison sociale</label>
                    <input
                      value={editModal.form.raisonSociale}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, raisonSociale: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">SIRET</label>
                    <input
                      value={editModal.form.siret}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, siret: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Civilité</label>
                    <select
                      value={editModal.form.civilite || ""}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, civilite: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">—</option>
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Société">Société</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-gray-200 mb-1">Représentant légal</label>
                    <input
                      value={editModal.form.representantLegal}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, representantLegal: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-400/90 mb-3">Coordonnées</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-200 mb-1">Email</label>
                    <input
                      type="email"
                      autoComplete="off"
                      value={editModal.form.email}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, email: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Téléphone</label>
                    <input
                      value={editModal.form.telephone}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, telephone: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-gray-200 mb-1">Adresse</label>
                    <input
                      value={editModal.form.adresse}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, adresse: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Code postal</label>
                    <input
                      value={editModal.form.codePostal}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, codePostal: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Ville</label>
                    <input
                      value={editModal.form.ville}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, ville: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-400/90 mb-3">Montants & garanties (€)</h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-200 mb-1">Chiffre d&apos;affaires</label>
                    <input
                      inputMode="decimal"
                      value={editModal.form.chiffreAffaires}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, chiffreAffaires: e.target.value } } : m))}
                      placeholder="inchangé si vide"
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Prime annuelle</label>
                    <input
                      inputMode="decimal"
                      value={editModal.form.primeAnnuelle}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, primeAnnuelle: e.target.value } } : m))}
                      placeholder="inchangé si vide"
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Prime mensuelle</label>
                    <input
                      inputMode="decimal"
                      value={editModal.form.primeMensuelle}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, primeMensuelle: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Prime trimestrielle</label>
                    <input
                      inputMode="decimal"
                      value={editModal.form.primeTrimestrielle}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, primeTrimestrielle: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Franchise</label>
                    <input
                      inputMode="decimal"
                      value={editModal.form.franchise}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, franchise: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Plafond garantie</label>
                    <input
                      inputMode="decimal"
                      value={editModal.form.plafond}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, plafond: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-400/90 mb-3">Paiement</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-200 mb-1">Mode</label>
                    <select
                      value={editModal.form.modePaiement || ""}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, modePaiement: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">— inchangé —</option>
                      <option value="unique">Paiement unique</option>
                      <option value="prelevement">Prélèvement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Périodicité prélèvement</label>
                    <input
                      value={editModal.form.periodicitePrelevement}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, periodicitePrelevement: e.target.value } } : m))}
                      placeholder="ex. trimestriel"
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Frais gestion (€)</label>
                    <input
                      inputMode="decimal"
                      value={editModal.form.fraisGestionPrelevement}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, fraisGestionPrelevement: e.target.value } } : m))}
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-400/90 mb-3">Activités garanties</h4>
                <textarea
                  rows={3}
                  value={editModal.form.activites}
                  onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, activites: e.target.value } } : m))}
                  placeholder="Ex. Plomberie, Chauffage, Zinguerie (liste complète, séparée par des virgules)"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500"
                />
              </div>

              {editModal.type === "avenant" && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-400/90 mb-3">Avenant</h4>
                  <label className="block text-gray-200 mb-1">Motif de l&apos;avenant</label>
                  <textarea
                    rows={2}
                    value={editModal.form.motifAvenant}
                    onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, motifAvenant: e.target.value } } : m))}
                    placeholder="Modification contractuelle, extension d'activité…"
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-400/90 mb-3">Période de couverture</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-200 mb-1">Date d&apos;effet</label>
                    <input
                      value={editModal.form.dateEffet}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, dateEffet: e.target.value } } : m))}
                      placeholder="JJ/MM/AAAA"
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-200 mb-1">Date d&apos;échéance</label>
                    <input
                      value={editModal.form.dateEcheance}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, form: { ...m.form, dateEcheance: e.target.value } } : m))}
                      placeholder="JJ/MM/AAAA"
                      className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editSubmitting}
                className="px-5 py-2 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 font-medium"
              >
                {editSubmitting ? "Enregistrement…" : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal autorisation annulation / résiliation */}
      {resiliationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setResiliationModal(null)}>
          <div className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Autoriser l&apos;annulation</h3>
            <p className="text-sm text-gray-200 mb-4">
              Le document sera marqué comme résilié. Un email de confirmation sera envoyé au client.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-200 mb-2">Motif (optionnel)</label>
              <input
                type="text"
                value={resiliationModal.motif}
                onChange={(e) => setResiliationModal((m) => m ? { ...m, motif: e.target.value } : m)}
                placeholder="Ex. demande client, fin d'activité..."
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setResiliationModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={() => handleStatusChange(resiliationModal.docId, "resilie", resiliationModal.motif)}
                className="px-4 py-2 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
              >
                Confirmer la résiliation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal proposition RC Fabriquant (e-mail au prospect) */}
      {rcFabEtudeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            if (!rcFabEtudeSubmitting) setRcFabEtudeModal(null)
          }}
        >
          <div
            className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Créer dossier étude RC Fabriquant</h3>
            <p className="text-sm text-gray-200 mb-4">
              <strong>{rcFabEtudeModal.raisonSociale}</strong> — {rcFabEtudeModal.email}
            </p>
            <p className="text-xs text-gray-200 mb-4 leading-relaxed">
              Ce module génère automatiquement le <strong>devis RC Fabriquant</strong>, envoie la signature
              électronique, puis crée le <strong>contrat</strong> à la signature. L&apos;attestation sera disponible
              après paiement.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Référence dossier</label>
                <input
                  value={rcFabEtudeModal.devisReference}
                  onChange={(e) =>
                    setRcFabEtudeModal((m) => (m ? { ...m, devisReference: e.target.value } : m))
                  }
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="RCFAB-1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Périodicité</label>
                <select
                  value={rcFabEtudeModal.periodicite}
                  onChange={(e) =>
                    setRcFabEtudeModal((m) =>
                      m
                        ? {
                            ...m,
                            periodicite: e.target.value as
                              | "mensuel"
                              | "trimestriel"
                              | "semestriel"
                              | "annuel",
                          }
                        : m
                    )
                  }
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="mensuel">Mensuel (12 échéances)</option>
                  <option value="trimestriel">Trimestriel (4 échéances)</option>
                  <option value="semestriel">Semestriel (2 échéances)</option>
                  <option value="annuel">Annuel (1 échéance)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Prime annuelle TTC (€)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={rcFabEtudeModal.primeAnnuelleTtc}
                  onChange={(e) =>
                    setRcFabEtudeModal((m) => (m ? { ...m, primeAnnuelleTtc: e.target.value } : m))
                  }
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Ex. 2400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Prime annuelle HT (€) <span className="text-gray-400 font-normal">optionnel</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={rcFabEtudeModal.primeAnnuelleHt}
                  onChange={(e) =>
                    setRcFabEtudeModal((m) => (m ? { ...m, primeAnnuelleHt: e.target.value } : m))
                  }
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Ex. 2000"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-200 mb-2">Libellé produit (email)</label>
              <input
                value={rcFabEtudeModal.produitLabel}
                onChange={(e) =>
                  setRcFabEtudeModal((m) => (m ? { ...m, produitLabel: e.target.value } : m))
                }
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="RC Fabriquant — étude personnalisée"
              />
            </div>

            <div className="flex flex-wrap gap-3 justify-end mt-6">
              <button
                type="button"
                disabled={rcFabEtudeSubmitting}
                onClick={() => setRcFabEtudeModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={
                  rcFabEtudeSubmitting ||
                  Number(rcFabEtudeModal.primeAnnuelleTtc.replace(",", ".")) <= 0
                }
                onClick={async () => {
                  if (!rcFabEtudeModal) return
                  const primeTtc = Number(rcFabEtudeModal.primeAnnuelleTtc.replace(",", "."))
                  if (!Number.isFinite(primeTtc) || primeTtc <= 0) {
                    setToast({ message: "Prime annuelle TTC invalide", type: "error" })
                    return
                  }
                  const primeHtTrim = rcFabEtudeModal.primeAnnuelleHt.trim()
                  const primeHt =
                    primeHtTrim.length > 0 ? Number(primeHtTrim.replace(",", ".")) : undefined
                  if (primeHt != null && (!Number.isFinite(primeHt) || primeHt <= 0)) {
                    setToast({ message: "Prime annuelle HT invalide", type: "error" })
                    return
                  }
                  setRcFabEtudeSubmitting(true)
                  try {
                    const res = await fetch("/api/gestion/sign/send-rc-fabriquant-etude", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        leadId: rcFabEtudeModal.leadId,
                        userId: rcFabEtudeModal.userId,
                        devisReference: rcFabEtudeModal.devisReference.trim(),
                        primeAnnuelleTtc: primeTtc,
                        ...(primeHt != null ? { primeAnnuelleHt: primeHt } : {}),
                        periodicite: rcFabEtudeModal.periodicite,
                        produitLabel: rcFabEtudeModal.produitLabel.trim() || undefined,
                        afterSignNextPath: "/espace-client",
                      }),
                    })
                    const json = await readResponseJson<{ error?: string; message?: string }>(res)
                    if (!res.ok) throw new Error(json.error || "Erreur")
                    setToast({
                      message: json.message || "Dossier étude RC Fabriquant envoyé en signature.",
                      type: "success",
                    })
                    setRcFabEtudeModal(null)
                    const dashRes = await fetch("/api/gestion/dashboard")
                    if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                  } catch (err) {
                    setToast({ message: err instanceof Error ? err.message : "Erreur", type: "error" })
                  } finally {
                    setRcFabEtudeSubmitting(false)
                  }
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 font-medium"
              >
                {rcFabEtudeSubmitting ? "Création…" : "Créer et envoyer la signature"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rcFabPropositionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            if (!rcFabPropositionSubmitting) {
              setRcFabPropositionModal(null)
              setRcFabPropositionMessage("")
              setRcFabPropositionPrime("")
            }
          }}
        >
          <div
            className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Proposition RC Fabriquant par e-mail</h3>
            <p className="text-sm text-gray-200 mb-4">
              <strong>{rcFabPropositionModal.raisonSociale}</strong> — {rcFabPropositionModal.email}
            </p>
            <p className="text-xs text-gray-200 mb-4 leading-relaxed">
              Rédigez le corps du message tel qu’il sera lu par le prospect (conditions, prochaines étapes, pièces à
              fournir…). Le statut du lead passera à « Proposition envoyée » et l’indication de prime sera mémorisée si
              vous en saisissez une. Réponse directe : l’e-mail part avec votre adresse en reply-to si elle est connue.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Prime annuelle indicative (€) <span className="text-gray-200 font-normal">— optionnel</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={rcFabPropositionPrime}
                onChange={(e) => setRcFabPropositionPrime(e.target.value)}
                placeholder="Ex. 2400"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-200 mb-2">Message au client (min. 20 caractères)</label>
              <textarea
                rows={8}
                value={rcFabPropositionMessage}
                onChange={(e) => setRcFabPropositionMessage(e.target.value)}
                placeholder="Bonjour, suite à l’analyse de votre dossier…"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                disabled={rcFabPropositionSubmitting}
                onClick={() => {
                  setRcFabPropositionModal(null)
                  setRcFabPropositionMessage("")
                  setRcFabPropositionPrime("")
                }}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={
                  rcFabPropositionSubmitting ||
                  rcFabPropositionMessage.trim().length < 20
                }
                onClick={async () => {
                  if (!rcFabPropositionModal) return
                  setRcFabPropositionSubmitting(true)
                  try {
                    const primeTrim = rcFabPropositionPrime.trim()
                    const body: {
                      leadId: string
                      messagePersonnalise: string
                      primeAnnuelle?: number
                    } = {
                      leadId: rcFabPropositionModal.id,
                      messagePersonnalise: rcFabPropositionMessage.trim(),
                    }
                    if (primeTrim !== "") {
                      const p = Number(primeTrim.replace(",", "."))
                      if (Number.isFinite(p) && p > 0) body.primeAnnuelle = p
                    }
                    const res = await fetch("/api/gestion/rc-fabriquant-lead/proposition", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    })
                    const json = await readResponseJson<{ error?: string }>(res)
                    if (!res.ok) throw new Error(json.error || "Erreur")
                    setToast({ message: "E-mail de proposition envoyé au prospect.", type: "success" })
                    setRcFabPropositionModal(null)
                    setRcFabPropositionMessage("")
                    setRcFabPropositionPrime("")
                    const dashRes = await fetch("/api/gestion/dashboard")
                    if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                  } catch (err) {
                    setToast({ message: err instanceof Error ? err.message : "Erreur", type: "error" })
                  } finally {
                    setRcFabPropositionSubmitting(false)
                  }
                }}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50 font-medium"
              >
                {rcFabPropositionSubmitting ? "Envoi…" : "Envoyer l’e-mail"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal remise personnalisée étude */}
      {etudeMiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEtudeMiseModal(null)}>
          <div className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Faire une remise au client</h3>
            <p className="text-sm text-gray-200 mb-4">
              {etudeMiseModal.raisonSociale || etudeMiseModal.email} — Envoyez une proposition avec prime personnalisée. Le client recevra un email avec un lien pour finaliser sa souscription.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-200 mb-2">Prime annuelle personnalisée (€)</label>
              <input
                type="number"
                value={etudeMiseModal.primeAnnuelle}
                onChange={(e) => setEtudeMiseModal((m) => m ? { ...m, primeAnnuelle: e.target.value } : m)}
                placeholder="Ex. 1200"
                min={1}
                required
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEtudeMiseModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  const prime = Number(etudeMiseModal.primeAnnuelle)
                  if (!prime || prime <= 0) return
                  setEtudeMiseSubmitting(true)
                  try {
                    const res = await fetch("/api/gestion/etude/remise", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ etudeLeadId: etudeMiseModal.id, primeAnnuelle: prime }),
                    })
                    const json = await readResponseJson<{ error?: string }>(res)
                    if (!res.ok) throw new Error(json.error || "Erreur")
                    setToast({ message: "Remise envoyée au client par email.", type: "success" })
                    setEtudeMiseModal(null)
                    const dashRes = await fetch("/api/gestion/dashboard")
                    if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                  } catch (err) {
                    setToast({ message: err instanceof Error ? err.message : "Erreur", type: "error" })
                  } finally {
                    setEtudeMiseSubmitting(false)
                  }
                }}
                disabled={etudeMiseSubmitting || !etudeMiseModal.primeAnnuelle || Number(etudeMiseModal.primeAnnuelle) <= 0}
                className="px-4 py-2 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {etudeMiseSubmitting ? "Envoi..." : "Envoyer la remise"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  )
}
