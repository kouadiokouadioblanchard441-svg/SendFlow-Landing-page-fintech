# SendFlow — préparation et livraison sur Plesk

## Structure livrée

Le build de production produit `dist/` dans le checkout Git Plesk après l’action de déploiement, avec un `package.json` minimal pour le gestionnaire Node.js. GitHub Actions vérifie séparément que ce paquet se construit et démarre correctement. Le checkout Git et la racine de l’application Node.js sont deux chemins distincts. Configure :

- **Application root** : le `dist` généré sous le checkout Git Plesk. Résous le chemin à partir du vrai dossier du dépôt affiché par Plesk ; ne suppose pas que ce chemin est `/httpdocs`.
- **Application startup file** : `index.cjs` (le fichier compilé `dist/index.cjs`).
- **Document root** : `public` sous l’application root, soit le chemin réel `<checkout-git>/dist/public`.
- **Node.js** : Node 24 si disponible (référence de développement et de CI), sinon Node 22.12+ dans la branche 22. La compatibilité de build avec Node 20.19+ dans la branche 20 est conservée pour les hébergements existants ; préférer une branche LTS encore maintenue.
- **Gestionnaire Plesk** : pnpm 10.26.1, épinglé par `packageManager` dans `package.json`. Les scripts Plesk utilisent Corepack quand il est disponible ; sinon ils exigent que le pnpm fourni par Plesk corresponde exactement à cette version. Le manifeste runtime ne déclare aucune dépendance à installer.
- **Mode** : `production`.
- **Écoute réseau** : sous Plesk, le serveur détecte `PhusionPassenger` et utilise son socket avec `listen("passenger")`. Aucun `PORT` numérique n’est exigé sous Passenger. En exécution Node directe seulement, `PORT` reste obligatoire et le serveur écoute sur `0.0.0.0`.

Le build génère aussi `dist/public/.htaccess` : Apache renvoie les routes web inconnues vers `index.html` pour que le routeur React traite les accès directs et les actualisations. Les chemins `/api/*` restent transmis à Passenger.

Plesk doit démarrer le bundle avec `dist` comme répertoire courant : le serveur y cherche `build-info.json` et `public/`. Le fichier `index.cjs` à la racine du checkout est un wrapper de build ; ne le sélectionne pas comme fichier de démarrage si l’application root reste le checkout. Il laisse le répertoire courant au checkout, ce qui fait perdre l’ID du build et ne correspond pas au paquet runtime isolé.

L’arborescence attendue dans l’application root Plesk est :

```text
dist/
  package.json
  index.cjs
  build-info.json
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

Chaque paquet contient un `build-info.json` qui ne stocke qu’un UUID aléatoire
non sensible. Le script affiche cet identifiant dans la sortie de l’action de
déploiement. L’API renvoie le même identifiant dans `buildId` sur
`/api/healthz`; elle ne renvoie ni variables d’environnement, ni secrets, ni
chemins, ni données d’administration.

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

Le dépôt est un monorepo : le dossier livré par Git doit conserver sa racine et contenir `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `scripts/` et `artifacts/`. Le build écrit `dist/` dans cette racine ; `dist/` n’est pas suivi par Git.

Plesk distingue le dépôt local/checkout géré par son extension, le dossier où il déploie les fichiers et la racine de l’application Node.js. Vérifie leurs chemins réels dans les paramètres du dépôt et le Gestionnaire de fichiers ; ne déduis pas un chemin absolu à partir du seul nom de domaine. Le dossier déployé doit contenir toute la racine du monorepo pour que l’action ci-dessous trouve le lockfile et le build.

Avant le déploiement, configure une seule action de déploiement Plesk pour construire les sources livrées :

```sh
bash scripts/plesk-git-deploy.sh
```

Plesk effectue d’abord son opération Git native ; l’action de build ne démarre qu’après la réussite de cette étape. Cette action ne lance aucune commande Git. Elle repère la racine du projet depuis son propre fichier, vérifie la version de pnpm, installe avec le lockfile, exécute tests et vérifications TypeScript, construit le frontend et l’API, vérifie le paquet, puis marque Passenger pour redémarrage. Elle ne lance aucune migration de base de données.

Le bouton Plesk **Deploy Now** effectue d’abord son propre déploiement Git. L’erreur `fatal: this operation must be run in a work tree` affichée dans l’étape Plesk **Deploying files** survient avant cette action de build : cette erreur n’est pas produite par le script du projet et ne peut pas être corrigée par `index.cjs`. Vérifie le checkout et le répertoire ciblé dans Plesk avant de relancer :

```sh
git -C "<chemin-réel-du-checkout-ou-worktree-utilisé-par-Plesk>" rev-parse --show-toplevel
git -C "<chemin-réel-du-checkout-ou-worktree-utilisé-par-Plesk>" rev-parse --is-inside-work-tree
git -C "<chemin-réel-du-checkout-ou-worktree-utilisé-par-Plesk>" rev-parse --is-bare-repository
```

Pour le worktree dans lequel Plesk tente son opération de checkout, les réponses attendues sont un chemin de racine, `true`, puis `false`. Un dépôt bare peut être une copie interne valide ; dans ce cas, vérifie le worktree de déploiement distinct au lieu d’exiger que le dépôt bare lui-même soit un worktree. Si Plesk ne peut pas exécuter ces commandes dans le dossier concerné, corrige ou recrée la copie locale gérée par Plesk sans supprimer le dépôt Git distant ni les fichiers du site. Si le worktree est valide mais que l’étape interne échoue encore, le problème relève de l’état/configuration de l’extension Git Plesk ou de l’hébergeur.

Le flux complet est : pousser le commit sur GitHub, cliquer **Pull** puis **Deploy Now**, confirmer que le déploiement Git Plesk réussit, vérifier la sortie du hook de build, puis cliquer **Restart** si Passenger ne redémarre pas automatiquement.

### Première livraison et réglages Node.js

Si `dist/` n’existe pas encore sur le serveur, il est normal qu’il soit absent
dans le sélecteur de dossiers Plesk. Ce sélecteur **Document Root** choisit un
dossier, pas le fichier de démarrage. Procède dans cet ordre :

1. Configure l’action de build ci-dessus sur la racine déployée du monorepo.
2. Vérifie que la copie Git Plesk fonctionne, puis exécute **Pull** et **Deploy Now**.
3. Vérifie que le hook réussit et crée `dist/index.cjs`, `dist/build-info.json`
   et `dist/public/index.html`.
4. Dans les réglages Node.js, configure **Application Root** avec le chemin
   réel `<racine-déployée-du-monorepo>/dist`. Le **Startup File** est
   `index.cjs`, relatif à cette racine.
5. Configure **Document Root** avec
   `<racine-déployée-du-monorepo>/dist/public`.
6. Utilise Node 24, ou Node 22.12+ / Node 20.19+ compatible avec le build,
   pnpm 10.26.1, le mode `production`, puis **Restart**.

`index.cjs` est le point de démarrage de l’application compilée ; ce n’est pas
une commande de build ni une action Git. Le `index.cjs` à la racine des sources
est seulement un wrapper qui échoue explicitement si `dist/index.cjs` n’existe
pas. N’utilise pas ce wrapper comme substitut au hook de build. Ne configure pas
`/httpdocs`, `/sendflow.africa` ou un autre chemin absolu sans vérifier dans
Plesk le chemin réel de la racine déployée.

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

Après une livraison réussie, vérifier dans le File Manager que l’Application
Root Node.js contient `index.cjs`, `build-info.json`, les workers Pino et
`public/index.html`. Tester :

- `https://<domaine-configuré>/`
- `https://<domaine-configuré>/api/healthz`

Pour confirmer quel paquet est réellement servi après **Deploy Now** et
**Restart** :

1. Dans la sortie de l’action Plesk, relever la valeur `build ID` de la ligne
   `Plesk build ready`.
2. Interroger publiquement `https://<domaine-configuré>/api/healthz` et relever
   le champ `buildId` de la réponse JSON.
3. Comparer les deux UUID : s’ils sont identiques, le serveur répond avec le
   paquet préparé par cette action. S’ils diffèrent, ou si `buildId` vaut
   `null`/est absent, le paquet servi n’est pas celui attendu (ou le paquet
   préparé n’inclut pas encore les métadonnées). Vérifier le résultat de
   **Deploy Now**, puis redémarrer Passenger et refaire le contrôle.

Les pages protégées nécessitant une authentification ne sont pas vérifiables sans session. Une réponse HTTP 200 à `/api/healthz` vérifie que le processus sert l’API, mais ne prouve pas à elle seule que chaque intégration tierce fonctionne.
