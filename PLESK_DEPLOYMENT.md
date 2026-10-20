# SendFlow — préparation et livraison sur Plesk

## Structure livrée

Le build de production produit `dist/` dans le dépôt Plesk après l’action de déploiement Git, avec un `package.json` minimal pour le gestionnaire Node.js. GitHub Actions vérifie séparément que ce paquet se construit et démarre correctement. Configure :

- **Application root** : le sous-dossier `dist` généré sous la racine du dépôt Plesk. Le dépôt Git doit rester dans le dossier parent.
- **Application startup file** : `index.cjs` (le fichier compilé `dist/index.cjs`).
- **Document root** : le dossier `public` sous l’application root, soit `<racine-du-projet>/dist/public`.
- **Node.js** : Node 22 LTS (le build accepte aussi Node 20.19+).
- **Gestionnaire Plesk** : pnpm (comme le projet). Le manifeste runtime ne déclare aucune dépendance à installer ; le build du dépôt utilise pnpm 10.26.1.
- **Mode** : `production`.
- **Écoute réseau** : le serveur utilise le `PORT` fourni par Plesk et écoute sur `0.0.0.0`.

Le build génère aussi `dist/public/.htaccess` : Apache renvoie les routes web inconnues vers `index.html` pour que le routeur React traite les accès directs et les actualisations. Les chemins `/api/*` restent transmis à Passenger.

Le serveur recherche les fichiers du site dans `public/` relativement au dossier courant Plesk `dist`. L’arborescence attendue est :

```text
dist/
  package.json
  index.cjs
  pino-worker.cjs
  pino-file.cjs
  pino-pretty.cjs
  thread-stream-worker.cjs
  public/
    index.html
    assets/
    sitemap.xml
    robots.txt
```

Le répertoire `dist/` reste exclu du dépôt Git. Après un pull, l’action de déploiement Plesk le régénère dans le dossier du dépôt. Le déploiement ne lance aucune migration de base de données. Il demande le redémarrage Passenger via `dist/tmp/restart.txt`.

## Build et livraison

À la racine du dépôt, le build complet (tests, vérifications TypeScript, frontend et serveur) est :

```sh
pnpm run deploy:plesk
```

## Déploiement depuis Plesk Git

Le dépôt Git doit être placé dans le dossier parent de `dist`, sur la branche `main`. Dans les paramètres du dépôt Git Plesk, garde la racine du dépôt comme dossier de déploiement et configure une seule action de déploiement après le pull :

```sh
bash scripts/plesk-git-deploy.sh
```

Cette action installe les dépendances avec le lockfile, exécute les tests et les vérifications TypeScript, construit le frontend et l’API, vérifie les fichiers attendus et marque Passenger pour redémarrage. Elle ne lance aucune migration de base de données. Ensuite, le flux est : pousser le commit sur GitHub, cliquer **Pull** puis **Deploy Now** dans Plesk, vérifier que l’action de déploiement réussit, puis cliquer **Restart** dans Plesk.

Le workflow `.github/workflows/validate-plesk-build.yml` ne déploie pas sur Plesk et n’a besoin d’aucun secret SSH : il vérifie le build sur GitHub à chaque push sur `main`. Le déploiement de production est effectué par Plesk lorsque tu cliques **Deploy Now**.

## Variables d’environnement Plesk

Configurer les noms suivants dans l’environnement Node.js de Plesk, sans les placer dans Git :

- `NODE_ENV` — `production`.
- `PORT` — fourni par Plesk ; ne pas le remplacer par une valeur fixe.
- `NEON_DATABASE_URL` — connexion PostgreSQL utilisée par l’application.
- `PLESK_MEDIA_DIR` — chemin absolu inscriptible hors de `dist/public`, nécessaire au stockage durable des médias.
- `RESEND_API_KEY` et `RESEND_FROM_EMAIL` — nécessaires aux fonctions d’envoi d’e-mails.
- `PUBLIC_SITE_URL` — `https://sendflow.africa` pour les contrôles d’origine et les liens envoyés par le serveur. `APP_URL` ou `PUBLIC_URL` sont aussi acceptées comme alias; `VITE_PUBLIC_SITE_URL` est reconnue en dernier recours pour les configurations Plesk existantes.
- `APP_URL` — `https://sendflow.africa`, utilisée au build. Le script Plesk accepte aussi `PUBLIC_URL`, `PUBLIC_SITE_URL` ou, en dernier recours, `VITE_PUBLIC_SITE_URL`.
- `LOG_LEVEL` — optionnel.
- `CORS_ORIGINS` — optionnel, uniquement si des origines publiques supplémentaires sont nécessaires.

`SESSION_SECRET` n’est pas lu par la version actuelle du serveur SendFlow ; ne l’ajouter que si une fonctionnalité qui l’utilise est introduite. Les variables `ADMIN_BOOTSTRAP_*`, `ADMIN_PANEL_TOKEN` et les scripts de seed ne sont pas requis au démarrage normal. N’exécute aucun script de seed ou de migration pendant le démarrage Plesk.

## Commandes et vérifications

Le build est effectué par l’action de déploiement Plesk. Après **Deploy Now**, utiliser **Restart** dans Plesk pour redémarrer Passenger.

Après une livraison réussie, vérifier dans le File Manager que le dossier d’application contient `index.cjs`, les workers Pino et `public/index.html`. Tester :

- `https://<domaine-configuré>/`
- `https://<domaine-configuré>/api/healthz`

Les pages protégées nécessitant une authentification ne sont pas vérifiables sans session. Une réponse HTTP 200 à `/api/healthz` vérifie que le processus sert l’API, mais ne prouve pas à elle seule que chaque intégration tierce fonctionne.
