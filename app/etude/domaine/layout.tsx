import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const metadata: Metadata = {
  title: "Activité non listée — demande d'étude | Optimum Assurance",
  description:
    "Votre domaine d'activité BTP n'apparaît pas dans notre liste ? Décrivez votre métier : notre équipe étudie votre dossier et vous recontacte sous 24 h.",
  alternates: { canonical: `${baseUrl}/etude/domaine` },
}

export default function EtudeDomaineLayout({ children }: { children: React.ReactNode }) {
  return children
}
