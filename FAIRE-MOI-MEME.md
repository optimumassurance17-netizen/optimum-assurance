# À faire toi-même — 4 étapes simples

Fais-les dans l'ordre.

---

## ÉTAPE 1 : Base de données (2 minutes)

1. Va sur **vercel.com**
2. Ouvre ton projet **optimum-assurance**
3. En haut, clique sur l'onglet **Storage**
4. Clique sur **Create Database**
5. Choisis **Postgres**
6. Clique sur **Create**
7. **C'est tout** — Vercel ajoute DATABASE_URL automatiquement

---

## ÉTAPE 2 : Clé Resend (3 minutes)

1. Va sur **resend.com**
2. Clique **Sign Up** (créer un compte avec ton email)
3. Une fois connecté, clique sur **API Keys** dans le menu
4. Clique **Create API Key**
5. Donne un nom (ex: vercel) → **Add**
6. **Copie la clé** (elle commence par re_)
7. Retourne sur **vercel.com** → ton projet
8. **Settings** → **Environment Variables**
9. Clique **Add**
   - Name : `RESEND_API_KEY`
   - Value : colle la clé que tu viens de copier
10. Clique **Save**

---

## ÉTAPE 3 : Importer les autres variables

**Option A — Via le dashboard (manuel)**  
1. Sur Vercel, dans **Environment Variables**  
2. Clique sur **Import .env**  
3. Sélectionne le fichier **vercel-env.env** (dans ton dossier optimum-assurance)  
4. Clique **Import**

**Option B — Via la CLI (automatique)**  
1. Dans le terminal : `vercel login` (une fois, pour te connecter)  
2. Puis : `vercel link` (une fois, pour lier le projet)  
3. Enfin : `npm run vercel:import`  
   → Toutes les variables de vercel-env.env sont envoyées vers Vercel

---

## ENSUITE : Déployer

1. Va sur l'onglet **Deployments**
2. Clique sur **Redeploy** (ou fais un nouveau déploiement)

---

# RÉSUMÉ

1. **Storage** → Create Database → Postgres (Vercel ajoute DATABASE_URL tout seul)
2. **resend.com** → créer compte → copier clé → l'ajouter sur Vercel (RESEND_API_KEY)
3. **Import** → sélectionner vercel-env.env (ajoute toutes les autres variables)
4. **Redeploy**

C'est tout. Pas besoin de Neon, pas besoin de comprendre — juste cliquer.
