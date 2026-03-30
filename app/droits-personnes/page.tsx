import Link from "next/link"
import { Header } from "@/components/Header"

const contactEmail = process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"

export default function DroitsPersonnesPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-8 text-[#0a0a0a]">
          Vos droits sur vos données personnelles
        </h1>
        <p className="text-[#171717] mb-8">
          Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez de droits sur vos données personnelles. Cette page vous explique comment les exercer.
        </p>

        <div className="prose prose-gray max-w-none text-[#171717] space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-[#0a0a0a] mb-4">Droit d&apos;accès (article 15)</h2>
            <p>Vous pouvez obtenir une copie de vos données personnelles détenues par Optimum Assurance. Pour cela, adressez une demande écrite à l&apos;adresse ci-dessous. Nous vous répondrons dans un délai d&apos;un mois.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0a0a0a] mb-4">Droit de rectification (article 16)</h2>
            <p>Vous pouvez demander la correction de données inexactes ou incomplètes. Connectez-vous à votre espace client pour modifier vos coordonnées, ou contactez-nous pour les autres données.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0a0a0a] mb-4">Droit à l&apos;effacement (article 17)</h2>
            <p>Vous pouvez demander la suppression de vos données dans les limites prévues par la loi. Certaines données doivent être conservées 10 ans pour nos obligations légales en assurance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0a0a0a] mb-4">Droit à la limitation du traitement (article 18)</h2>
            <p>Vous pouvez demander la suspension du traitement de vos données dans certains cas (contestation de l&apos;exactitude, traitement illicite, etc.).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0a0a0a] mb-4">Droit à la portabilité (article 20)</h2>
            <p>Vous pouvez recevoir vos données dans un format structuré et lisible par machine, ou demander leur transmission à un autre responsable de traitement.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0a0a0a] mb-4">Droit d&apos;opposition (article 21)</h2>
            <p>Vous pouvez vous opposer au traitement de vos données pour des motifs légitimes, notamment pour la prospection commerciale.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0a0a0a] mb-4">Réclamation auprès de la CNIL</h2>
            <p>Si vous estimez que le traitement de vos données porte atteinte au RGPD, vous pouvez introduire une réclamation auprès de la Commission Nationale de l&apos;Informatique et des Libertés (CNIL) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">www.cnil.fr</a></p>
          </section>

          <section className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#0a0a0a] mb-4">Exercer vos droits</h2>
            <p className="mb-4">Pour toute demande relative à vos données personnelles :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Par email : <a href={`mailto:${contactEmail}`} className="text-[#2563eb] hover:underline">{contactEmail}</a></li>
              <li>En précisant l&apos;objet de votre demande (accès, rectification, effacement, etc.)</li>
              <li>En joignant une copie d&apos;une pièce d&apos;identité pour vérifier votre identité</li>
            </ul>
            <p className="mt-4 text-sm text-[#171717]">Nous nous engageons à vous répondre dans un délai maximal d&apos;un mois à compter de la réception de votre demande.</p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/confidentialite" className="text-[#2563eb] font-medium hover:underline">
            Politique de confidentialité
          </Link>
          <Link href="/mentions-legales" className="text-[#2563eb] font-medium hover:underline">
            Mentions légales
          </Link>
          <Link href="/" className="text-[#2563eb] font-medium hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
