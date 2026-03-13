import Link from "next/link"
import { Header } from "@/components/Header"

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-8 text-black">Mentions légales</h1>
        <div className="prose prose-gray max-w-none text-[#171717] space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-black">1. Éditeur du site</h2>
            <p>Le site optimum-assurance.fr est édité par Optimum Assurance, société par actions simplifiée au capital de 10 000 €, dont le siège social est situé au [adresse du siège à compléter], immatriculée au RCS de [ville] sous le numéro [SIRET].</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">2. Intermédiaire en assurance</h2>
            <p>Optimum Assurance est un intermédiaire en assurance immatriculé à l&apos;ORIAS sous le numéro [numéro ORIAS à compléter]. L&apos;ORIAS est le registre unique des intermédiaires en assurance, mutuelle et prévoyance. Vous pouvez vérifier notre immatriculation sur <a href="https://www.orias.fr" target="_blank" rel="noopener noreferrer" className="text-[#C65D3B] hover:underline">www.orias.fr</a>.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">3. Hébergement</h2>
            <p>Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">4. Propriété intellectuelle</h2>
            <p>L&apos;ensemble du contenu de ce site (textes, images, logos, structure) est protégé par le droit d&apos;auteur. Toute reproduction non autorisée est interdite.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">5. Données personnelles</h2>
            <p>Pour plus d&apos;informations sur le traitement de vos données personnelles, consultez notre <Link href="/confidentialite" className="text-[#C65D3B] hover:underline">politique de confidentialité</Link>.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">6. Cookies</h2>
            <p>Le site utilise des cookies techniques nécessaires au fonctionnement (session, authentification). Aucun cookie publicitaire n&apos;est utilisé.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">7. Contact</h2>
            <p>Pour toute question concernant les mentions légales : contactez-nous via les coordonnées indiquées dans le footer du site.</p>
          </section>
        </div>
        <p className="mt-8">
          <Link href="/" className="text-[#C65D3B] hover:underline">← Retour à l&apos;accueil</Link>
        </p>
      </div>
    </main>
  )
}
