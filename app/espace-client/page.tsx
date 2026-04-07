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

interface DocumentItem {
  id: string
  type: string
  numero: string
  status?: string
  createdAt: string
}

const typeLabels: Record<string, string> = {
  devis: "Devis décennale",
  devis_do: "Devis dommage ouvrage",
  contrat: "Contrat",
  attestation: "Attestation décennale",
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
  attestation_do: "🏠",
  attestation_non_sinistralite: "📜",
  avenant: "📝",
  facture_do: "🧾",
  facture_decennale: "🧾",
}

export default function EspaceClientPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [payments, setPayments] = useState<{ id: string; amount: number; status: string; paidAt: string | null; createdAt: string }[]>([])
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

  useEffect(() => {
    if (status !== "authenticated") return

    const fetchData = async () => {
      try {
        const [docsRes, summaryRes, paymentsRes, insRes, doqRes] = await Promise.all([
          fetch("/api/documents/list"),
          fetch("/api/client/summary"),
          fetch("/api/client/payments"),
          fetch("/api/client/insurance-contracts"),
          fetch("/api/client/do-questionnaire"),
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
          <div className="mb-10 p-6 bg-[#eff6ff] border border-[#2563eb]/25 rounded-2xl">
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
                      ) : (
                        <>{c.premium.toLocaleString("fr-FR")} € / an · </>
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

        {activeTab === "documents" && (
        <div className="mb-10">
          <GedUpload />
          <p className="text-sm text-[#171717] mt-4">
            Décennale : KBIS, pièce d&apos;identité, justificatif d&apos;activité, qualification, RIB. Dommage ouvrage : permis de construire, DOC/DROC, plans, conventions, rapport étude de sol.
          </p>
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
              <button
                type="button"
                disabled={exportingPdf}
                onClick={async () => {
                  setExportingPdf(true)
                  try {
                    const res = await fetch("/api/documents/export-all-pdf")
                    if (!res.ok) throw new Error("Erreur")
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `documents-optimum-${new Date().toISOString().slice(0, 10)}.pdf`
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
                {exportingPdf ? "Génération..." : "Télécharger tout en PDF"}
              </button>
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
          <div className="flex flex-wrap gap-4">
            <Link
              href="/devis"
              className="inline-block bg-[#2563eb] text-white px-8 py-4 rounded-2xl hover:bg-[#1d4ed8] transition-all font-semibold shadow-lg shadow-[#2563eb]/20"
            >
              Devis décennale BTP
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
