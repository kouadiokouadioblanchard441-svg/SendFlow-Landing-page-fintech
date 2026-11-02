# SendFlow — préparation et livraison sur Plesk

## Structure livrée

Le build de production produit `dist/` dans le checkout Git Plesk après l’action de déploiement, avec un `package.json` minimal pour le gestionnaire Node.js. GitHub Actions vérifie séparément que ce paquet se construit et démarre correctement. Le checkout Git, la racine de l’application Node.js et la racine web sont trois chemins distincts. Configure :

- **Cible du déploiement Git** : conserve `/sendflow.africa`, comme demandé. Ce libellé de Plesk ne suffit pas à déterminer le chemin absolu du checkout.
- **Application Root** : le dossier compilé `dist` sous le checkout Git réellement déployé. La racine du monorepo (`/sendflow.africa` dans le journal fourni) n’est pas la racine Node de production.
- **Startup File** : `index.cjs`, relatif à l’Application Root. C’est `dist/index.cjs`, pas le wrapper `index.cjs` de la racine du dépôt.
- **Document Root** : le sous-dossier `public` de l’Application Root, soit `<checkout Git>/dist/public`. Ne configure pas `dist` lui-même comme Document Root : les fichiers web sont dans `dist/public`.
- **Node.js** : sélectionne Node 22.23.4 dans Plesk. Le fichier `.node-version` contient `22`, afin que les shims `nodenv` sélectionnent la version majeure 22 depuis la racine du dépôt et depuis `dist`. Le build accepte Node 22.13+, 20.19+ et les autres versions paires LTS à partir de 24.
- **Gestionnaire pour construire** : pnpm 10.26.1, épinglé par `packageManager` dans `package.json`. L’action de déploiement utilise explicitement `corepack pnpm@10.26.1`, puis `npx pnpm@10.26.1` si Corepack est absent. Un pnpm global différent est refusé ; le contrôle `preinstall` n’est pas contourné.
- **Gestionnaire Plesk pour le runtime** : il n’est pas utilisé pour construire le monorepo. Le manifeste compilé `dist/package.json` ne contient ni dépendances ni script `preinstall`, et `dist/pnpm-workspace.yaml` isole explicitement ce paquet du workspace source ; aucun install des neuf projets n’est requis pour démarrer Passenger.
- **Mode** : `production`.
- **URL de l’application** : `https://sendflow.africa` lorsque ce champ sert d’URL publique ; le build refuse une origine HTTP.
- **Écoute réseau** : sous Plesk, le serveur détecte `PhusionPassenger` et utilise son socket avec `listen("passenger")`. Aucun `PORT` numérique n’est exigé sous Passenger. En exécution Node directe seulement, `PORT` reste obligatoire et le serveur écoute sur `0.0.0.0`.

Le build génère aussi `dist/public/.htaccess` : Apache renvoie les routes web inconnues vers `index.html` pour que le routeur React traite les accès directs et les actualisations. Une règle laisse explicitement `/api` et `/api/*` à Passenger ; le serveur répond en JSON pour les routes API inconnues et ne leur renvoie jamais le HTML de la SPA.

Plesk doit démarrer le bundle avec `dist` comme répertoire courant : le serveur y cherche `build-info.json` et `public/`. La configuration retenue est donc : Application Root=`<checkout Git>/dist`, Startup File=`index.cjs`, Document Root=`<checkout Git>/dist/public`. Le wrapper source `index.cjs` à la racine du checkout n’est pas le Startup File recommandé ; il redirige vers `dist/index.cjs` seulement si Plesk est délibérément configuré pour démarrer depuis la racine source.

### Erreur `nodenv: node: command not found` dans les commandes Node.js

Le journal fourni indique `Scope: all 9 workspace projects` et lance le
`preinstall` de la racine. Cela prouve que la commande Plesk a été exécutée avec
le monorepo comme Application Root, au lieu du paquet compilé `dist/`. Le
`pnpm run start` de la racine déclenche alors l’installation du workspace avant
le démarrage. Le journal montre également que le shim `nodenv` ne sélectionne
aucun Node dans ce contexte.

Le dépôt fournit maintenant `.node-version` (`22`) à la racine et dans le paquet
généré. Régle les paramètres Plesk comme suit, après un build réussi :

- Version Node.js sélectionnée : `22.23.4`
- Application Root : `<chemin physique du checkout>/dist`
- Startup File : `index.cjs`
- Document Root : `<chemin physique du checkout>/dist/public`

Le paquet ajoute aussi un `pnpm-workspace.yaml` vide pour empêcher pnpm de
remonter jusqu’au workspace source quand Plesk lance son installation depuis
`dist/`. Ainsi, les commandes s’exécutent dans le manifeste minimal isolé de
`dist/`, qui ne contient ni les neuf projets du workspace source, ni
`preinstall`, ni dépendances à installer.
Utilise le fichier Startup File Plesk pour démarrer Passenger; ne lance pas
`pnpm run start` depuis la racine du monorepo. Pour vérifier le shell des
commandes Node.js depuis `dist/`, exécute `pwd`, `cat .node-version`,
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

Le dépôt est un monorepo : le dossier livré par Git doit conserver sa racine et contenir `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `scripts/` et `artifacts/`. Le build écrit `dist/` dans cette racine ; `dist/` n’est pas suivi par Git.

Plesk distingue le dépôt local/checkout géré par son extension, le dossier où il déploie les fichiers et la racine de l’application Node.js. Vérifie leurs chemins réels dans les paramètres du dépôt et le Gestionnaire de fichiers ; ne déduis pas un chemin absolu à partir du seul nom de domaine. Le dossier déployé doit contenir toute la racine du monorepo pour que l’action ci-dessous trouve le lockfile et le build.

Configure cette commande comme l’unique **Additional deployment action** du dépôt Git Plesk :

```sh
bash scripts/plesk-deploy.sh
```

Cette action s’exécute après que Plesk a publié les fichiers du checkout et avant que le marqueur Passenger de redémarrage soit créé. Elle choisit pnpm 10.26.1 par Corepack, sinon par npx, et n’accepte le pnpm global que s’il vaut exactement 10.26.1. Si seul le pnpm global 12.15.0 est disponible, elle s’arrête sans installer avec cette version. Le script ne lance aucune commande Git et ne dépend pas de `.git` dans le dossier livré. Il résout la racine du dépôt depuis son propre fichier, installe depuis le lockfile, exécute lint/tests/vérifications TypeScript, construit le frontend et l’API, puis vérifie le paquet avant de le publier dans `dist/`. Un échec de build garde l’ancien `dist/` en place ; Passenger est redémarré seulement après un build validé. Aucune migration de base de données n’est lancée.

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

Le log reçu montre que Plesk a exécuté `pnpm install` depuis `/httpdocs` avec pnpm 12.15.0. C’est le mauvais contexte d’installation : le `preinstall` du monorepo doit refuser cette version. Ne lance pas **Install Dependencies** sur le checkout source et ne supprime pas/contourne pas le contrôle. Exécute d’abord l’action de déploiement ci-dessus, qui installe le workspace avec pnpm 10.26.1 et produit `<checkout>/dist`.

Après le premier build réussi, règle l’application Node Plesk sur `Application Root=<checkout>/dist`, `Startup File=index.cjs` et `Document Root=<checkout>/dist/public`. Plesk peut afficher pnpm 12.15.0 pour l’abonnement : ce pnpm ne doit pas installer le monorepo. Désactive toute installation automatique visant le checkout source si l’option existe; si Plesk lance une installation pour le runtime dans `dist`, le manifeste n’a ni `preinstall` ni dépendances et ne nécessite rien à installer. Ne configure pas l’application sur le checkout `/httpdocs` avec son manifeste workspace et ne démarre pas le wrapper source en attendant que `dist` soit créé.

Le dépôt ignore `dist/` volontairement. Le Git natif ne transfère donc pas ce
répertoire, même s’il existe dans un poste local ou dans Replit. En déploiement
Git normal, c’est l’action `bash scripts/plesk-deploy.sh` qui doit le
reconstruire dans `<racine-déployée-du-monorepo>/dist`. Si l’étape native
« Deploying files » échoue, ne considère pas le hook exécuté et ne configure
pas Passenger sur un `dist` supposé présent.

Les captures Plesk fournies montrent le dépôt `SendFlow-Landing-page-fintech.git`, la branche `main`, la cible de déploiement affichée comme `/sendflow.africa`, puis le résultat exact :

```text
Pulling a Git repository ... Done
Deploying files to sendflow.africa ... Failed
fatal: this operation must be run in a work tree
```

Cela confirme que le pull a réussi et que la tâche a échoué pendant l’étape Plesk intitulée **Deploying files**. Cette étiquette ne prouve pas si l’échec vient de l’opération Git interne de Plesk ou d’une action de déploiement lancée pendant cette étape. Le message signifie qu’une opération Git nécessitant un worktree a été exécutée dans un contexte que Git ne reconnaît pas comme worktree ; il ne révèle ni la commande fautive ni le répertoire courant.

L’examen du dépôt confirme que `scripts/plesk-deploy.sh` et la préparation/vérification du build n’appellent aucune commande Git et ne requièrent aucun dossier `.git`. Le script est conçu pour s’exécuter depuis les fichiers livrés, même si Plesk ne copie pas son métadossier Git dans le répertoire de déploiement. Cela écarte un appel Git direct dans ces scripts, mais ne suffit pas à déterminer si Plesk les a lancés ni si un processus enfant a échoué.

Pour cette installation, conserve dans **Git → dépôt SendFlow-Landing-page-fintech.git → Deployment / Deployment directory** la cible `/sendflow.africa`, nécessaire au fonctionnement du site. Le fait que Plesk termine l’opération quand la cible est `/httpdocs` ne prouve pas que le site est alors livré à sa racine web correcte ; ne bascule pas vers `/httpdocs` pour SendFlow sans confirmation explicite du document root du domaine. Dans Plesk et le Gestionnaire de fichiers, relève le chemin absolu réel auquel `/sendflow.africa` correspond. Cette cible doit recevoir la racine complète du monorepo — `package.json`, lockfile, `scripts/` et `artifacts/` — et non le dossier `dist` seul.

Les captures Node.js antérieures montrant `/httpdocs` ne suffisent pas à établir que ce chemin est le document root actuel du domaine. Aligne la racine Node sur `dist` sous le chemin absolu réel de la cible `/sendflow.africa`, puis configure le Document Root sur son sous-dossier `dist/public`, à condition que Plesk confirme que c’est bien la racine publique voulue.

Le fait que l’erreur apparaisse avec une cible et pas l’autre désigne une différence dans la résolution du chemin, les permissions ou le traitement interne de la tâche Git Plesk. Un répertoire imbriqué ou absent ne prouve pas, à lui seul, la cause du message `this operation must be run in a work tree` : celui-ci indique qu’une commande Git exigeant un worktree a été lancée dans un contexte que Git ne reconnaît pas comme tel. Le dépôt ne permet pas d’identifier cette commande interne ni de confirmer si `/sendflow.africa` existe ou si le compte Plesk peut y écrire. Les scripts du projet ne lancent aucune commande Git et n’embarquent aucun de ces deux chemins.

Pour diagnostiquer sans modifier les données :

1. Dans **Websites & Domains → Git**, ouvre les réglages du dépôt et relève le chemin réel du dépôt local ainsi que le répertoire de déploiement. N’infère pas ces chemins à partir du nom du domaine. Repère aussi la commande d’action de déploiement configurée.
2. Demande le journal détaillé de la tâche `ext-git-task\deployment`. Vérifie si la sortie contient `Building SendFlow from the Plesk Git checkout...`. Si le marqueur apparaît, le script de déploiement a démarré ; s’il n’apparaît pas, cela ne suffit pas seul à conclure, mais le journal doit alors montrer l’opération antérieure qui a échoué. Demande la commande exacte, le répertoire courant et le stderr du processus fautif.
3. Avec le terminal Plesk ou l’aide de l’administrateur/hébergeur, exécute ces commandes de lecture seule sur le chemin réel du dépôt local :

```sh
git -C "<chemin-réel-du-dépôt-local>" rev-parse --show-toplevel
git -C "<chemin-réel-du-dépôt-local>" rev-parse --is-inside-work-tree
git -C "<chemin-réel-du-dépôt-local>" rev-parse --is-bare-repository
git -C "<chemin-réel-du-dépôt-local>" worktree list --porcelain
```

Ces résultats doivent être interprétés selon le mode de stockage Plesk : un dépôt interne bare peut être normal et ne doit pas être converti ou supprimé à l’aveugle. Si Plesk est censé faire un checkout dans un répertoire précis, vérifie ce répertoire séparément avec `git -C "<chemin-réel-du-checkout>" rev-parse --show-toplevel` et `git -C "<chemin-réel-du-checkout>" rev-parse --is-inside-work-tree`. Ne lance pas `reset --hard`, `clean`, ne supprime pas le dépôt et ne change pas son remote pour tester.

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

Si `dist/` n’existe pas encore sur le serveur, il est normal qu’il soit absent
dans le sélecteur de dossiers Plesk. Ce sélecteur **Document Root** choisit un
dossier, pas le fichier de démarrage. Procède dans cet ordre :

1. Configure l’action de build ci-dessus sur la racine déployée du monorepo.
2. Vérifie que la copie Git Plesk fonctionne, puis exécute **Pull** et **Deploy Now**.
3. Vérifie que le script réussit et crée `dist/index.cjs`, `dist/build-info.json`
   et `dist/public/index.html`.
4. Dans les réglages Node.js, configure **Application Root** avec le chemin
   réel `<racine-déployée-du-monorepo>/dist`. Le **Startup File** est
   `index.cjs`, relatif à cette racine.
5. Configure **Document Root** avec
   `<racine-déployée-du-monorepo>/dist/public`.
6. Utilise Node 24 (recommandé), ou Node 22.13+ / Node 20.19+,
   le mode `production`, puis **Restart**. Le build du monorepo a été fait
   avec pnpm 10.26.1 par l’action de déploiement ; pnpm 12.15.0 dans le
   sélecteur Plesk ne doit pas être utilisé pour installer les sources.

Le Document Root doit viser `dist/public`, et non `dist` : `dist` contient le
bundle Node, le manifeste Passenger et les métadonnées de build, tandis que les
fichiers web sont dans `public/`. Si Plesk confirme dans son Gestionnaire de
fichiers que la cible physique est exactement `/sendflow.africa`, les valeurs
sont Application Root `/sendflow.africa/dist`, Startup File `index.cjs` et
Document Root `/sendflow.africa/dist/public`. Si `/sendflow.africa` est seulement
le libellé de la cible Git, remplace ce préfixe par le chemin absolu réellement
affiché pour le checkout; ne déduis pas le chemin physique du libellé.

`index.cjs` est le point de démarrage de l’application compilée ; ce n’est pas
une commande de build ni une action Git. Le `index.cjs` à la racine des sources
est seulement un wrapper qui échoue explicitement si `dist/index.cjs` n’existe
pas. Le dépôt ne fournit pas `.plesk.startup.cjs` : ne sélectionne pas ce nom
comme Startup File. Si Plesk l’a généré ou ajouté sur le serveur, vérifie son
contenu ; la configuration documentée lance directement `dist/index.cjs`.

Pour les captures où les champs affichent `/httpdocs`, si le checkout Git réel
est bien `/var/www/vhosts/sendflow.africa/httpdocs`, les valeurs Plesk sont :

| Champ Plesk | Valeur |
| --- | --- |
| Cible du déploiement Git | Garde `/sendflow.africa` comme actuellement configuré ; ne la remplace pas par `/httpdocs` sur la base de ces réglages Node.js. |
| Application Root | `/httpdocs/dist` |
| Startup File | `index.cjs` |
| Document Root | `/httpdocs/dist/public` |
| Application Mode | `production` |
| Node.js | `22.23.4` est accepté (minimum de la ligne 22 : `22.13+`). |
| Package Manager | Plesk peut afficher pnpm 12.15.0, mais ne l’utilise pas sur le checkout; l’action Git sélectionne pnpm 10.26.1. Le manifeste `dist` n’a rien à installer. |

Dans Plesk, Application Root et Document Root sont sélectionnés relativement à
l’abonnement. Si la cible Git `/sendflow.africa` résout vers un autre chemin
physique que `/httpdocs`, remplace le préfixe `/httpdocs` du tableau par le
chemin de checkout réellement confirmé ; garde les suffixes `/dist` et
`/dist/public`. Après l’action de build, vérifie que
`dist/index.cjs`, `dist/build-info.json` et `dist/public/index.html` existent,
puis redémarre l’application Node.js. Le nom affiché par Git ne prouve pas le
chemin absolu de destination.

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
