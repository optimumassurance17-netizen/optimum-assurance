"use client"

import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "2rem", background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <h1 style={{ color: "#0a0a0a", marginBottom: "1rem" }}>Une erreur critique est survenue</h1>
        {process.env.NODE_ENV === "development" && error?.message && (
          <p style={{ color: "#333333", fontSize: "0.85rem", marginBottom: "1rem", maxWidth: "400px", wordBreak: "break-word" }}>
            {error.message}
          </p>
        )}
        <p style={{ color: "#404040", marginBottom: "2rem", textAlign: "center", maxWidth: "400px" }}>
          Le site rencontre un problème. Veuillez réessayer ou nous contacter.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
        <Link
          href="/"
          style={{
            marginTop: "1rem",
            color: "#2563eb",
            textDecoration: "underline",
            fontSize: "0.9rem",
          }}
        >
          Retour à l&apos;accueil
        </Link>
      </body>
    </html>
  )
}
