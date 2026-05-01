"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { SkeletonCard, SkeletonDocumentRow } from "@/components/Skeleton"
import { GedUpload } from "@/components/GedUpload"
import { InstallPrompt } from "@/components/InstallPrompt"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import type { InsuranceContractListItem } from "@/lib/insurance-contract-types"
import { PayInsuranceContractButton } from "@/components/insurance/PayInsuranceContractButton"
import { InsuranceContractPdfLinks } from "@/components/insurance/InsuranceContractPdfLinks"
import { primeTrimestrielle } from "@/lib/premium"

interface DocumentItem {
  id: string
  type: string
  numero: string
  status?: string
  createdAt: string
}

type PendingSignatureItem = {
  signatureRequestId: string
  contractNumero: string
  signatureFlow: "decennale" | "custom_pdf"
  signatureFlowLabel?: string
  createdAt: string
  signatureLink: string
}

type AutonomyStatusAction = {
  id: string
  title: string
  description: string
  href: string
  priority: "high" | "medium" | "low"
}

type AutonomyStatusPayload = {
  pendingSignaturesTotal: number
  pendingSignaturesDecennale: number
  hasDecennaleContract: boolean
  firstDecennalePaymentDone: boolean
  approvedUnpaidContractsCount: number
  suspendedAttestationsCount: number
  sepaSubscription: {
    status: string
    nextSepaDue: string | null
    trimestresSepaPayes: number
    lastError: string | null
  }
    | null
  advisories: string[]
  actions: AutonomyStatusAction[]
}

type DecennaleTimelineState = "done" | "current" | "blocked" | "todo"

type DecennaleTimelineStep = {
  id: string
  title: string
  description: string
  state: DecennaleTimelineState
  href: string
}

type SavedDevisDraftItem = {
  id: string
  token: string
  produit: string
  createdAt: string
  expiresAt: string
  raisonSociale?: string | null
  siret?: string | null
  primeAnnuelle?: number | null
}

type CaRegularisationDraft = {
  contractId: string
  contractNumber: string
  plannedCa: number
  declaredCa: number
  regularisation: number
  newAnnualPremium: number
}

const typeLabels: Record<string, string> = {
  devis: "Devis décennale",
  devis_do: "Devis dommage ouvrage",
  contrat: "Contrat",
  attestation: "Attestation décennale",
  attestation_nominative: "Attestation décennale nominative",
  attestation_do: "Attestation dommage ouvrage",
  attestation_non_sinistralite: "Attestation non sinistralité",
  avenant: "Avenant",
  facture_do: "Facture acquittée DO",
  facture_decennale: "Facture acquittée décennale",
}

const typeIcons: Record<string, string> = {
  devis: "📋",
  devis_do: "🏗️",
  contrat: "📄",
  attestation: "✅",
  attestation_nominative: "🪪",
  attestation_do: "🏠",
  attestation_non_sinistralite: "📜",
  avenant: "📝",
  facture_do: "🧾",
  facture_decennale: "🧾",
}

function getActionPriorityWeight(priority: AutonomyStatusAction["priority"]): number {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1
}

function pickTopAutonomyAction(actions: AutonomyStatusAction[]): AutonomyStatusAction | null {
  if (!actions.length) return null
  const sorted = [...actions].sort((a, b) => getActionPriorityWeight(b.priority) - getActionPriorityWeight(a.priority))
  return sorted.find((action) => action.id !== "autonomy-ok") ?? null
}

function buildDecennaleTimeline(status: AutonomyStatusPayload): DecennaleTimelineStep[] {
  const pendingSignature = status.pendingSignaturesDecennale > 0
  const hasDecennaleJourney = status.hasDecennaleContract || pendingSignature || status.firstDecennalePaymentDone
  const sepaStatus = status.sepaSubscription?.status ?? null
  const sepaBlocked = sepaStatus === "pending_mandate" || sepaStatus === "failed"
  const paymentDone = status.firstDecennalePaymentDone
  const paymentStepOpen = hasDecennaleJourney && !pendingSignature && !paymentDone

  const hrefFor = (actionId: string, fallback: string) =>
    status.actions.find((action) => action.id === actionId && action.href.trim().length > 0)?.href ?? fallback

  return [
    {
      id: "devis",
      title: "Devis et souscription",
      description: "Simulation, validation des informations et création du dossier.",
      state: hasDecennaleJourney ? "done" : "current",
      href: "/devis?from=espace-client",
    },
    {
      id: "signature",
      title: "Signature électronique",
      description: "Signature du contrat décennale pour passer au mandat SEPA.",
      state: pendingSignature ? "current" : hasDecennaleJourney ? "done" : "todo",
      href: hrefFor("resume-signature-decennale", "/signature"),
    },
    {
      id: "sepa",
      title: "Mandat SEPA",
      description: "Validation de l’IBAN pour activer les prélèvements trimestriels.",
      state: paymentDone ? "done" : paymentStepOpen ? (sepaBlocked ? "blocked" : "current") : "todo",
      href: hrefFor("continue-sepa-and-payment", "/mandat-sepa"),
    },
    {
      id: "payment",
      title: "Paiement d’activation",
      description: "Paiement du premier trimestre et des frais de gestion.",
      state: paymentDone ? "done" : paymentStepOpen ? "current" : "todo",
      href: hrefFor("pay-approved-contracts", "#contrats-plateforme"),
    },
    {
      id: "attestation",
      title: "Attestation active",
      description: "Attestation disponible après validation du paiement.",
      state: status.suspendedAttestationsCount > 0 ? "blocked" : paymentDone ? "done" : "todo",
      href:
        status.suspendedAttestationsCount > 0
          ? hrefFor("regularize-suspended-attestation", "/espace-client/regularisation")
          : "/espace-client",
    },
  ]
}

export default function EspaceClientPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [payments, setPayments] = useState<{ id: string; amount: number; status: string; paidAt: string | null; createdAt: string }[]>([])
  const [savedDevisDrafts, setSavedDevisDrafts] = useState<SavedDevisDraftItem[]>([])
  const [pendingSignatures, setPendingSignatures] = useState<PendingSignatureItem[]>([])
  const [autonomyStatus, setAutonomyStatus] = useState<AutonomyStatusPayload | null>(null)
  const [profile, setProfile] = useState<{ adresse?: string; codePostal?: string; ville?: string; telephone?: string; siret?: string } | null>(null)
  const [profileEditing, setProfileEditing] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [summary, setSummary] = useState<{
    documentsCount: number
    attestationsCount: number
    suspendedCount: number
    paymentsCount: number
    paidTotal: number
    lastPayment?: { amount: number; paidAt: string }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"documents" | "paiements" | "profil">("documents")
  const [exportingPdf, setExportingPdf] = useState(false)
  const [insuranceContracts, setInsuranceContracts] = useState<InsuranceContractListItem[]>([])
  const [doEtudeBanner, setDoEtudeBanner] = useState<{ show: boolean; hasSaved: boolean } | null>(null)
  const [caDeclarationByContractId, setCaDeclarationByContractId] = useState<Record<string, string>>({})
  const [caCalcByContractId, setCaCalcByContractId] = useState<Record<string, CaRegularisationDraft | null>>({})
  const [caLoadingContractId, setCaLoadingContractId] = useState<string | null>(null)
  const [caErrorByContractId, setCaErrorByContractId] = useState<Record<string, string | null>>({})
  const [nominativeForm, setNominativeForm] = useState({
    beneficiaireNom: "",
    chantierAdresse: "",
    objetMission: "",
  })
  const [nominativeLoading, setNominativeLoading] = useState(false)
  const [nominativeError, setNominativeError] = useState<string | null>(null)
  const [nominativeSuccess, setNominativeSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return

    const fetchData = async () => {
      try {
        const [docsRes, summaryRes, paymentsRes, insRes, doqRes, draftsRes, pendingSignaturesRes, autonomyStatusRes] = await Promise.all([
          fetch("/api/documents/list"),
          fetch("/api/client/summary"),
          fetch("/api/client/payments"),
          fetch("/api/client/insurance-contracts"),
          fetch("/api/client/do-questionnaire"),
          fetch("/api/client/devis-drafts"),
          fetch("/api/client/pending-signatures"),
          fetch("/api/client/autonomy-status"),
        ])
        if (docsRes.ok) setDocuments(await docsRes.json())
        if (summaryRes.ok) setSummary(await summaryRes.json())
        if (paymentsRes.ok) setPayments(await paymentsRes.json())
        if (insRes.ok) {
          const j = (await insRes.json()) as { contracts?: InsuranceContractListItem[] }
          setInsuranceContracts(Array.isArray(j.contracts) ? j.contracts : [])
        }
        if (doqRes.ok) {
          const dq = (await doqRes.json()) as { hasInitial?: boolean; hasEtudeSaved?: boolean }
          setDoEtudeBanner({ show: !!dq.hasInitial, hasSaved: !!dq.hasEtudeSaved })
        } else {
          setDoEtudeBanner(null)
        }
        if (draftsRes.ok) {
          const draftsPayload = (await draftsRes.json()) as { drafts?: SavedDevisDraftItem[] } | SavedDevisDraftItem[]
          if (Array.isArray(draftsPayload)) {
            setSavedDevisDrafts(draftsPayload)
          } else {
            setSavedDevisDrafts(Array.isArray(draftsPayload.drafts) ? draftsPayload.drafts : [])
          }
        } else {
          setSavedDevisDrafts([])
        }
        if (pendingSignaturesRes.ok) {
          const pendingPayload = (await pendingSignaturesRes.json()) as {
            items?: PendingSignatureItem[]
            pendingSignatures?: PendingSignatureItem[]
          }
          setPendingSignatures(
            Array.isArray(pendingPayload.items)
              ? pendingPayload.items
              : Array.isArray(pendingPayload.pendingSignatures)
                ? pendingPayload.pendingSignatures
                : []
          )
        } else {
          setPendingSignatures([])
        }
        if (autonomyStatusRes.ok) {
          const autonomyPayload = (await autonomyStatusRes.json()) as AutonomyStatusPayload
          setAutonomyStatus(autonomyPayload)
        } else {
          setAutonomyStatus(null)
        }
        const profileRes = await fetch("/api/client/profile")
        if (profileRes.ok) setProfile(await profileRes.json())
      } catch {
        setDocuments([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [status])

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  if (status === "unauthenticated") {
    router.replace("/connexion?callbackUrl=/espace-client")
    return null
  }

  const topAutonomyAction = autonomyStatus ? pickTopAutonomyAction(autonomyStatus.actions) : null
  const decennaleTimeline = autonomyStatus ? buildDecennaleTimeline(autonomyStatus) : []

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />

      <div className="max-w-4xl mx-auto px-6 py-14">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Espace client" }]} />
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[#0a0a0a]">
          Mon espace client
        </h1>
        <p className="text-[#171717] mb-6 text-lg">
          Bienvenue, {session?.user?.name || session?.user?.email}
        </p>

        {!loading && autonomyStatus && (
          <div className="mb-8 rounded-2xl border border-[#0ea5e9]/35 bg-[#f0f9ff] p-6 text-[#0a0a0a]">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-lg">Centre d&apos;autonomie client</h2>
                <p className="text-sm text-[#171717]">
                  Pilotez votre dossier de A à Z sans intervention manuelle.
                </p>
              </div>
              <span className="inline-flex rounded-lg bg-white border border-[#7dd3fc] px-3 py-1.5 text-xs font-semibold text-[#0c4a6e]">
                {autonomyStatus.actions.some((action) => action.priority === "high")
                  ? "Action requise"
                  : "Dossier autonome"}
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl border border-[#bae6fd] bg-white p-3">
                <p className="text-xs text-[#0c4a6e]">Signatures en attente</p>
                <p className="text-xl font-bold text-[#082f49]">{autonomyStatus.pendingSignaturesTotal}</p>
              </div>
              <div className="rounded-xl border border-[#bae6fd] bg-white p-3">
                <p className="text-xs text-[#0c4a6e]">Contrats approuvés non payés</p>
                <p className="text-xl font-bold text-[#082f49]">{autonomyStatus.approvedUnpaidContractsCount}</p>
              </div>
              <div className="rounded-xl border border-[#bae6fd] bg-white p-3">
                <p className="text-xs text-[#0c4a6e]">Attestations à régulariser</p>
                <p className="text-xl font-bold text-[#082f49]">{autonomyStatus.suspendedAttestationsCount}</p>
              </div>
            </div>

            {autonomyStatus.sepaSubscription && (
              <p className="text-xs text-[#155e75] mb-4">
                SEPA : <strong>{autonomyStatus.sepaSubscription.status}</strong>
                {autonomyStatus.sepaSubscription.nextSepaDue
                  ? ` · prochaine échéance ${new Date(autonomyStatus.sepaSubscription.nextSepaDue).toLocaleDateString("fr-FR")}`
                  : ""}
                {autonomyStatus.sepaSubscription.lastError
                  ? ` · dernier incident : ${autonomyStatus.sepaSubscription.lastError}`
                  : ""}
              </p>
            )}

            {decennaleTimeline.length > 0 && (
              <div className="mb-4 rounded-xl border border-[#cbd5e1] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-[#0a0a0a]">Timeline dossier décennale</h3>
                  {topAutonomyAction &&
                    (topAutonomyAction.href.startsWith("#") ? (
                      <a
                        href={topAutonomyAction.href}
                        className="text-xs font-semibold text-[#0369a1] hover:underline"
                      >
                        Continuer mon parcours →
                      </a>
                    ) : (
                      <Link
                        href={topAutonomyAction.href}
                        className="text-xs font-semibold text-[#0369a1] hover:underline"
                      >
                        Continuer mon parcours →
                      </Link>
                    ))}
                </div>
                <ol className="space-y-3">
                  {decennaleTimeline.map((step, index) => {
                    const badge =
                      step.state === "done"
                        ? { label: "Terminé", dot: "bg-emerald-500", text: "text-emerald-700" }
                        : step.state === "current"
                          ? { label: "En cours", dot: "bg-sky-500", text: "text-sky-700" }
                          : step.state === "blocked"
                            ? { label: "À régulariser", dot: "bg-amber-500", text: "text-amber-700" }
                            : { label: "À venir", dot: "bg-slate-300", text: "text-slate-500" }
                    return (
                      <li key={step.id} className="flex gap-3">
                        <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${badge.dot}`} aria-hidden />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0a0a0a]">
                            {index + 1}. {step.title}{" "}
                            <span className={`text-xs font-medium ${badge.text}`}>({badge.label})</span>
                          </p>
                          <p className="text-xs text-[#334155]">{step.description}</p>
                          {step.state !== "done" &&
                            (step.href.startsWith("#") ? (
                              <a href={step.href} className="inline-flex mt-1 text-xs font-medium text-[#0284c7] hover:underline">
                                Aller à cette étape
                              </a>
                            ) : (
                              <Link href={step.href} className="inline-flex mt-1 text-xs font-medium text-[#0284c7] hover:underline">
                                Aller à cette étape
                              </Link>
                            ))}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}

            <div className="space-y-3">
              {autonomyStatus.actions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-xl border border-[#cbd5e1] bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#0a0a0a]">{action.title}</p>
                    <p className="text-xs text-[#334155]">{action.description}</p>
                  </div>
                  {action.href.startsWith("#") ? (
                    <a
                      href={action.href}
                      className="inline-flex items-center justify-center rounded-xl bg-[#0284c7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0369a1]"
                    >
                      Continuer
                    </a>
                  ) : (
                    <Link
                      href={action.href}
                      className="inline-flex items-center justify-center rounded-xl bg-[#0284c7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0369a1]"
                    >
                      Continuer
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {autonomyStatus.advisories.length > 0 && (
              <ul className="mt-4 list-disc pl-5 text-xs text-[#155e75] space-y-1">
                {autonomyStatus.advisories.map((advisory, index) => (
                  <li key={`advisory-${index}`}>{advisory}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!loading && doEtudeBanner?.show && (
          <div className="mb-8 rounded-2xl border border-[#2563eb]/30 bg-[#eff6ff] p-5 text-[#0a0a0a]">
            <p className="font-semibold mb-1">Dommage ouvrage — questionnaire d&apos;étude</p>
            <p className="text-sm text-[#171717] mb-3">
              {doEtudeBanner.hasSaved
                ? "Vous pouvez mettre à jour votre dossier technique détaillé (données préremplies depuis votre première demande)."
                : "Complétez le questionnaire d’étude pour faciliter l’analyse de votre dossier (champs repris de votre première demande lorsque possible)."}
            </p>
            <Link
              href="/espace-client/questionnaire-do-etude"
              className="inline-flex text-sm font-semibold text-[#2563eb] hover:underline"
            >
              {doEtudeBanner.hasSaved ? "Modifier le questionnaire d’étude →" : "Remplir le questionnaire d’étude →"}
            </Link>
          </div>
        )}

        {/* Onglets */}
        <div className="flex gap-1 p-1 bg-[#e4e4e4] rounded-xl mb-10 w-fit" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "documents"}
            onClick={() => setActiveTab("documents")}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === "documents"
                ? "bg-white text-[#0a0a0a] shadow-sm"
                : "text-[#171717] hover:text-[#0a0a0a]"
            }`}
          >
            Documents
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "paiements"}
            onClick={() => setActiveTab("paiements")}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === "paiements"
                ? "bg-white text-[#0a0a0a] shadow-sm"
                : "text-[#171717] hover:text-[#0a0a0a]"
            }`}
          >
            Paiements
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "profil"}
            onClick={() => setActiveTab("profil")}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === "profil"
                ? "bg-white text-[#0a0a0a] shadow-sm"
                : "text-[#171717] hover:text-[#0a0a0a]"
            }`}
          >
            Profil
          </button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-3 gap-5 mb-10">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : summary ? (
          <div className="grid sm:grid-cols-3 gap-5 mb-10">
            <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
              <p className="text-sm font-medium text-[#171717] mb-1">Documents</p>
              <p className="text-3xl font-bold text-[#0a0a0a]">{summary.documentsCount}</p>
            </div>
            <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
              <p className="text-sm font-medium text-[#171717] mb-1">Attestations</p>
              <p className="text-3xl font-bold text-[#0a0a0a]">{summary.attestationsCount}</p>
            </div>
            <div className="bg-[#f5f5f5] border-2 border-[#2563eb]/30 rounded-2xl p-6 shadow-lg shadow-[#2563eb]/10">
              <p className="text-sm font-medium text-[#171717] mb-1">Total payé</p>
              <p className="text-3xl font-bold text-[#2563eb]">{summary.paidTotal.toLocaleString("fr-FR")} €</p>
            </div>
          </div>
        ) : null}

        {!loading && insuranceContracts.length > 0 && (
          <div id="contrats-plateforme" className="mb-10 p-6 bg-[#eff6ff] border border-[#2563eb]/25 rounded-2xl">
            <h2 className="font-bold text-[#0a0a0a] text-lg mb-4">Contrats plateforme (souscription en ligne)</h2>
            <ul className="space-y-4">
              {insuranceContracts.map((c) => (
                <li
                  key={c.id}
                  className="p-4 rounded-xl bg-white border border-[#e5e5e5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div>
                    <p className="font-mono text-sm text-[#0a0a0a]">{c.contractNumber}</p>
                    <p className="text-sm text-[#171717]">{c.clientName}</p>
                    <p className="text-xs text-[#666] mt-1">
                      {c.productType === "do"
                        ? "Dommages-ouvrage"
                        : c.productType === "rc_fabriquant"
                          ? "RC Fabriquant"
                          : "Décennale"}{" "}
                      ·{" "}
                      {c.productType === "rc_fabriquant" ? (
                        <>
                          {c.premium.toLocaleString("fr-FR")} € — montant de l&apos;échéance en cours (trimestriel) ·{" "}
                        </>
                      ) : c.productType === "decennale" ? (
                        <>
                          {c.premium.toLocaleString("fr-FR")} € / an — virement Mollie ≈{" "}
                          {primeTrimestrielle(c.premium).toLocaleString("fr-FR")} € / trimestre ·{" "}
                        </>
                      ) : (
                        <>{c.premium.toLocaleString("fr-FR")} € TTC · </>
                      )}
                      <span className="font-medium">{c.status}</span>
                    </p>
                    {c.status === CONTRACT_STATUS.rejected && c.rejectedReason && (
                      <p className="text-xs text-red-700 mt-2">{c.rejectedReason}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 sm:items-end sm:text-right">
                    <InsuranceContractPdfLinks
                      contractId={c.id}
                      contractNumber={c.contractNumber}
                      status={c.status}
                      productType={c.productType}
                    />
                    {(c.status === CONTRACT_STATUS.approved ||
                      (c.status === CONTRACT_STATUS.active && c.productType === "rc_fabriquant")) && (
                      <PayInsuranceContractButton
                        contractId={c.id}
                        label={
                          c.productType === "rc_fabriquant"
                            ? "Payer l\u2019échéance — virement Mollie"
                            : "Payer (virement Mollie)"
                        }
                      />
                    )}
                    {c.status === CONTRACT_STATUS.pending_validation && (
                      <span className="inline-block rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-900">
                        En examen assureur
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-[#d4d4d4] bg-white p-5">
              <h3 className="text-base font-semibold text-[#0a0a0a] mb-2">Déclaration de chiffre d’affaires annuel</h3>
              <p className="text-sm text-[#171717] mb-4">
                Déclarez votre CA réel en fin d’exercice. La régularisation s’applique uniquement si le CA déclaré est
                supérieur au CA prévu au contrat. En dessous, votre cotisation ne change pas.
              </p>
              <div className="space-y-4">
                {insuranceContracts
                  .filter((c) => c.productType === "decennale")
                  .map((contract) => {
                    const currentInput = caDeclarationByContractId[contract.id] ?? ""
                    const calcResult = caCalcByContractId[contract.id]
                    const isLoading = caLoadingContractId === contract.id
                    const lineError = caErrorByContractId[contract.id]
                    return (
                      <div key={`ca-${contract.id}`} className="rounded-xl border border-[#e5e5e5] p-4">
                        <p className="font-mono text-xs text-[#171717] mb-1">{contract.contractNumber}</p>
                        <p className="text-sm text-[#171717] mb-3">
                          Cotisation annuelle actuelle : {contract.premium.toLocaleString("fr-FR")} €
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={currentInput}
                            onChange={(e) =>
                              setCaDeclarationByContractId((prev) => ({
                                ...prev,
                                [contract.id]: e.target.value,
                              }))
                            }
                            placeholder="CA annuel réel (ex: 125000)"
                            className="flex-1 rounded-xl border border-[#d4d4d4] bg-[#e4e4e4] px-4 py-2.5 text-[#0a0a0a]"
                          />
                          <button
                            type="button"
                            disabled={isLoading || !currentInput.trim()}
                            onClick={async () => {
                              const declaredCa = Number(currentInput)
                              if (!Number.isFinite(declaredCa) || declaredCa < 0) {
                                setCaErrorByContractId((prev) => ({
                                  ...prev,
                                  [contract.id]: "Veuillez saisir un CA valide.",
                                }))
                                return
                              }
                              setCaLoadingContractId(contract.id)
                              setCaErrorByContractId((prev) => ({ ...prev, [contract.id]: null }))
                              try {
                                const res = await fetch("/api/client/ca-regularisation", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    contractId: contract.id,
                                    declaredChiffreAffaires: declaredCa,
                                  }),
                                })
                                const json = (await res.json().catch(() => ({}))) as {
                                  error?: string
                                  contractId?: string
                                  contractNumber?: string
                                  plannedChiffreAffaires?: number
                                  declaredChiffreAffaires?: number
                                  regularisationAmount?: number
                                  newAnnualPremium?: number
                                }
                                if (!res.ok) {
                                  throw new Error(json.error || "Erreur de calcul de régularisation.")
                                }
                                setCaCalcByContractId((prev) => ({
                                  ...prev,
                                  [contract.id]: {
                                    contractId: json.contractId || contract.id,
                                    contractNumber: json.contractNumber || contract.contractNumber,
                                    plannedCa: Number(json.plannedChiffreAffaires || 0),
                                    declaredCa: Number(json.declaredChiffreAffaires || declaredCa),
                                    regularisation: Number(json.regularisationAmount || 0),
                                    newAnnualPremium: Number(json.newAnnualPremium || contract.premium),
                                  },
                                }))
                              } catch (error) {
                                setCaErrorByContractId((prev) => ({
                                  ...prev,
                                  [contract.id]:
                                    error instanceof Error
                                      ? error.message
                                      : "Erreur de calcul de régularisation.",
                                }))
                              } finally {
                                setCaLoadingContractId(null)
                              }
                            }}
                            className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-white font-medium hover:bg-[#1d4ed8] disabled:opacity-50"
                          >
                            {isLoading ? "Calcul..." : "Calculer"}
                          </button>
                        </div>
                        {lineError && (
                          <p className="mt-2 text-sm text-red-700">{lineError}</p>
                        )}
                        {calcResult && (
                          <div className="mt-3 rounded-xl bg-[#f8fafc] border border-[#dbe3ee] p-3 text-sm text-[#0a0a0a]">
                            <p>CA prévu : {calcResult.plannedCa.toLocaleString("fr-FR")} €</p>
                            <p>CA déclaré : {calcResult.declaredCa.toLocaleString("fr-FR")} €</p>
                            {calcResult.regularisation > 0 ? (
                              <>
                                <p className="font-semibold text-amber-700">
                                  Régularisation due : +{calcResult.regularisation.toLocaleString("fr-FR")} €
                                </p>
                                <p>Nouvelle cotisation annuelle : {calcResult.newAnnualPremium.toLocaleString("fr-FR")} €</p>
                              </>
                            ) : (
                              <p className="font-semibold text-emerald-700">
                                Aucune régularisation : cotisation inchangée.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Onglet Profil */}
        {activeTab === "profil" && !loading && status === "authenticated" && (
          <div className="mb-8 p-6 bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl shadow-sm">
            <h2 className="font-bold text-[#0a0a0a] mb-4 text-lg">Mes coordonnées</h2>
            {!profileEditing ? (
              <div className="space-y-2 text-[#171717]">
                {profile?.siret && <p>SIRET : {profile.siret}</p>}
                {profile && (profile.adresse || profile.codePostal || profile.ville) && (
                  <p>{[profile.adresse, profile.codePostal, profile.ville].filter(Boolean).join(", ")}</p>
                )}
                {profile?.telephone && <p>Tél. {profile.telephone}</p>}
                {(!profile || (!profile.adresse && !profile.telephone)) && <p className="text-[#333333]">Aucune coordonnée renseignée</p>}
                <button onClick={() => setProfileEditing(true)} className="text-[#2563eb] font-medium hover:underline text-sm">
                  Modifier
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const form = e.target as HTMLFormElement
                  const adresse = (form.querySelector('[name="adresse"]') as HTMLInputElement)?.value
                  const codePostal = (form.querySelector('[name="codePostal"]') as HTMLInputElement)?.value
                  const ville = (form.querySelector('[name="ville"]') as HTMLInputElement)?.value
                  const telephone = (form.querySelector('[name="telephone"]') as HTMLInputElement)?.value
                  const siret = (form.querySelector('[name="siret"]') as HTMLInputElement)?.value
                  setProfileSaving(true)
                  try {
                    const res = await fetch("/api/client/profile", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ adresse, codePostal, ville, telephone, siret }),
                    })
                    if (res.ok) {
                      setProfile((p) => ({ ...(p || {}), adresse, codePostal, ville, telephone, siret }))
                      setProfileEditing(false)
                    }
                  } finally {
                    setProfileSaving(false)
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-[#0a0a0a] mb-1">SIRET</label>
                  <input name="siret" defaultValue={profile?.siret} placeholder="14 chiffres" maxLength={14} className="w-full border border-[#d4d4d4] rounded-xl px-4 py-2 bg-[#e4e4e4] text-[#0a0a0a] placeholder:text-[#404040]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0a0a0a] mb-1">Adresse</label>
                  <input name="adresse" defaultValue={profile?.adresse} className="w-full border border-[#d4d4d4] rounded-xl px-4 py-2 bg-[#e4e4e4] text-[#0a0a0a] placeholder:text-[#404040]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0a0a0a] mb-1">Code postal</label>
                    <input name="codePostal" defaultValue={profile?.codePostal} className="w-full border border-[#d4d4d4] rounded-xl px-4 py-2 bg-[#e4e4e4] text-[#0a0a0a] placeholder:text-[#404040]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0a0a0a] mb-1">Ville</label>
                    <input name="ville" defaultValue={profile?.ville} className="w-full border border-[#d4d4d4] rounded-xl px-4 py-2 bg-[#e4e4e4] text-[#0a0a0a] placeholder:text-[#404040]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0a0a0a] mb-1">Téléphone</label>
                  <input name="telephone" type="tel" defaultValue={profile?.telephone} className="w-full border border-[#d4d4d4] rounded-xl px-4 py-2 bg-[#e4e4e4] text-[#0a0a0a] placeholder:text-[#404040]" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={profileSaving} className="bg-[#2563eb] text-white px-4 py-2 rounded-xl font-medium disabled:opacity-50">
                    {profileSaving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                  <button type="button" onClick={() => setProfileEditing(false)} className="border border-[#d4d4d4] px-4 py-2 rounded-xl text-[#171717]">
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Onglet Documents */}
        {activeTab === "documents" && !loading && documents.some((d) => d.type === "attestation" && d.status === "suspendu") && (
          <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <p className="mb-2 font-medium text-blue-900">Paiement décennale en attente</p>
            <p className="mb-3 text-sm text-blue-800">
              Une ou plusieurs attestations <strong>décennale</strong> sont suspendues pour défaut de paiement (échéances).
              Régularisez par carte bancaire. Le DO, lui, est payé en une fois avant l’attestation.
            </p>
            <Link
              href="/espace-client/regularisation"
              className="inline-block bg-[#2563eb] text-white px-4 py-2 rounded-xl hover:bg-[#1d4ed8] font-medium text-sm"
            >
              Régulariser le paiement par CB
            </Link>
          </div>
        )}

        {activeTab === "documents" && !loading && (
          <div className="mb-8 rounded-2xl border border-[#2563eb]/30 bg-[#eff6ff] p-6">
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">Attestation décennale nominative</h2>
            <p className="text-sm text-[#171717] mb-4">
              Générez une attestation nominative pour un maître d&apos;ouvrage/client final, sans intervention manuelle.
              Le document est ajouté automatiquement dans vos documents.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setNominativeError(null)
                setNominativeSuccess(null)
                if (!nominativeForm.beneficiaireNom.trim()) {
                  setNominativeError("Le nom du bénéficiaire est requis.")
                  return
                }
                setNominativeLoading(true)
                try {
                  const res = await fetch("/api/client/attestation-nominative", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(nominativeForm),
                  })
                  const json = (await res.json().catch(() => ({}))) as {
                    error?: string
                    id?: string
                    numero?: string
                  }
                  if (!res.ok || !json.id || !json.numero) {
                    throw new Error(json.error || "Impossible de créer l'attestation nominative.")
                  }
                  const createdAt = new Date().toISOString()
                  setDocuments((prev) => [
                    {
                      id: json.id!,
                      type: "attestation_nominative",
                      numero: json.numero!,
                      status: "valide",
                      createdAt,
                    },
                    ...prev,
                  ])
                  setSummary((prev) =>
                    prev
                      ? {
                          ...prev,
                          documentsCount: prev.documentsCount + 1,
                          attestationsCount: prev.attestationsCount + 1,
                        }
                      : prev
                  )
                  setNominativeSuccess(`Attestation nominative créée (${json.numero}).`)
                  setNominativeForm({
                    beneficiaireNom: "",
                    chantierAdresse: "",
                    objetMission: "",
                  })
                } catch (error) {
                  setNominativeError(
                    error instanceof Error
                      ? error.message
                      : "Impossible de créer l'attestation nominative."
                  )
                } finally {
                  setNominativeLoading(false)
                }
              }}
              className="space-y-3"
            >
              <input
                type="text"
                value={nominativeForm.beneficiaireNom}
                onChange={(e) =>
                  setNominativeForm((prev) => ({ ...prev, beneficiaireNom: e.target.value }))
                }
                placeholder="Nom du bénéficiaire (ex: Mairie de Lyon)"
                className="w-full rounded-xl border border-[#d4d4d4] bg-white px-4 py-2.5 text-[#0a0a0a]"
              />
              <input
                type="text"
                value={nominativeForm.chantierAdresse}
                onChange={(e) =>
                  setNominativeForm((prev) => ({ ...prev, chantierAdresse: e.target.value }))
                }
                placeholder="Adresse du chantier (optionnel)"
                className="w-full rounded-xl border border-[#d4d4d4] bg-white px-4 py-2.5 text-[#0a0a0a]"
              />
              <input
                type="text"
                value={nominativeForm.objetMission}
                onChange={(e) =>
                  setNominativeForm((prev) => ({ ...prev, objetMission: e.target.value }))
                }
                placeholder="Objet / lot concerné (optionnel)"
                className="w-full rounded-xl border border-[#d4d4d4] bg-white px-4 py-2.5 text-[#0a0a0a]"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={nominativeLoading}
                  className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                >
                  {nominativeLoading ? "Création..." : "Créer l’attestation nominative"}
                </button>
                {nominativeSuccess && <p className="text-sm text-emerald-700">{nominativeSuccess}</p>}
                {nominativeError && <p className="text-sm text-red-700">{nominativeError}</p>}
              </div>
            </form>
          </div>
        )}

        {activeTab === "documents" && (
        <div className="mb-10">
          <GedUpload />
          <p className="text-sm text-[#171717] mt-4">
            Décennale : KBIS, pièce d&apos;identité, justificatif d&apos;activité, qualification, RIB. Dommage ouvrage : permis de construire, DOC/DROC, plans, conventions, rapport étude de sol.
          </p>
        </div>
        )}

        {activeTab === "documents" && !loading && (
          <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-10 shadow-sm">
            <h2 className="font-bold text-[#0a0a0a] text-lg mb-3">Reprise de devis enregistrés</h2>
            {savedDevisDrafts.length === 0 ? (
              <p className="text-sm text-[#171717]">
                Aucun devis sauvegardé en attente de reprise.
              </p>
            ) : (
              <div className="space-y-3">
                {savedDevisDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="rounded-xl border border-[#d4d4d4] bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0a0a0a]">
                        {draft.produit === "decennale" ? "Devis décennale" : "Devis dommage ouvrage"}
                      </p>
                      <p className="text-xs text-[#171717]">
                        Créé le {new Date(draft.createdAt).toLocaleDateString("fr-FR")} · expire le{" "}
                        {new Date(draft.expiresAt).toLocaleDateString("fr-FR")}
                      </p>
                      {(draft.raisonSociale || draft.siret || draft.primeAnnuelle != null) && (
                        <p className="text-xs text-[#171717] mt-1">
                          {draft.raisonSociale ? `${draft.raisonSociale}` : "Dossier sans raison sociale"}
                          {draft.siret ? ` · SIRET ${draft.siret}` : ""}
                          {draft.primeAnnuelle != null
                            ? ` · Prime ${Number(draft.primeAnnuelle).toLocaleString("fr-FR")} €/an`
                            : ""}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/devis/resume/${draft.token}`}
                      className="inline-flex items-center justify-center rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
                    >
                      Reprendre
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && !loading && (
          <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-10 shadow-sm">
            <h2 className="font-bold text-[#0a0a0a] text-lg mb-3">Signature électronique à reprendre</h2>
            {pendingSignatures.length === 0 ? (
              <p className="text-sm text-[#171717]">
                Aucune signature électronique en attente.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingSignatures.map((item) => (
                  <div
                    key={item.signatureRequestId}
                    className="rounded-xl border border-[#d4d4d4] bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0a0a0a]">
                        {item.signatureFlow === "custom_pdf"
                          ? item.signatureFlowLabel || "Dossier personnalisé"
                          : "Contrat décennale"}
                      </p>
                      <p className="text-xs text-[#171717]">
                        Référence {item.contractNumero} · créé le{" "}
                        {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <a
                      href={item.signatureLink}
                      className="inline-flex items-center justify-center rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
                    >
                      Reprendre la signature
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onglet Paiements */}
        {activeTab === "paiements" && (
        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-10 shadow-sm">
          <h2 className="font-bold text-[#0a0a0a] mb-6 text-lg">Historique des paiements</h2>
          {loading ? (
            <div className="space-y-3">
              <SkeletonDocumentRow />
              <SkeletonDocumentRow />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-[#171717] leading-relaxed">Aucun paiement enregistré.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#d4d4d4]">
                    <th className="text-left py-3 font-medium text-[#0a0a0a]">Date</th>
                    <th className="text-left py-3 font-medium text-[#0a0a0a]">Montant</th>
                    <th className="text-left py-3 font-medium text-[#0a0a0a]">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-[#d4d4d4]/50">
                      <td className="py-3 text-[#171717]">{new Date(p.paidAt || p.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 font-medium text-[#0a0a0a]">{p.amount.toLocaleString("fr-FR")} €</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${p.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-900"}`}>
                          {p.status === "paid" ? "Payé" : p.status === "pending" ? "En attente" : "Échoué"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* Onglet Documents - liste */}
        {activeTab === "documents" && (
        <>
        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-10 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="font-bold text-[#0a0a0a] text-lg">Devis, contrats et attestations</h2>
            {documents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(["decennale", "do"] as const).map((assurance) => (
                  <button
                    key={assurance}
                    type="button"
                    disabled={exportingPdf}
                    onClick={async () => {
                      setExportingPdf(true)
                      try {
                        const res = await fetch(`/api/documents/export-all-pdf?assurance=${assurance}`)
                        if (!res.ok) throw new Error("Erreur")
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `documents-optimum-${assurance}-${new Date().toISOString().slice(0, 10)}.pdf`
                        a.click()
                        URL.revokeObjectURL(url)
                      } catch {
                        // Erreur silencieuse — l'utilisateur peut réessayer
                      } finally {
                        setExportingPdf(false)
                      }
                    }}
                    className="inline-flex items-center gap-2 bg-[#2563eb] text-white px-4 py-2.5 rounded-xl hover:bg-[#1d4ed8] font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {exportingPdf
                      ? "Génération..."
                      : assurance === "decennale"
                        ? "Exporter PDF Décennale"
                        : "Exporter PDF DO"}
                  </button>
                ))}
              </div>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              <SkeletonDocumentRow />
              <SkeletonDocumentRow />
              <SkeletonDocumentRow />
            </div>
          ) : documents.length === 0 ? (
            <p className="text-[#171717] leading-relaxed">
              Aucun document pour le moment. Vos devis, contrats et attestations apparaîtront ici après souscription.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/espace-client/documents/${doc.id}`}
                  className="flex items-center justify-between p-4 bg-[#e4e4e4] rounded-xl hover:bg-[#eff6ff] border border-[#d4d4d4] hover:border-[#2563eb]/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{typeIcons[doc.type] || "📄"}</span>
                    <div>
                      <p className="font-medium text-black">{typeLabels[doc.type] || doc.type}</p>
                      <p className="text-sm text-[#171717]">{doc.numero}</p>
                    </div>
                  </div>
                  <span className="text-[#2563eb] font-medium">Voir →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-bold text-[#0a0a0a] mb-2 text-lg">Nouveaux devis</h2>
          <p className="text-sm text-[#171717]">
            Lancez un nouveau parcours en conservant vos informations de compte.
          </p>
          {topAutonomyAction && (
            <div className="rounded-xl border border-[#7dd3fc] bg-[#f0f9ff] p-4">
              <p className="text-sm font-semibold text-[#0c4a6e] mb-1">Parcours en cours détecté</p>
              <p className="text-xs text-[#155e75] mb-3">
                Reprenez d&apos;abord votre étape bloquante pour finaliser votre dossier actuel.
              </p>
              {topAutonomyAction.href.startsWith("#") ? (
                <a
                  href={topAutonomyAction.href}
                  className="inline-flex items-center justify-center rounded-xl bg-[#0284c7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0369a1]"
                >
                  Continuer mon parcours
                </a>
              ) : (
                <Link
                  href={topAutonomyAction.href}
                  className="inline-flex items-center justify-center rounded-xl bg-[#0284c7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0369a1]"
                >
                  Continuer mon parcours
                </Link>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/devis?from=espace-client"
              className="inline-block bg-[#2563eb] text-white px-8 py-4 rounded-2xl hover:bg-[#1d4ed8] transition-all font-semibold shadow-lg shadow-[#2563eb]/20"
            >
              Nouveau devis décennale
            </Link>
            <Link
              href="/devis-dommage-ouvrage"
              className="inline-block border-2 border-[#2563eb] text-[#2563eb] px-8 py-4 rounded-2xl hover:bg-[#eff6ff] transition-all font-semibold"
            >
              Devis dommage ouvrage
            </Link>
          </div>
        </div>
        </>
        )}
      </div>

      <InstallPrompt />
    </main>
  )
}
