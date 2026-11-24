# Backend API PHP — étape 3

Démarrage local (serveur PHP réservé au développement) :

```powershell
cd "$HOME\Desktop\amjd-tourisme\backend"
Copy-Item .env.example .env
php -S 127.0.0.1:8000 -t public public/index.php
```

Si PHP n'est pas dans le PATH sur Windows, utilisez :

```powershell
& "C:\xampp\php\php.exe" -S 127.0.0.1:8000 -t public public/index.php
```

Importez `database/schema.sql` puis `database/seed.sql` dans phpMyAdmin avant de démarrer.

Routes :
- `GET /api/health` : connexion MySQL
- `GET /api/voyages` : liste des voyages publiés (par défaut 30, maximum 50)
- `GET /api/voyages?q=Paris` : recherche
- `GET /api/voyages?pays=Maroc&max_price=700` : filtres
- `GET /api/voyages/1` : détail par ID

En production, déployer derrière un serveur web PHP adapté (Apache/Nginx + PHP-FPM), avec un compte SQL restreint et un véritable gestionnaire de secrets. La clé `.env` est ignorée par Git. La création des réservations et l'authentification arrivent dans les prochaines étapes.
