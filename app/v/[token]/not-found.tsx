export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "system-ui, sans-serif",
        background: "#FDF8F3",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          padding: "32px",
          borderRadius: "16px",
          border: "2px solid #F44336",
          background: "#FFEBEE",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#C62828" }}>
          Attestation introuvable
        </h1>
        <p style={{ color: "#404040", fontSize: "0.875rem", marginTop: "8px" }}>
          Le lien de vérification est invalide ou a expiré.
        </p>
      </div>
    </div>
  )
}
