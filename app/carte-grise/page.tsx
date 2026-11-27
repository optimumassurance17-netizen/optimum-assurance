import type { Metadata } from "next"
import { Header } from "@/components/Header"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Carte grise en ligne — Demande de certificat d'immatriculation",
  description:
    "Faites votre carte grise en ligne : changement de propriétaire, changement d'adresse, duplicata. Traitement en 24 h via notre partenaire habilité par le Ministère de l'Intérieur.",
}

export default function CarteGrisePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="mx-auto max-w-4xl px-4 pt-8 pb-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Carte grise en ligne
        </h1>
        <p className="mt-2 text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
          Effectuez votre demande de certificat d&apos;immatriculation directement
          en ligne : changement de propriétaire, changement d&apos;adresse,
          duplicata, immatriculation véhicule étranger… Traitement en 24&nbsp;h
          via notre partenaire{" "}
          <strong className="font-semibold text-slate-800">Certimat</strong>,
          habilité par le Ministère de l&apos;Intérieur.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 md:px-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <iframe
            src="https://certimat.fr/iframe/prescripteurs?partner=1281"
            title="Demande de carte grise en ligne — Certimat"
            className="w-full border-0"
            style={{ minHeight: "900px", height: "100vh", maxHeight: "1400px" }}
            allow="payment"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          />
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Service fourni par{" "}
          <a
            href="https://certimat.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-700"
          >
            Certimat.fr
          </a>{" "}
          — professionnel habilité par le Ministère de l&apos;Intérieur (SIV).
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 md:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Questions fréquentes
          </h2>
          <dl className="space-y-4 text-sm text-slate-700">
            <div>
              <dt className="font-medium text-slate-900">
                Quelles démarches puis-je effectuer ?
              </dt>
              <dd className="mt-1 leading-relaxed">
                Changement de propriétaire (carte grise à votre nom),
                changement d&apos;adresse, duplicata (perte / vol), fin de LOA
                ou leasing, immatriculation de véhicule étranger, déclaration
                de cession, et bien d&apos;autres.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">
                Quel est le délai de traitement ?
              </dt>
              <dd className="mt-1 leading-relaxed">
                Votre dossier est traité en 24&nbsp;h dès réception des
                documents. Vous recevez un Certificat Provisoire
                d&apos;Immatriculation (CPI) par email, puis le certificat
                définitif par courrier.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">
                Le service est-il officiel ?
              </dt>
              <dd className="mt-1 leading-relaxed">
                Oui. Certimat est un professionnel habilité par le Ministère de
                l&apos;Intérieur et transmet les demandes directement au
                Système d&apos;Immatriculation des Véhicules (SIV / ANTS).
              </dd>
            </div>
          </dl>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          <Link
            href="/"
            className="font-medium text-blue-600 hover:underline"
          >
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </section>
    </main>
  )
}
