import Link from "next/link"
import { Header } from "@/components/Header"
import { EtudeDemandeForm } from "@/components/EtudeDemandeForm"

export default function EtudePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <article className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-black mb-4">Demande d’étude décennale</h1>
          <p className="text-[#171717] leading-relaxed mb-4">
            Le devis en ligne tarifie les activités du catalogue lorsque le dossier entre dans le parcours automatique.
            Une étude sert lorsque ce parcours ne peut pas conclure seul : sinistralité, activité absente de la liste,
            ou situation qui demande une lecture manuelle.
          </p>
          <h2 className="text-xl font-semibold text-black mt-6 mb-3">Quand une étude est nécessaire</h2>
          <ul className="list-disc pl-5 space-y-2 text-[#171717]">
            <li>plusieurs sinistres, ou un relevé de sinistralité à transmettre</li>
            <li>une activité ou une technique qui n’est pas dans le menu du devis</li>
            <li>une reprise après une période non assurée ou une résiliation</li>
          </ul>
          <h2 className="text-xl font-semibold text-black mt-6 mb-3">Informations utiles au dossier</h2>
          <ul className="list-disc pl-5 space-y-2 text-[#171717]">
            <li>SIRET et raison sociale</li>
            <li>chiffre d’affaires</li>
            <li>activités exercées</li>
            <li>nombre de sinistres et montant des indemnisations, si le dossier en comporte</li>
            <li>relevé de sinistralité, lorsqu’il est disponible</li>
          </ul>
          <p className="text-[#171717] leading-relaxed mt-6">
            L’envoi de la demande ne vaut ni acceptation, ni tarif, ni délai d’attestation. L’équipe répond sous 24 h
            ouvrées. Le montant, s’il y en a un, est celui du moteur de tarification ou de l’étude du dossier, pas un
            prix affiché ici.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/devis" className="text-[#2563eb] font-medium hover:underline">
              Devis décennale en ligne
            </Link>
            {" · "}
            <Link href="/etude/domaine" className="text-[#2563eb] font-medium hover:underline">
              Activité non listée
            </Link>
            {" · "}
            <Link href="/documents-assurance-decennale" className="text-[#2563eb] font-medium hover:underline">
              Documents du dossier
            </Link>
          </p>
        </article>
        <EtudeDemandeForm />
      </div>
    </main>
  )
}
