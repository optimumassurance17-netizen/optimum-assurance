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

  useEffect(() => {
    if (status !== "authenticated") return

    const fetchData = async () => {
      try {
        const [docsRes, summaryRes, paymentsRes] = await Promise.all([
          fetch("/api/documents/list"),
          fetch("/api/client/summary"),
          fetch("/api/client/payments"),
        ])
        if (docsRes.ok) setDocuments(await docsRes.json())
        if (summaryRes.ok) setSummary(await summaryRes.json())
        if (paymentsRes.ok) setPayments(await paymentsRes.json())
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

        {/* Onglets */}
        <div className="flex gap-1 p-1 bg-[#ebebeb] rounded-xl mb-10 w-fit" role="tablist">
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
            <div className="bg-[#f5f5f5] border-2 border-[#C65D3B]/30 rounded-2xl p-6 shadow-lg shadow-[#C65D3B]/10">
              <p className="text-sm font-medium text-[#171717] mb-1">Total payé</p>
              <p className="text-3xl font-bold text-[#C65D3B]">{summary.paidTotal.toLocaleString("fr-FR")} €</p>
            </div>
          </div>
        ) : null}

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
                {(!profile || (!profile.adresse && !profile.telephone)) && <p className="text-gray-500">Aucune coordonnée renseignée</p>}
                <button onClick={() => setProfileEditing(true)} className="text-[#C65D3B] font-medium hover:underline text-sm">
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
                  <input name="siret" defaultValue={profile?.siret} placeholder="14 chiffres" maxLength={14} className="w-full border border-[#d4d4d4] rounded-xl px-4 py-2 text-[#0a0a0a]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0a0a0a] mb-1">Adresse</label>
                  <input name="adresse" defaultValue={profile?.adresse} className="w-full border border-[#d4d4d4] rounded-xl px-4 py-2 text-[#0a0a0a]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0a0a0a] mb-1">Code postal</label>
                    <input name="codePostal" defaultValue={profile?.codePostal} className="w-full border border-[#d4d4d4] rounded-xl px-4 py-2 text-[#0a0a0a]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0a0a0a] mb-1">Ville</label>
                    <input name="ville" defaultValue={profile?.ville} className="w-full border border-[#d4d4d4] rounded-xl px-4 py-2 text-[#0a0a0a]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0a0a0a] mb-1">Téléphone</label>
                  <input name="telephone" type="tel" defaultValue={profile?.telephone} className="w-full border border-[#d4d4d4] rounded-xl px-4 py-2 text-[#0a0a0a]" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={profileSaving} className="bg-[#C65D3B] text-white px-4 py-2 rounded-xl font-medium disabled:opacity-50">
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
          <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
            <p className="font-medium text-amber-800 mb-2">Paiement en attente</p>
            <p className="text-sm text-amber-700 mb-3">
              Une ou plusieurs attestations sont suspendues pour défaut de paiement. Régularisez par carte bancaire.
            </p>
            <Link
              href="/espace-client/regularisation"
              className="inline-block bg-[#C65D3B] text-white px-4 py-2 rounded-xl hover:bg-[#B04F2F] font-medium text-sm"
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
                        <span className={`px-2 py-1 rounded text-xs ${p.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
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
                className="inline-flex items-center gap-2 bg-[#C65D3B] text-white px-4 py-2.5 rounded-xl hover:bg-[#B04F2F] font-medium text-sm transition-colors disabled:opacity-50"
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
                  className="flex items-center justify-between p-4 bg-[#ebebeb] rounded-xl hover:bg-[#FEF3F0] border border-[#d4d4d4] hover:border-[#C65D3B]/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{typeIcons[doc.type] || "📄"}</span>
                    <div>
                      <p className="font-medium text-black">{typeLabels[doc.type] || doc.type}</p>
                      <p className="text-sm text-[#171717]">{doc.numero}</p>
                    </div>
                  </div>
                  <span className="text-[#C65D3B] font-medium">Voir →</span>
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
              className="inline-block bg-[#C65D3B] text-white px-8 py-4 rounded-2xl hover:bg-[#B04F2F] transition-all font-semibold shadow-lg shadow-[#C65D3B]/20"
            >
              Devis décennale BTP
            </Link>
            <Link
              href="/devis-dommage-ouvrage"
              className="inline-block border-2 border-[#C65D3B] text-[#C65D3B] px-8 py-4 rounded-2xl hover:bg-[#FEF3F0] transition-all font-semibold"
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
