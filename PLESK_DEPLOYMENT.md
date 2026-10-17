# SendFlow — préparation et livraison sur Plesk

## Structure livrée

Le build de production produit `dist/` à la racine du dépôt, avec un `package.json` minimal pour le gestionnaire Node.js de Plesk. Pour Plesk, configure :

- **Application root** : le chemin absolu du dossier `dist` sur le serveur, par exemple `<racine-du-projet>/dist`.
- **Application startup file** : `index.cjs` (le fichier compilé `dist/index.cjs`).
- **Document root** : le dossier `public` sous l’application root, soit `<racine-du-projet>/dist/public`.
- **Node.js** : Node 22 LTS (le build accepte aussi Node 20.19+).
- **Gestionnaire Plesk** : pnpm (comme le projet). Le manifeste runtime ne déclare aucune dépendance à installer ; le build du dépôt utilise pnpm 10.26.1.
- **Mode** : `production`.
- **Écoute réseau** : le serveur utilise le `PORT` fourni par Plesk et écoute sur `0.0.0.0`.

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

Le répertoire de sortie `dist` est généré par le build et reste exclu du dépôt Git. Le workflow GitHub Actions le construit, puis transfère son contenu dans le dossier Plesk configuré comme `PLESK_APP_ROOT`. Le déploiement ne lance aucune migration de base de données. Il demande le redémarrage Passenger via `tmp/restart.txt`.

## Build et livraison

À la racine du dépôt, le build complet (tests, vérifications TypeScript, frontend et serveur) est :

```sh
pnpm run deploy:plesk
```

Le workflow `.github/workflows/deploy-plesk.yml` utilise pnpm 10.26.1 et Node 22, puis livre le build à Plesk sur un push vers `main` ou par lancement manuel dans GitHub Actions. Aucun push n’est effectué par l’agent. Il n’est pas nécessaire d’exécuter un build ou `pnpm install` dans Plesk : le serveur compilé et les fichiers publics sont déjà générés dans GitHub Actions.

## Réglages GitHub

Créer ces **Actions variables** (ce ne sont pas des secrets) :

- `APP_URL` **ou** `PUBLIC_URL` : `https://sendflow.africa` (origine HTTPS canonique, sans chemin). Cette valeur est utilisée au build pour les URLs SEO.

Créer ces **Actions secrets** :

- `PLESK_HOST` : hôte SSH, pas l’adresse du panneau Plesk.
- `PLESK_PORT` : port SSH.
- `PLESK_USER` : utilisateur SSH autorisé à écrire dans l’application.
- `PLESK_APP_ROOT` : chemin absolu du dossier `dist` qui sera l’Application root Plesk. Le workflow transfère directement le contenu compilé dans ce dossier.
- `PLESK_SSH_PRIVATE_KEY` : clé privée dédiée au déploiement.
- `PLESK_KNOWN_HOSTS` : clé d’hôte SSH vérifiée, au format `known_hosts`.
- `VITE_CLERK_PUBLISHABLE_KEY` : clé publique Clerk de production employée pendant le build frontend.

Le dossier `PLESK_APP_ROOT` doit exister ou pouvoir être créé par l’utilisateur SSH. Celui-ci doit également pouvoir créer le dossier de staging voisin et écrire dans `tmp/`.

## Variables d’environnement Plesk

Configurer les noms suivants dans l’environnement Node.js de Plesk, sans les placer dans Git :

- `NODE_ENV` — `production`.
- `PORT` — fourni par Plesk ; ne pas le remplacer par une valeur fixe.
- `NEON_DATABASE_URL` — connexion PostgreSQL utilisée par l’application.
- `CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY` — authentification et proxy Clerk.
- `PLESK_MEDIA_DIR` — chemin absolu inscriptible hors de `dist/public`, nécessaire au stockage durable des médias.
- `RESEND_API_KEY` et `RESEND_FROM_EMAIL` — nécessaires aux fonctions d’envoi d’e-mails.
- `APP_URL` ou `PUBLIC_URL` — `https://sendflow.africa`. Pour mettre à jour le sitemap et les canonicals, la même origine doit aussi être définie dans les Actions variables GitHub avant le build.
- `LOG_LEVEL` — optionnel.
- `CORS_ORIGINS` — optionnel, uniquement si des origines publiques supplémentaires sont nécessaires.

`SESSION_SECRET` n’est pas lu par la version actuelle du serveur SendFlow ; ne l’ajouter que si une fonctionnalité qui l’utilise est introduite. Les variables `ADMIN_BOOTSTRAP_*`, `ADMIN_PANEL_TOKEN` et les scripts de seed ne sont pas requis au démarrage normal. N’exécute aucun script de seed ou de migration pendant le démarrage Plesk.

## Commandes et vérifications

Le build est effectué dans GitHub Actions avec `pnpm run deploy:plesk`. Sur Plesk, ne lance ni `npm install`, ni `pnpm install`, ni une commande de build. Dans **Run Node.js commands**, utiliser seulement le redémarrage après la livraison si le workflow ne l’a pas déjà fait.

Après une livraison réussie, vérifier dans le File Manager que le dossier d’application contient `index.cjs`, les workers Pino et `public/index.html`. Tester :

- `https://<domaine-configuré>/`
- `https://<domaine-configuré>/sign-in`
- `https://<domaine-configuré>/api/healthz`

Les pages protégées nécessitant une authentification ne sont pas vérifiables sans session. Une réponse HTTP 200 à `/api/healthz` vérifie que le processus sert l’API, mais ne prouve pas à elle seule que chaque intégration tierce fonctionne.
