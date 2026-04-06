# Checklist déploiement — Optimum Assurance



Détails longs : **`DEPLOY.md`**.  

Ci-dessous : **état actuel** + ce qui reste **manuel** (dashboards externes).



---



## Déjà fait — conforme



- **Git** : `main` poussé sur GitHub ; CI + déploiement Vercel déclenchés.

- **Vercel** : dernier déploiement **Production** **Ready** ; alias `https://www.optimum-assurance.fr`.

- **Santé prod** : `https://www.optimum-assurance.fr/api/health` → base **connected**, email Resend **configured** (`RESEND_API_KEY` + `EMAIL_FROM` côté serveur).

- **Variables Vercel (Production)** : **`npm run verify:vercel-env`** — toutes les clés **requises** présentes (DB, auth, **Mollie**, **Supabase** `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, **Resend**, **`CRON_SECRET`**, etc.). Les clés **Yousign** restent **optionnelles** (webhook legacy).

- **SEO — URL canonique** : **`NEXT_PUBLIC_SITE_CANONICAL`** = `https://www.optimum-assurance.fr` sur Vercel Production (utilisée par `lib/site-url.ts` pour sitemap, robots, métadonnées). Redéployer après changement de cette variable.

- **Prisma** : migration baseline appliquée côté base utilisée ; scripts `db:sync-url-vercel`, `verify-supabase`, etc. documentés dans `DEPLOY.md`.

- **Supabase Auth / session (Next.js 16)** : fichier racine **`proxy.ts`** (remplace l’ancienne convention `middleware`) + helpers **`utils/supabase/`** (`server`, `client`, session). Variables : `NEXT_PUBLIC_SUPABASE_URL` + **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** ou **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`**.

- **Dépendances npm** : `npm audit` **0** vulnérabilité (overrides ciblés pour le CLI Vercel ; ne pas utiliser `npm audit fix --force` sans revue).

- **Agent skills Supabase** : **`skills-lock.json`** versionné ; copie locale **`.agents/`** ignorée par git — après clone : **`npm run skills:supabase`**.

- **Qualité locale** : `npm run lint`, `preflight`, `build` OK.



---



## SQL Supabase (sécurité / signature) — à exécuter sur le bon projet



Une fois dans le **SQL Editor** (ou `SUPABASE_DATABASE_URL` en local + scripts npm) :



| Fichier | Objet |

|--------|--------|

| `sql/supabase-esign-complete.sql` | Tables signature + buckets + RLS + politiques `sign_*` |

| `sql/supabase-esign-rls-policies.sql` | Seulement politiques RLS `sign_requests` / `signatures` (si tables déjà créées) |

| `sql/supabase-rls-utilisateurs-entreprises-devis.sql` | RLS sur `utilisateurs`, `entreprises`, `devis` (advisor « RLS Disabled in Public ») |



Commandes locales (nécessitent **`SUPABASE_DATABASE_URL`** dans `.env.local`) :  

`npm run supabase:apply-esign-sql` · `npm run supabase:apply-esign-policies` · `npm run supabase:apply-rls-sql`



---



## À faire côté dashboards (si pas déjà fait)



### Mollie

- [ ] **Webhooks** : URL **`https://www.optimum-assurance.fr/api/mollie/webhook`** enregistrée dans l’app Mollie.

- [ ] En **prod**, confirmer dans le dashboard Mollie que tu utilises bien le mode **live** (cohérent avec la clé sur Vercel).



### Yousign *(optionnel — legacy)*

- [ ] Si vous conservez l’ancien webhook : **`/api/yousign/webhook`** aligné avec le dashboard Yousign (`npm run print:webhooks`). Sinon, le parcours principal passe par **Supabase Sign** ci-dessous.



### Signature Supabase (`/api/sign` + Storage)

- [ ] Créer un projet **Supabase** (ou en utiliser un).

- [ ] **SQL** (une fois) : **`sql/supabase-esign-complete.sql`** (voir tableau ci-dessus) **ou** **`npm run supabase:apply-esign-sql`** avec `SUPABASE_DATABASE_URL`.

- [ ] Copier **URL**, **anon** (ou clé publishable), **service_role** depuis Supabase → **Project Settings → API** dans **`.env.local`**.

- [ ] **`npm run vercel:push-supabase-env`** (envoie les clés sur Vercel Production) puis redéploiement.

- [ ] **`npm run verify:supabase`** — tables + buckets OK ; **`npm run verify:vercel-env`** — signature Supabase complète.

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

npm run verify:vercel-env

npm run print:webhooks

npm run skills:supabase

npx vercel env pull .env.vercel.pull --environment production --yes && npm run db:sync-url-vercel

npx prisma migrate deploy

```



---



*Mis à jour : proxy Next.js 16, skills Supabase, SQL RLS, npm audit.*


