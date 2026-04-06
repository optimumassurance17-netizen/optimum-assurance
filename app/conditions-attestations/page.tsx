import Link from "next/link"
import { Header } from "@/components/Header"

export default function ConditionsAttestationsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-2 text-black">
          Conditions d&apos;émission et de validité des attestations
        </h1>
        <p className="text-lg font-medium text-[#171717] mb-8">Assurance décennale &amp; dommages-ouvrage</p>
        <div className="max-w-none text-[#171717] space-y-8 text-[15px] leading-relaxed">
          <section className="space-y-3">
            <p>
              Les présentes conditions s&apos;appliquent à toute attestation d&apos;assurance délivrée par <strong>Optimum Assurance</strong>, service opéré par <strong>Optimum Courtage</strong>, agissant en qualité de courtier en assurance immatriculé à l&apos;ORIAS sous le numéro{" "}
              <strong>LPS 28931947</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">1. Délégation</h2>
            <p>
              Les contrats d&apos;assurance sont souscrits auprès de compagnies partenaires, notamment <strong>Accelerant Insurance</strong>.
            </p>
            <p>
              <strong>Optimum Courtage / Optimum Assurance agit par délégation de l&apos;assureur pour la distribution et, le cas échéant, la gestion des contrats.</strong>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">2. Conditions d&apos;émission de l&apos;attestation</h2>
            <p>Toute attestation d&apos;assurance (décennale ou dommages-ouvrage) est délivrée uniquement sous réserve :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>De la validation complète du dossier par l&apos;assureur</li>
              <li>De l&apos;acceptation du risque</li>
              <li>De la réception des pièces justificatives demandées</li>
              <li>Du paiement effectif de la cotisation ou de l&apos;échéance initiale</li>
            </ul>
            <p className="flex gap-2 items-start">
              <span aria-hidden className="shrink-0">
                ⚠️
              </span>
              <span>
                <strong>Aucune attestation ne peut être considérée comme valide en l&apos;absence de ces conditions cumulatives.</strong>
              </span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">3. Portée de l&apos;attestation</h2>
            <p>L&apos;attestation d&apos;assurance constitue un document informatif qui :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Résume les garanties souscrites</li>
              <li>Ne remplace pas les conditions générales et particulières du contrat</li>
              <li>Ne peut en aucun cas étendre les garanties contractuelles</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">4. Limites de garantie</h2>
            <p>Les garanties s&apos;appliquent strictement :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Aux activités déclarées lors de la souscription</li>
              <li>Aux chantiers conformes aux conditions du contrat</li>
              <li>Dans les limites et exclusions prévues par l&apos;assureur</li>
            </ul>
            <p>Toute activité non déclarée ou non validée est exclue de garantie.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">5. Validité de l&apos;attestation</h2>
            <p>L&apos;attestation est valable :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Pour la période indiquée</li>
              <li>Sous réserve du paiement continu des cotisations</li>
              <li>Tant que le contrat n&apos;est pas suspendu, résilié ou annulé</li>
            </ul>
            <p className="flex gap-2 items-start">
              <span aria-hidden className="shrink-0">
                ⚠️
              </span>
              <span>En cas de non-paiement ou d&apos;incident, les garanties peuvent être suspendues immédiatement.</span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">6. Vérification et authenticité</h2>
            <p>
              L&apos;authenticité de toute attestation peut être vérifiée auprès de <strong>Optimum Courtage</strong>.
            </p>
            <p>Toute falsification ou usage frauduleux expose son auteur à des poursuites.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">7. Dommages-ouvrage (spécifique)</h2>
            <p>Pour les contrats dommages-ouvrage :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>L&apos;attestation ne vaut pas acceptation définitive du chantier</li>
              <li>La garantie est subordonnée à l&apos;étude complète du dossier technique</li>
              <li>Les travaux doivent respecter les normes en vigueur</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">8. Responsabilité</h2>
            <p>Optimum Courtage agit en qualité d&apos;intermédiaire.</p>
            <p>
              La responsabilité des garanties incombe exclusivement à l&apos;assureur, notamment <strong>Accelerant Insurance</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">9. Opposabilité</h2>
            <p>Les présentes conditions sont opposables :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Au souscripteur</li>
              <li>Au bénéficiaire de l&apos;attestation</li>
              <li>À tout tiers s&apos;en prévalant</li>
            </ul>
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
