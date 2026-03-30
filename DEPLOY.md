# Déploiement rapide (Vercel + PostgreSQL)

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

## 3. Commande de build Vercel

Le fichier **`vercel.json`** à la racine définit déjà :

`buildCommand: npm run vercel-build`

Vous n’avez normalement **rien à changer** dans le dashboard Vercel (sauf si vous l’avez surchargé manuellement).

Ce script exécute : `prisma generate` puis `next build` (pas de migration automatique au build).

**Migrations Prisma :** les appliquer sur la base **production** avant ou après le premier déploiement, par exemple :

```bash
npx prisma migrate deploy
```

(avec `DATABASE_URL` pointant vers la prod, en CI ou en local sécurisé).

### Secrets (NEXTAUTH, CRON, Yousign webhook)

En local, pour générer des valeurs à coller dans Vercel :

```bash
npm run secrets:prod
```

## 4. Après le premier déploiement

1. **Mollie** : URL webhook = `https://votredomaine.fr/api/mollie/webhook`
2. **Yousign** : webhook + URL de callback selon doc Yousign
3. **Search Console** : propriété + sitemap `https://votredomaine.fr/sitemap.xml`
4. Tester : `/api/health` → `database: connected`

## 5. Icônes PWA (install / barre d’adresse)

Les fichiers `public/icon-192.png` et `public/icon-512.png` sont utilisés par `app/manifest.ts`. Pour les régénérer (charte bleue) :

```bash
npm run icons:pwa
```

## 6. Avant chaque mise en prod locale

```bash
npm run preflight
```

---

En cas d’erreur de migration : vérifier que `DATABASE_URL` pointe bien sur la base **production** utilisée par Vercel.
