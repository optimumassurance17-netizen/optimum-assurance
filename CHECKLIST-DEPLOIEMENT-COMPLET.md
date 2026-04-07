# Checklist déploiement — Optimum Assurance



Détails longs : **`DEPLOY.md`**.  

Ci-dessous : **état actuel** + ce qui reste **manuel** (dashboards externes).



---



## Déjà fait — conforme



- **Git** : `main` poussé sur GitHub ; CI + déploiement Vercel déclenchés.

- **Vercel** : dernier déploiement **Production** **Ready** ; alias `https://www.optimum-assurance.fr`.

- **Santé prod** : `https://www.optimum-assurance.fr/api/health` → base **connected**, email Resend **configured** (`RESEND_API_KEY` + `EMAIL_FROM` côté serveur).

- **Smoke test prod (sans secrets)** : **`npm run verify:prod`** — `/api/health`, `/robots.txt`, **`/sitemap.xml`** en **200** (sitemap : route handler dynamique + proxy qui **n’applique pas** Supabase session sur `sitemap.xml` / `robots.txt`).

- **Variables Vercel (Production)** : **`npm run verify:vercel-env`** — toutes les clés **requises** présentes (DB, auth, **Mollie**, **Supabase** `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, **Resend**, **`CRON_SECRET`**, etc.). Raccourci : **`npm run verify:release`** (= `verify:vercel-env` puis `verify:prod`).

- **SEO — URL canonique** : **`NEXT_PUBLIC_SITE_CANONICAL`** = `https://www.optimum-assurance.fr` sur Vercel Production (utilisée par `lib/site-url.ts` pour sitemap, robots, métadonnées). Redéployer après changement de cette variable.

- **Prisma** : migration baseline appliquée côté base utilisée ; **`prisma/migrations/migration_lock.toml`** versionné (`provider = "postgresql"`) — requis pour `migrate deploy` (dont CI e2e). Scripts `db:sync-url-vercel`, `verify-supabase`, etc. documentés dans `DEPLOY.md`.

- **Supabase Auth / session (Next.js 16)** : fichier racine **`proxy.ts`** (remplace l’ancienne convention `middleware`) + helpers **`utils/supabase/`** (`server`, `client`, session). Variables : `NEXT_PUBLIC_SUPABASE_URL` + **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** ou **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`**.

- **Dépendances npm** : `npm audit` **0** vulnérabilité (overrides ciblés pour le CLI Vercel ; ne pas utiliser `npm audit fix --force` sans revue).

- **Agent skills Supabase** : **`skills-lock.json`** versionné ; copie locale **`.agents/`** ignorée par git — après clone : **`npm run skills:supabase`**.

- **Qualité locale** : `npm run lint`, `preflight`, `build` OK.

- **CI GitHub** : job **e2e** — Postgres 16 (service), `prisma migrate deploy`, `npm run build`, Playwright Chromium sur **`e2e/*.spec.ts`**. Pas de fichier `.env.e2e` dans le dépôt → le test « connexion admin gestion » reste **ignoré** en CI ; le reste (devis, health API, redirections) est couvert.

- **E2E en local (admin gestion)** : `npm run e2e:seed-admin` génère **`.env.e2e`** (gitignored), puis `npm run test:e2e`. Reproduire le mode CI (après build) : définir **`PLAYWRIGHT_USE_BUILD_SERVER=1`** et **`CI=true`**, puis `npx playwright test` (port **3000** libre, base migrée).



---



## SQL Supabase (sécurité / signature) — à exécuter sur le bon projet



Une fois dans le **SQL Editor** (ou `SUPABASE_DATABASE_URL` en local + scripts npm) :



| Fichier | Objet |

|--------|--------|

| `sql/supabase-bootstrap-all-in-one.sql` | **Tout-en-un** (généré : `npm run supabase:bundle`) — signature + RLS advisor + SEO + slug ; à coller dans SQL Editor |

| `sql/supabase-esign-complete.sql` | Tables signature + buckets + RLS `sign_*` (inclus dans le bootstrap) |

| `sql/supabase-esign-rls-policies.sql` | Seulement politiques RLS `sign_requests` / `signatures` (déjà dans `esign-complete`) |

| `sql/supabase-rls-utilisateurs-entreprises-devis.sql` | RLS sur `utilisateurs`, `entreprises`, `devis` (advisor) |

| `sql/supabase-seo-programmatic.sql` + `supabase-contenus-seo-slug.sql` | Pages SEO localement (inclus dans le bootstrap) |



Commandes locales (nécessitent **`SUPABASE_DATABASE_URL`** dans `.env.local`) :  

**`npm run supabase:install`** — enchaîne esign + RLS advisor + SEO + slug · `npm run supabase:bundle` — régénère le fichier tout-en-un · `npm run supabase:apply-esign-sql` · `npm run supabase:apply-esign-policies` · `npm run supabase:apply-rls-sql`



---



## À faire côté dashboards (si pas déjà fait)



### Mollie

- [ ] **Webhooks** : URL **`https://www.optimum-assurance.fr/api/mollie/webhook`** enregistrée dans l’app Mollie.

- [ ] En **prod**, confirmer dans le dashboard Mollie que tu utilises bien le mode **live** (cohérent avec la clé sur Vercel).



### Signature Supabase (`/api/sign` + Storage)

- [x] Projet **Supabase** + variables sur **Vercel** (vérifié par **`npm run verify:vercel-env`** — section signature).

- [ ] **SQL** (une fois par environnement) : **`sql/supabase-esign-complete.sql`** (voir tableau ci-dessus) **ou** **`npm run supabase:apply-esign-sql`** avec `SUPABASE_DATABASE_URL` — à confirmer sur la base réelle si besoin.

- [ ] Copier **URL**, **anon** (ou clé publishable), **service_role** dans **`.env.local`** pour le dev local / scripts (optionnel si tout passe par Vercel).

- [x] **`npm run vercel:push-supabase-env`** déjà utilisable ; clés présentes côté Vercel si `verify:vercel-env` est vert.

- [ ] **`npm run verify:supabase`** — tables + buckets OK *(nécessite `SUPABASE_SERVICE_ROLE_KEY` en local ou URL DB)*.

- [ ] Aide : **`npm run print:supabase-signature`** — optionnel : `npm run esign:create-request -- …`



### Google Search Console (recommandé pour le suivi SEO)

- [ ] Créer la propriété **domaine** ou **préfixe d’URL** `https://www.optimum-assurance.fr`.

- [ ] Récupérer le code de **vérification** (balise `meta`) → variable **`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`** sur Vercel (Production), puis redéployer — le layout injecte déjà la meta si la variable est définie (voir `.env.example`).

- [ ] **Sitemaps** : soumettre **`https://www.optimum-assurance.fr/sitemap.xml`**.



### Optionnel

- [ ] Variables optionnelles : téléphone/WhatsApp, **Upstash**, Pappers, etc. selon besoins.

- [ ] SEO programmatique : enrichir `seo_decennale_ville` / `seo_do_ville` dans Supabase si tu veux plus de pages localement (voir `lib/seo-programmatic/`).

- [ ] Rotation des secrets si exposition accidentelle.



---



## Commandes utiles



```bash

npm run verify:all

npm run build

npm run audit:env && npm run check-env && npm run preflight

npm run verify:prod

npm run verify:release

npm run verify:vercel-env

npm run print:webhooks

npm run skills:supabase

npx vercel env pull .env.vercel.pull --environment production --yes && npm run db:sync-url-vercel

npx prisma migrate deploy

```



---



*Mis à jour : proxy Next.js 16 (exclusion sitemap/robots), `verify:release`, skills Supabase, SQL RLS, npm audit.*


