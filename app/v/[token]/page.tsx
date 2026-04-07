import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const metadata = {
  robots: "noindex, nofollow",
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split("/")
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    const d = new Date(year, month, day)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const document = await prisma.document.findFirst({
    where: {
      verificationToken: token,
      type: { in: ["attestation", "attestation_do"] },
    },
  })

  if (!document) {
    notFound()
  }

  const isDo = document.type === "attestation_do"
  const data = JSON.parse(document.data) as {
    raisonSociale?: string
    dateEcheance?: string
    activites?: string[]
    closCouvert?: boolean
    dateSignature?: string
  }

  const dateEcheance = parseDate(data.dateEcheance || "")
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let statut: "valide" | "perimee" | "suspendu"
  let message: string

  if (document.status === "suspendu") {
    statut = "suspendu"
    message = isDo
      ? "Attestation DO suspendue — hors impayé (le DO est payé avant délivrance). Contactez Optimum Assurance."
      : "Attestation décennale suspendue pour défaut de paiement"
  } else if (dateEcheance && dateEcheance < today) {
    statut = "perimee"
    message = isDo ? "Attestation DO périmée" : "Attestation périmée"
  } else {
    statut = "valide"
    message = isDo ? "Attestation DO valide" : "Attestation valide"
  }

  const colors = {
    valide: { bg: "#E8F5E9", text: "#2E7D32", border: "#4CAF50" },
    perimee: { bg: "#FFF3E0", text: "#E65100", border: "#FF9800" },
    suspendu: { bg: "#FFEBEE", text: "#C62828", border: "#F44336" },
  }

  const c = colors[statut]
  const typeGarantieDo = data.closCouvert ? "Clos et couvert" : "DO complète"

  return (
    <html lang="fr">
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <title>Vérification attestation - Optimum Assurance</title>
      </head>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            fontFamily: "system-ui, sans-serif",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              maxWidth: "400px",
              width: "100%",
              padding: "32px",
              borderRadius: "16px",
              border: `2px solid ${c.border}`,
              background: c.bg,
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                color: c.text,
                marginBottom: "8px",
              }}
            >
              {message}
            </h1>
            <p style={{ color: "#404040", fontSize: "0.875rem", marginBottom: "16px" }}>
              N° {document.numero}
            </p>
            <p style={{ color: "#2D2A26", fontSize: "0.9rem" }}>
              {data.raisonSociale}
            </p>
            {isDo && (
              <p style={{ color: "#404040", fontSize: "0.8rem", marginTop: "12px" }}>
                <strong>Type de garantie :</strong> {typeGarantieDo}<br />
                <strong>Validité :</strong> unique de 10 ans, non résiliable
                {data.dateSignature && data.dateEcheance && (
                  <><br />({data.dateSignature} → {data.dateEcheance})</>
                )}
              </p>
            )}
            {!isDo && data.activites && data.activites.length > 0 && (
              <p style={{ color: "#404040", fontSize: "0.8rem", marginTop: "12px" }}>
                <strong>Activité(s) assurée(s) :</strong><br />
                {data.activites.join(", ")}
              </p>
            )}
            <p style={{ color: "#404040", fontSize: "0.75rem", marginTop: "24px" }}>
              Optimum Assurance - Vérification {isDo ? "attestation dommage ouvrage" : "attestation décennale"}
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
