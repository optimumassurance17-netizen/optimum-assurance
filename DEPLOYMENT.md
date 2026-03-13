# Guide de déploiement — Optimum Assurance

## Checklist avant mise en production

### 1. Variables d'environnement

Renseigner toutes les variables dans `.env` (ou les secrets de la plateforme) :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `MOLLIE_API_KEY` | Clé API Mollie **live** | `live_xxxx` |
| `NEXT_PUBLIC_APP_URL` | URL du site en production | `https://optimum-assurance.fr` |
| `DATABASE_URL` | Base de données (PostgreSQL recommandé) | `postgresql://...` |
| `NEXTAUTH_URL` | Même que NEXT_PUBLIC_APP_URL | `https://optimum-assurance.fr` |
| `NEXTAUTH_SECRET` | Secret fort (`npm run generate-secret` ou `openssl rand -base64 32`) | — |
| `ADMIN_EMAILS` | Emails admin (accès CRM), séparés par des virgules | `admin@optimum-assurance.fr` |
| `RESEND_API_KEY` | Clé API Resend pour l'envoi d'emails | `re_xxxx` |
| `EMAIL_FROM` | Email expéditeur (domaine vérifié dans Resend) | `Optimum <noreply@optimum-assurance.fr>` |
| `YOUSIGN_API_KEY` | Clé API Yousign **production** | — |
| `YOUSIGN_ENV` | `production` | `production` |
| `NEXT_PUBLIC_PHONE` | Téléphone affiché sur le site | `01 23 45 67 89` |
| `NEXT_PUBLIC_EMAIL` | Email de contact | `contact@optimum-assurance.fr` |
| `NEXT_PUBLIC_WHATSAPP` | Numéro WhatsApp (sans espaces) | `33612345678` |
| `INSEE_API_KEY_INTEGRATION` | Optionnel — pré-remplissage SIRET (gratuit, portail-api.insee.fr) | — |
| `PAPPERS_API_KEY` | Optionnel — pré-remplissage SIRET (Pappers, payant) | — |
| `CRON_SECRET` | Recommandé — sécurise les crons Vercel (rappels renouvellement, devis abandonné) | — |
| `YOUSIGN_WEBHOOK_SECRET` | Recommandé — vérifie la signature des webhooks Yousign | — |

### 2. Base de données (PostgreSQL obligatoire sur Vercel)

**SQLite ne fonctionne pas sur Vercel** (système de fichiers en lecture seule). Utiliser PostgreSQL :

1. Créer une base : [Vercel Postgres](https://vercel.com/storage/postgres), [Supabase](https://supabase.com), [Neon](https://neon.tech) ou [Railway](https://railway.app)
2. Copier l’URL de connexion (`postgresql://...`)
3. Dans `prisma/schema.prisma`, remplacer :
   ```prisma
   provider = "sqlite"
   ```
   par :
   ```prisma
   provider = "postgresql"
   ```
4. Définir `DATABASE_URL` dans Vercel avec l’URL PostgreSQL
5. Avant le premier déploiement : `DATABASE_URL="postgresql://..." npx prisma db push`

### 3. Webhooks externes

#### Mollie
- Dashboard Mollie → Paramètres → Webhooks
- URL : `https://optimum-assurance.fr/api/mollie/webhook`

#### Yousign
- Dashboard Yousign (mode Production) → Webhooks
- URL : `https://optimum-assurance.fr/api/yousign/webhook`
- Événements : `signature_request.completed`, `signature_request.declined`

### 4. Domaine et SSL

- Configurer le domaine (ex. `optimum-assurance.fr`)
- SSL activé (automatique sur Vercel, Netlify, etc.)

### 5. Vérification avant déploiement

```bash
npm run build          # Vérifie que le build passe
npm run check-env      # Vérifie les variables (avec .env configuré)
```

### 6. Déploiement (Vercel)

```bash
# Installer Vercel CLI
npm i -g vercel

# Premier déploiement
vercel

# Variables d'environnement : Vercel → Projet → Settings → Environment Variables
# Ajouter toutes les variables de la section 1 (Production)
```

### 7. Post-déploiement

- [ ] Tester le parcours décennale complet
- [ ] Tester le parcours dommage ouvrage
- [ ] Vérifier les emails (confirmation, devis DO)
- [ ] Vérifier les webhooks (Mollie, Yousign)
- [ ] Créer un compte admin (email dans ADMIN_EMAILS)

---

## Environnement de développement

### ngrok (webhooks en local)

```bash
# Terminal 1 : serveur Next.js
npm run dev

# Terminal 2 : ngrok
ngrok http 3000
```

Configurer les webhooks avec l'URL ngrok (ex. `https://abc123.ngrok-free.app/api/mollie/webhook`).

### Test Yousign

```bash
node scripts/test-yousign.mjs
```

---

## Structure des parcours

### Décennale BTP
1. `/devis` → 2. `/souscription` → 3. `/creer-compte` → 4. `/signature` → 5. `/paiement` → 6. `/confirmation`

### Dommage ouvrage
1. `/devis-dommage-ouvrage` (demande) → Gestion crée le devis → Client reçoit email → 2. `/espace-client` (connexion) → 3. Paiement Mollie
