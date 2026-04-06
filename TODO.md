# Optimum Assurance — tâches restantes

Liste issue de l’audit projet. Cocher au fur et à mesure.

## Paiement décennale trimestriel (à finaliser côté ops / dev)

- [x] **Prélèvements SEPA automatiques** (T2–T4) : **Customer + mandat** Mollie au webhook après T1 CB ; **cron** `/api/cron/sepa-trimestriel` + prélèvements `sequenceType: recurring`. Voir [docs/SEPA-RECURRENT-MOLLIE.md](./docs/SEPA-RECURRENT-MOLLIE.md). À valider en **test/live** sur votre compte Mollie (`db push`, `CRON_SECRET`, planification Vercel).

## Technique

- [x] **Build Next 16** : `CookieBanner` importé en Client Component direct (plus de `dynamic(..., { ssr: false })` dans le layout racine).
- [x] **Crons sécurisés** : `lib/cron-auth.ts` — en **production**, sans `CRON_SECRET` les routes `/api/cron/*` répondent **503** ; avec secret, `Authorization: Bearer <CRON_SECRET>` requis.
- [x] **Prod distante** : `npm run verify:prod` — `/api/health`, `/robots.txt`, `/sitemap.xml` en 200 (`https://www.optimum-assurance.fr`).
- [x] **Variables Vercel Production** : `npm run verify:vercel-env` — clés requises + triplet signature Supabase ; `NEXT_PUBLIC_SITE_CANONICAL` présent.
- [ ] `npm run build` : si erreur EPERM (Prisma), fermer tous les terminaux / `npm run dev`, puis relancer.
- [ ] Compléter `.env` / `.env.local` : `npm run check-env` jusqu’à ce que toutes les variables **obligatoires** soient vertes *(en local, sans clés Supabase, le preflight peut échouer — les copier depuis Vercel ou `vercel env pull` si besoin de tester la signature en dev)*.
- [x] Déploiement Git + Vercel : `main` déployé, site accessible en HTTPS.
- [x] En production : URLs **HTTPS** ; parcours signature principal via **Supabase Sign** ; **Yousign** réservé au **legacy** (clés optionnelles sur Vercel si webhook encore utilisé).
- [ ] **Production** : confirmer `CRON_SECRET` sur Vercel si les crons planifiés (`vercel.json`) doivent tourner (sinon 503 volontaire).
- [x] Supabase signature (Vercel) : `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + anon ; SQL `sign_*` à jour sur le projet Supabase utilisé en prod (voir checklist).
- [ ] *(Optionnel legacy)* `YOUSIGN_WEBHOOK_SECRET` aligné avec le dashboard Yousign si `/api/yousign/webhook` est encore utilisé (sinon ignorer).

## Contenu légal (hors code — avocat / conformité assurance)

- [ ] Faire relire **contrat**, **attestations** et **CGV** par un professionnel du droit des assurances.
- [ ] Clarifier sur les PDF : assureur réel vs intermédiaire selon votre statut.

## Déjà facilité dans le code

- [ ] Renseigner dans `.env` : `NEXT_PUBLIC_LEGAL_*`, `NEXT_PUBLIC_ORIAS_NUMBER` (voir `.env.example`) — les mentions légales s’affichent automatiquement.

## Tests manuels

- [ ] Parcours mobile : header (scroll horizontal si besoin), FAQ, Guides, Espace client.
- [ ] Export PDF groupé : QR + URL de vérification sur les attestations (si `verificationToken` présent).
- [ ] Parcours décennale complet : **signature** (lien `/sign/…`, Supabase Sign) → **mandat SEPA** → **paiement Mollie** (test ou live selon politique). *(Legacy : webhook Yousign + `/api/yousign/sync-pending` seulement si anciennes demandes.)*
- [ ] **Google Search Console** : propriété + soumission du sitemap `https://www.optimum-assurance.fr/sitemap.xml`.
