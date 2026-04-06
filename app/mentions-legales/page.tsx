import Link from "next/link"
import { Header } from "@/components/Header"

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-8 text-black">Mentions légales</h1>
        <div className="max-w-none text-[#171717] space-y-8 text-[15px] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">1. Éditeur du site</h2>
            <p>
              Le présent site <strong>Optimum Assurance</strong> est édité par :
            </p>
            <p>
              <strong>Optimum Courtage</strong>
              <br />
              Société de courtage en assurance
            </p>
            <p>
              SIRET : <strong>450 788 278</strong>
            </p>
            <p>
              Immatriculation ORIAS : <strong>LPS 28931947</strong>
              <br />
              Activité exercée en libre prestation de services (LPS)
            </p>
            <p>
              Adresse du siège social :
              <br />
              <strong>14 rue d&apos;Amboise</strong>
              <br />
              <strong>49300 Cholet – France</strong>
            </p>
            <p>
              Email :{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#2563eb] hover:underline font-medium">
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">2. Directeur de la publication</h2>
            <p>
              Le directeur de la publication est : <strong>Optimum Courtage</strong>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">3. Hébergement</h2>
            <p>Le site est hébergé par :</p>
            <p>
              <strong>Vercel Inc.</strong>
              <br />
              440 N Barranca Ave #4133
              <br />
              Covina, CA 91723
              <br />
              États-Unis
              <br />
              Site :{" "}
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">
                https://vercel.com
              </a>
            </p>
            <p>Nom de domaine enregistré auprès de :</p>
            <p>
              <strong>IONOS SARL</strong>
              <br />
              7 place de la Gare
              <br />
              57200 Sarreguemines
              <br />
              France
              <br />
              Site :{" "}
              <a href="https://www.ionos.fr" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">
                https://www.ionos.fr
              </a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">4. Activité de courtage</h2>
            <p>
              Optimum Courtage exerce une activité de courtier en assurance conformément aux dispositions du Code des assurances.
            </p>
            <p>
              La société agit en qualité de <strong>courtier indépendant</strong> et propose des contrats d&apos;assurance auprès de plusieurs compagnies partenaires, notamment{" "}
              <strong>Accelerant Insurance</strong>, dans le cadre de délégations de gestion.
            </p>
            <p>
              Optimum Courtage n&apos;est pas soumis à une obligation contractuelle de travailler exclusivement avec une ou plusieurs entreprises d&apos;assurance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">5. Autorité de contrôle</h2>
            <p>L&apos;autorité de contrôle de Optimum Courtage est :</p>
            <p>
              <strong>Autorité de Contrôle Prudentiel et de Résolution (ACPR)</strong>
              <br />
              4 Place de Budapest
              <br />
              CS 92459
              <br />
              75436 Paris Cedex 09
              <br />
              France
              <br />
              Site :{" "}
              <a href="https://acpr.banque-france.fr" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">
                https://acpr.banque-france.fr
              </a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">6. Immatriculation ORIAS</h2>
            <p>
              Optimum Courtage est immatriculée à l&apos;ORIAS (
              <a href="https://www.orias.fr" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">
                www.orias.fr
              </a>
              ) sous le numéro :
            </p>
            <p>
              <strong>LPS 28931947</strong>
            </p>
            <p>Vous pouvez vérifier cette immatriculation sur le site officiel de l&apos;ORIAS.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">7. Responsabilité civile professionnelle</h2>
            <p>
              Optimum Courtage dispose d&apos;une assurance de responsabilité civile professionnelle et d&apos;une garantie financière conformes aux articles L512-6 et L512-7 du Code des assurances.
            </p>
            <p>Les références de la police sont disponibles sur demande.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">8. Médiation</h2>
            <p>En cas de litige, vous pouvez recourir gratuitement au service de médiation suivant :</p>
            <p>
              <strong>La Médiation de l&apos;Assurance</strong>
              <br />
              TSA 50110
              <br />
              75441 Paris Cedex 09
              <br />
              France
            </p>
            <p>
              Site :{" "}
              <a href="https://www.mediation-assurance.org" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">
                https://www.mediation-assurance.org
              </a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">9. Responsabilité</h2>
            <p>
              Les informations diffusées sur le site sont fournies à titre informatif et n&apos;ont pas de valeur contractuelle.
            </p>
            <p>
              Optimum Courtage s&apos;efforce d&apos;assurer l&apos;exactitude des informations, mais ne saurait être tenue responsable des erreurs, omissions ou indisponibilités.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">10. Données personnelles</h2>
            <p>
              Les données collectées sur le site sont utilisées uniquement dans le cadre de la relation commerciale, de la gestion des contrats et du traitement des demandes.
            </p>
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Droit d&apos;accès</li>
              <li>Droit de rectification</li>
              <li>Droit de suppression</li>
              <li>Droit d&apos;opposition</li>
              <li>Droit à la portabilité</li>
            </ul>
            <p>
              Pour exercer vos droits :{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#2563eb] hover:underline font-medium">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p>
              Pour le détail des traitements :{" "}
              <Link href="/confidentialite" className="text-[#2563eb] hover:underline">
                politique de confidentialité
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">11. Cookies</h2>
            <p>
              Le site peut utiliser des cookies afin d&apos;améliorer l&apos;expérience utilisateur, mesurer l&apos;audience et proposer des contenus adaptés.
            </p>
            <p>
              Un bandeau de gestion des cookies permet à l&apos;utilisateur d&apos;accepter ou refuser tout ou partie des cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">12. Lutte contre le blanchiment et le financement du terrorisme</h2>
            <p>
              Conformément à la réglementation en vigueur, Optimum Courtage est soumis aux obligations de lutte contre le blanchiment de capitaux et le financement du terrorisme.
            </p>
            <p>À ce titre, des informations et documents peuvent être demandés aux clients.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">13. Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu du site (textes, images, logo, design, structure, code, etc.) est la propriété exclusive d&apos;Optimum Courtage, sauf mention contraire.
            </p>
            <p>
              Toute reproduction, distribution ou utilisation sans autorisation préalable est strictement interdite.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">14. Démarchage téléphonique</h2>
            <p>
              Conformément à l&apos;article L223-2 du Code de la consommation, vous avez la possibilité de vous inscrire gratuitement sur la liste d&apos;opposition au démarchage téléphonique{" "}
              <strong>Bloctel</strong> (
              <a href="https://www.bloctel.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">
                www.bloctel.gouv.fr
              </a>
              ).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">15. Droit applicable</h2>
            <p>Le présent site est soumis au droit français.</p>
            <p>
              En cas de litige, les tribunaux compétents seront ceux du ressort du siège social d&apos;Optimum Courtage.
            </p>
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
