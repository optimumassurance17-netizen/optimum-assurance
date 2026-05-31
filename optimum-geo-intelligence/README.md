# OPTIMUM GEO INTELLIGENCE

Module de veille SEO/GEO et d'automatisation éditoriale pour Optimum Assurance.

## Modules inclus

1. **Competitor Tracker**
   - Crawl concurrent
   - Détection nouvelles pages / changements
   - Extraction title, meta, h1, h2, FAQ, schema
2. **GEO Visibility Engine**
   - Suivi requêtes IA (ChatGPT, Gemini, Claude, Perplexity)
   - Mesure de présence marque / concurrents
   - Calcul GEO score
3. **Content Generator**
   - Génération articles, FAQ, guides, pages métiers et locales
4. **SEO Optimizer**
   - Scan pages
   - Détection thin / duplicate / FAQ/schema manquants
   - Recommandations title/H1/meta/liens
5. **GEO Page Builder**
   - Génération pages locales ville / métier+ville
6. **Alert Center**
   - Alertes concurrence, visibilité, opportunités
7. **GEO Score**
   - Score global + segmenté (page, ville, métier)

---

## Routes dashboard

- `/dashboard`
- `/dashboard/seo`
- `/dashboard/geo`
- `/dashboard/competitors`
- `/dashboard/content`
- `/dashboard/alerts`
- `/dashboard/settings`

---

## API principales

- `GET /api/geo-intelligence/dashboard`
- `POST /api/geo-intelligence/competitors/scan`
- `POST /api/geo-intelligence/geo/analyze`
- `POST /api/geo-intelligence/content/generate`
- `POST /api/geo-intelligence/pages/build`
- `POST /api/geo-intelligence/seo/scan`
- `POST /api/geo-intelligence/seo/validate`
- `POST /api/geo-intelligence/alerts/run`
- `POST /api/geo-intelligence/score/recompute`

Toutes les routes sont protégées (session admin + rate limiting).

---

## Crons Vercel

- `03:00` `/api/cron/geo-competitors`
- `03:30` `/api/cron/geo-visibility`
- `04:00` `/api/cron/geo-content-generation`
- `04:30` `/api/cron/geo-seo-optimizer`
- `05:00` `/api/cron/geo-alerts`
- `05:30` `/api/cron/geo-daily-snapshot`

---

## Déploiement Vercel

1. Déployer le code.
2. Appliquer la migration Supabase:
   - `supabase/migrations/20260530213000_optimum_geo_intelligence.sql`
3. Configurer les variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `FIRECRAWL_API_KEY`
   - `CRON_SECRET`
   - `ALERTS_EMAIL_TO` (optionnel)
4. Vérifier `/dashboard/settings`.
5. Lancer un run manuel depuis `/dashboard`.

---

## Edge Function Supabase

Fonction disponible:

- `supabase/functions/geo-intelligence-runner/index.ts`

Permet de déclencher à distance un step cron Next.js via:

`/functions/v1/geo-intelligence-runner?step=competitor|geo|content|optimizer|alerts|snapshot`
