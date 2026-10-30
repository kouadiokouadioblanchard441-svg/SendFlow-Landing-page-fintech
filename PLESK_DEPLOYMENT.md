# SendFlow — préparation et livraison sur Plesk

## Structure livrée

Le build de production produit `dist/` dans le checkout Git Plesk après l’action de déploiement, avec un `package.json` minimal pour le gestionnaire Node.js. GitHub Actions vérifie séparément que ce paquet se construit et démarre correctement. Le checkout Git et la racine de l’application Node.js sont deux chemins distincts. Configure :

- **Application root** : le `dist` généré sous le checkout Git Plesk. Résous le chemin à partir du vrai dossier du dépôt affiché par Plesk ; ne suppose pas que ce chemin est `/httpdocs`.
- **Application startup file** : `index.cjs` (le fichier compilé `dist/index.cjs`).
- **Document root** : `public` sous l’application root, soit le chemin réel `<checkout-git>/dist/public`.
- **Node.js** : Node 24 recommandé (référence CI), Node 22.13+ ou Node 20.19+ sont également acceptés. Les autres versions paires LTS à partir de 24 le sont aussi. Les versions impaires, dont Node 21, sont refusées.
- **Gestionnaire Plesk** : pnpm 10.26.1, épinglé par `packageManager` dans `package.json`. Les scripts Plesk utilisent Corepack quand il est disponible ; sinon ils exigent que le pnpm fourni par Plesk corresponde exactement à cette version. Le manifeste runtime ne déclare aucune dépendance à installer.
- **Mode** : `production`.
- **Écoute réseau** : sous Plesk, le serveur détecte `PhusionPassenger` et utilise son socket avec `listen("passenger")`. Aucun `PORT` numérique n’est exigé sous Passenger. En exécution Node directe seulement, `PORT` reste obligatoire et le serveur écoute sur `0.0.0.0`.

Le build génère aussi `dist/public/.htaccess` : Apache renvoie les routes web inconnues vers `index.html` pour que le routeur React traite les accès directs et les actualisations. Une règle laisse explicitement `/api` et `/api/*` à Passenger ; le serveur répond en JSON pour les routes API inconnues et ne leur renvoie jamais le HTML de la SPA.

Plesk doit démarrer le bundle avec `dist` comme répertoire courant : le serveur y cherche `build-info.json` et `public/`. Configure donc l’Application Root sur `dist`, le Startup File sur `index.cjs` et le Document Root sur `dist/public`. Le wrapper source `index.cjs` à la racine du checkout change lui aussi le répertoire courant vers `dist` avant de lancer le bundle, mais la configuration recommandée reste de lancer directement le bundle généré depuis l’Application Root `dist`.

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
| Contrôle de build Plesk et cPanel | Node 20.19+, Node 22.13+, ou une branche LTS paire à partir de Node 24 |
| Compatibilité | Node 24 est vérifié en CI ; les autres branches acceptées passent le contrôle de version, mais doivent aussi être validées sur l'hôte |
| Manifeste du bundle `dist/package.json` | Minimum runtime `>=20.19.0` ; ce manifeste sans dépendances ne décrit pas les prérequis du build du dépôt |

Vite 7 demande Node 20.19+ ou 22.12+, mais ESLint 10 — exécuté pendant le build
— demande Node 20.19+ ou 22.13+. Le contrôle du dépôt retient donc 22.13 comme
minimum sur la branche 22. Node 21, 22.12 et les branches impaires sont refusés.
Node 24 reste la version recommandée ; Node 20.19+ est conservé pour les
hébergements existants. Les outils de développement non exécutés par le
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

Avant le déploiement, configure une seule action de déploiement Plesk pour construire les sources livrées :

```sh
bash scripts/plesk-git-deploy.sh
```

Plesk effectue d’abord son opération Git native ; l’action de build ne démarre qu’après la réussite de cette étape. Cette action ne lance aucune commande Git et ne dépend pas de `.git` dans le dossier livré. Elle repère la racine du projet depuis son propre fichier, vérifie les fichiers sources nécessaires, Node et la version de pnpm, valide les URL de build, installe avec le lockfile, exécute lint/tests/vérifications TypeScript, construit le frontend et l’API, contrôle les assets/pages générés, puis marque Passenger pour redémarrage. Elle ne lance aucune migration de base de données et peut être relancée : `dist/` est un résultat généré puis reconstruit.

Les captures Plesk fournies montrent le dépôt `SendFlow-Landing-page-fintech.git`, la branche `main`, la cible de déploiement affichée comme `/sendflow.africa`, puis le résultat exact :

```text
Pulling a Git repository ... Done
Deploying files to sendflow.africa ... Failed
fatal: this operation must be run in a work tree
```

Cela localise l’échec dans la phase **Git native de déploiement vers la cible Plesk**, après le pull et avant toute preuve que le build SendFlow s’est lancé. Le message signifie qu’une opération Git nécessitant un worktree a été exécutée dans un contexte que Git ne reconnaît pas comme worktree. Il ne révèle pas à lui seul lequel des chemins internes Plesk est fautif. Il n’indique pas une erreur Node.js, pnpm, Express, `index.cjs` ou Vite.

L’examen du dépôt confirme que la chaîne `scripts/plesk-git-deploy.sh` → `scripts/plesk-deploy.sh` → préparation/vérification du build n’appelle aucune commande Git et ne requiert aucun dossier `.git`. Elle est conçue pour s’exécuter depuis les fichiers livrés, même si Plesk ne copie pas son métadossier Git dans le répertoire de déploiement. Le hook du projet ne peut donc pas réparer l’opération native qui échoue avant son exécution.

Pour cette capture, le réglage Plesk à examiner est **Git → dépôt SendFlow-Landing-page-fintech.git → Deployment / Deployment directory**, actuellement affiché comme `/sendflow.africa`, ainsi que le répertoire local associé au dépôt. Confirme dans les réglages et le Gestionnaire de fichiers les chemins absolus réellement résolus par Plesk. La cible doit recevoir la racine complète du monorepo — `package.json`, lockfile, `scripts/` et `artifacts/` — et non le dossier `dist` seul. Ne change pas la cible vers un chemin deviné.

Les captures Node.js antérieures ont également montré une racine d’application `/httpdocs`, tandis que la capture Git montre la cible `/sendflow.africa`. Ces valeurs peuvent être anciennes ou désigner des chemins différents ; elles ne prouvent pas à elles seules la cause de l’erreur Git. Après réparation du déploiement natif, aligne la racine Node sur le `dist` généré sous le chemin de déploiement réellement confirmé, et le Document Root sur son sous-dossier `public`.

Pour diagnostiquer sans modifier les données :

1. Dans **Websites & Domains → Git**, ouvre les réglages du dépôt et relève le chemin réel du dépôt local ainsi que le répertoire de déploiement. N’infère pas ces chemins à partir du nom du domaine. Repère aussi la commande d’action de déploiement configurée.
2. Avec le terminal Plesk ou l’aide de l’administrateur/hébergeur, exécute ces commandes de lecture seule sur le chemin réel du dépôt local :

```sh
git -C "<chemin-réel-du-dépôt-local>" rev-parse --show-toplevel
git -C "<chemin-réel-du-dépôt-local>" rev-parse --is-inside-work-tree
git -C "<chemin-réel-du-dépôt-local>" rev-parse --is-bare-repository
git -C "<chemin-réel-du-dépôt-local>" worktree list --porcelain
```

Ces résultats doivent être interprétés selon le mode de stockage Plesk : un dépôt interne bare peut être normal et ne doit pas être converti ou supprimé à l’aveugle. Si Plesk est censé faire un checkout dans un répertoire précis, vérifie ce répertoire séparément avec `git -C "<chemin-réel-du-checkout>" rev-parse --show-toplevel` et `git -C "<chemin-réel-du-checkout>" rev-parse --is-inside-work-tree`. Si l’étape échoue encore alors que les chemins affichés paraissent cohérents, l’administrateur/l’hébergeur doit examiner le détail de la tâche `ext-git-task\deployment` et le journal de l’extension pour identifier le chemin courant et la commande Git qui a échoué. Ne lance pas `reset --hard`, `clean`, ne supprime pas le dépôt et ne change pas son remote pour tester.

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
6. Utilise Node 24 (recommandé), ou Node 22.13+ / Node 20.19+,
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
- `BASE_PATH` — `/` pour le domaine vitrine servi à la racine ; le script Plesk refuse une autre valeur afin que les assets et les pages générées gardent les bons chemins.
- `LOG_LEVEL` — optionnel.
- `CORS_ORIGINS` — optionnel, uniquement si des origines publiques supplémentaires sont nécessaires.

`SESSION_SECRET` n’est pas lu par la version actuelle du serveur SendFlow ; ne l’ajouter que si une fonctionnalité qui l’utilise est introduite. Les variables `ADMIN_BOOTSTRAP_*`, `ADMIN_PANEL_TOKEN` et les scripts de seed ne sont pas requis au démarrage normal. N’exécute aucun script de seed ou de migration pendant le démarrage Plesk.

Les réglages d’environnement de l’application Node et ceux de l’action Git Plesk
peuvent être séparés. Vérifie que `APP_URL` — ou un de ses alias — est bien
présent dans l’environnement de l’action qui exécute le hook ; si plusieurs
alias sont définis, ils doivent tous désigner la même origine HTTPS.

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
