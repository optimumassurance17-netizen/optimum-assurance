import Link from "next/link"
import { Header } from "@/components/Header"

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-8 text-black">Politique de confidentialité</h1>
        <div className="prose prose-gray max-w-none text-[#171717] space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-black">1. Responsable du traitement</h2>
            <p>Optimum Assurance est responsable du traitement des données personnelles collectées sur ce site.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">2. Données collectées</h2>
            <p>Nous collectons : identité (raison sociale, SIRET, représentant légal), coordonnées (email, téléphone, adresse), informations relatives à votre activité (chiffre d&apos;affaires, sinistres, activités assurées), données de paiement (traitées par Mollie).</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">3. Finalités</h2>
            <p>Les données sont utilisées pour : établir des devis, gérer les contrats et attestations, traiter les paiements, vous contacter concernant votre assurance, respecter nos obligations légales.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">4. Base légale</h2>
            <p>Le traitement repose sur : l&apos;exécution du contrat, votre consentement (cookies, communications), nos obligations légales (assurance, comptabilité).</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">5. Durée de conservation</h2>
            <p>Les données sont conservées pendant la durée du contrat et 10 ans après sa fin (obligations légales en matière d&apos;assurance).</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">6. Vos droits (RGPD)</h2>
            <p>Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, de portabilité et d&apos;opposition. Contactez-nous pour les exercer. Vous pouvez également introduire une réclamation auprès de la CNIL.</p>
            <p className="mt-4">
              <Link href="/droits-personnes" className="text-[#C65D3B] font-medium hover:underline">
                → Voir le détail de vos droits et comment les exercer
              </Link>
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">7. Sécurité</h2>
            <p>Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données (chiffrement, accès restreint, hébergement sécurisé).</p>
          </section>
        </div>
        <p className="mt-8">
          <Link href="/" className="text-[#C65D3B] hover:underline">← Retour à l&apos;accueil</Link>
        </p>
      </div>
    </main>
  )
}
