# Optimum Assurance — tâches restantes

Liste issue de l’audit projet. Cocher au fur et à mesure.

## Paiement décennale trimestriel (à finaliser côté ops / dev)

- [x] **Prélèvements SEPA automatiques** (T2–T4) : **Customer + mandat** Mollie au webhook après T1 CB ; **cron** `/api/cron/sepa-trimestriel` + prélèvements `sequenceType: recurring`. Voir [docs/SEPA-RECURRENT-MOLLIE.md](./docs/SEPA-RECURRENT-MOLLIE.md). À valider en **test/live** sur votre compte Mollie (`db push`, `CRON_SECRET`, planification Vercel).

## Technique

- [x] **Build Next 16** : `CookieBanner` importé en Client Component direct (plus de `dynamic(..., { ssr: false })` dans le layout racine).
- [x] **Crons sécurisés** : `lib/cron-auth.ts` — en **production**, sans `CRON_SECRET` les routes `/api/cron/*` répondent **503** ; avec secret, `Authorization: Bearer <CRON_SECRET>` requis.
- [ ] `npm run build` : si erreur EPERM (Prisma), fermer tous les terminaux / `npm run dev`, puis relancer.
- [ ] Compléter `.env` : `npm run check-env` jusqu’à ce que toutes les variables **obligatoires** soient vertes.
- [ ] Déploiement : suivre `GUIDE-MISE-EN-LIGNE-SIMPLE.md` (Git + Vercel ou équivalent).
- [ ] En production : `NEXT_PUBLIC_APP_URL` et `NEXTAUTH_URL` en **HTTPS** ; webhooks Mollie / YouSign pointent vers l’URL publique.
- [ ] **Production** : définir `CRON_SECRET` (Vercel env) — les crons planifiés (`vercel.json`) doivent pouvoir l’envoyer (comportement Vercel avec `CRON_SECRET`).
- [x] `YOUSIGN_WEBHOOK_SECRET` sur Vercel (Production + Development) — **à recopier dans le dashboard Yousign** pour le webhook (même valeur).

## Contenu légal (hors code — avocat / conformité assurance)

- [ ] Faire relire **contrat**, **attestations** et **CGV** par un professionnel du droit des assurances.
- [ ] Clarifier sur les PDF : assureur réel vs intermédiaire selon votre statut.

## Déjà facilité dans le code

- [ ] Renseigner dans `.env` : `NEXT_PUBLIC_LEGAL_*`, `NEXT_PUBLIC_ORIAS_NUMBER` (voir `.env.example`) — les mentions légales s’affichent automatiquement.

## Tests manuels

- [ ] Parcours mobile : header (scroll horizontal si besoin), FAQ, Guides, Espace client.
- [ ] Export PDF groupé : QR + URL de vérification sur les attestations (si `verificationToken` présent).
- [ ] Paiement test Mollie + signature test YouSign en sandbox.
