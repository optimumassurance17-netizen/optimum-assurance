import fs from "node:fs"
import path from "node:path"
import Link from "next/link"
import { Header } from "@/components/Header"
import {
  COMPANY_BRAND,
  INSURER_NAME,
  LEGAL_DELEGATION_MANDATORY,
  ORIAS_NUMBER,
} from "@/lib/legal-branding"

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"

function loadCgFullText(): string | null {
  try {
    const p = path.join(process.cwd(), "lib", "cg-dommage-ouvrage-full.txt")
    return fs.readFileSync(p, "utf8")
  } catch {
    return null
  }
}

/**
 * Conditions générales dommage ouvrage — texte propre au dispositif Optimum / Axcelrant.
 * Si `lib/cg-dommage-ouvrage-full.txt` est présent (généré par `npm run extract:cg-do`),
 * le texte intégral issu du PDF adapté s’affiche ci-dessous.
 * Ne pas confondre avec les CGV de distribution (courtage numérique) : /cgv
 */
const linkClass = "text-[#2563eb] font-medium underline underline-offset-2 hover:text-[#1d4ed8]"

export default function ConditionsGeneralesDommageOuvragePage() {
  const cgFullText = loadCgFullText()
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-3xl font-semibold text-black tracking-tight">
            Conditions générales — Dommages-ouvrage
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-prose">
            Document contractuel de référence annexé au devis et à la proposition. Les{" "}
            <strong className="font-semibold text-slate-800">conditions particulières</strong> et le{" "}
            <strong className="font-semibold text-slate-800">questionnaire d&apos;étude</strong> complètent et, en cas de
            contradiction, <strong className="font-semibold text-slate-800">prévalent</strong> sur les présentes.
          </p>
        </header>

        <div className="prose prose-gray max-w-none text-[#171717] text-[15px] leading-relaxed prose-headings:scroll-mt-24">
          <section className="not-prose space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-black">Intervenants</h2>
            <div className="space-y-3 text-[15px] leading-relaxed text-[#171717]">
              <p>
                <strong className="text-black">Assureur :</strong> {INSURER_NAME}.
              </p>
              <p>
                <strong className="text-black">Courtier distributeur :</strong> {COMPANY_BRAND}, immatriculé à
                l&apos;ORIAS sous le numéro <strong className="font-semibold text-black">{ORIAS_NUMBER}</strong>.{" "}
                {LEGAL_DELEGATION_MANDATORY}.
              </p>
              <p>
                <strong className="text-black">Service client :</strong>{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                  {CONTACT_EMAIL}
                </a>
                {" — "}
                <Link href="/contact" className={linkClass}>
                  formulaire de contact
                </Link>
                .
              </p>
            </div>
          </section>

          {cgFullText ? (
            <section
              className="not-prose mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 shadow-sm"
              aria-labelledby="cg-do-full-heading"
            >
              <h2 id="cg-do-full-heading" className="text-lg font-semibold text-black mb-5 pb-3 border-b border-slate-200">
                Texte intégral des conditions générales
              </h2>
              <div
                className="max-w-full overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0"
                tabIndex={0}
                role="region"
                aria-label="Texte intégral des conditions générales dommages-ouvrage"
              >
                <div className="whitespace-pre-wrap font-sans text-[15px] leading-[1.7] text-[#171717] [overflow-wrap:anywhere] text-left m-0">
                  {cgFullText}
                </div>
              </div>
            </section>
          ) : null}

          {!cgFullText ? (
            <article className="not-prose mt-8 space-y-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 shadow-sm">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">1. Constitution du contrat</h2>
            <p>Le contrat d&apos;assurance dommages-ouvrage est constitué par :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Les présentes <strong>conditions générales</strong> ;</li>
              <li>Les <strong>conditions particulières</strong> qui individualisent la garantie (montants, adresse du chantier, nature des travaux, options) ;</li>
              <li>Le <strong>questionnaire d&apos;étude</strong> et les pièces techniques transmises pour l&apos;appréciation du risque.</li>
            </ul>
            <p>
              En cas de contradiction entre ces éléments, les <strong>conditions particulières</strong> prévalent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">2. Définitions (résumé)</h2>
            <p>
              <strong>Maître d&apos;ouvrage / Assuré :</strong> la personne physique ou morale tenue à l&apos;obligation
              d&apos;assurance prévue aux articles L.242-1 et suivants du Code des assurances pour l&apos;opération désignée
              aux conditions particulières.
            </p>
            <p>
              <strong>Opération de construction :</strong> les travaux couverts par le contrat et décrits au questionnaire
              d&apos;étude, dans la limite des travaux soumis à l&apos;assurance obligatoire (hors exclusions légales ou
              contractuelles).
            </p>
            <p>
              <strong>Réception :</strong> acte par lequel le maître d&apos;ouvrage accepte les travaux, avec ou sans
              réserves, au sens de l&apos;article 1792-6 du Code civil.
            </p>
            <p>
              <strong>Coût total de la construction :</strong> montant déclaré et, le cas échéant, actualisé selon les
              modalités prévues aux conditions particulières (honoraires, taxes, travaux supplémentaires intégrés dans la
              limite contractuelle).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">3. Garantie dommages-ouvrage obligatoire</h2>
            <p>
              La garantie répond à l&apos;obligation légale pour les dommages affectant la solidité de l&apos;ouvrage ou le
              rendant impropre à sa destination, dans les conditions des articles L.242-1 et L.242-2 du Code des assurances
              et du Code civil (notamment articles 1792 et suivants).
            </p>
            <p>
              Elle vise le paiement ou le financement des travaux de réparation nécessaires, dans la limite des capitaux et
              franchises fixés aux <strong>conditions particulières</strong>. Sauf mention contraire aux conditions
              particulières, la <strong>franchise applicable au produit distribué sur cette plateforme est nulle</strong>{" "}
              (garantie obligatoire — pas de retenue à la charge de l&apos;assuré sur la base indemnisée, sous réserve du
              texte définitif validé par l&apos;assureur).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">4. Autres garanties (selon souscription)</h2>
            <p>Selon les options indiquées aux conditions particulières et au devis :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>
                <strong>Bon fonctionnement (biennale)</strong> — équipements dissociables, dans le délai légal applicable ;
              </li>
              <li>
                <strong>Dommages aux biens et équipements</strong> ou <strong>dommages aux existants</strong> — lorsque
                expressément souscrits ;
              </li>
              <li>
                <strong>Garantie « clos et couvert »</strong> — périmètre réduit aux lots structurels définis au contrat, si
                cette formule est choisie.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">5. Exclusions (indicatif)</h2>
            <p>Sont notamment exclus les sinistres et circonstances énumérés au contrat et par la réglementation :</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Travaux non soumis à l&apos;obligation d&apos;assurance ou non déclarés ;</li>
              <li>Mauvaise exécution des prescriptions techniques ou absence de contrôle lorsque imposé ;</li>
              <li>Dommages résultant de la guerre, du terrorisme, des catastrophes naturelles dans les conditions du contrat
                d&apos;assurance et des clauses types applicable ;</li>
              <li>Vices de conception non couverts au-delà des hypothèses légales, sauf extension contractuelle.</li>
            </ul>
            <p>La liste exhaustive figure aux conditions particulières et aux documents de l&apos;assureur.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">6. Prise d&apos;effet — suspension</h2>
            <p>
              Le contrat prend effet à la date indiquée aux conditions particulières, sous réserve de l&apos;encaissement
              de la prime, de la signature des pièces requises et de l&apos;acceptation du risque par {INSURER_NAME}.
            </p>
            <p>
              Toute inexactitude grave ou réticence dans les déclarations peut entraîner nullité, réduction d&apos;indemnité
              ou résiliation selon les articles L.113-8 et suivants du Code des assurances.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">7. Cotisation</h2>
            <p>
              La prime est celle du devis ou de la proposition, sous réserve de l&apos;étude du dossier. Elle peut être
              révisée si le risque réel diffère des informations déclarées. Les modalités de paiement (virement, prélèvement)
              sont précisées sur la proposition, le mandat et les échéanciers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">8. Obligations en cas de sinistre</h2>
            <p>
              L&apos;assuré doit déclarer le sinistre dans les délais légaux et contractuels, permettre l&apos;expertise et
              fournir les justificatifs (correspondance avec les constructeurs, réception, constats). Toute déclaration
              tardive ou frauduleuse peut affecter les droits à garantie.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">9. Prescription — loi applicable</h2>
            <p>
              Les délais de prescription sont ceux du Code des assurances et du Code civil. Le contrat est soumis au droit
              français. Les tribunaux compétents sont ceux du ressort de la situation du risque ou selon les clauses de
              délégation de juridiction portées au contrat définitif de l&apos;assureur.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">10. Réclamations</h2>
            <p>
              Toute réclamation doit être adressée à {COMPANY_BRAND} à l&apos;adresse indiquée sur vos documents ou à{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                {CONTACT_EMAIL}
              </a>
              . À défaut de réponse satisfaisante, vous pouvez saisir le médiateur de l&apos;assurance compétent et, le cas
              échéant, la juridiction applicable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-black">11. Données personnelles</h2>
            <p>
              Les traitements de données sont décrits dans la{" "}
              <Link href="/confidentialite" className={linkClass}>
                politique de confidentialité
              </Link>
              .
            </p>
          </section>
            </article>
          ) : null}

          <section className="not-prose mt-8 space-y-3 rounded-2xl border border-[var(--border)] bg-slate-50/80 p-5 sm:p-6 text-sm text-slate-600">
            <p>
              <strong className="text-slate-800">Distribution :</strong> les modalités de commande et de service du site
              (paiement en ligne, signature électronique) sont complétées par nos{" "}
              <Link href="/cgv" className={linkClass}>
                conditions générales de vente (CGV)
              </Link>{" "}
              — elles ne remplacent pas le présent document relatif au produit d&apos;assurance dommages-ouvrage.
            </p>
            <p>
              <Link href="/conditions-attestations" className={linkClass}>
                Conditions d&apos;émission des attestations
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
