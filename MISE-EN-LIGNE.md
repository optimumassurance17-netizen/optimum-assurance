# Mise en ligne — Étapes à suivre

Ce guide liste **étape par étape** ce que vous devez faire pour déployer Optimum Assurance sur Vercel.

---

## Ce qui a été préparé automatiquement

- [x] Schéma Prisma configuré pour PostgreSQL
- [x] Docker Compose pour PostgreSQL en local
- [x] Guide de déploiement mis à jour (`DEPLOYMENT.md`)

---

## Étape 1 : Base de données PostgreSQL

**Option A — Local (Docker)**  
Si vous développez en local avec Docker :

```bash
docker compose up -d
```

Puis dans `.env` :
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/optimum"
```

**Option B — Hébergée (recommandé pour la prod)**  
Créer une base PostgreSQL gratuite :

1. Aller sur [neon.tech](https://neon.tech) ou [supabase.com](https://supabase.com)
2. Créer un projet
3. Copier l’URL de connexion (ex. `postgresql://user:pass@host/db?sslmode=require`)

**Initialiser la base :**
```bash
DATABASE_URL="postgresql://..." npx prisma db push
```

---

## Étape 2 : Compte Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. Se connecter avec GitHub (ou créer un compte)
3. Importer le projet : *Add New → Project → Import Git Repository*

---

## Étape 3 : Variables d’environnement sur Vercel

Dans Vercel : **Projet → Settings → Environment Variables**

Ajouter ces variables (Production) :

| Variable | Où la trouver |
|----------|----------------|
| `MOLLIE_API_KEY` | Dashboard Mollie → Clés API (utiliser `live_` en prod) |
| `NEXT_PUBLIC_APP_URL` | `https://votre-domaine.vercel.app` ou votre domaine |
| `NEXTAUTH_URL` | Même valeur que `NEXT_PUBLIC_APP_URL` |
| `NEXTAUTH_SECRET` | `npm run generate-secret` (en local) |
| `DATABASE_URL` | URL PostgreSQL (Neon, Supabase, Vercel Postgres…) |
| `ADMIN_EMAILS` | Votre email (accès CRM `/gestion`) |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys |
| `EMAIL_FROM` | `Optimum <noreply@votredomaine.com>` (domaine vérifié dans Resend) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role (secret) |
| `CRON_SECRET` | `npm run generate-secret` (en local) |

**Optionnelles :**
- `YOUSIGN_API_KEY`, `YOUSIGN_ENV`, `YOUSIGN_WEBHOOK_SECRET` — uniquement si webhook Yousign legacy encore actif
- `INSEE_API_KEY_INTEGRATION` — [portail-api.insee.fr](https://portail-api.insee.fr) (pré-remplissage SIRET)
- `PAPPERS_API_KEY` — [pappers.fr](https://pappers.fr) (pré-remplissage SIRET)

---

## Étape 4 : Premier déploiement

1. Dans Vercel, cliquer sur **Deploy**
2. Attendre la fin du build
3. Noter l’URL du projet (ex. `optimum-assurance-xxx.vercel.app`)

---

## Étape 5 : Base de données en production

Si vous utilisez une base dédiée à la prod (Neon, Supabase, Vercel Postgres) :

```bash
DATABASE_URL="postgresql://votre-url-prod" npx prisma db push
```

(Vérifier que `DATABASE_URL` dans Vercel pointe bien vers cette base.)

---

## Étape 6 : Domaine personnalisé (optionnel)

1. Vercel → Projet → Settings → Domains
2. Ajouter `optimum-assurance.fr` (ou votre domaine)
3. Suivre les instructions pour configurer les DNS

Mettre à jour dans Vercel :
- `NEXT_PUBLIC_APP_URL` = `https://optimum-assurance.fr`
- `NEXTAUTH_URL` = `https://optimum-assurance.fr`

---

## Étape 7 : Webhooks (après déploiement)

**Mollie :**  
Dashboard Mollie → Paramètres → Webhooks  
URL : `https://votre-domaine/api/mollie/webhook`

**Signature (Supabase) :** exécuter `sql/supabase-esign-complete.sql` sur le projet ; variables `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` sur Vercel.

**Yousign *(optionnel — legacy)* :** si encore utilisé, Dashboard Yousign → Webhooks → `https://votre-domaine/api/yousign/webhook`

---

## Étape 8 : Vérifications

- [ ] Parcours décennale : `/devis` → souscription → signature → paiement
- [ ] Parcours dommage ouvrage : `/devis-dommage-ouvrage` → envoi
- [ ] Emails reçus (confirmation, devis DO)
- [ ] Connexion à `/gestion` avec l’email dans `ADMIN_EMAILS`
- [ ] Créer un compte client de test et valider le flux complet

---

## En cas de problème

- **Build échoue :** vérifier les logs Vercel
- **Erreur base de données :** vérifier `DATABASE_URL` et que `prisma db push` a été exécuté
- **Emails non reçus :** vérifier Resend (domaine vérifié, clé API)
- **Paiement Mollie :** utiliser `test_` en dev, `live_` en prod
