# Checklist déploiement complète — Optimum Assurance

Document de contrôle : cocher au fur et à mesure. Détails dans **`DEPLOY.md`**.

---

## A. Comptes & dépôt

- [ ] Compte **GitHub** avec le code à jour (branche de production définie, ex. `main`).
- [ ] Compte **Vercel** ; projet **importé** depuis GitHub (ou `vercel link` en local).
- [ ] Branche **Production** sur Vercel = la branche que tu pousses pour la prod.
- [ ] **Commit / push** de tous les changements locaux (lockfile, `prisma/migrations`, scripts, config) pour ne rien perdre.

---

## B. Base PostgreSQL (Neon, Supabase Postgres, etc.)

- [ ] Instance **PostgreSQL** créée (pas SQLite pour ce projet).
- [ ] **`DATABASE_URL`** au format `postgresql://…` ou `postgres://…` avec **`sslmode=require`** (ou équivalent) si le fournisseur l’exige.
- [ ] Même **`DATABASE_URL`** (ou équivalent) sur **Vercel → Environment Variables → Production** (et Preview si besoin).
- [ ] **Prisma — baseline** : le dépôt contient `prisma/migrations/20260403120000_baseline`.
  - [ ] Sur une base **déjà remplie** sans historique Migrate : exécuter **une fois**  
        `npx prisma migrate resolve --applied 20260403120000_baseline`
  - [ ] Puis **`npx prisma migrate deploy`** → doit afficher « No pending migrations ».
  - [ ] Sur une **base vide** : seulement **`npx prisma migrate deploy`** suffit.
- [ ] **Aligner le `.env` local** avec la prod (option) :  
      `npx vercel env pull .env.vercel.pull --environment production --yes`  
      puis **`npm run db:sync-url-vercel`**
- [ ] **Changements de schéma futurs** : `npx prisma migrate dev` en local → commit du dossier `prisma/migrations` → `npx prisma migrate deploy` sur la prod.

---

## C. Vercel — build & région

- [ ] **Build command** : laisser celle du **`vercel.json`** → `npm run vercel-build` (Prisma generate + Next build), sauf override manuel dans le dashboard.
- [ ] **Région** : `vercel.json` indique **`cdg1`** ; vérifier dans Vercel **Settings** qu’aucune autre région ne surcharge tout le projet si tu veux l’Europe.
- [ ] Après **chaque modification** des variables d’environnement : **Redeploy** (ou nouveau push).

---

## D. Variables d’environnement — obligatoires (prod)

À renseigner sur **Vercel → Settings → Environment Variables** (au minimum **Production**).

| Variable | Action |
|----------|--------|
| `DATABASE_URL` | URI Postgres prod |
| `NEXTAUTH_SECRET` | Secret long et aléatoire (`npm run generate-secret`) |
| `NEXTAUTH_URL` | URL **publique HTTPS** du site (ex. `https://www.optimum-assurance.fr`) |
| `NEXT_PUBLIC_APP_URL` | **Identique** à `NEXTAUTH_URL` (même origine) |
| `MOLLIE_API_KEY` | En prod : préfixe **`live_`** |
| `RESEND_API_KEY` | Clé API Resend |
| `EMAIL_FROM` | Expéditeur autorisé (domaine vérifié chez Resend) |
| `YOUSIGN_API_KEY` | Clé Yousign |
| `YOUSIGN_ENV` | **`production`** en prod |
| `ADMIN_EMAILS` | Liste des emails autorisés sur `/gestion` |

- [ ] Toutes les lignes ci-dessus sont remplies et cohérentes (pas d’URL `localhost` en prod).

---

## E. Variables — fortement recommandées

| Variable | Action |
|----------|--------|
| `CRON_SECRET` | Secret pour sécuriser les appels **`/api/cron/*`** (définis dans `vercel.json`) |
| `YOUSIGN_WEBHOOK_SECRET` | Vérification des webhooks Yousign |

- [ ] `CRON_SECRET` défini si les crons doivent tourner en prod.
- [ ] `YOUSIGN_WEBHOOK_SECRET` défini si tu utilises les webhooks Yousign.

---

## F. Variables — optionnelles (fonctionnalités / confort)

| Variable | Usage |
|----------|--------|
| `MOLLIE_PUBLIC_BASE_URL` | Webhooks Mollie si URL différente de `NEXT_PUBLIC_APP_URL` (ex. ngrok en dev) |
| `NEXT_PUBLIC_SITE_CANONICAL` | URL canonique forcée (SEO) |
| `NEXT_PUBLIC_PHONE` | Affichage site |
| `NEXT_PUBLIC_EMAIL` | Contact affiché |
| `NEXT_PUBLIC_WHATSAPP` | Lien WhatsApp |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console |
| `PAPPERS_API_KEY` | Préremplissage SIRET (Pappers) |
| `INSEE_API_KEY_INTEGRATION` | Préremplissage SIRET (INSEE) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Rate limit distribué (chat / contact) |
| `NEXT_PUBLIC_SUPABASE_URL` | Projet Supabase (URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé **service_role** (serveur uniquement) — **obligatoire** si signature MVP `/sign` + `/api/sign` |

- [ ] Cocher celles que tu utilises réellement.

---

## G. Intégration Vercel ↔ Supabase (marketplace)

- [ ] **[vercel.com/integrations/supabase](https://vercel.com/integrations/supabase)** : intégration ajoutée au bon **projet Vercel** + bon **projet Supabase**.
- [ ] Vérifier les noms des variables injectées ; les aligner sur **`NEXT_PUBLIC_SUPABASE_*`** et ajouter **`SUPABASE_SERVICE_ROLE_KEY`** à la main si absente.
- [ ] **Redeploy** après ajout des clés.

---

## H. Signature électronique MVP (Supabase + Storage)

Si tu utilises **`/sign/[id]`** et **`POST /api/sign`** :

- [ ] SQL exécuté dans Supabase : **`sql/supabase-esign-mvp.sql`** puis **`sql/supabase-esign-storage.sql`**  
      (ou équivalent **`supabase/migrations/20250403120000_esign_signature_mvp.sql`** via `supabase db push --db-url …`).
- [ ] Buckets Storage **`documents`** et **`signed_documents`** présents.
- [ ] Sur Vercel : **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, **`SUPABASE_SERVICE_ROLE_KEY`**.
- [ ] Test local ou après déploiement : **`npm run verify:supabase`** (avec `.env.local` ou pull Vercel).
- [ ] Création d’un lien test : **`npm run esign:create-request -- chemin/contrat.pdf`** puis ouvrir l’URL `/sign/…`.

**Option CI** : secret GitHub **`SUPABASE_DATABASE_URL`** + workflow **Supabase — migrations (signature)** si tu l’utilises.

---

## I. Mollie (paiements)

- [ ] Dashboard Mollie : URL webhook = **`https://TON_DOMAINE/api/mollie/webhook`**
- [ ] Clé **`live_`** en production sur Vercel.
- [ ] Tester un paiement test / réel selon ta politique.

---

## J. Resend (emails transactionnels)

- [ ] Domaine **vérifié** dans Resend.
- [ ] **`EMAIL_FROM`** correspond à une adresse / domaine autorisé.
- [ ] Test d’envoi (inscription, devis, etc.).

---

## K. Yousign

- [ ] **`YOUSIGN_ENV=production`** en prod.
- [ ] Webhooks + URLs de callback configurés côté Yousign selon leur documentation.
- [ ] **`YOUSIGN_WEBHOOK_SECRET`** si tu sécurises les webhooks.

---

## L. Domaine & DNS

- [ ] Nom de domaine ajouté dans **Vercel → Domains** (ex. `www.optimum-assurance.fr`).
- [ ] **DNS** chez le registrar : enregistrements indiqués par Vercel (A / CNAME).
- [ ] **`NEXTAUTH_URL`** et **`NEXT_PUBLIC_APP_URL`** = **HTTPS** sur ce domaine (pas l’URL `*.vercel.app` en prod finale, sauf choix assumé).

---

## M. Après déploiement — vérifications

- [ ] **`https://TON_DOMAINE/api/health`** → base **`connected`** (ou équivalent attendu).
- [ ] Page d’accueil, `/devis`, `/connexion`, flux critique métier.
- [ ] **Google Search Console** : propriété + soumission **`/sitemap.xml`**.
- [ ] **GitHub Actions** : build vert sur la branche principale (`.github/workflows/ci.yml`).

---

## N. Fichiers d’environnement locaux (développement)

- [ ] **`.env`** + **`.env.local`** : pas de placeholders **`HOST` / `NOM_BASE`** dans `DATABASE_URL`.
- [ ] **`NEXTAUTH_SECRET`** dans `.env` : pas de texte d’exemple ; ou supprimer la ligne si tout est dans **`.env.local`**.
- [ ] Ne **jamais committer** les secrets (`.env*` sont en général gitignored).
- [ ] Commandes de contrôle :  
      **`npm run audit:env`** · **`npm run check-env`** · **`npm run verify:supabase`** · **`npm run preflight`**

---

## O. PWA & assets

- [ ] Icônes **`public/icon-192.png`** et **`public/icon-512.png`** : **`npm run icons:pwa`** si tu les régénères.

---

## P. Sécurité dépendances (npm)

- [ ] **`npm audit`** consulté ; **`npm audit fix`** (sans `--force`) appliqué si tu veux corriger le sans risque.
- [ ] Éviter **`npm audit fix --force`** sur **`vercel`** sans tester (changements breaking).

---

## Q. Secrets à générer / lister pour Vercel

- [ ] **`npm run secrets:prod`** (ou équivalent) pour préparer des valeurs à coller dans Vercel.

---

## R. Résumé des commandes utiles

```bash
# Contrôles
npm run audit:env
npm run check-env
npm run verify:supabase
npm run preflight
npm run build

# Déploiement CLI
npx vercel login
npm run deploy

# Prisma (prod, URL dans .env)
npx prisma migrate deploy

# Pull env Vercel Production → sync DATABASE_URL locale
npx vercel env pull .env.vercel.pull --environment production --yes
npm run db:sync-url-vercel
```

---

*Dernière mise à jour : checklist alignée sur `DEPLOY.md`, `vercel.json`, `check-env.mjs` et le flux signature Supabase du dépôt.*
