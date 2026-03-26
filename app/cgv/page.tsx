import Link from "next/link"
import { Header } from "@/components/Header"

export default function CGVPage() {
  return (
    <main className="min-h-screen bg-[#FDF8F3]">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-8 text-black">Conditions générales de vente</h1>
        <div className="prose prose-gray max-w-none text-[#171717] space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-black">1. Objet</h2>
            <p>Les présentes CGV régissent les contrats d&apos;assurance décennale souscrits auprès d&apos;Optimum Assurance via le site optimum-assurance.fr.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">2. Devis et souscription</h2>
            <p>Le devis est valable 30 jours. La souscription est effective après signature électronique du contrat et validation du premier paiement. L&apos;attestation est délivrée dès réception du paiement.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">3. Paiement</h2>
            <p>
              Paiement : premier trimestre (avec frais de gestion de 60 €) par carte bancaire, puis prélèvements SEPA trimestriels sur l&apos;IBAN du mandat. Les montants de cotisation sont dus par échéances trimestrielles ; les éventuels montants présentés en « équivalent mensuel » sur le site (prime annuelle divisée par 12) sont indicatifs et ne modifient pas l&apos;échéancier contractuel.
            </p>
            <p>En cas d&apos;impayé, l&apos;attestation peut être suspendue. Régularisation possible par carte bancaire.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">3 bis. Avenants</h2>
            <p>Les avenants de modification sont soumis à des frais de 60 € uniques, automatiquement reportés sur la prochaine échéance de prélèvement.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">3 ter. Reprise du passé</h2>
            <p>La reprise du passé permet de couvrir rétroactivement les ouvrages des 3 derniers mois, sous réserve de non sinistralité. Elle n&apos;est proposée qu&apos;en l&apos;absence de sinistre déclaré sur les 5 dernières années. Une majoration de 40 % s&apos;applique sur la prime correspondant à ces 3 mois.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">4. Durée et renouvellement</h2>
            <p>Le contrat est conclu pour une période annuelle (du jour de souscription au 31 décembre). Il est renouvelable tacitement du 1er janvier au 31 décembre de chaque année.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">5. Résiliation</h2>
            <p>Les demandes de résiliation doivent être adressées par lettre recommandée au plus tard 2 mois avant la date d&apos;échéance (31 décembre). Un minimum d&apos;un an de contrat est requis avant toute résiliation à l&apos;échéance.</p>
            <p>En cas de non-paiement, le contrat peut être résilié après mise en demeure.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-black">6. Réclamations et médiation</h2>
            <p>Pour toute réclamation : contact@optimum-assurance.fr ou par courrier à l&apos;adresse du siège social.</p>
            <p>Conformément au Code des assurances (L. 612-1 et suivants), en cas de litige vous pouvez saisir le médiateur de la consommation :</p>
            <p className="mt-2">
              <strong>Médiateur de la consommation</strong><br />
              Association CM2C – 14 rue Saint Jean 75017 Paris<br />
              Site : www.cm2c.net
            </p>
          </section>
        </div>
        <p className="mt-8">
          <Link href="/" className="text-[#C65D3B] hover:underline">← Retour à l&apos;accueil</Link>
        </p>
      </div>
    </main>
  )
}
