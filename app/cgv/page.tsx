import Link from "next/link"
import { Header } from "@/components/Header"

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"

export default function CGVPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-8 text-black">Conditions générales de vente (CGV)</h1>
        <div className="max-w-none text-[#171717] space-y-8 text-[15px] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">1. Objet</h2>
            <p>
              Les présentes Conditions Générales de Vente (CGV) définissent les modalités de souscription, de validation et de gestion des contrats d&apos;assurance proposés sur le site{" "}
              <strong>Optimum Assurance</strong>, édité par <strong>Optimum Courtage</strong>, courtier en assurance indépendant immatriculé à l&apos;ORIAS sous le numéro{" "}
              <strong>LPS 28931947</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">2. Nature du service</h2>
            <p>Optimum Courtage agit en qualité d&apos;intermédiaire en assurance et propose un service digital permettant :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>La tarification en ligne</li>
              <li>L&apos;édition de devis</li>
              <li>La souscription dématérialisée</li>
              <li>La signature électronique</li>
              <li>La mise en place d&apos;un mandat SEPA</li>
            </ul>
            <p>
              Les contrats sont portés par des compagnies partenaires, notamment <strong>Axcelrant Insurance</strong>, dans le cadre de délégations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">3. Processus de souscription</h2>
            <p>La souscription suit les étapes suivantes :</p>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Saisie des informations</li>
              <li>Génération du devis</li>
              <li>Validation par le client</li>
              <li>Signature électronique</li>
              <li>Mise en place du mandat SEPA</li>
              <li>Paiement</li>
            </ol>
            <p className="flex gap-2 items-start">
              <span aria-hidden className="shrink-0">
                ⚠️
              </span>
              <span>
                <strong>La souscription reste soumise à validation de l&apos;assureur.</strong>
              </span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">4. Validation du contrat</h2>
            <p>Le contrat est réputé formé uniquement après :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Validation du dossier par l&apos;assureur</li>
              <li>Acceptation du risque</li>
              <li>Encaissement du premier paiement</li>
            </ul>
            <p>Optimum Courtage se réserve le droit de refuser un dossier sans justification.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">5. Clause anti-fraude et déclarations</h2>
            <p>Le client certifie l&apos;exactitude des informations fournies.</p>
            <p>Toute fausse déclaration, tentative de fraude ou incohérence entraîne :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Refus immédiat du dossier</li>
              <li>Annulation du contrat</li>
              <li>Perte de toute garantie</li>
              <li>Signalement aux autorités compétentes si nécessaire</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">6. Attestation d&apos;assurance décennale</h2>
            <p>L&apos;attestation d&apos;assurance est délivrée uniquement si :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Le dossier est validé par l&apos;assureur</li>
              <li>Le paiement est effectué</li>
              <li>Les pièces justificatives sont conformes</li>
            </ul>
            <p className="flex gap-2 items-start">
              <span aria-hidden className="shrink-0">
                ⚠️
              </span>
              <span>Aucune attestation ne sera délivrée en cas de dossier incomplet ou en cours d&apos;analyse.</span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">7. Conditions spécifiques décennale</h2>
            <p>Le client reconnaît que :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>La garantie dépend strictement des activités déclarées</li>
              <li>Toute activité non déclarée est exclue</li>
              <li>Les chantiers réalisés hors cadre contractuel ne sont pas couverts</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">8. Paiement et mandat SEPA</h2>
            <p>Le paiement s&apos;effectue par prélèvement automatique via mandat SEPA.</p>
            <p>Le client autorise expressément :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Le prélèvement des cotisations</li>
              <li>Les prélèvements récurrents</li>
            </ul>
            <p>En cas de rejet :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Suspension des garanties</li>
              <li>Résiliation possible</li>
              <li>Frais supplémentaires applicables</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">9. Signature électronique</h2>
            <p>La signature électronique vaut engagement contractuel ferme.</p>
            <p>Elle a la même valeur juridique qu&apos;une signature manuscrite.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">10. Absence de droit à garantie immédiate</h2>
            <p>Aucune garantie ne prend effet :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Avant validation assureur</li>
              <li>Avant paiement</li>
              <li>Avant émission des documents contractuels</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">11. Résiliation</h2>
            <p>Le contrat peut être résilié :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Par le client selon les conditions contractuelles</li>
              <li>Par l&apos;assureur en cas de non-paiement ou fraude</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">12. Limitation de responsabilité</h2>
            <p>Optimum Courtage agit en qualité d&apos;intermédiaire.</p>
            <p>La responsabilité de la couverture et de l&apos;indemnisation incombe exclusivement à l&apos;assureur.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">13. Données personnelles</h2>
            <p>Les données collectées sont nécessaires à :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>L&apos;étude du risque</li>
              <li>La souscription</li>
              <li>La gestion des contrats</li>
            </ul>
            <p>Elles sont traitées conformément au RGPD.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">14. Lutte contre le blanchiment</h2>
            <p>Des justificatifs peuvent être demandés à tout moment.</p>
            <p>Le refus de transmission entraîne le blocage du dossier.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">15. Réclamations</h2>
            <p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#2563eb] hover:underline font-medium">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p>En cas de litige :</p>
            <p>
              <strong>La Médiation de l&apos;Assurance</strong>
              <br />
              <a href="https://www.mediation-assurance.org" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">
                www.mediation-assurance.org
              </a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">16. Droit applicable</h2>
            <p>Les présentes CGV sont soumises au droit français.</p>
          </section>
        </div>
        <p className="mt-10">
          <Link href="/" className="text-[#2563eb] hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  )
}
