# SendFlow — préparation et livraison sur Plesk

## Structure livrée

Le build de production produit `dist/` sous le dépôt Plesk, avec un `package.json` minimal pour le gestionnaire Node.js. Le dépôt Git reste à sa racine ; `dist/` est généré automatiquement par l’action post-déploiement Plesk. Configure :

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

Le répertoire `dist/` est généré sur Plesk après chaque récupération du dépôt et reste exclu de Git. Le script de déploiement ne lance aucune migration de base de données. Il demande le redémarrage Passenger via `dist/tmp/restart.txt`.

## Build et livraison

À la racine du dépôt, le build complet (tests, vérifications TypeScript, frontend et serveur) est :

```sh
pnpm run deploy:plesk
```

## Déploiement depuis Plesk Git

Le flux visé est : pousser le code sur GitHub, puis cliquer sur **Pull + Deploy Now** dans Plesk. Dans les actions de déploiement du dépôt Git Plesk, configure une seule fois la commande :

```sh
PUBLIC_SITE_URL=https://sendflow.africa bash scripts/plesk-git-deploy.sh
```

Cette commande installe les dépendances du workspace, exécute les tests, les vérifications TypeScript et le build de production, puis crée `dist/` avec l’application compilée et demande le redémarrage Passenger. Après **Pull + Deploy Now**, clique sur **Restart** dans Node.js si Plesk ne redémarre pas automatiquement.

La commande reçoit une origine sous `PUBLIC_SITE_URL`, `APP_URL` ou `PUBLIC_URL`. Ne mets pas les secrets de production dans la commande de déploiement.

Node.js 22 LTS et pnpm 10.26.1 sont requis pour le build. Le script s’arrête avec une erreur explicite si une variable de build manque ou si sa valeur est invalide.

## Variables d’environnement Plesk

Configurer les noms suivants dans l’environnement Node.js de Plesk, sans les placer dans Git :

- `NODE_ENV` — `production`.
- `PORT` — fourni par Plesk ; ne pas le remplacer par une valeur fixe.
- `NEON_DATABASE_URL` — connexion PostgreSQL utilisée par l’application.
- `PLESK_MEDIA_DIR` — chemin absolu inscriptible hors de `dist/public`, nécessaire au stockage durable des médias.
- `RESEND_API_KEY` et `RESEND_FROM_EMAIL` — nécessaires aux fonctions d’envoi d’e-mails.
- `PUBLIC_SITE_URL` — `https://sendflow.africa` pour les contrôles d’origine et les liens envoyés par le serveur. `APP_URL` ou `PUBLIC_URL` sont aussi acceptées comme alias.
- `APP_URL` — `https://sendflow.africa`, utilisée au build. Le serveur accepte également `APP_URL` ou `PUBLIC_URL` comme alias de `PUBLIC_SITE_URL`.
- `LOG_LEVEL` — optionnel.
- `CORS_ORIGINS` — optionnel, uniquement si des origines publiques supplémentaires sont nécessaires.

`SESSION_SECRET` n’est pas lu par la version actuelle du serveur SendFlow ; ne l’ajouter que si une fonctionnalité qui l’utilise est introduite. Les variables `ADMIN_BOOTSTRAP_*`, `ADMIN_PANEL_TOKEN` et les scripts de seed ne sont pas requis au démarrage normal. N’exécute aucun script de seed ou de migration pendant le démarrage Plesk.

## Commandes et vérifications

Le build et `pnpm install` sont effectués par l’action post-déploiement Plesk. Ne les lance pas une seconde fois à la main après le pull. Le bouton **Restart** sert à relancer l’application compilée.

Après une livraison réussie, vérifier dans le File Manager que le dossier d’application contient `index.cjs`, les workers Pino et `public/index.html`. Tester :

- `https://<domaine-configuré>/`
- `https://<domaine-configuré>/api/healthz`

Les pages protégées nécessitant une authentification ne sont pas vérifiables sans session. Une réponse HTTP 200 à `/api/healthz` vérifie que le processus sert l’API, mais ne prouve pas à elle seule que chaque intégration tierce fonctionne.
