# SendFlow — préparation et livraison sur Plesk

## Structure livrée

Le build de production produit `dist/` dans le dépôt Plesk après l’action de déploiement Git, avec un `package.json` minimal pour le gestionnaire Node.js. GitHub Actions vérifie séparément que ce paquet se construit et démarre correctement. Configure :

- **Application root** : le sous-dossier `dist` généré sous la racine du dépôt Plesk. Le dépôt Git doit rester dans le dossier parent.
- **Application startup file** : `index.cjs` (le fichier compilé `dist/index.cjs`).
- **Document root** : le dossier `public` sous l’application root, soit `<racine-du-projet>/dist/public`.
- **Node.js** : Node 24 si disponible (référence de développement et de CI), sinon Node 22.12+ dans la branche 22. La compatibilité de build avec Node 20.19+ dans la branche 20 est conservée pour les hébergements existants ; préférer une branche LTS encore maintenue.
- **Gestionnaire Plesk** : pnpm (comme le projet). Le manifeste runtime ne déclare aucune dépendance à installer ; le build du dépôt utilise pnpm 10.26.1.
- **Mode** : `production`.
- **Écoute réseau** : sous Plesk, le serveur détecte `PhusionPassenger` et utilise son socket avec `listen("passenger")`. Aucun `PORT` numérique n’est exigé sous Passenger. En exécution Node directe seulement, `PORT` reste obligatoire et le serveur écoute sur `0.0.0.0`.

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

### Versions Node.js : disponibilité, build et validation

La compatibilité plus large que Node 24 est volontaire pour les hébergements
existants ; elle n'est pas une garantie de validation équivalente à la CI.

| Contexte | Version / portée |
| --- | --- |
| Workspace et CI GitHub | Node 24, avec tests, types, build et smoke-test du bundle |
| Contrôle de build Plesk et cPanel | `^20.19.0 || >=22.12.0`, exigence déclarée par Vite 7 et son plugin React dans les dépendances verrouillées |
| Anciennes branches et autres versions acceptées | Compatibilité conservée, mais pas de matrice CI sur ces versions ; valider le build et le démarrage sur l'hôte |
| Manifeste du bundle `dist/package.json` | Minimum runtime `>=20.19.0` ; ce manifeste sans dépendances ne décrit pas les prérequis du build du dépôt |

Node 22.0 à 22.11 était accepté par erreur : il ne satisfait pas les prérequis
de Vite et est désormais refusé avant l'installation. Node 21 reste refusé.
Les versions ultérieures à 22 satisfaisant la plage restent acceptées, sans
pour autant recommander une branche impaire ou non maintenue en production.
Les outils de développement non exécutés par le déploiement, notamment Orval
pour régénérer l'API, peuvent demander une version plus récente : utiliser
Node 24 pour ce travail.

Selon la [documentation Plesk sur les runtimes Node.js](https://docs.plesk.com/en-US/obsidian/administrator-guide/plesk-administration/enabling-nodejs-support.76658/),
Plesk Linux peut installer plusieurs versions, sélectionnables par domaine ;
Plesk Windows n'en utilise qu'une à la fois. Les versions réellement proposées
dépendent de l'installation et de l'hébergeur : ce guide ne confirme pas la
version actuellement installée sur le serveur de production.
Les [prérequis Vite](https://vite.dev/guide/#scaffolding-your-first-vite-project)
expliquent le seuil 20.19 / 22.12.

Sélectionner la version dans Plesk **et** s'assurer que l'action Git utilise le
même runtime dans son `PATH`. Depuis le terminal exécutant le hook :

```sh
node -p 'process.version + " " + process.execPath'
node scripts/check-deploy-node.cjs
```

Le contrôle partagé affiche la version et le binaire utilisés et avertit si
ce n'est pas la référence Node 24. Un passage réussi confirme seulement le
prérequis de version, pas un build réussi ni le fonctionnement de Passenger.
Après un changement de runtime, exécuter le déploiement complet, redémarrer
Passenger et effectuer les vérifications HTTP ci-dessous.

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
- `PORT` — non requis sous Passenger ; ne pas ajouter de port fixe dans Plesk. Obligatoire uniquement pour lancer le serveur directement avec Node hors Passenger.
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
