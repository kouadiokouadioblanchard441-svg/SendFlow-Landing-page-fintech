# SendFlow — préparation et livraison sur Plesk

## Structure livrée

Le build de production produit `dist/`, qui contient le serveur Passenger et les fichiers web. GitHub Actions construit ce dossier depuis les sources, le valide puis le commit dans `main`. Le Git natif Plesk récupère ensuite ce `dist/` suivi par Git avec le reste du dépôt.

La capture Plesk la plus récente montre **Application Root** et **Document Root** réglés sur `/dist`, puis l’absence de `/dist/index.cjs`. Elle prouve que le fichier de démarrage est absent du répertoire actuellement sélectionné; elle ne prouve pas que le build ait été livré dans le dossier de déploiement `/sendflow.africa`. Le libellé Git `/sendflow.africa` et le sélecteur de racines sont relatifs à l’abonnement et ne révèlent pas à eux seuls le chemin physique réel. Après confirmation d’une livraison dans la cible, configure :

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

Le build génère aussi `dist/public/.htaccess` : chaque route SEO pré-rendue est réécrite vers son propre `index.html`, avec ou sans barre oblique finale. Cela évite qu’Apache traite une URL comme `/securite` comme un dossier et renvoie une erreur au lieu de sa page. Les autres routes web inconnues vont vers `index.html` pour que React les traite. Une règle laisse explicitement `/api` et `/api/*` à Passenger ; le serveur répond en JSON pour les routes API inconnues et ne leur renvoie jamais le HTML de la SPA. Les anciens liens admin de forme `/panel/<code>/<email>` sont redirigés vers `/panel` sans cache ni référent afin de ne plus conserver ces valeurs dans l’adresse du navigateur.

### Indexation des pages publiques

`artifacts/sendflow/src/lib/public-seo-routes.json` est la source des 22 URL publiques en français et en anglais. Chaque page livrée reçoit son propre titre, sa description, son URL canonique, ses liens `hreflang` et ses données structurées. Le paquet ajoute aussi un titre H1 et un résumé visibles lorsqu’un navigateur ou robot n’exécute pas JavaScript; l’application React reste le rendu principal pour les visiteurs.

La page d’accueil anglaise utilise `/en` comme URL canonique. `/en/` reste accessible comme alias, mais sa balise canonique pointe vers `/en`; le sitemap ne liste que `/en`. Les routes d’administration et le panel ne figurent pas dans le sitemap et restent en `noindex`.

Pour contrôler le site après le pull et le redémarrage Plesk, depuis le checkout du dépôt :

```sh
pnpm --filter @workspace/sendflow run seo:verify -- https://sendflow.africa
```

Cette vérification teste le sitemap, `robots.txt` et les 22 routes (réponse HTML, titre, description, canonique, alternates linguistiques et rendu de secours sans JavaScript). Elle confirme l’accessibilité technique, pas l’ajout effectif dans l’index Google. Après livraison, soumets `https://sendflow.africa/sitemap.xml` dans Google Search Console et consulte l’inspection d’URL pour suivre l’indexation réelle.

Si une page publique renvoie encore le 500 générique Plesk après le pull, compare la route avec et sans `/` final et vérifie que le `.htaccess` livré contient une règle directe pour cette route. Un 500 HTML sur `/api/healthz` n’est pas une réponse de santé de l’API : vérifie dans **Plesk → Websites & Domains → sendflow.africa → Logs** l’erreur Apache/Passenger au même horaire et le journal de l’application Node. Ce journal est nécessaire pour distinguer un démarrage Passenger invalide d’un problème de proxy ou de permissions; les captures et les journaux d’accès seuls ne donnent pas l’exception. Les erreurs qui atteignent Express sont journalisées en JSON avec l’identifiant, la méthode et la route (jetons `/panel` masqués), le type et la trace; les corps de requête et les en-têtes sensibles ne sont pas journalisés, et les valeurs de credentials courantes sont expurgées. Une erreur de démarrage Node est aussi journalisée avant l’arrêt du processus. Si aucun événement Node n’apparaît pour une requête, le problème survient avant l’application.

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

Seul le `dist/` de production à la racine du dépôt est versionné; les sorties de build internes aux paquets restent ignorées. GitHub Actions construit et vérifie le paquet depuis les sources, puis publie le `dist/` validé sur `main`. Le pull Git Plesk reçoit ainsi les fichiers compilés, dont `dist/tmp/restart.txt` pour demander le redémarrage Passenger. Ce flux ne lance aucune migration de base de données.

Chaque paquet contient un `build-info.json` qui ne stocke qu’un UUID aléatoire
non sensible. Le workflow affiche cet identifiant pendant la validation CI.
L’API renvoie le même identifiant dans `buildId` sur
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

## Build publié dans Git pour le pull natif Plesk

Le dossier de production `dist/` est ignoré par défaut dans beaucoup de projets,
mais SendFlow doit le livrer par le pull Git natif de Plesk. Il est donc suivi
dans ce dépôt et n’est plus exclu par `.gitignore`.

À chaque push source vers `main`, `.github/workflows/validate-plesk-build.yml`
exécute les tests, le typecheck, les builds frontend/API, les contrôles du
paquet et les smoke-tests. Seulement après leur réussite, le job
`publish-plesk-dist` extrait le paquet validé et crée un commit normal contenant
le nouveau `dist/` sur `main`. Ce commit bot ne relance pas inutilement le
workflow, car les pushes qui ne changent que `dist/**` sont ignorés. Le push CI
est normal et non forcé; si `main` avance pendant le build, la publication
échoue au lieu d’écraser le commit plus récent.

Le dépôt sur Plesk doit suivre la branche `main` et déployer dans
`/sendflow.africa`. Après le succès du workflow et l’apparition du commit
« Build SendFlow production dist for Plesk » sur `main`, utilise Pull now dans
Plesk (ou laisse son déploiement automatique terminer). Le pull reçoit alors le
`dist/` versionné avec `index.cjs`, `build-info.json` et `public/`. Il n’y a
aucun transfert SSH, aucune clé à configurer dans GitHub, et aucune commande de
build manuelle à saisir dans Plesk.

**Ordre important :** ne lance pas le pull Plesk immédiatement après le push
source. Attends d’abord la réussite du job `Plesk build validation`, puis celle
de `Publish built dist to main for Plesk` et le commit généré sur `main`. C’est
ce second commit qui contient le dossier compilé. Le succès CI confirme que
`dist/` a été publié dans GitHub; il ne prouve pas à lui seul que Plesk a déjà
terminé son pull.

Le workflow crée le schéma nécessaire uniquement dans son conteneur PostgreSQL
jetable afin que le smoke-test navigateur puisse appeler `/api/landing`. Il
n’utilise pas la base Plesk, n’exécute pas de seed et ne lance pas de migration
de production. Les smoke-tests indiquent aussi la méthode et l’URL d’une API qui
retourne HTTP 500 au lieu d’un message navigateur générique.

Le libellé `/sendflow.africa` affiché par le panneau est relatif à l’abonnement.
Le dépôt ne peut pas confirmer le chemin physique du serveur; sélectionne le
dossier de déploiement réel déjà utilisé par Plesk. Cette méthode fait parvenir
`dist/` via les fichiers suivis de Git, au lieu de demander à Plesk de construire
le monorepo. Si Plesk échoue avant ou pendant le pull, le commit de build reste
disponible sur GitHub, mais le dossier ne sera pas présent sur le serveur tant
que Plesk n’aura pas terminé un pull réussi.

### Première livraison et réglages Node.js

Si `dist/` n’existe pas encore, il est normal qu’il soit absent du sélecteur.
Après le commit de build généré par GitHub Actions, confirme sa présence
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
`/dist` ou `/dist/public`. Si `dist` n’apparaît pas après un pull Plesk réussi,
vérifie d’abord que le commit « Build SendFlow production dist for Plesk » est
bien présent sur la branche `main` du dépôt source.

## Variables d’environnement Plesk

Configurer les variables de production suivantes dans **Plesk → Node.js →
Environment variables**, jamais dans Git :

| Variable | Obligatoire ? | Usage et valeur Plesk |
| --- | --- | --- |
| `NODE_ENV` | Oui | `production` : active notamment les cookies sécurisés et les en-têtes de production. |
| `NEON_DATABASE_URL` | Oui | Connexion PostgreSQL utilisée par l’API. |
| `SESSION_SECRET` | Oui | Secret serveur utilisé pour les clés du limiteur de requêtes partagé. Garder sa valeur privée ; sans lui, les routes protégées par ce contrôle peuvent répondre `503`. |
| `PLESK_MEDIA_DIR` | Oui | Chemin absolu inscriptible et persistant, situé hors de `dist/public`, pour les fichiers médias. |
| `RESEND_API_KEY` | Pour l’envoi d’e-mails | Clé Resend, côté serveur uniquement. |
| `RESEND_FROM_EMAIL` | Pour l’envoi d’e-mails | Adresse d’expédition vérifiée chez Resend. |
| `PUBLIC_SITE_URL` | Recommandée | `https://sendflow.africa` pour les contrôles d’origine et les liens générés par l’API. |
| `RECAPTCHA_SITE_KEY` et `RECAPTCHA_SECRET_KEY` | Facultatives, ensemble | Active le badge reCAPTCHA v3 et la vérification des inscriptions à la newsletter. La clé secrète reste côté serveur. Voir la section reCAPTCHA ci-dessous. |
| `TELEGRAM_AUDIT_ENABLED` | Facultative | Valeur `true` pour activer les notifications Telegram. Laisser désactivée jusqu’à la mise à jour de la politique de confidentialité et à la vérification du groupe, des identifiants admin et du proxy. |
| `TELEGRAM_BOT_TOKEN` | Si Telegram est activé | Jeton BotFather, uniquement dans l’environnement Node Plesk. Ne jamais l’ajouter à Git, à `VITE_*`, au frontend ou à une URL. |
| `TELEGRAM_CHAT_ID` | Si Telegram est activé | Identifiant numérique du groupe privé qui reçoit les alertes. Limiter l’accès du groupe aux personnes autorisées. |
| `TELEGRAM_WEBHOOK_SECRET` | Si Telegram est activé | Secret aléatoire transmis par Telegram dans l’en-tête du webhook ; utiliser uniquement des lettres, chiffres, `_` et `-`. |
| `TELEGRAM_ADMIN_USER_IDS` | Si Telegram est activé | Identifiants Telegram numériques, séparés par des virgules. Seuls ces comptes peuvent bloquer/débloquer une IP avec les boutons du groupe. |
| `TELEGRAM_AUTO_CONFIGURE_WEBHOOK` | Facultative | Valeur `true` pour que le démarrage Node enregistre `/api/security/telegram/webhook` auprès du bot. Cette opération remplace le webhook déjà configuré pour ce bot : réserver un bot dédié à SendFlow et activer explicitement après vérification. |
| `TRUSTED_PROXY_IPS` | Selon le proxy Plesk | Adresses IP exactes des proxys de confiance, séparées par des virgules. Ne pas y mettre `*`, un nombre de sauts ou des plages larges. Sans cette valeur, `X-Forwarded-For` n’est pas cru ; si Node ne voit que l’IP privée de Passenger, Telegram indiquera que l’IP visiteur est indisponible et n’affichera pas de bouton de blocage. |
| `PORT` | Non sous Passenger | Ne pas fixer de port dans Plesk Passenger. Nécessaire uniquement si le serveur est lancé directement par Node hors Passenger. |
| `LOG_LEVEL` | Facultative | Niveau de journalisation ; `info` par défaut. |
| `CORS_ORIGINS` | Facultative | Origines supplémentaires séparées par des virgules, seulement si l’API doit accepter d’autres sites. |
| `WEB_DIST_DIR` | Facultative | Remplacement du chemin public par défaut. Ne pas la définir avec la structure Plesk documentée (`Application Root=/sendflow.africa/dist`). |

L’API accepte `APP_URL`, `PUBLIC_URL` et `VITE_PUBLIC_SITE_URL` comme solutions de repli à `PUBLIC_SITE_URL`. Pour le build CI/Plesk, définis `APP_URL=https://sendflow.africa` ; le script de build accepte aussi `PUBLIC_URL`, `PUBLIC_SITE_URL` ou `VITE_PUBLIC_SITE_URL`. `VITE_PUBLIC_SITE_URL` est une valeur publique de build, jamais un secret.

Toute variable `VITE_*` peut être intégrée au JavaScript livré au navigateur : n’y place jamais de clé privée, mot de passe, jeton, URL de base avec identifiants, ou secret de session. SendFlow n’utilise actuellement côté client que la base publique du site pour les métadonnées SEO. Les clés serveur comme `NEON_DATABASE_URL`, `RESEND_API_KEY`, `SESSION_SECRET` et `RECAPTCHA_SECRET_KEY` doivent rester dans l’environnement Node de Plesk et ne sont pas envoyées dans le bundle. La clé `RECAPTCHA_SITE_KEY` est publique par conception.

`BASE_PATH` doit rester `/` (ou être absent, car `/` est la valeur par défaut) pour servir le site à la racine du domaine.

`PUBLIC_OBJECT_SEARCH_PATHS` est uniquement le repli du stockage objet hors Plesk lorsque `PLESK_MEDIA_DIR` n’est pas défini. Sur Plesk, configure `PLESK_MEDIA_DIR` et n’utilise pas ce repli.

### Supervision Telegram et blocage d’IP au niveau Node

La fonctionnalité est désactivée par défaut. Une fois activée, elle envoie au
groupe configuré les vues de pages publiques, clics, soumissions de formulaires
(sans leurs champs), et alertes HTTP 401/403/429/5xx. Elle transmet une IP
uniquement si l’application peut l’identifier comme une adresse publique.
Elle ne collecte ni numéro de téléphone, ni GPS, ni opérateur réseau ou
géolocalisation ; aucune base GeoIP tierce n’est appelée. Les contenus de
formulaires, textes des boutons et valeurs saisies ne sont jamais envoyés.
Les événements sont regroupés en mémoire avant envoi, sans archive analytique
dans PostgreSQL. En cas de redémarrage, les événements encore en attente sont
perdus ; une panne Telegram déclenche des tentatives ultérieures, mais la file
est limitée et signale les excès. Ce canal n’est donc pas un journal d’audit
garanti. Les adresses bloquées sont, elles, conservées dans la table
`security_ip_blocks` jusqu’au déblocage.

Renseigne les variables Telegram dans **Plesk → Node.js → Environment variables**,
puis active `TELEGRAM_AUDIT_ENABLED=true`. Le démarrage crée de façon idempotente
la seule table `security_ip_blocks`; le compte PostgreSQL doit donc avoir le
droit `CREATE`. Les boutons IP ne sont affichés qu’après l’enregistrement du
webhook. Active aussi `TELEGRAM_AUTO_CONFIGURE_WEBHOOK=true` puis redémarre
l’application pour configurer le webhook automatiquement.
Le bot doit être ajouté au groupe privé et disposer du droit d’envoyer des
messages. Les identifiants Telegram autorisés sont contrôlés côté serveur ;
l’appui d’un autre membre sur un bouton ne modifie pas la liste.

Avant l’activation, mets à jour la politique de confidentialité publiée depuis
le panel pour signaler les événements/IP transmis au groupe Telegram, le rôle
de ce prestataire, les destinataires et la durée de conservation des blocages.
La page de confidentialité étant éditable en base par le panel, le dépôt ne peut
pas confirmer que le texte actuellement publié en production a été mis à jour.

Le blocage s’applique aux requêtes qui arrivent à Express/Node, avant les routes
API et les fichiers statiques servis par Node. Il ne bloque pas les fichiers
que Plesk/Apache/CDN sert directement. Plesk peut masquer l’adresse visiteur
derrière Passenger : tant que les IP exactes des proxys ne sont pas vérifiées
dans les journaux serveur, ne configure pas `TRUSTED_PROXY_IPS`. Ne fais jamais
confiance à un `X-Forwarded-For` fourni directement par le navigateur. Si Node
voit une adresse privée de proxy, aucun IP n’est montrée et aucun bouton de
blocage n’est proposé, afin d’éviter de bannir tous les visiteurs via le proxy.
Le pays, le type de réseau et l’opérateur ne sont pas déterminés par cette
fonctionnalité. Les alertes de même IP, route et statut sont regroupées pendant
une minute pour éviter les répétitions d’un même scan.

Les variables `PLESK_DIST_DIR`, `PLESK_DEPLOYMENT_ROOT` et `PLESK_REQUIRE_DEPLOYMENT_ROOT` servent à la génération du paquet et au choix/à la validation de sa destination ; `PLESK_KEEP_PREVIOUS_DIST` contrôle la conservation d’une sauvegarde. Elles ne sont pas nécessaires dans l’environnement du processus Node.js lorsque le build est livré par CI.

`API_ORIGIN`, `API_PORT` et `WEB_PORT` servent au développement local, pas au lancement de production. `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `ADMIN_PANEL_TOKEN` et `REFRESH_LEGAL_CONTENT` concernent des scripts explicites de seed/maintenance ; ne les configure pas pour le démarrage normal et n’exécute pas de seed ou migration lors du déploiement.

### Connexion au panel administrateur

Ouvre `/panel` sans identifiants dans l’URL, puis saisis le code privé, l’email
associé à ce code, l’email du compte admin et son mot de passe dans le formulaire.
Le navigateur les envoie uniquement dans le corps JSON du POST same-origin ; le
serveur vérifie les quatre valeurs, applique la limitation de débit et crée une
session par cookie `HttpOnly`, `SameSite=Lax` et `Secure` en production. Le
frontend ne met pas ces valeurs dans l’URL, le fragment, le stockage navigateur
ou les journaux. Les anciennes URL `/panel/<code>/<email>` redirigent vers
`/panel` et sont marquées sans cache ni référent. Si une ancienne URL a été
partagée ou enregistrée, remplace le code privé car l’URL a pu apparaître dans
l’historique ou les journaux d’accès antérieurs.

Les réglages d’environnement du build GitHub et ceux de l’application Node Plesk
sont séparés. `APP_URL` et `PLESK_MEDIA_DIR` ont des valeurs de validation CI
non sensibles pour construire et tester le paquet; configure les valeurs de
production déjà utilisées par l’application dans Plesk. Aucun secret
d’application ni identifiant de base de données n’est copié dans `dist/`.

## Commandes et vérifications

Le build est effectué dans GitHub Actions. Après le push source, attends le
commit généré `Build SendFlow production dist for Plesk`, puis lance Pull now
dans Plesk si le déploiement automatique n’a pas déjà récupéré ce commit.
Passenger redémarre selon son mécanisme de surveillance du fichier
`dist/tmp/restart.txt`. Aucune **Additional deployment action** ni commande de
build manuelle dans Plesk n’est nécessaire.

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
   **Publish built dist to main for Plesk**, vérifier que Plesk a bien tiré le
   commit, puis refaire le contrôle après le redémarrage Passenger.

Les pages protégées nécessitant une authentification ne sont pas vérifiables sans session. Une réponse HTTP 200 à `/api/healthz` vérifie que le processus sert l’API, mais ne prouve pas à elle seule que chaque intégration tierce fonctionne.

## Badge Google reCAPTCHA sur les pages publiques

Le composant public charge le script et le badge officiel Google reCAPTCHA v3
sur toutes les pages publiques (françaises et anglaises) quand les deux clés
sont configurées. Il ne le charge pas dans `/admin` ni `/panel`. V3 n’affiche
normalement pas de case à cocher ; Google peut afficher son petit badge en bas
de page. Sans les clés, aucun badge n’est chargé.

- `RECAPTCHA_SITE_KEY` — clé publique de site, renvoyée uniquement par
  `/api/recaptcha/config`.
- `RECAPTCHA_SECRET_KEY` — clé secrète conservée uniquement côté serveur.

Crée des clés reCAPTCHA v3 et autorise `sendflow.africa` (ainsi que
`www.sendflow.africa` seulement si ce nom est réellement utilisé). Définis les
deux variables ensemble dans **Plesk → Node.js → Environment variables**, puis
redémarre l’application. Aucun secret ne doit être ajouté à Git, à Vite ou au
formulaire navigateur.

Lors de l’envoi de la newsletter, le navigateur obtient un jeton pour
`newsletter_subscribe`. L’API le vérifie auprès de Google avant d’accepter
l’inscription, en contrôlant le résultat, l’action, l’hôte défini par
`PUBLIC_SITE_URL` (pas un en-tête `Host` fourni par le client) et un
score minimal de 0,5. La limite de débit existante reste active. Si les deux
clés sont absentes, le badge reste désactivé et le formulaire garde son
fonctionnement actuel. Si une seule clé est configurée, l’API refuse
l’inscription plutôt que de contourner la vérification. Avant activation, la
politique de confidentialité doit informer les visiteurs du traitement
reCAPTCHA par Google.
