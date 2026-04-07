import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Header } from "@/components/Header"
import { RegeneratePdfButton } from "@/components/admin/RegeneratePdfButton"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { DelegationLegalLine } from "@/components/premium/DelegationLegalLine"

export const dynamic = "force-dynamic"

function statusBadge(status: string) {
  if (status === "active" || status === "paid") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
        {status}
      </span>
    )
  }
  if (status === "pending_validation" || status === "draft" || status === "approved") {
    return (
      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-950">
        {status}
      </span>
    )
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-900">
        {status}
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-900">
      {status}
    </span>
  )
}

export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; product?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session)) {
    redirect("/connexion")
  }

  const sp = await searchParams
  const statusFilter = sp.status?.trim()
  const productFilter = sp.product?.trim()

  const contracts = await prisma.insuranceContract.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(productFilter ? { productType: productFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <main className="min-h-screen bg-slate-50/90">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Administration — Contrats</h1>
              <p className="mt-2 text-slate-700">
                Filtrer par statut ou produit. Liste des contrats plateforme (100 derniers).
              </p>
            </div>
            <Link
              href="/gestion"
              className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              ← Gestion CRM
            </Link>
          </div>
          <div className="mt-4">
            <DelegationLegalLine size="xs" />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          <Link
            href="/admin"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            Tous
          </Link>
          {Object.values(CONTRACT_STATUS).map((s) => (
            <Link
              key={s}
              href={`/admin?status=${s}`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              {s}
            </Link>
          ))}
          <Link
            href="/admin?product=decennale"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            Décennale
          </Link>
          <Link
            href="/admin?product=do"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            DO
          </Link>
          <Link
            href="/admin?product=rc_fabriquant"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            RC Fabriquant
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                  <th className="p-4 font-semibold text-slate-900">N° contrat</th>
                  <th className="p-4 font-semibold text-slate-900">Produit</th>
                  <th className="p-4 font-semibold text-slate-900">Client</th>
                  <th className="p-4 font-semibold text-slate-900">Statut</th>
                  <th className="p-4 font-semibold text-slate-900">Risque</th>
                  <th className="p-4 font-semibold text-slate-900">Créé</th>
                  <th className="p-4 font-semibold text-slate-900">PDF</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/80">
                    <td className="p-4 font-mono text-xs text-slate-800">{c.contractNumber}</td>
                    <td className="p-4 text-slate-800">{c.productType}</td>
                    <td className="p-4 text-slate-800">{c.clientName}</td>
                    <td className="p-4">{statusBadge(c.status)}</td>
                    <td className="p-4 text-slate-700">{c.riskScore ?? "—"}</td>
                    <td className="p-4 text-xs text-slate-600">{c.createdAt.toLocaleString("fr-FR")}</td>
                    <td className="p-4">
                      <a
                        href={`/api/contracts/${c.id}/pdf/quote`}
                        className="mr-2 text-blue-600 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        devis
                      </a>
                      <a
                        href={`/api/contracts/${c.id}/pdf/policy`}
                        className="mr-2 text-blue-600 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        CP
                      </a>
                      <RegeneratePdfButton contractId={c.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {contracts.length === 0 && (
            <p className="p-8 text-center text-slate-600">Aucun contrat.</p>
          )}
        </div>

        <p className="mt-8 text-xs text-slate-600">
          Validation manuelle : POST <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">/api/contracts/validate</code> avec{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">{"{ contractId, approve: true|false, reason }"}</code>. Paiement :{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">/api/contracts/pay</code> (utilisateur connecté).
        </p>
      </div>
    </main>
  )
}
