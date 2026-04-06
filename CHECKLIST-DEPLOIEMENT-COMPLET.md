# Checklist déploiement — Optimum Assurance

Détails longs : **`DEPLOY.md`**.  
Ci-dessous : **état actuel** + ce qui reste **manuel** (dashboards externes).

---

## Déjà fait — conforme

- **Git** : `main` poussé sur GitHub ; CI + déploiement Vercel déclenchés.
- **Vercel** : dernier déploiement **Production** **Ready** ; alias `https://www.optimum-assurance.fr`.
- **Santé prod** : `https://www.optimum-assurance.fr/api/health` → base **connected**, email Resend **configured** (`RESEND_API_KEY` + `EMAIL_FROM` côté serveur).
- **Variables Vercel (Production)** : **`npm run verify:vercel-env`** — toutes les clés **requises** présentes (DB, auth, **Mollie**, **Yousign** + `YOUSIGN_WEBHOOK_SECRET`, **Resend**, **`CRON_SECRET`**, etc.).
- **SEO — URL canonique** : **`NEXT_PUBLIC_SITE_CANONICAL`** = `https://www.optimum-assurance.fr` sur Vercel Production (utilisée par `lib/site-url.ts` pour sitemap, robots, métadonnées). Redéployer après changement de cette variable.
- **Prisma** : migration baseline appliquée côté base utilisée ; scripts `db:sync-url-vercel`, `verify-supabase`, etc. documentés dans `DEPLOY.md`.
- **Qualité locale** : `npm run lint`, `preflight`, `build` OK.

---

## À faire côté dashboards (si pas déjà fait)

### Mollie
- [ ] **Webhooks** : URL **`https://www.optimum-assurance.fr/api/mollie/webhook`** enregistrée dans l’app Mollie.
- [ ] En **prod**, confirmer dans le dashboard Mollie que tu utilises bien le mode **live** (cohérent avec la clé sur Vercel).

### Yousign
- [ ] **Webhooks / redirections** : URLs de prod alignées avec le site (rappel : `npm run print:webhooks`).

### Signature MVP Supabase (`/api/sign` + Storage)
- [ ] Créer un projet **Supabase** (ou en utiliser un).
- [ ] **SQL** (une fois) : **SQL Editor** → coller **`sql/supabase-esign-complete.sql`** **ou** en local : `SUPABASE_DATABASE_URL` (URI Postgres du projet Supabase, pas Neon) dans `.env.local` puis **`npm run supabase:apply-esign-sql`**.
- [ ] Copier **URL**, **anon**, **service_role** depuis Supabase → **Project Settings → API** dans **`.env.local`**.
- [ ] **`npm run vercel:push-supabase-env`** (envoie les 3 clés sur Vercel Production) puis **`npx vercel deploy --prod --yes`**.
- [ ] **`npm run verify:supabase`** — tables + buckets OK ; **`npm run verify:vercel-env`** — doit indiquer la signature Supabase complète.
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
npx vercel env pull .env.vercel.pull --environment production --yes && npm run db:sync-url-vercel
npx prisma migrate deploy
```

---

*Mis à jour : canonical Vercel + étapes Search Console.*
