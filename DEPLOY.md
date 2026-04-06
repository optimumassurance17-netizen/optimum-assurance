# Déploiement rapide (Vercel + PostgreSQL)

**Checklist exhaustive (ne rien oublier) :** voir **`CHECKLIST-DEPLOIEMENT-COMPLET.md`** à la racine du dépôt.

## Git, CI et déploiement automatique

- **GitHub Actions** : `.github/workflows/ci.yml` exécute **ESLint** et **`npm run build`** sur chaque push et chaque pull request vers `main` ou `master`.
- **Vercel** : dans le [dashboard Vercel](https://vercel.com), **Importer le projet** et lier ce dépôt Git. Les pushes sur la branche **Production** déclenchent un déploiement ; les PR ont des **Preview deployments**. Le `vercel.json` à la racine définit déjà la commande de build.

## 1. Base de données

- Créer un Postgres managé (Neon, Supabase, Vercel Postgres, Railway…).
- Récupérer `DATABASE_URL` (SSL en général : `?sslmode=require`).

## 2. Variables sur Vercel

Projet Vercel → **Settings → Environment Variables** : copier depuis `.env.example` et remplir **Production**.

**Minimum critique :**

| Variable | Note |
|----------|------|
| `DATABASE_URL` | Obligatoire |
| `NEXTAUTH_SECRET` | `npm run generate-secret` |
| `NEXTAUTH_URL` | URL **publique** du site, ex. `https://optimum-assurance.fr` |
| `NEXT_PUBLIC_APP_URL` | **Identique** à `NEXTAUTH_URL` (même origine) |
| `MOLLIE_API_KEY` | `live_` en prod |
| `RESEND_API_KEY` + `EMAIL_FROM` | Domaine vérifié sur Resend |
| `YOUSIGN_API_KEY` + `YOUSIGN_ENV` | `production` pour la prod |
| `ADMIN_EMAILS` | Emails autorisés sur `/gestion` |

**Recommandé :** `CRON_SECRET` (crons Vercel), `YOUSIGN_WEBHOOK_SECRET`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

**SEO :** `NEXT_PUBLIC_APP_URL` et `NEXTAUTH_URL` = URL publique finale (ex. `https://www.optimum-assurance.fr`). Optionnel : `NEXT_PUBLIC_SITE_CANONICAL` pour forcer la même URL dans robots, sitemap et métadonnées si `NEXT_PUBLIC_APP_URL` pointe encore vers un domaine Vercel en preview.

### Mettre à jour Supabase avec Vercel (intégration officielle)

L’intégration marketplace **synchronise** une partie des variables d’environnement entre ton **projet Supabase** et ton **projet Vercel** (sans que tu les recopies à la main à chaque fois).

1. Ouvre **[vercel.com/integrations/supabase](https://vercel.com/integrations/supabase)** (ou Vercel → ton projet → **Settings** → **Integrations** → **Browse Marketplace** → chercher **Supabase** → **Add Integration**).
2. Choisis le **scope** Vercel (compte / équipe), puis le **projet Vercel** (ex. optimum-assurance).
3. Dans la fenêtre Supabase, sélectionne l’**organisation** et le **projet Supabase** à lier, puis valide.
4. Vérifie dans Vercel → **Settings** → **Environment Variables** : tu dois y voir au minimum des variables du type **`NEXT_PUBLIC_SUPABASE_URL`** et **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (les noms exacts peuvent varier selon la version de l’intégration ; renomme-les si besoin pour correspondre au tableau ci-dessous).

**Indispensable pour ce dépôt (souvent à ajouter à la main)** : l’intégration ne publie en général **pas** la clé **`service_role`** sur Vercel (trop sensible). Ajoute-la toi-même :

| Variable Vercel | Où la copier (Supabase) |
|-----------------|-------------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | **Project Settings** → **API** → **service_role** (secret) |

Coche **Production** (et **Preview** / **Development** si tu en as besoin pour les previews). Puis **Redeploy** le dernier déploiement pour prendre en compte les nouvelles variables.

**En local**, pour récupérer les variables du projet Vercel :

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.vercel
```

Tu peux recopier les lignes Supabase pertinentes vers **`.env.local`** (déjà ignoré par git).

**Récap des noms attendus par le code** (à aligner avec ce que l’intégration crée) :

| Variable | Usage |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | API serveur, scripts, `/api/sign` |

**Vérifier en local** (après `.env.local` ou `vercel env pull`) que les tables / buckets signature existent :

```bash
npx vercel env pull .env.vercel.pull --environment production --yes
npm run verify:supabase
```

Si la commande indique encore l’absence d’URL Supabase, les variables ne sont **pas** définies sur Vercel : ajoute `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` dans **Vercel → Settings → Environment Variables** (Production), puis refais un *pull* ou copie-les dans `.env.local`.

(`npm run preflight` exécute aussi `verify:supabase` ; sans `SUPABASE_SERVICE_ROLE_KEY` mais avec l’URL, un avertissement s’affiche sans bloquer.)

## 3. Commande de build Vercel

Le fichier **`vercel.json`** à la racine définit déjà :

`buildCommand: npm run vercel-build`

Vous n’avez normalement **rien à changer** dans le dashboard Vercel (sauf si vous l’avez surchargé manuellement).

Ce script exécute : `prisma generate` puis `next build` (pas de migration automatique au build).

**Migrations Prisma :** le dépôt inclut une migration **baseline** (`prisma/migrations/20260403120000_baseline`) pour initialiser l’historique `_prisma_migrations` sans recréer les tables. Sur une **base déjà remplie** créée avant Migrate, exécuter **une fois** : `npx prisma migrate resolve --applied 20260403120000_baseline`, puis `npx prisma migrate deploy` affichera « No pending migrations ». Sur une **base vide**, un simple `migrate deploy` suffit. Les prochains changements de schéma : `npx prisma migrate dev` (local) puis commit du dossier `migrations` et `migrate deploy` en prod.

**Aligner `DATABASE_URL` local avec Vercel Production** (sans copier-coller à la main) :

```bash
npx vercel env pull .env.vercel.pull --environment production --yes
node scripts/sync-database-url-from-vercel-pull.mjs
```

Puis, **si** vous avez des migrations versionnées :

```bash
npx prisma migrate deploy
```

Ou : `node scripts/prisma-migrate-prod.mjs` (utilise `.env.vercel.pull` directement).

### Secrets (NEXTAUTH, CRON, optionnel Yousign webhook legacy)

En local, pour générer des valeurs à coller dans Vercel :

```bash
npm run secrets:prod
```

## 4. Après le premier déploiement

1. **Mollie** : URL webhook = `https://votredomaine.fr/api/mollie/webhook`
2. **Supabase signature** : tables + buckets (`sql/supabase-esign-complete.sql`) ; variables URL + `SUPABASE_SERVICE_ROLE_KEY`
3. **Yousign** *(si legacy)* : webhook `/api/yousign/webhook`
4. **Search Console** : propriété + sitemap `https://votredomaine.fr/sitemap.xml`
5. Tester : `/api/health` → `database: connected`

## 5. Icônes PWA (install / barre d’adresse)

Les fichiers `public/icon-192.png` et `public/icon-512.png` sont utilisés par `app/manifest.ts`. Pour les régénérer (charte bleue) :

```bash
npm run icons:pwa
```

## 6. Avant chaque mise en prod locale

```bash
npm run preflight
```

## 7. Signature électronique MVP (`/sign/[id]`) — Supabase

**Personne d’autre (y compris un agent IA) ne peut se connecter à ton Vercel, GitHub ou tableau de bord Supabase.** Il faut exécuter la migration **une fois** sur le projet Supabase lié à la prod.

### Où récupérer l’URI Postgres (sans la partager publiquement)

1. Ouvre **[supabase.com/dashboard](https://supabase.com/dashboard)** → sélectionne **ton projet**.
2. Barre de gauche : **Project Settings** (icône engrenage en bas).
3. Onglet **Database**.
4. Section **Connection string** (ou **URI** selon l’interface).
5. Choisir l’onglet / mode **URI** (parfois intitulé **Node.js** ou **psql**).
6. Copier la chaîne qui ressemble à  
   `postgresql://postgres.[REF]:[YOUR-PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres`  
   ou le port **5432** en « direct ».
7. Remplacer **`[YOUR-PASSWORD]`** par le **mot de passe base de données** du projet (celui défini à la création du projet ; sinon **Database → Reset database password** pour en définir un nouveau).

**Conseils :**

- Pour **`supabase db push`** et le workflow GitHub, l’URI **avec mot de passe en clair** est nécessaire ; elle ne doit aller que dans **Secrets Vercel**, **Secrets GitHub** ou **`.env.local` (gitignored)** — jamais dans le code ni dans une issue GitHub.
- Si la copie affiche `[YOUR-PASSWORD]`, c’est un **placeholder** : tu dois le substituer par le vrai mot de passe toi-même.

### Où coller quoi

| Où | Quoi mettre | Rôle |
|----|-------------|------|
| **Vercel** → Projet → **Settings** → **Environment Variables** | `NEXT_PUBLIC_SUPABASE_URL` = URL du projet (onglet **API** du même **Project Settings**) | Client + serveur |
| Même page Vercel | `NEXT_PUBLIC_SUPABASE_ANON_KEY` = **anon** `public` ( **API** ) | Client |
| Même page Vercel | `SUPABASE_SERVICE_ROLE_KEY` = **service_role** ( **API** ) — **Production** (et Preview si besoin) | API `/api/sign`, script `esign:create-request` |
| **GitHub** → Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** | Nom : **`SUPABASE_DATABASE_URL`**, valeur : l’**URI Postgres complète** (avec mot de passe) | Workflow **Supabase — migrations (signature)** uniquement |
| **Local** `.env.local` (déjà ignoré par git) | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (+ optionnel `SUPABASE_DATABASE_URL` si tu lances `db push` en local) | Dev + script signature |

Les clés **API** se trouvent dans Supabase : **Project Settings** → **API** → **Project URL** + **anon** / **service_role**.

### Variables Vercel (récap signature)

| Variable | Rôle |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon |
| `SUPABASE_SERVICE_ROLE_KEY` | **Serveur uniquement** — jamais exposée au navigateur |

### Appliquer les tables + buckets Storage

**Option A — SQL Editor Supabase (la plus simple)**  
Dans Supabase : **SQL** → **New query** → exécuter **`sql/supabase-esign-complete.sql`** (tout-en-un), **ou** coller `sql/supabase-esign-mvp.sql` → **Run** puis `sql/supabase-esign-storage.sql` → **Run**.

**Option B — CLI en local** (fichier identique à `supabase/migrations/20250403120000_esign_signature_mvp.sql`) :

```bash
npx supabase@latest db push --db-url "postgresql://postgres.xxxx:TON_MOT_DE_PASSE@aws-0-....pooler.supabase.com:6543/postgres"
```

(Remplace par l’URI copiée à l’étape ci-dessus, depuis la racine du repo où existe `supabase/config.toml`.)

**Option C — GitHub Actions**  
1. Créer le secret **`SUPABASE_DATABASE_URL`** (voir tableau ci-dessus).  
2. **Actions** → **Supabase — migrations (signature)** → **Run workflow**.

### Créer un lien de signature après déploiement

En local (`.env.local` avec URL + service role) :

```bash
npm run esign:create-request -- chemin/vers/contrat.pdf
```

Ouvrir l’URL affichée (`/sign/...`) dans le navigateur.

---

En cas d’erreur de migration : vérifier que `DATABASE_URL` pointe bien sur la base **production** utilisée par Vercel.
