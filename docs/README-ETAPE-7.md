# Étape 7 — Installation sur Windows CMD

Cette mise à jour est un **patch à ajouter au projet de l'étape 6**, pas un remplacement complet. Elle ajoute Docker, GitHub Actions, tests et documentation. Elle ne modifie aucune table MySQL.

## A. Sauvegarder puis copier les fichiers

1. Sauvegarder le dossier actuel `amjd-tourisme` (ou créer un commit Git local).
2. Décompresser `amjd-tourisme-etape7.zip`.
3. Copier **le contenu du dossier** `amjd-tourisme-etape7` dans `C:\Users\faysal flk\Desktop\amjd-tourisme`.
4. Fusionner les dossiers, remplacer **uniquement** `backend/config/database.php` et `frontend/vite.config.js` parmi les anciens fichiers.
5. Conserver `backend/.env`, `frontend/package.json`, `frontend/package-lock.json` et tous les fichiers de l'étape 6.
6. Ne rien réimporter dans phpMyAdmin : **aucune nouvelle migration**.

## B. Lancer avec Docker Desktop (données Docker isolées)

Arrêter les serveurs locaux React/PHP utilisant les ports 5173 et 8000. Installer et ouvrir Docker Desktop si nécessaire.

Dans **CMD** :

```cmd
cd /d "C:\Users\faysal flk\Desktop\amjd-tourisme"
copy .env.example .env
docker compose config
docker compose up -d --build
docker compose ps
```

Naviguer vers http://localhost:5173 et vérifier http://localhost:8000/api/health.

- Si un port est déjà utilisé, fermer l'ancien serveur et relancer.
- MySQL Docker est sur `127.0.0.1:3307`, XAMPP reste sur `3306`. Ce sont **deux bases distinctes**.
- Les voyages fictifs s'importent au **premier** démarrage du volume Docker.
- Ne pas lancer `docker compose down -v` si vous voulez conserver les comptes/réservations dans Docker.

## C. Exécuter les tests

Dans CMD (depuis la racine du projet) :

```cmd
docker compose exec api php tests/unit.php
python scripts/smoke_test.py http://127.0.0.1:8000
```

Si `python` n'est pas reconnu, essayer `py scripts/smoke_test.py http://127.0.0.1:8000`.

Attention : le test d'intégration crée **un compte fictif et une réservation qu'il annule**. Il est conçu pour la base Docker de démonstration.

## D. Préparer le frontend pour GitHub Actions

Le projet React créé à l'étape 1 possède déjà `frontend/package.json`. Vérifier qu'il possède aussi le fichier `frontend/package-lock.json` ; sinon faire dans `frontend` :

```cmd
npm install
npm run build
```

**Ne jamais mettre `node_modules` sur GitHub.** `package-lock.json` en revanche **doit** être versionné pour `npm ci` en CI.

## E. GitHub : publier un dépôt (après vérification des droits sur le code/logo)

Créer un **dépôt vide** sur GitHub, sans README automatique. Dans CMD, à la racine :

```cmd
git init
git add .
git status
git commit -m "feat: full-stack travel booking platform with CI and Docker"
git branch -M main
git remote add origin https://github.com/TON_COMPTE/amjd-tourisme-v2.git
git push -u origin main
```

Remplacer `TON_COMPTE` par votre identifiant GitHub et utiliser le nom du dépôt créé. Les commandes supposent que Git et l'authentification GitHub sont déjà configurés.

**Avant git commit :** `git status` ne doit pas lister `.env`, `node_modules`, `dist`, des exports MySQL ni des données personnelles.

## F. Voir la CI

GitHub → dépôt → onglet **Actions** → workflow **CI — AMJD Tourisme**. Le workflow effectue un build React, vérifie la syntaxe PHP, exécute les tests unitaires et un scénario d'intégration API avec une base MySQL jetable.

## G. Limites honnêtes

La CI valide le build et les scénarios automatisés fournis, pas la sécurité complète ni l'UX sur tous les navigateurs. Cette configuration Docker est destinée au **développement** ; la publication GitHub du code ne correspond pas à un déploiement public du site.
