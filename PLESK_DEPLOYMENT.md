# SendFlow — préparation et livraison sur Plesk

## Structure livrée

Le build de production produit un paquet `dist/` contenant le serveur Passenger et les fichiers web. La capture prouve que **Application Root** et **Document Root** sont réglés sur `/git`, mais ne prouve pas que `/git` soit le checkout Git ni la racine du projet. Elle montre que le fichier de démarrage y manque. Le build retrouve sa vraie racine source à partir du script exécuté et doit écrire dans la cible Git distincte `/sendflow.africa/dist`.

Les captures montrent aussi que **Application Root** et **Document Root** sont réglés sur `/git`, puis que Plesk ne trouve pas le startup file `/git/index.cjs`. Cette erreur est cohérente avec ces réglages : le bundle compilé n’est pas dans le dossier configuré `/git`. Cette capture ne démontre pas où se trouve le checkout source. Configure :

- **Cible du déploiement Git** : `/sendflow.africa`.
- **Application Root** : `/sendflow.africa/dist`, une fois l’action de build réussie.
- **Startup File** : `index.cjs`, résolu relativement à l’Application Root, donc `/sendflow.africa/dist/index.cjs`.
- **Document Root** : `/sendflow.africa/dist/public`. Ne choisis ni `/git` ni le dossier `dist` lui-même comme Document Root : les fichiers web sont dans `dist/public`.
- **Node.js** : sélectionne Node 22.23.4 dans Plesk. Le fichier `.node-version` contient `22`, afin que les shims `nodenv` sélectionnent la version majeure 22 depuis la racine du dépôt et depuis `dist`. Le build accepte Node 22.13+, 20.19+ et les autres versions paires LTS à partir de 24.
- **Gestionnaire pour construire** : pnpm 10.26.1, épinglé par `packageManager` dans `package.json`. L’action de déploiement utilise explicitement `corepack pnpm@10.26.1`, puis `npx pnpm@10.26.1` si Corepack est absent. Un pnpm global différent est refusé ; le contrôle `preinstall` n’est pas contourné.
- **Gestionnaire Plesk pour le runtime** : il n’est pas utilisé pour construire le monorepo. Le manifeste compilé `dist/package.json` ne contient ni dépendances ni script `preinstall`, et `dist/pnpm-workspace.yaml` isole explicitement ce paquet du workspace source ; aucun install des neuf projets n’est requis pour démarrer Passenger.
- **Mode** : `production`.
- **URL de l’application** : `https://sendflow.africa` lorsque ce champ sert d’URL publique ; le build refuse une origine HTTP.
- **Écoute réseau** : sous Plesk, le serveur détecte `PhusionPassenger` et utilise son socket avec `listen("passenger")`. Aucun `PORT` numérique n’est exigé sous Passenger. En exécution Node directe seulement, `PORT` reste obligatoire et le serveur écoute sur `0.0.0.0`.

Le build génère aussi `dist/public/.htaccess` : Apache renvoie les routes web inconnues vers `index.html` pour que le routeur React traite les accès directs et les actualisations. Une règle laisse explicitement `/api` et `/api/*` à Passenger ; le serveur répond en JSON pour les routes API inconnues et ne leur renvoie jamais le HTML de la SPA.

Plesk doit démarrer le bundle avec `/sendflow.africa/dist` comme répertoire courant : le serveur y cherche `build-info.json` et `public/`. La configuration retenue est donc Application Root=`/sendflow.africa/dist`, Startup File=`index.cjs`, Document Root=`/sendflow.africa/dist/public`. Le `index.cjs` compilé est créé par le build. Le wrapper source à la racine Git n’est pas le startup file à sélectionner dans cette configuration.

### Erreur `nodenv: node: command not found` dans les commandes Node.js

Le journal fourni indique `Scope: all 9 workspace projects` et lance le
`preinstall` de la racine. Cela prouve que la commande Plesk a été exécutée avec
le monorepo comme Application Root, au lieu du paquet compilé `dist/`. Le
`pnpm run start` de la racine déclenche alors l’installation du workspace avant
le démarrage. Les captures récentes montrent précisément que le startup file
est résolu sous `/git`, où `/git/index.cjs` n’existe pas.

Le dépôt fournit `.node-version` (`22`) à la racine et dans le paquet généré.
Régle les paramètres Plesk comme suit, après un build réussi dans la cible :

- Version Node.js sélectionnée : `22.23.4`
- Application Root : `/sendflow.africa/dist`
- Startup File : `index.cjs`
- Document Root : `/sendflow.africa/dist/public`

Le paquet ajoute aussi un `pnpm-workspace.yaml` vide pour empêcher pnpm de
remonter jusqu’au workspace source quand Plesk lance son installation depuis
`dist/`. Ainsi, les commandes s’exécutent dans le manifeste minimal isolé de
`dist/`, qui ne contient ni les neuf projets du workspace source, ni
`preinstall`, ni dépendances à installer.
Dans **Startup File**, indique `index.cjs` : Plesk lance alors `node ./index.cjs`
depuis l’Application Root. N’utilise pas `pnpm run start` depuis `/git` ou la
racine du monorepo pour démarrer Passenger. Pour vérifier le shell des commandes
Node.js depuis `dist/`, exécute `pwd`, `cat .node-version`,
`node --version` et `command -v node`. Le résultat attendu est Node 22.23.4 et
un exécutable Node accessible. Si `nodenv` échoue encore depuis `dist/` malgré
`.node-version` valant `22`, le problème restant est le shim/PATH fourni par
Plesk et doit être corrigé dans la configuration serveur; le dépôt ne peut pas
modifier le runtime installé.

L’arborescence attendue dans l’application root Plesk est :

```text
dist/
  package.json
  .node-version
  pnpm-workspace.yaml
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

| Contexte                                | Version / portée                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace et CI GitHub                  | Node 24, avec tests, types, build et smoke-test du bundle                                                                             |
| Runtime de l’application Plesk          | Node 22.23.4 ; `.node-version` sélectionne le major 22 dans le shim `nodenv`                                                           |
| Contrôle de build Plesk et cPanel       | Node 20.19+, Node 22.13+, ou une branche LTS paire à partir de Node 24                                                                |
| Compatibilité                           | Node 24 est vérifié en CI ; les autres branches acceptées passent le contrôle de version, mais doivent aussi être validées sur l'hôte |
| Manifeste du bundle `dist/package.json` | Minimum runtime `>=20.19.0` ; ce manifeste sans dépendances ne décrit pas les prérequis du build du dépôt                             |

Vite 7 demande Node 20.19+ ou 22.12+, mais ESLint 10 — exécuté pendant le build
— demande Node 20.19+ ou 22.13+. Le contrôle du dépôt retient donc 22.13 comme
minimum sur la branche 22. Node 21, 22.12 et les branches impaires sont refusés.
Node 24 reste la référence CI ; l’application Plesk actuelle est configurée
sur Node 22.23.4. Node 20.19+ reste accepté pour les hébergements existants.
Les outils de développement non exécutés par le
déploiement, notamment Orval pour régénérer l’API, peuvent demander une version
plus récente.

Selon la [documentation Plesk sur les runtimes Node.js](https://docs.plesk.com/en-US/obsidian/administrator-guide/plesk-administration/enabling-nodejs-support.76658/),
Plesk Linux peut installer plusieurs versions, sélectionnables par domaine ;
Plesk Windows n'en utilise qu'une à la fois. Les versions réellement proposées
dépendent de l'installation et de l'hébergeur : ce guide ne confirme pas la
version actuellement installée sur le serveur de production.
Les prérequis d’ESLint 10 relèvent à 22.13 le minimum du build sur la branche 22.

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

À la racine du dépôt, le build complet (lint ciblé, tests, vérifications TypeScript, frontend, API et contrôle des fichiers générés) est :

```sh
pnpm run deploy:plesk
```

Le contrôle final vérifie le manifeste et le bundle Passenger, les pages SEO
générées, les références locales des HTML/CSS/JavaScript, l’absence de source
maps publiées, la présence du découpage JavaScript et la taille des chunks
(maximum 500 KiB chacun). Le build Vite désactive explicitement les source maps
de production ; le marqueur `use client`, inutile dans cette application Vite
client, a été retiré du composant tooltip pour éviter la référence de source
invalide signalée pendant le build.

## Déploiement depuis Plesk Git

Le dépôt est un monorepo : le checkout contient `package.json`,
`pnpm-lock.yaml`, `pnpm-workspace.yaml`, `scripts/` et `artifacts/`.
`dist/` est généré et ignoré par Git. `/git` est le **Application Root** montré
dans la capture, mais cette capture ne prouve pas que ce soit le checkout Git.
Le script retrouve la racine source depuis son propre emplacement; le chemin
de la cible de production doit, lui, être explicite.

Configure cette commande comme l’unique **Additional deployment action** du dépôt Git Plesk :

```sh
PLESK_REQUIRE_DEPLOYMENT_ROOT=1 PLESK_DEPLOYMENT_ROOT=/var/www/vhosts/sendflow.africa/sendflow.africa bash scripts/plesk-deploy.sh
```

La dernière sortie Node.js Plesk fournie a affiché
`/var/www/vhosts/sendflow.africa/sendflow.africa` comme répertoire d’application.
Si le Gestionnaire de fichiers confirme que c’est toujours le chemin physique
de la cible Git `/sendflow.africa`, la commande ci-dessus est exacte. Sinon,
remplace uniquement la valeur de `PLESK_DEPLOYMENT_ROOT` par le chemin physique
existant confirmé dans Plesk. Ne la déduis pas de l’Application Root `/git`.
`PLESK_REQUIRE_DEPLOYMENT_ROOT=1` fait échouer le hook si le chemin n’est pas
fourni ou ne se termine pas par le dossier `sendflow.africa`; le script ne
devine jamais le dossier cible.

L’action choisit pnpm 10.26.1 par Corepack, sinon par npx, et refuse une version
globale différente. Elle installe depuis le checkout, exécute tests,
vérifications TypeScript, frontend et API, puis construit directement un
répertoire de staging dans la cible et le publie sous
`/sendflow.africa/dist`. Une version antérieure est conservée dans un dossier
de sauvegarde ; aucun dossier de production n’est supprimé. Passenger reçoit
son fichier de redémarrage seulement après la vérification du nouveau paquet.
Aucune migration de base de données n’est lancée.

La commande doit être enregistrée dans Plesk : aucun fichier du dépôt ne peut
activer l’**Additional deployment action** à distance. Après un déploiement réussi,
la sortie doit contenir `PLESK_BUILD_HOOK_STARTED`, puis les chemins absolus
`Plesk Application Root` et `Plesk Document Root`, et enfin
`PLESK_BUILD_COMPLETE`. Si l’interface indique seulement que le pull et la
publication Git ont réussi, mais que ces marqueurs sont absents, le hook de build
n’a pas été exécuté : Git ne transfère pas `dist/`, car ce dossier est généré et
ignoré. Si `PLESK_BUILD_HOOK_STARTED` apparaît sans `PLESK_BUILD_COMPLETE`,
l’action a démarré mais le build ou la vérification a échoué; récupérer sa sortie
complète au lieu de configurer Passenger sur un dossier partiel.

Un ancien log montre que Plesk a exécuté `pnpm install` depuis la racine du
monorepo avec pnpm 12.15.0. Ne lance pas **Install Dependencies** sur le
checkout source et ne contourne pas ce contrôle. L’action ci-dessus utilise
pnpm 10.26.1 pour les sources et crée le runtime isolé dans la cible du site.

Après le premier build réussi, règle Plesk sur `Application Root=/sendflow.africa/dist`,
`Startup File=index.cjs` et `Document Root=/sendflow.africa/dist/public`.
Plesk peut afficher pnpm 12.15.0 pour le runtime : le manifeste de `dist` n’a
ni `preinstall` ni dépendances. Ne configure pas l’application sur `/git` et ne
démarre pas le wrapper source en attendant que `dist` soit créé.

Le dépôt ignore `dist/` volontairement. Le Git natif ne transfère donc pas ce
répertoire, même s’il existe dans un poste local ou dans Replit. En déploiement
Git normal, c’est l’action `bash scripts/plesk-deploy.sh` qui doit le
reconstruire dans `<cible-de-déploiement>/dist`. Si l’étape native
« Deploying files » échoue, ne considère pas le hook exécuté et ne configure
pas Passenger sur un `dist` supposé présent.

Une ancienne capture Plesk montrait le dépôt `SendFlow-Landing-page-fintech.git`,
la branche `main`, et l’échec Git natif suivant :

```text
Pulling a Git repository ... Done
Deploying files to sendflow.africa ... Failed
fatal: this operation must be run in a work tree
```

Cette ancienne erreur reste distincte de la nouvelle erreur de startup. Le code
du hook et des outils de build ne lance aucune commande Git; seule la sortie
détaillée de Plesk/Cybrancee peut établir la cause de l’erreur native.

Les captures récentes établissent que Plesk cherche le startup sous `/git` et
que `/git/index.cjs` manque; l’arborescence montre séparément `/httpdocs` et
`/sendflow.africa`. Elles ne prouvent pas que `/git` soit le checkout source.
La correction de configuration est donc d’utiliser
`/sendflow.africa/dist` comme Application Root et `/sendflow.africa/dist/public`
comme Document Root après que l’action a créé ces fichiers.

Vérifie le build et le chemin de destination sans modifier de données :

1. Dans **Websites & Domains → Git**, garde `/sendflow.africa` comme cible et configure l’action indiquée ci-dessus.
2. Après **Pull** puis **Deploy Now**, vérifie que les logs indiquent la cible physique finissant par `/sendflow.africa` et `PLESK_BUILD_COMPLETE`.
3. Dans le Gestionnaire de fichiers, vérifie que les trois fichiers suivants sont dans le dossier cible : `dist/index.cjs`, `dist/build-info.json` et `dist/public/index.html`.
4. Si l’ancienne erreur Git native revient, demande à Cybrancee la commande fautive, le répertoire courant et le stderr du processus `ext-git-task\deployment`. Les scripts du dépôt ne peuvent pas révéler le checkout interne ou les permissions de ce serveur.
5. Dans le terminal Plesk, vérifie les chemins et le runtime depuis le dossier d’application :

```sh
pwd
ls -la /sendflow.africa/dist
node --version
command -v node
```

Le sélecteur Plesk peut afficher un chemin relatif à l’abonnement, tandis que
le shell exige un chemin physique. Si le chemin affiché comme
`/sendflow.africa` n’est pas ce chemin physique, utilise celui relevé dans le
Gestionnaire de fichiers ou par `pwd -P` depuis le dossier cible.

Pour les diagnostics Git natifs, exécute les commandes en lecture seule sur le
chemin réel du dépôt local :

```sh
git -C "<chemin-réel-du-dépôt-local>" rev-parse --show-toplevel
git -C "<chemin-réel-du-dépôt-local>" rev-parse --is-inside-work-tree
git -C "<chemin-réel-du-dépôt-local>" rev-parse --is-bare-repository
git -C "<chemin-réel-du-dépôt-local>" worktree list --porcelain
```

Un dépôt Plesk interne bare peut être normal et ne doit pas être converti ou
supprimé à l’aveugle. Ne lance pas `reset --hard`, `clean`, ne supprime pas le
dépôt et ne change pas son remote pour tester.

Le flux complet est : pousser le commit sur GitHub, cliquer **Pull** puis **Deploy Now**, confirmer que le déploiement Git Plesk réussit, vérifier la sortie du hook de build, puis cliquer **Restart** si Passenger ne redémarre pas automatiquement.

### Livraison de secours sans le Git natif Plesk

Le workflow GitHub Actions exécute désormais le même script
`scripts/plesk-deploy.sh` depuis un checkout propre où `dist/` est absent.
Il vérifie les pages et le démarrage du paquet, puis publie
un artefact `sendflow-plesk-<commit>` pour les exécutions hors pull request.
L’archive `sendflow-plesk-<build-id>.tar.gz` ne contient que le dossier généré
`dist/`; elle n’inclut pas le dépôt Git ni ses variables d’environnement. Elle
est conservée 14 jours par GitHub Actions. Cette voie permet de fournir le build
à Plesk sans attendre que son extension Git fonctionne, mais elle ne répare pas
l’erreur Git native et ne déploie rien automatiquement.

Procédure non destructive :

1. Ouvre l’exécution réussie du workflow **Validate SendFlow Plesk build** sur
   `main`, puis télécharge l’artefact correspondant au commit souhaité.
2. Dans Plesk, identifie les chemins réels du checkout et de l’application.
   Crée un nouveau dossier de release séparé de la version actuellement servie;
   n’écrase ni ne supprime l’ancienne version.
3. Téléverse l’archive et extrais-la dans ce nouveau dossier. Elle contient un
   sous-dossier `dist/`. Si l’extraction n’est pas disponible dans le File
   Manager, demande à l’hébergeur d’extraire l’archive dans le dossier choisi.
4. Configure l’Application Root sur le chemin réel de cette nouvelle release
   suivi de `/dist`, le Startup File sur `index.cjs` et le Document Root sur
   ce même chemin suivi de `/dist/public`. Garde les variables d’environnement
   Node déjà configurées; ne place aucune valeur secrète dans l’archive.
5. Redémarre Passenger. Vérifie `GET /`, `/api/healthz` et les pages publiques.
   Le `buildId` renvoyé par `/api/healthz` doit correspondre à celui de
   `dist/build-info.json` dans la release extraite.
6. Conserve l’ancienne release jusqu’à la validation complète. En cas de
   problème, remets les chemins Node de l’ancienne release; ne supprime aucune
   donnée pour tenter une réparation.

Cette solution de secours nécessite toujours l’action manuelle d’un
administrateur Plesk/Cybrancee pour téléverser, extraire, sélectionner les
chemins et redémarrer Passenger. L’erreur `fatal: this operation must be run in
a work tree` doit être examinée séparément par Cybrancee dans les journaux de
`ext-git-task\deployment`; le dépôt ne peut ni lire ni réparer le checkout
interne de l’extension Plesk.

### Première livraison et réglages Node.js

Si `dist/` n’existe pas encore, il est normal qu’il soit absent du sélecteur.
Exécute d’abord l’action de build avec sa cible `/sendflow.africa`, puis
confirme la présence des fichiers dans le Gestionnaire de fichiers. Configure
ensuite **Application Root** sur `/sendflow.africa/dist`, **Startup File** sur
`index.cjs`, **Document Root** sur `/sendflow.africa/dist/public`, le mode sur
`production` et Node.js sur `22.23.4`.

Le Document Root vise `dist/public`, et non `dist` : le dossier `dist` contient
le bundle Node, le manifeste Passenger et les métadonnées de build; les fichiers
web sont dans son sous-dossier `public`.

`index.cjs` est le point de démarrage de l’application compilée ; ce n’est pas
une commande de build ni une action Git. Le `index.cjs` à la racine des sources
est seulement un wrapper qui échoue explicitement si `dist/index.cjs` n’existe
pas. Le dépôt ne fournit pas `.plesk.startup.cjs` : ne sélectionne pas ce nom
comme Startup File. Si Plesk l’a généré ou ajouté sur le serveur, vérifie son
contenu ; la configuration documentée lance directement `dist/index.cjs`.

Valeurs Plesk à utiliser d’après les captures actuelles :

| Champ Plesk | Valeur |
| --- | --- |
| Cible du déploiement Git | `/sendflow.africa` |
| Application Root | `/sendflow.africa/dist` |
| Startup File | `index.cjs` |
| Document Root | `/sendflow.africa/dist/public` |
| Application Mode | `production` |
| Node.js | `22.23.4` est accepté (minimum de la ligne 22 : `22.13+`). |
| Package Manager | Plesk peut afficher pnpm 12.15.0, mais ne l’utilise pas sur le checkout; l’action Git sélectionne pnpm 10.26.1. Le manifeste `dist` n’a rien à installer. |

Dans le shell Plesk, les valeurs peuvent être affichées relativement à
l’abonnement. Si Plesk demande des chemins absolus, utilise le chemin physique
réel de `/sendflow.africa` relevé dans le Gestionnaire de fichiers, puis ajoute
`/dist` ou `/dist/public`. Si `dist` n’apparaît pas après un déploiement, vérifie
la sortie de l’action : le sélecteur ne génère pas ce dossier lui-même.

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
- `BASE_PATH` — `/` pour le domaine vitrine servi à la racine ; le script Plesk refuse une autre valeur afin que les assets et les pages générées gardent les bons chemins.
- `LOG_LEVEL` — optionnel.
- `CORS_ORIGINS` — optionnel, uniquement si des origines publiques supplémentaires sont nécessaires.

`SESSION_SECRET` n’est pas lu par la version actuelle du serveur SendFlow ; ne l’ajouter que si une fonctionnalité qui l’utilise est introduite. Les variables `ADMIN_BOOTSTRAP_*`, `ADMIN_PANEL_TOKEN` et les scripts de seed ne sont pas requis au démarrage normal. N’exécute aucun script de seed ou de migration pendant le démarrage Plesk.

Les réglages d’environnement de l’application Node et ceux de l’action Git Plesk
peuvent être séparés. Vérifie que `APP_URL` — ou un de ses alias — est bien
présent dans l’environnement de l’action qui exécute le hook ; si plusieurs
alias sont définis, ils doivent tous désigner la même origine HTTPS.
`PLESK_MEDIA_DIR` doit également être présent à la fois dans l’environnement
de l’action de build et dans celui de l’application Node. Le hook refuse de
construire sans ce chemin; Passenger refuse de démarrer sans le chemin ou si le
mode n’est pas `production`. Cela évite qu’un déploiement Plesk utilise par
erreur le service de stockage local géré par Replit, prévu pour l’autre mode
d’hébergement.

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
