import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Optimum Assurance - Assurance décennale BTP en ligne"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAFAF9",
          background: "linear-gradient(135deg, #eff6ff 0%, #FAFAF9 50%, #F5F5F4 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 12,
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: "bold",
              color: "white",
            }}
          >
            O
          </div>
          <span style={{ fontSize: 36, fontWeight: "bold", color: "#0a0a0a" }}>
            Optimum Assurance
          </span>
        </div>
        <p style={{ fontSize: 48, fontWeight: "bold", color: "#0a0a0a", margin: 0, textAlign: "center", maxWidth: 900 }}>
          Assurance décennale BTP en ligne
        </p>
        <p style={{ fontSize: 24, color: "#404040", marginTop: 16 }}>
          Devis en 3 minutes • Attestation immédiate
        </p>
      </div>
    ),
    { ...size }
  )
}
