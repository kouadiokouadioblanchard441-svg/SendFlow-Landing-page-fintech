# SendFlow — préparation et livraison sur Plesk

## Structure livrée

Le build de production produit un paquet `dist/` contenant le serveur Passenger et les fichiers web. GitHub Actions le construit depuis le checkout source, puis le transfère vers le dossier Plesk configuré explicitement dans `PLESK_DEPLOY_ROOT`.

La capture Plesk la plus récente montre **Application Root** et **Document Root** réglés sur `/dist`, puis l’absence de `/dist/index.cjs`. Elle prouve que le fichier de démarrage est absent du répertoire actuellement sélectionné; elle ne prouve pas que le build ait été livré dans le dossier de déploiement `/sendflow.africa`. Le libellé Git `/sendflow.africa` et le sélecteur de racines sont relatifs à l’abonnement et ne révèlent pas à eux seuls le chemin SSH absolu. Après confirmation d’une livraison dans la cible, configure :

- **Cible du déploiement/livraison** : `/sendflow.africa`.
- **Application Root** : `/sendflow.africa/dist`, après une livraison CI réussie.
- **Startup File** : `index.cjs`, résolu relativement à l’Application Root, donc `/sendflow.africa/dist/index.cjs`.
- **Document Root** : `/sendflow.africa/dist/public`. Ne choisis ni `/git` ni le dossier `dist` lui-même comme Document Root : les fichiers web sont dans `dist/public`.
- **Node.js** : sélectionne Node 22.23.4 dans Plesk. Le fichier `.node-version` contient `22`, afin que les shims `nodenv` sélectionnent la version majeure 22 depuis la racine du dépôt et depuis `dist`. Le build accepte Node 22.13+, 20.19+ et les autres versions paires LTS à partir de 24.
- **Gestionnaire pour construire** : pnpm 10.26.1, épinglé par `packageManager` dans `package.json`. GitHub Actions construit le monorepo avec cette version; Plesk reçoit seulement l’archive compilée et n’exécute pas le `preinstall` du workspace source.
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
Régle les paramètres Plesk après la première livraison réussie depuis GitHub Actions :

- Version Node.js sélectionnée : `22.23.4`
- Application Root : `/sendflow.africa/dist`
- Startup File : `index.cjs`
- Document Root : `/sendflow.africa/dist/public`

Le paquet ajoute aussi un `pnpm-workspace.yaml` vide pour empêcher pnpm de
remonter jusqu’au workspace source si Plesk lance une commande depuis `dist/`.
Le manifeste compilé est isolé du workspace source et ne contient ni
`preinstall` ni dépendances à installer.
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

Le répertoire `dist/` reste exclu de Git. GitHub Actions le construit depuis les sources suivies, puis transmet l’archive vérifiée à la cible Plesk par SSH. Le déploiement ne lance aucune migration de base de données et demande le redémarrage Passenger via `dist/tmp/restart.txt`.

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
| Runtime de l’application Plesk          | Node 22.23.4 ; `.node-version` sélectionne le major 22 dans le shim `nodenv`                                                          |
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

Sélectionner la version dans Plesk pour l’application, et laisser le build au
runner GitHub Actions. Celui-ci utilise Node 24 et pnpm 10.26.1; la version
Node du serveur Plesk n’exécute pas Vite ni les scripts du monorepo. Le job CI
contrôle les versions, exécute les tests, le typecheck et les builds, puis
démarre le bundle dans un smoke-test avant de l’envoyer.

Pour reproduire localement le build complet (lint ciblé, tests, vérifications
TypeScript, frontend, API et contrôle des fichiers générés) :

```sh
pnpm run deploy:plesk
```

Cette commande construit dans l’espace courant, mais ne transfère rien sur
Plesk. La livraison de production est faite par le job SSH décrit ci-dessus.

Le contrôle final vérifie le manifeste et le bundle Passenger, les pages SEO
générées, les références locales des HTML/CSS/JavaScript, l’absence de source
maps publiées, la présence du découpage JavaScript et la taille des chunks
(maximum 500 KiB chacun). Le build Vite désactive explicitement les source maps
de production ; le marqueur `use client`, inutile dans cette application Vite
client, a été retiré du composant tooltip pour éviter la référence de source
invalide signalée pendant le build.

## Livraison automatique à Plesk depuis GitHub Actions

Le dépôt source est un monorepo et `dist/` est un build généré de 39 Mo; il
reste ignoré par Git et n’est pas ajouté à l’historique. Le Git natif Plesk
transfère les sources suivies, mais ne construit pas automatiquement ce
monorepo. La production reçoit donc le paquet depuis GitHub Actions, pas via une
**Additional deployment action** Plesk.

À chaque push sur `main`, `.github/workflows/validate-plesk-build.yml` exécute
les tests, le typecheck, les builds frontend/API et les smoke-tests. Après leur
réussite, le job `deploy-plesk` téléverse l’archive validée en SSH/SCP vers la
cible `/sendflow.africa`, vérifie les fichiers attendus, conserve le dernier
`dist/` valide dans `.sendflow-dist-backup` (un seul rollback build est gardé)
et crée `dist/tmp/restart.txt` pour
Passenger. Le script distant ne lance aucune commande Git et ne supprime pas
l’ancien build pendant le remplacement : une sauvegarde précédente, générée par
ce script, est remplacée seulement après validation complète de la nouvelle
archive. Le pull manuel dans Plesk ne déclenche pas GitHub Actions; le
push sur GitHub est le déclencheur de la build et de la livraison.

Pour activer le transfert, configure dans **GitHub → Settings → Secrets and
variables → Actions** :

| Type     | Nom                     | Valeur                                                                                                                                                            |
| -------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variable | `PLESK_SSH_HOST`        | Nom d’hôte SSH fourni/confirmé par Cybrancee (ne pas déduire l’hôte SSH de l’URL du panneau).                                                                     |
| Variable | `PLESK_SSH_USER`        | Utilisateur système Plesk ayant accès en écriture à la cible.                                                                                                     |
| Variable | `PLESK_SSH_PORT`        | Port SSH; facultatif, `22` par défaut.                                                                                                                            |
| Variable | `PLESK_DEPLOY_ROOT`     | Obligatoire : chemin absolu physique du dossier `sendflow.africa`, relevé dans le Gestionnaire de fichiers Plesk ou confirmé par Cybrancee. Aucun chemin par défaut n’est deviné. |
| Variable | `PLESK_SSH_KNOWN_HOSTS` | Ligne `known_hosts` confirmée par Cybrancee pour cet hôte et ce port. Le job exige la vérification stricte de l’hôte; il n’utilise pas `ssh-keyscan` non vérifié. |
| Secret   | `PLESK_SSH_PRIVATE_KEY` | Clé privée dédiée au déploiement, dont la clé publique est autorisée pour l’utilisateur système Plesk. Ne jamais la mettre dans Git ou dans le chat.              |

Le job échoue explicitement si ces paramètres manquent ou si l’utilisateur SSH
ne peut pas écrire dans la cible. Après remplacement, il exige aussi le marqueur
`PLESK_RELEASE_DEPLOYED` renvoyé par le script distant et l’inscrit dans le
résumé de l’exécution GitHub Actions. Il n’y a aucune commande shell à saisir dans
Plesk et aucun secret n’est requis pour construire le paquet; la clé SSH ne sert
qu’au transfert depuis le runner GitHub. L’accès SSH doit être activé par
l’hébergeur pour l’utilisateur système concerné.

Le workflow crée le schéma nécessaire uniquement dans son conteneur PostgreSQL
jetable afin que le smoke-test navigateur puisse appeler `/api/landing`. Il
n’utilise pas la base Plesk, n’exécute pas de seed et ne lance pas de migration
de production. Les smoke-tests indiquent aussi la méthode et l’URL d’une API qui
retourne HTTP 500 au lieu d’un message navigateur générique.

Le libellé `/sendflow.africa` affiché par le panneau est un chemin relatif à
l’abonnement; il ne suffit pas à établir le chemin absolu utilisé par SSH. Le
workflow exige donc `PLESK_DEPLOY_ROOT` et échoue avant le transfert si cette
variable n’est pas définie. Renseigne uniquement le chemin absolu du dossier
existant que le Gestionnaire de fichiers Plesk montre comme cible de livraison.

Cette méthode contourne le transfert de fichiers du Git natif Plesk et peut
livrer `dist/` même si son étape « Deploying files » échoue. Elle ne corrige pas
le défaut interne `fatal: this operation must be run in a work tree`; cette
erreur reste à traiter par Cybrancee séparément. Le fichier de démarrage
Passenger reste distinct de la livraison du build : les réglages exacts suivent
ci-dessous.

### Première livraison et réglages Node.js

Si `dist/` n’existe pas encore, il est normal qu’il soit absent du sélecteur.
Après la première livraison réussie du job GitHub Actions, confirme sa présence
dans le Gestionnaire de fichiers. Configure ensuite **Application Root** sur
`/sendflow.africa/dist`, **Startup File** sur
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

| Champ Plesk              | Valeur                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Cible du déploiement Git | `/sendflow.africa`                                                                                                     |
| Application Root         | `/sendflow.africa/dist`                                                                                                |
| Startup File             | `index.cjs`                                                                                                            |
| Document Root            | `/sendflow.africa/dist/public`                                                                                         |
| Application Mode         | `production`                                                                                                           |
| Node.js                  | `22.23.4` est accepté (minimum de la ligne 22 : `22.13+`).                                                             |
| Package Manager          | Plesk peut afficher pnpm 12.15.0, mais le build GitHub utilise pnpm 10.26.1. Le manifeste `dist` n’a rien à installer. |

Dans le shell Plesk, les valeurs peuvent être affichées relativement à
l’abonnement. Si Plesk demande des chemins absolus, utilise le chemin physique
réel de `/sendflow.africa` relevé dans le Gestionnaire de fichiers, puis ajoute
`/dist` ou `/dist/public`. Si `dist` n’apparaît pas après une livraison CI,
vérifie le job **Deploy validated build to Plesk** et son marqueur
`PLESK_RELEASE_DEPLOYED`.

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

Les réglages d’environnement du build GitHub et ceux de l’application Node Plesk
sont séparés. `APP_URL` et `PLESK_MEDIA_DIR` ont des valeurs de validation CI
non sensibles pour construire et tester le paquet; configure les valeurs de
production déjà utilisées par l’application dans Plesk. Le transfert SSH ne lit
ni la base de données ni les secrets applicatifs et ne les copie pas dans
`dist/`.

## Commandes et vérifications

Le build est effectué dans GitHub Actions. Après le push, le job CI transfère
`dist/` et met à jour `tmp/restart.txt`; Passenger redémarre selon son mécanisme
de surveillance. Aucune **Additional deployment action** Plesk n’est nécessaire.

Après une livraison réussie, vérifier dans le File Manager que l’Application
Root Node.js contient `index.cjs`, `build-info.json`, les workers Pino et
`public/index.html`. Tester :

- `https://<domaine-configuré>/`
- `https://<domaine-configuré>/api/healthz`

Pour confirmer quel paquet est réellement servi après la livraison CI :

1. Dans les journaux du job **Plesk build validation**, relever le `build ID`
   produit par le paquet.
2. Interroger publiquement `https://<domaine-configuré>/api/healthz` et relever
   le champ `buildId` de la réponse JSON.
3. Comparer les deux UUID : s’ils sont identiques, le serveur répond avec le
   paquet préparé par ce workflow. S’ils diffèrent, ou si `buildId` vaut
   `null`/est absent, le paquet servi n’est pas celui attendu (ou le paquet
   préparé n’inclut pas encore les métadonnées). Vérifier les journaux du job
   **Deploy validated build to Plesk**, puis refaire le contrôle après le
   redémarrage Passenger.

Les pages protégées nécessitant une authentification ne sont pas vérifiables sans session. Une réponse HTTP 200 à `/api/healthz` vérifie que le processus sert l’API, mais ne prouve pas à elle seule que chaque intégration tierce fonctionne.

## Badge Google reCAPTCHA sur les pages publiques

SendFlow utilise reCAPTCHA v3 pour l’inscription à la newsletter. Le badge
officiel Google est chargé sur les pages publiques lorsque les deux variables
sont présentes dans les paramètres d’environnement Node.js de l’application
Plesk :

- `RECAPTCHA_SITE_KEY` — clé publique de site, renvoyée uniquement par
  `/api/recaptcha/config`.
- `RECAPTCHA_SECRET_KEY` — clé secrète conservée uniquement côté serveur.

Crée des clés reCAPTCHA v3 et autorise `sendflow.africa` (ainsi que
`www.sendflow.africa` seulement si ce nom est réellement utilisé). Définis les
deux variables ensemble dans **Plesk → Node.js → Environment variables**, puis
redémarre l’application. Aucun secret ne doit être ajouté à Git, à Vite ou au
formulaire navigateur.

Le navigateur obtient un jeton pour l’action `newsletter_subscribe`. L’API le
vérifie auprès de Google avant d’accepter l’inscription, en contrôlant le
résultat, l’action, l’hôte de la requête et un score minimal de 0,5. La limite de
débit existante reste active. Si les deux clés sont absentes, l’intégration reste
désactivée et le formulaire garde son fonctionnement actuel. Si une seule clé
est configurée, l’API refuse l’inscription plutôt que de contourner la
vérification. Avant activation, mets à jour la politique de confidentialité pour
informer les visiteurs du traitement reCAPTCHA par Google.
