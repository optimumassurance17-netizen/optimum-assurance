# Importer les variables dans Vercel

## Étape 1 : Remplir le fichier vercel-env.env

Ouvre le fichier **vercel-env.env** dans ton projet.

Remplace **chaque** `REMPLACE_PAR_...` par ta vraie valeur :

| À remplacer | Où trouver |
|-------------|------------|
| REMPLACE_PAR_URL_NEON | neon.tech → ton projet → Connection string → Copy |
| REMPLACE_PAR_CLE_MOLLIE | mollie.com → Dashboard → Clés API |
| REMPLACE_PAR_CLE_RESEND | resend.com → API Keys |
| REMPLACE_PAR_SUPABASE_URL | Supabase → Project Settings → API → Project URL |
| REMPLACE_PAR_SUPABASE_SERVICE_ROLE | Supabase → API → service_role (secret) |
| REMPLACE_PAR_TON_DOMAINE | Ton domaine (ex: optimum-assurance) |
| REMPLACE_PAR_TON_EMAIL | Ton email (ex: contact@optimum-assurance.fr) |

**Exemple** après remplissage :
```
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require
MOLLIE_API_KEY=live_xxxxxxxx
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=Optimum <noreply@optimum-assurance.fr>
...
```

## Étape 2 : Importer dans Vercel

1. Va sur **vercel.com** → ton projet **optimum-assurance**
2. Clique sur **Settings**
3. Dans le menu à gauche : **Environment Variables**
4. Clique sur le bouton **Import .env** (ou "Import")
5. Sélectionne le fichier **vercel-env.env** (dans ton dossier optimum-assurance)
6. Choisis **Production** (et Preview si tu veux)
7. Clique sur **Import**

Les variables sont ajoutées automatiquement.

## Étape 3 : Corriger l'URL si besoin

Après ton premier déploiement, Vercel te donne une URL (ex: optimum-assurance-abc123.vercel.app).

Si ton URL est différente de optimum-assurance.vercel.app :
- Retourne dans Environment Variables
- Modifie **NEXTAUTH_URL** et **NEXT_PUBLIC_APP_URL** avec ta vraie URL

## Note

Les secrets **NEXTAUTH_SECRET** et **CRON_SECRET** sont déjà générés dans le fichier — ne les modifie pas.
