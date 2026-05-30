# OPTIMUM GEO INTELLIGENCE — Architecture complète

## 1) Objectif produit

Le module **OPTIMUM GEO INTELLIGENCE** fournit une chaîne autonome de veille, scoring et exécution SEO/GEO:

- veille concurrentielle (crawl + diff + score)
- visibilité GEO (LLM engines, présence marque/concurrents)
- génération de contenu SEO
- optimisation automatique des pages existantes
- génération de pages locales
- alerting stratégique
- pilotage centralisé via dashboard admin

Le module est conçu pour fonctionner en:

- **manual trigger** (dashboard / API)
- **auto trigger** (crons Vercel + Edge Functions Supabase)

---

## 2) Stack et conventions

- Next.js App Router (TypeScript strict)
- Supabase PostgreSQL (RLS + policies + cron storage)
- Supabase Auth (RLS policies `authenticated`)
- OpenAI API (analyse + génération)
- Firecrawl (crawl SEO concurrent)
- Playwright (fallback extraction HTML)
- React Query (dashboard client-side data fetching)
- Zod (validation entrée/sortie)
- Server Actions (orchestration admin)
- Tailwind + composants style shadcn

---

## 3) Structure des dossiers

```txt
/optimum-geo-intelligence
  /ARCHITECTURE.md
  /README.md
  /schemas
    index.ts
  /types
    index.ts
  /lib
    constants.ts
    utils.ts
  /services
    supabase-admin.ts
    audit-log.ts
    alerts.ts
    competitor-tracker.ts
    geo-visibility.ts
    content-generator.ts
    seo-optimizer.ts
    geo-page-builder.ts
    geo-score.ts
    dashboard.ts
  /server
    auth.ts
    security.ts
  /client
    query-client.tsx
    hooks.ts
  /components
    /ui
      button.tsx
      card.tsx
      badge.tsx
      table.tsx
    score-card.tsx
    trend-chart.tsx
    alerts-panel.tsx
    visibility-panel.tsx
```

Intégration Next.js:

- API Routes: `/app/api/geo-intelligence/**`
- Dashboard: `/app/dashboard/**`
- Crons: `/app/api/cron/geo-*`
- Server Actions: `/app/dashboard/actions.ts`

Supabase:

- migration SQL dédiée `supabase/migrations/*_optimum_geo_intelligence.sql`
- Edge function dédiée `supabase/functions/geo-intelligence-runner/index.ts`

---

## 4) Flux fonctionnels

### A. Competitor Tracker

1. `competitors` → liste des domaines actifs
2. crawl URL (Firecrawl; fallback Playwright)
3. extraction `title/meta/h1/h2/faq/schema`
4. hash contenu + détection nouvelle page/changement
5. calcul `seo_score`
6. insertion `competitor_pages` + `crawl_logs`
7. alertes si nouveauté stratégique

### B. GEO Visibility Engine

1. chargement `geo_queries`
2. génération réponses simulées par provider (OpenAI + placeholders Gemini/Claude/Perplexity)
3. analyse présence marque/concurrents
4. calcul `geo_score`
5. stockage `geo_results`, `geo_scores`
6. tendances journalières dans `daily_snapshots`

### C. Content Generator

1. entrée: mot-clé, type, ville, métier, intent
2. prompt structuré OpenAI
3. sortie normalisée:
   - SEO title
   - meta description
   - H1
   - sections
   - FAQ + schema
   - JSON-LD
   - maillage interne
   - CTA devis
4. stockage `generated_content` + `content_history`

### D. SEO Optimizer

1. scan pages (sitemap)
2. détection:
   - thin content
   - duplication potentielle
   - FAQ/schema absents
3. génération recommandations
4. workflow validation:
   - draft proposition
   - statut `approved` avant publication

### E. GEO Page Builder

- génération pages locales pour villes + métiers configurés
- pattern:
  - `/assurance-decennale-[ville]`
  - `/assurance-decennale-[metier]-[ville]`
- persistance dans `generated_content`

### F. Alert Center

Déclencheurs:

- nouveau concurrent / page concurrente
- perte de visibilité GEO
- baisse SEO score
- opportunité mot-clé

Canaux:

- dashboard
- email (via couche email existante)
- notifications internes

---

## 5) Sécurité

- Validation Zod pour toutes les entrées API/Actions
- Auth admin (`NextAuth` + `isAdmin`) côté dashboard/API sensibles
- RLS Supabase activée sur toutes les tables
- Rate limiting endpoint (IP + action)
- Audit logs (`ai_reports` + `crawl_logs`)
- Gestion d’erreurs centralisée (`AppError` + status code)

---

## 6) Automatisation planifiée

Crons Vercel:

- 03:00 → veille concurrentielle
- 03:30 → analyse GEO
- 04:00 → génération contenu
- 04:30 → optimisation SEO
- 05:00 → alertes
- 05:30 → snapshot / rapport quotidien

Chaque cron:

- valide `CRON_SECRET`
- exécute service métier
- loggue `crawl_logs` ou `ai_reports`

---

## 7) Dashboard admin

Pages:

- `/dashboard`
- `/dashboard/seo`
- `/dashboard/geo`
- `/dashboard/competitors`
- `/dashboard/content`
- `/dashboard/alerts`
- `/dashboard/settings`

Widgets:

- GEO score global
- SEO score global
- visibilité IA par provider
- pages générées
- alertes actives
- évolution concurrentielle
- tendances (7/30 jours)

---

## 8) Déploiement

- Build Vercel standard (`npm run vercel-build`)
- Migrations Supabase à appliquer avant activation cron
- Variables env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `OPENAI_API_KEY`
  - `FIRECRAWL_API_KEY`
  - `CRON_SECRET`
  - `OPTIMUM_GEO_FROM_EMAIL` (optionnel)

