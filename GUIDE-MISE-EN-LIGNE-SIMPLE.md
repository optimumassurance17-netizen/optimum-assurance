# Mise en ligne — Étape par étape (minutieux)

---

# ÉTAPE 1 : Créer un compte GitHub

1. Ouvre ton navigateur (Chrome, Edge, Firefox...)
2. Va sur l'adresse : **https://github.com**
3. En haut à droite, clique sur le bouton **Sign up**
4. Remplis le formulaire :
   - Ton email
   - Un mot de passe (minimum 15 caractères)
   - Un nom d'utilisateur (ex: jeanmartin)
   - Tape "y" pour accepter
5. Clique sur **Create account**
6. Vérifie ton email si GitHub te le demande
7. Tu es maintenant connecté à GitHub

---

# ÉTAPE 2 : Créer un nouveau dépôt sur GitHub

1. Tu es sur la page d'accueil de GitHub
2. En haut à gauche, clique sur le **logo GitHub** (le chat noir) pour aller à l'accueil
3. En haut à droite, à côté de ta photo de profil, tu vois un bouton **+**
4. Clique sur ce **+**
5. Dans le menu qui s'ouvre, clique sur **New repository**
6. Tu es sur une page "Create a new repository"
7. Dans la case **Repository name**, tape exactement : **optimum-assurance**
8. Laisse **Public** coché (ou choisis Private si tu préfères)
9. **NE COCHE PAS** "Add a README file"
10. **NE COCHE PAS** "Add .gitignore"
11. En bas de la page, clique sur le bouton vert **Create repository**
12. Une nouvelle page s'ouvre avec ton dépôt vide — c'est normal

---

# ÉTAPE 3 : Préparer le terminal dans Cursor

1. Ouvre **Cursor** (ton éditeur de code)
2. Ouvre ton projet optimum-assurance (si ce n'est pas déjà fait)
3. En bas de l'écran, tu vois une zone avec du texte noir/blanc : c'est le **Terminal**
4. Si tu ne vois pas le Terminal : clique sur le menu **Terminal** en haut, puis **New Terminal**
5. Tu dois voir une ligne qui se termine par quelque chose comme : `optimum-assurance>` ou `C:\Users\osmos\optimum-assurance>`
6. Le terminal est prêt

---

# ÉTAPE 4 : Envoyer ton code sur GitHub (commandes)

**Pour chaque commande ci-dessous :**
- Copie la ligne (sans les numéros)
- Colle dans le terminal
- Appuie sur **Entrée**
- Attends que ça se termine avant de passer à la suivante

**Commande 4.1**
```
cd c:\Users\osmos\optimum-assurance
```

**Commande 4.2**
```
git init
```
*(Tu peux voir "Initialized empty Git repository" — c'est normal)*

**Commande 4.3**
```
git add .
```
*(Rien ne s'affiche — c'est normal)*

**Commande 4.4**
```
git commit -m "Premier envoi"
```
*(Tu vois une liste de fichiers — c'est normal)*

**Commande 4.5** — ATTENTION : remplace **TON-PSEUDO** par ton vrai nom d'utilisateur GitHub (celui que tu as choisi à l'étape 1)
```
git remote add origin https://github.com/TON-PSEUDO/optimum-assurance.git
```
*Exemple : si ton pseudo est "jeanmartin", tu tapes :*
```
git remote add origin https://github.com/jeanmartin/optimum-assurance.git
```

**Commande 4.6**
```
git branch -M main
```

**Commande 4.7**
```
git push -u origin main
```

---

# ÉTAPE 4bis : Si la commande 4.7 demande un mot de passe

GitHub n'accepte plus le mot de passe du compte. Il faut un **token** :

1. Ouvre un nouvel onglet dans ton navigateur
2. Va sur **https://github.com/settings/tokens**
3. Clique sur **Generate new token** puis **Generate new token (classic)**
4. Si on te demande ton mot de passe GitHub, entre-le
5. Dans "Note", tape : **vercel**
6. Dans "Expiration", choisis **90 days** (ou No expiration)
7. Coche **uniquement** la case **repo** (tout en bas)
8. Descends et clique sur **Generate token**
9. **COPIE LE TOKEN** immédiatement (il commence par ghp_...) — tu ne pourras plus le revoir
10. Retourne dans Cursor, dans le terminal
11. Retape la commande 4.7 : `git push -u origin main`
12. Quand on te demande "Username" : tape ton pseudo GitHub
13. Quand on te demande "Password" : **colle le token** (pas ton mot de passe)
14. Appuie sur Entrée

Si tout va bien, tu vois "Enumerating objects..." puis "Writing objects: 100%"

---

# ÉTAPE 5 : Créer une base de données (Neon)

1. Ouvre ton navigateur
2. Va sur **https://neon.tech**
3. Clique sur **Sign Up** (ou Sign in si tu as déjà un compte)
4. Choisis **Continue with GitHub** — connecte-toi avec ton compte GitHub
5. Une fois connecté, clique sur **New Project**
6. Dans "Project name", tape : **optimum**
7. Choisis une région (ex: Frankfurt)
8. Clique sur **Create Project**
9. Une page s'affiche avec les détails du projet
10. Tu vois une section **Connection string**
11. À côté, il y a un bouton **Copy** — clique dessus
12. L'URL est copiée (elle ressemble à : postgresql://user:password@host/db?sslmode=require)
13. **Garde cette URL** — tu en auras besoin à l'étape 8
14. Tu peux ouvrir un fichier texte (Bloc-notes) et coller l'URL dedans pour ne pas la perdre

---

# ÉTAPE 6 : Créer un compte Vercel

1. Ouvre ton navigateur
2. Va sur **https://vercel.com**
3. Clique sur **Sign Up** (en haut à droite)
4. Choisis **Continue with GitHub**
5. Autorise Vercel à accéder à ton compte GitHub (clique sur **Authorize Vercel**)
6. Tu es maintenant connecté à Vercel

---

# ÉTAPE 7 : Importer ton projet sur Vercel

1. Tu es sur le tableau de bord Vercel
2. Clique sur le bouton **Add New...** (en haut à droite)
3. Dans le menu, clique sur **Project**
4. Tu vois une liste de dépôts GitHub
5. Cherche **optimum-assurance** dans la liste
6. À droite de optimum-assurance, clique sur le bouton **Import**
7. Une page de configuration s'affiche
8. **NE CLIQUE PAS ENCORE sur Deploy** — on doit d'abord ajouter les variables

---

# ÉTAPE 8 : Générer les secrets (NEXTAUTH_SECRET et CRON_SECRET)

1. Retourne dans **Cursor**
2. Dans le terminal, tape :
```
npm run generate-secret
```
3. Appuie sur Entrée
4. Une longue chaîne de caractères s'affiche (ex: a1b2c3d4e5f6...)
5. **Copie cette chaîne** entièrement
6. Colle-la dans ton Bloc-notes — tu en auras besoin 2 fois (NEXTAUTH_SECRET et CRON_SECRET)
7. Si tu veux 2 secrets différents : relance la commande une 2e fois pour avoir une 2e chaîne

---

# ÉTAPE 9 : Ajouter les variables d'environnement sur Vercel

1. Tu es sur la page de configuration du projet Vercel (étape 7)
2. Cherche la section **Environment Variables** (elle peut être plus bas sur la page)
3. Tu vois 2 cases : **Key** (ou Name) et **Value**
4. Pour **chaque ligne** du tableau ci-dessous :
   - Tape le **Nom** dans la case Key
   - Tape la **Valeur** dans la case Value (en remplaçant par tes vraies valeurs)
   - Clique sur **Add** (ou le bouton pour ajouter)

**Variable 1**
- Nom : `DATABASE_URL`
- Valeur : colle l'URL que tu as copiée à l'étape 5 (Neon)

**Variable 2**
- Nom : `NEXTAUTH_SECRET`
- Valeur : colle la chaîne générée à l'étape 8

**Variable 3**
- Nom : `NEXTAUTH_URL`
- Valeur : `https://optimum-assurance.vercel.app` (on corrigera après si besoin)

**Variable 4**
- Nom : `NEXT_PUBLIC_APP_URL`
- Valeur : `https://optimum-assurance.vercel.app`

**Variable 5**
- Nom : `MOLLIE_API_KEY`
- Valeur : ta clé Mollie (va sur mollie.com → Dashboard → Développeurs → Clés API)

**Variable 6**
- Nom : `RESEND_API_KEY`
- Valeur : ta clé Resend (va sur resend.com → API Keys)

**Variable 7**
- Nom : `EMAIL_FROM`
- Valeur : `Optimum <noreply@tondomaine.com>` (remplace tondomaine par ton domaine)

**Variable 8**
- Nom : `NEXT_PUBLIC_SUPABASE_URL`
- Valeur : URL du projet Supabase (`.supabase.co`)

**Variable 9**
- Nom : `SUPABASE_SERVICE_ROLE_KEY`
- Valeur : clé **service_role** (Supabase → Project Settings → API)

**Variable 10**
- Nom : `ADMIN_EMAILS`
- Valeur : ton email (ex: contact@optimum-assurance.fr)

**Variable 11**
- Nom : `CRON_SECRET`
- Valeur : la même chaîne que NEXTAUTH_SECRET (ou la 2e générée à l'étape 8)

5. Vérifie que les variables ci-dessus sont bien listées dans Vercel (voir `DEPLOYMENT.md`).

---

# ÉTAPE 10 : Déployer sur Vercel

1. Sur la même page Vercel
2. Clique sur le bouton **Deploy** (en bas)
3. Attends 2 à 5 minutes
4. Une barre de progression s'affiche
5. Quand c'est terminé, tu vois **Congratulations!** ou une page de succès
6. Note l'URL de ton site (ex: optimum-assurance-abc123.vercel.app)
7. Si l'URL est différente de optimum-assurance.vercel.app, retourne dans Environment Variables et corrige NEXTAUTH_URL et NEXT_PUBLIC_APP_URL avec la vraie URL

---

# ÉTAPE 11 : Créer les tables dans la base de données

1. Retourne dans **Cursor**
2. Ouvre le terminal
3. Tape cette commande en remplaçant **COLLE-URL-NEON-ICI** par ton URL Neon (celle de l'étape 5) :
```
DATABASE_URL="COLLE-URL-NEON-ICI" npx prisma db push
```
*Exemple (avec une fausse URL) :*
```
DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require" npx prisma db push
```
4. Appuie sur Entrée
5. Tu dois voir "Your database is now in sync with your schema"
6. C'est terminé

---

# RÉCAPITULATIF DES 11 ÉTAPES

| # | Action |
|---|--------|
| 1 | Créer compte GitHub |
| 2 | Créer dépôt "optimum-assurance" sur GitHub |
| 3 | Ouvrir le terminal dans Cursor |
| 4 | 7 commandes git (init, add, commit, remote, branch, push) |
| 4bis | Si push demande un mot de passe : créer un token GitHub |
| 5 | Créer projet sur Neon.tech et copier l'URL |
| 6 | Créer compte Vercel avec GitHub |
| 7 | Importer le projet optimum-assurance sur Vercel |
| 8 | Générer NEXTAUTH_SECRET avec npm run generate-secret |
| 9 | Ajouter les 11 variables sur Vercel |
| 10 | Cliquer Deploy sur Vercel |
| 11 | Lancer npx prisma db push avec l'URL Neon |

---

# TON SITE EST EN LIGNE

Tu peux maintenant aller sur l'URL que Vercel t'a donnée pour voir ton site.
