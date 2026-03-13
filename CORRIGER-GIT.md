# Corriger et pousser sur GitHub

Exécute ces commandes **une par une** dans le terminal. Remplace les valeurs entre crochets.

---

**1. Configurer ton identité Git** (remplace par ton email et ton nom)
```
git config --global user.email "ton@email.com"
```
```
git config --global user.name "Ton Nom"
```

---

**2. Vérifier si le remote existe**
```
git remote -v
```

Si tu vois "origin" avec une URL, passe à l'étape 3.
Si tu ne vois rien ou une erreur, tape :
```
git remote add origin https://github.com/optimumassurance17-netizen/optimum-assurance.git
```

---

**3. Ajouter tous les fichiers**
```
git add .
```

---

**4. Faire le commit**
```
git commit -m "Premier envoi"
```

---

**5. Créer la branche main**
```
git branch -M main
```

---

**6. Pousser sur GitHub**
```
git push -u origin main
```

Si on te demande un mot de passe : utilise un **token** GitHub (voir étape 4bis du guide principal).
