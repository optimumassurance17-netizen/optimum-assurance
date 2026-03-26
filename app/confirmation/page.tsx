"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"
import { STORAGE_KEYS } from "@/lib/types"

async function sendConfirmationEmail(raisonSociale: string, email: string) {
  try {
    await fetch("/api/email/confirmation-souscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale, email }),
    })
  } catch {
    // Silently fail - webhook may have already sent
  }
}

export default function ConfirmationPage() {
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed" | "unknown">("loading")

  const [isRegularisation, setIsRegularisation] = useState(false)
  const [isDevisDo, setIsDevisDo] = useState(false)
  const [isDevisDoFlow, setIsDevisDoFlow] = useState(false)
  /** 1er trimestre payé par carte + suite en SEPA trimestriel */
  const [decennalePremierTrimestreCarte, setDecennalePremierTrimestreCarte] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("mollie_payment_type") === "devis_do") {
      setIsDevisDoFlow(true)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentId = params.get("payment_id") || sessionStorage.getItem("mollie_payment_id")
    const paymentType = sessionStorage.getItem("mollie_payment_type")

    const checkStatus = async () => {
      if (paymentId) {
        try {
          const res = await fetch(`/api/mollie/payment-status?id=${paymentId}`)
          const data = await res.json()
          if (data.status === "paid") {
            const isDoPayment = paymentType === "devis_do"
            if (isDoPayment) {
              setIsDevisDo(true)
              setStatus("success")
              sessionStorage.removeItem("mollie_payment_id")
              sessionStorage.removeItem("mollie_payment_type")
              sessionStorage.removeItem("mollie_payment_document_id")
              return
            }
            const isRegularisation =
              params.get("regularisation") === "1" ||
              !!sessionStorage.getItem("mollie_regularisation_attestation")

            if (isRegularisation) {
              setIsRegularisation(true)
              const attestationId = sessionStorage.getItem("mollie_regularisation_attestation")
              if (attestationId) {
                await fetch("/api/documents/restore", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ attestationId }),
                })
                sessionStorage.removeItem("mollie_regularisation_attestation")
              }
              await fetch("/api/payments/record", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  molliePaymentId: paymentId,
                  amount: data.amount ?? 0,
                  status: "paid",
                  metadata: { type: "regularisation" },
                }),
              })
              setStatus("success")
              sessionStorage.removeItem("mollie_payment_id")
              return
            }
            // Récupérer les données avant de les effacer
            const signatureData = sessionStorage.getItem(STORAGE_KEYS.signature)
            if (signatureData) {
              try {
                const souscription = JSON.parse(signatureData)
                const now = new Date()
                const dateEffet = now.toLocaleDateString("fr-FR")
                const dateEcheance = new Date(now.getFullYear(), 11, 31).toLocaleDateString("fr-FR")
                const paiementOpts = (() => {
                  try {
                    const s = sessionStorage.getItem(STORAGE_KEYS.paiementOptions)
                    return s ? JSON.parse(s) : null
                  } catch {
                    return null
                  }
                })()
                const primeAnnuelle = souscription.tarif?.primeAnnuelle ?? 0
                const periodicite = paiementOpts?.periodicite ?? "trimestriel"
                const primeTrimestrielle = Math.round((primeAnnuelle / 4) * 100) / 100
                const primeMensuelleCalc =
                  primeAnnuelle > 0 ? Math.round((primeAnnuelle / 12) * 100) / 100 : undefined
                const trimestrielCarte = paiementOpts?.premierPaiementCarte === true && periodicite === "trimestriel"
                if (trimestrielCarte) setDecennalePremierTrimestreCarte(true)
                const docData = souscription.yousignContractData
                  ? {
                      ...souscription.yousignContractData,
                      raisonSociale: souscription.raisonSociale,
                      siret: souscription.siret,
                      adresse: souscription.adresse,
                      codePostal: souscription.codePostal,
                      ville: souscription.ville,
                      email: souscription.email,
                      representantLegal: souscription.representantLegal,
                      civilite: souscription.civilite,
                      activites: souscription.activites,
                      primeMensuelle: undefined,
                      primeTrimestrielle,
                      modePaiement: paiementOpts ? "prelevement" : "unique",
                      periodicitePrelevement: periodicite,
                      fraisGestionPrelevement: paiementOpts ? 60 : undefined,
                      dateEffet,
                      dateEcheance,
                      ...(trimestrielCarte && {
                        premierTrimestrePayeParCarte: true,
                        prelevementsSuivantsSepaTrimestriel: true,
                      }),
                    }
                  : {
                      raisonSociale: souscription.raisonSociale,
                      siret: souscription.siret,
                      adresse: souscription.adresse,
                      codePostal: souscription.codePostal,
                      ville: souscription.ville,
                      email: souscription.email,
                      representantLegal: souscription.representantLegal,
                      civilite: souscription.civilite,
                      activites: souscription.activites,
                      chiffreAffaires: souscription.chiffreAffaires,
                      primeAnnuelle: souscription.tarif?.primeAnnuelle,
                      primeMensuelle: souscription.tarif?.primeMensuelle ?? primeMensuelleCalc,
                      primeTrimestrielle,
                      modePaiement: paiementOpts ? "prelevement" : "unique",
                      periodicitePrelevement: periodicite,
                      fraisGestionPrelevement: paiementOpts ? 60 : undefined,
                      franchise: souscription.tarif?.franchise,
                      plafond: souscription.tarif?.plafond,
                      dateEffet,
                      dateEcheance,
                      ...(trimestrielCarte && {
                        premierTrimestrePayeParCarte: true,
                        prelevementsSuivantsSepaTrimestriel: true,
                      }),
                    }
                await fetch("/api/payments/record", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    molliePaymentId: paymentId,
                    amount: paiementOpts
                      ? Math.round((primeAnnuelle / 4 + 60) * 100) / 100
                      : primeAnnuelle,
                    status: "paid",
                    metadata: {
                      raisonSociale: souscription.raisonSociale,
                      siret: souscription.siret,
                      periodicite: paiementOpts?.periodicite,
                      fraisGestion: paiementOpts ? 60 : undefined,
                      ...(trimestrielCarte && { premierPaiementCarte: true }),
                    },
                  }),
                })
                await fetch("/api/documents/create", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "contrat",
                    data: docData,
                    ...(souscription.yousignContractNumero && {
                      numero: souscription.yousignContractNumero,
                    }),
                  }),
                })
                await fetch("/api/documents/create", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "attestation",
                    data: {
                      ...docData,
                      dateEffet,
                      dateEcheance,
                    },
                  }),
                })
                await sendConfirmationEmail(souscription.raisonSociale, souscription.email)
              } catch (e) {
                console.error("Erreur création documents:", e)
              }
            }
            setStatus("success")
            sessionStorage.removeItem(STORAGE_KEYS.devis)
            sessionStorage.removeItem(STORAGE_KEYS.souscription)
            sessionStorage.removeItem(STORAGE_KEYS.signature)
            sessionStorage.removeItem(STORAGE_KEYS.mandatSepa)
            sessionStorage.removeItem(STORAGE_KEYS.paiementOptions)
            sessionStorage.removeItem("mollie_payment_id")
          } else if (data.status === "pending" || data.status === "open") {
            setStatus("pending")
          } else {
            if (paymentType === "devis_do") setIsDevisDo(true)
            setStatus("failed")
          }
        } catch {
          setStatus("failed")
        }
      } else {
        setStatus("unknown")
      }
    }

    checkStatus()
  }, [])

  return (
    <main className="min-h-screen bg-[#FDF8F3]">
      <Header />

      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        {status === "loading" && (
          <p className="text-[#171717]">Vérification du paiement...</p>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-[#2E7D32]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-black mb-4">
              {isDevisDo
                ? "Paiement confirmé"
                : isRegularisation
                ? "Régularisation confirmée"
                : "Souscription confirmée"}
            </h1>
            <p className="text-[#171717] mb-8">
              {isDevisDo
                ? "Votre paiement pour le devis dommage ouvrage a été enregistré avec succès. Votre dossier sera traité en cours."
                : isRegularisation
                ? "Votre paiement a été enregistré. Votre attestation est à nouveau valide."
                : decennalePremierTrimestreCarte
                ? (
                    <>
                      Votre assurance décennale a été souscrite avec succès. Le <strong>premier trimestre</strong> a été réglé par carte bancaire. Les <strong>échéances suivantes</strong> seront prélevées
                      par <strong>SEPA trimestriel</strong> sur l’IBAN du mandat. Vous recevrez votre attestation par email dans les prochaines minutes.
                    </>
                  )
                : "Votre assurance décennale a été souscrite avec succès. Vous recevrez votre attestation par email dans les prochaines minutes."}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/espace-client"
                className="inline-block bg-[#C65D3B] text-white px-8 py-3 rounded-xl hover:bg-[#B04F2F] transition font-medium"
              >
                Accéder à mon espace client
              </Link>
              <Link
                href="/"
                className="inline-block border-2 border-[#C65D3B] text-[#C65D3B] px-8 py-3 rounded-xl hover:bg-[#F5E8E3] transition font-medium"
              >
                Retour à l&apos;accueil
              </Link>
            </div>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="w-20 h-20 bg-[#F5E8E3] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-[#C65D3B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-black mb-4">
              {isDevisDoFlow ? "Virement en attente" : "Paiement en cours"}
            </h1>
            <p className="text-[#171717] mb-8">
              {isDevisDoFlow ? (
                <>
                  Vous avez choisi un <strong>paiement par virement bancaire</strong> (Mollie). Effectuez le
                  virement selon les coordonnées et la référence indiquées sur la page Mollie ou reçues par
                  email. Votre attestation dommage ouvrage sera disponible après <strong>réception des fonds</strong>
                  sur le compte Mollie. Vous recevrez un email de confirmation à ce moment-là.
                </>
              ) : (
                <>
                  Votre paiement est en cours de traitement. Vous recevrez une confirmation par email une fois
                  celui-ci finalisé.
                </>
              )}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              {isDevisDoFlow && (
                <Link
                  href="/espace-client"
                  className="inline-block border-2 border-[#C65D3B] text-[#C65D3B] px-8 py-3 rounded-xl hover:bg-[#F5E8E3] transition font-medium"
                >
                  Retour à l&apos;espace client
                </Link>
              )}
              <Link
                href="/"
                className="inline-block bg-[#C65D3B] text-white px-8 py-3 rounded-xl hover:bg-[#B04F2F] transition font-medium"
              >
                Retour à l&apos;accueil
              </Link>
            </div>
          </>
        )}

        {status === "unknown" && (
          <>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-black mb-4">
              Page inaccessible
            </h1>
            <p className="text-[#171717] mb-8">
              Cette page est réservée au retour après paiement. Si vous venez de finaliser un paiement, vérifiez que vous n&apos;avez pas été redirigé vers une autre URL.
            </p>
            <Link
              href="/"
              className="inline-block bg-[#C65D3B] text-white px-8 py-3 rounded-xl hover:bg-[#B04F2F] transition font-medium"
            >
              Retour à l&apos;accueil
            </Link>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-black mb-4">
              Paiement échoué
            </h1>
            <p className="text-[#171717] mb-8">
              Votre paiement n&apos;a pas pu être finalisé. Vous pouvez réessayer
              ou choisir un autre mode de paiement.
            </p>
            <Link
              href={isDevisDo ? "/espace-client" : "/paiement"}
              className="inline-block bg-[#C65D3B] text-white px-8 py-3 rounded-xl hover:bg-[#B04F2F] transition font-medium"
            >
              {isDevisDo ? "Retour à l'espace client" : "Réessayer le paiement"}
            </Link>
            {isDevisDo && (
              <p className="text-sm text-[#171717] mt-4">
                Vous pourrez réessayer le paiement depuis votre espace client en cliquant sur le devis dommage ouvrage.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  )
}
