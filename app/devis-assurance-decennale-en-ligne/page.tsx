import type { Metadata } from "next"
import Link from "next/link"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { EQ_MENSUEL_MIN } from "@/lib/decennale-affichage-tarif"
import {
  seoBreadcrumbListNode,
  seoFaqPageNode,
  seoJsonLdGraph,
  seoWebPageNode,
} from "@/lib/seo-jsonld-helpers"
import { SITE_URL } from "@/lib/site-url"
import { truncateForDescription } from "@/lib/seo-metadata-utils"

const canonical = `${SITE_URL}/devis-assurance-decennale-en-ligne`

const faqEntries = [
  {
    q: "Combien de temps faut-il pour obtenir un devis assurance décennale en ligne ?",
    r: "Pour les profils éligibles, la tarification est immédiate après saisie des informations principales (SIRET, activités, chiffre d'affaires, sinistralité).",
  },
  {
    q: "Le devis décennale en ligne engage-t-il l'entreprise ?",
    r: "Non. Le devis est sans engagement. Vous pouvez consulter le tarif avant toute validation contractuelle.",
  },
  {
    q: "Un artisan résilié pour non-paiement peut-il demander un devis ?",
    r: "Oui. Le parcours prévoit ce cas et permet de transmettre le dossier pour étude selon le profil et l'historique.",
  },
  {
    q: "Peut-on demander un devis décennale pour plusieurs activités BTP ?",
    r: "Oui. Le formulaire permet d'ajouter plusieurs activités à assurer afin d'obtenir un tarif cohérent avec la réalité du chantier.",
  },
] as const

const pageJsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Devis décennale", path: "/devis" },
    { name: "Devis assurance décennale en ligne", path: "/devis-assurance-decennale-en-ligne" },
  ]),
  seoWebPageNode({
    path: "/devis-assurance-decennale-en-ligne",
    name: "Devis assurance décennale en ligne",
    description:
      "Page d'information et conversion pour obtenir un devis assurance décennale en ligne, sans engagement.",
  }),
  seoFaqPageNode(faqEntries),
])

export const metadata: Metadata = {
  title: "Devis assurance décennale en ligne | Sans engagement | Optimum Assurance",
  description: truncateForDescription(
    `Obtenez un devis assurance décennale en ligne pour artisans et entreprises du BTP. Tarif immédiat pour profils éligibles, sans engagement. Dès ${EQ_MENSUEL_MIN} €/mois équivalent.`,
    158
  ),
  alternates: { canonical },
  openGraph: {
    type: "website",
    url: canonical,
    title: "Devis assurance décennale en ligne | Optimum Assurance",
    description:
      "Demande de devis décennale en ligne : parcours rapide, cas jamais assuré/résilié traités, accompagnement jusqu'à la souscription.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Devis assurance décennale en ligne | Optimum Assurance",
    description: "Tarification décennale en ligne, sans engagement, pensée pour les pros du BTP.",
    images: [`${SITE_URL}/opengraph-image`],
  },
}

export default function DevisAssuranceDecennaleEnLignePage() {
  return (
    <main className="min-h-screen bg-slate-50/80">
      <JsonLd id="jsonld-devis-assurance-decennale-en-ligne" data={pageJsonLd} />
      <Header />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Devis décennale", href: "/devis" },
            { label: "Devis assurance décennale en ligne" },
          ]}
        />

        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
          Devis assurance décennale en ligne
        </h1>
        <p className="text-[#171717] text-lg leading-relaxed mb-6">
          Vous êtes artisan, auto-entrepreneur ou dirigeant d&apos;une entreprise du bâtiment et vous souhaitez
          obtenir un tarif rapidement ? Cette page vous aide à comprendre comment demander un devis décennale en
          ligne, quelles informations préparer et comment accélérer la mise en place de votre contrat.
        </p>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 mb-8">
          <p className="font-semibold text-slate-900 mb-2">Pourquoi ce parcours fonctionne pour les pros BTP</p>
          <ul className="space-y-1 text-sm text-slate-800">
            <li>• Tarification immédiate pour les dossiers standards éligibles.</li>
            <li>• Traitement des cas fréquents : jamais assuré, résilié non-paiement, sinistres.</li>
            <li>• Enchaînement simple : devis → souscription → signature électronique → paiement.</li>
          </ul>
        </div>

        <section className="space-y-4 mb-10">
          <h2 className="text-2xl font-bold text-slate-900">Comment obtenir votre devis en ligne</h2>
          <p className="text-[#171717] leading-relaxed">
            Pour obtenir un devis fiable, le plus important est la qualité des informations transmises dès le
            départ. La décennale repose sur le risque réel de vos activités. Une activité mal déclarée ou un
            chiffre d&apos;affaires sous-estimé peut provoquer des ajustements plus tard. Le bon réflexe : prendre
            quelques minutes pour remplir correctement votre profil avant de passer à la souscription.
          </p>
          <h3 className="text-xl font-semibold text-slate-900">1) Préparez les données clés</h3>
          <p className="text-[#171717] leading-relaxed">
            Avant de commencer, gardez votre SIRET, votre chiffre d&apos;affaires annuel et la liste de vos
            activités à portée de main. Le formulaire permet de sélectionner plusieurs activités du BTP pour
            coller à votre réalité chantier. Cela améliore la pertinence de la proposition et réduit les allers-retours.
          </p>
          <h3 className="text-xl font-semibold text-slate-900">2) Déclarez votre historique de sinistralité</h3>
          <p className="text-[#171717] leading-relaxed">
            Le nombre de sinistres des 5 dernières années influence directement l&apos;étude du dossier. En cas de
            sinistres, indiquez les montants d&apos;indemnisation et préparez le relevé de sinistralité. C&apos;est un
            point attendu dans la pratique des assureurs construction et cela accélère la décision.
          </p>
          <h3 className="text-xl font-semibold text-slate-900">3) Vérifiez le tarif puis passez en souscription</h3>
          <p className="text-[#171717] leading-relaxed">
            Le devis affiché est consultable sans engagement. Vous pouvez ensuite continuer vers la souscription
            pour finaliser le dossier, signer électroniquement et procéder au règlement selon les modalités
            proposées. Ce parcours réduit les délais entre la demande initiale et l&apos;attestation.
          </p>
        </section>

        <section className="space-y-4 mb-10">
          <h2 className="text-2xl font-bold text-slate-900">Objections fréquentes avant de demander un devis</h2>
          <p className="text-[#171717] leading-relaxed">
            Beaucoup de professionnels reportent leur demande parce qu&apos;ils pensent ne pas être éligibles.
            Pourtant, plusieurs situations peuvent être étudiées : première assurance, changement d&apos;assureur,
            résiliation antérieure ou reprise d&apos;activité. Le plus efficace est de lancer le parcours avec des
            données exactes ; vous saurez rapidement si la tarification est immédiate ou si une étude dédiée est nécessaire.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/assurance-decennale/plombier" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 transition-all">
              <p className="font-semibold text-slate-900">Décennale plombier</p>
              <p className="text-sm text-slate-700 mt-1">Exemples et points de vigilance métier.</p>
            </Link>
            <Link href="/assurance-decennale/electricien" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 transition-all">
              <p className="font-semibold text-slate-900">Décennale électricien</p>
              <p className="text-sm text-slate-700 mt-1">Activités déclarées et tarification.</p>
            </Link>
          </div>
        </section>

        <section className="space-y-4 mb-10">
          <h2 className="text-2xl font-bold text-slate-900">FAQ rapide : devis assurance décennale en ligne</h2>
          <div className="space-y-3">
            {faqEntries.map((item) => (
              <div key={item.q} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900 mb-1">{item.q}</p>
                <p className="text-sm text-slate-700">{item.r}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Passez à l&apos;action</h2>
          <p className="text-slate-700 mb-5">
            Lancez votre demande de devis décennale en ligne et obtenez une réponse adaptée à votre profil.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/devis"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Obtenir mon devis décennale
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Consulter la FAQ
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
