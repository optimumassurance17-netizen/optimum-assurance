import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { parseActivitiesJson, parseExclusionsJson } from "@/lib/insurance-contract-activities"
import { getVerifyPaymentRow } from "@/lib/insurance-contract-verify-labels"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { DelegationLegalLine } from "@/components/premium/DelegationLegalLine"

export const dynamic = "force-dynamic"
export const metadata = {
  robots: "noindex, nofollow",
}

/**
 * Vérification publique : plateforme SaaS (InsuranceContract) ou anciennes attestations (/v/[token]).
 */
export default async function VerifyByContractNumberPage({
  params,
}: {
  params: Promise<{ contractNumber: string }>
}) {
  const { contractNumber: raw } = await params
  const contractNumber = decodeURIComponent(raw)

  const ic = await prisma.insuranceContract.findUnique({
    where: { contractNumber },
  })

  if (ic) {
    const now = new Date()
    const isActive =
      ic.status === CONTRACT_STATUS.active && ic.validUntil != null && ic.validUntil > now

    const activities = parseActivitiesJson(ic.activitiesJson)
    const exclusions = parseExclusionsJson(ic.exclusionsJson)
    const paymentRow = getVerifyPaymentRow(ic, isActive)

    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/5">
            <div
              className={`px-8 py-6 text-center ${
                isActive ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
                Vérification
              </p>
              <p className="mt-1 text-xl font-bold">
                {isActive ? "Contrat valide" : "Contrat invalide"}
              </p>
            </div>
            <div className="space-y-4 px-8 py-8">
              {!isActive && paymentRow.detail && (
                <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-950">
                  {paymentRow.detail}
                </p>
              )}
              {!isActive && !paymentRow.detail && (
                <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-950">
                  Attestation invalide ou contrat non actif.
                </p>
              )}
              <dl className="space-y-3 text-sm">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                  <dt className="font-semibold text-slate-900">N° contrat</dt>
                  <dd className="font-mono text-slate-800">{ic.contractNumber}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                  <dt className="font-semibold text-slate-900">Client</dt>
                  <dd className="text-slate-800">{ic.clientName}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                  <dt className="font-semibold text-slate-900">Produit</dt>
                  <dd className="text-slate-800">
                    {ic.productType === "do"
                      ? "Dommages-ouvrage"
                      : ic.productType === "rc_fabriquant"
                        ? "RC Fabriquant"
                        : "Responsabilité décennale"}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                  <dt className="font-semibold text-slate-900">Statut</dt>
                  <dd className="text-slate-800">
                    {ic.status}
                    {isActive ? " (actif)" : " (inactif)"}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                  <dt className="font-semibold text-slate-900">Paiement</dt>
                  <dd className="text-right text-slate-800">{paymentRow.label}</dd>
                </div>
                {ic.validFrom && ic.validUntil && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                    <dt className="font-semibold text-slate-900">Validité</dt>
                    <dd className="text-slate-800">
                      du {ic.validFrom.toLocaleDateString("fr-FR")} au{" "}
                      {ic.validUntil.toLocaleDateString("fr-FR")}
                    </dd>
                  </div>
                )}
                {ic.productType === "decennale" && (
                  <div className="border-t border-slate-100 pt-3">
                    <dt className="font-semibold text-slate-900">Activité(s) assurée(s)</dt>
                    <dd className="mt-1 text-slate-800">
                      {activities.length > 0 ? activities.join(", ") : "—"}
                    </dd>
                  </div>
                )}
                {ic.productType === "decennale" && (
                  <div className="border-t border-slate-100 pt-3">
                    <dt className="font-semibold text-slate-900">Exclusion(s) d&apos;activité</dt>
                    <dd className="mt-1 text-slate-800">
                      {exclusions.length > 0
                        ? exclusions.join(", ")
                        : "Aucune exclusion d’activité déclarée au contrat."}
                    </dd>
                  </div>
                )}
                {ic.productType === "do" && activities.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <dt className="font-semibold text-slate-900">Activité(s) / nature assurée(s)</dt>
                    <dd className="mt-1 text-slate-800">{activities.join(", ")}</dd>
                  </div>
                )}
                {ic.productType === "do" && (
                  <div className="border-t border-slate-100 pt-3">
                    <dt className="font-semibold text-slate-900">Exclusion(s) d&apos;activité</dt>
                    <dd className="mt-1 text-slate-800">
                      {exclusions.length > 0
                        ? exclusions.join(", ")
                        : "Aucune exclusion d’activité déclarée au contrat."}
                    </dd>
                  </div>
                )}
                {ic.productType === "do" && (ic.projectName || ic.projectAddress) && (
                  <div className="border-t border-slate-100 pt-3">
                    <dt className="font-semibold text-slate-900">Projet</dt>
                    <dd className="mt-1 text-slate-800">
                      {ic.projectName} {ic.projectAddress ? `— ${ic.projectAddress}` : ""}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="border-t border-slate-100 pt-6">
                <DelegationLegalLine size="xs" />
                <p className="mt-2 text-xs text-slate-600">ORIAS LPS 28931947 — Optimum Courtage</p>
              </div>
              <p className="text-center">
                <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline">
                  ← Accueil
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const document = await prisma.document.findFirst({
    where: {
      numero: contractNumber,
      type: { in: ["attestation", "attestation_do"] },
      verificationToken: { not: null },
    },
    select: { verificationToken: true },
  })

  if (!document?.verificationToken) {
    notFound()
  }

  redirect(`/v/${document.verificationToken}`)
}
