# SendFlow — préparation et livraison sur Plesk

## Structure livrée

Le build de production produit `dist/` dans GitHub Actions, avec un `package.json` minimal pour le gestionnaire Node.js. Le workflow transfère ensuite le contenu de `dist/` vers la racine de l’application Node.js dans Plesk. Configure :

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

Le répertoire `dist/` reste exclu du dépôt Git. Le workflow le transfère depuis GitHub Actions vers Plesk après avoir vérifié le build. Le déploiement ne lance aucune migration de base de données. Il demande le redémarrage Passenger via `tmp/restart.txt`.

## Build et livraison

À la racine du dépôt, le build complet (tests, vérifications TypeScript, frontend et serveur) est :

```sh
pnpm run deploy:plesk
```

## Déploiement automatique vers Plesk

Le workflow `.github/workflows/deploy-plesk.yml` reconstruit l’application après chaque push sur `main`, transfère `dist/` vers le dossier d’application Plesk configuré, vérifie les fichiers livrés et demande le redémarrage Passenger. Il peut aussi être lancé manuellement depuis l’onglet **Actions** de GitHub. **Aucune commande de build n’est à saisir dans les actions Git Plesk.**

Le workflow utilise Node.js 22 et pnpm 10.26.1. Il exige les secrets GitHub `PLESK_HOST`, `PLESK_PORT`, `PLESK_USER`, `PLESK_APP_ROOT`, `PLESK_SSH_PRIVATE_KEY` et `PLESK_KNOWN_HOSTS`. `PLESK_APP_ROOT` doit correspondre au dossier Application root Node.js, par exemple le dossier `dist` configuré dans Plesk. L’origine de production est `APP_URL` (par défaut `https://sendflow.africa`), ou la variable `PUBLIC_URL` / `PUBLIC_SITE_URL`.

Après un push, vérifier que l’exécution **Build and deploy SendFlow to Plesk** est réussie dans GitHub Actions. Le workflow transfère lui-même le build et marque Passenger pour redémarrage ; il n’est pas nécessaire de lancer un second build depuis Plesk.

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

Le build et le transfert sont effectués par GitHub Actions. Le bouton Plesk **Restart** reste disponible si Passenger ne redémarre pas après la livraison.

Après une livraison réussie, vérifier dans le File Manager que le dossier d’application contient `index.cjs`, les workers Pino et `public/index.html`. Tester :

- `https://<domaine-configuré>/`
- `https://<domaine-configuré>/api/healthz`

Les pages protégées nécessitant une authentification ne sont pas vérifiables sans session. Une réponse HTTP 200 à `/api/healthz` vérifie que le processus sert l’API, mais ne prouve pas à elle seule que chaque intégration tierce fonctionne.
