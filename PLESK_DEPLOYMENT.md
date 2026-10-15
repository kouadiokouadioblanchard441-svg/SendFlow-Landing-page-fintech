# Déploiement SendFlow sur Plesk

## Structure de production

Le projet garde ses packages frontend et backend séparés dans le monorepo, mais le build de production les assemble pour Plesk :

- Frontend React/Vite : `artifacts/sendflow`
- Backend Express : `artifacts/api-server`
- Build final Plesk : `dist/index.cjs`
- Fichier de démarrage Plesk présent dans le dépôt : `index.cjs`
- Frontend servi par Express : `dist/public`
- Fichiers annexes de logs et sourcemaps : conserver tout le dossier `dist`.

Plesk doit démarrer depuis le fichier racine :

```bash
node index.cjs
```

Le fichier racine `index.cjs` charge le serveur compilé `dist/index.cjs`. Si `dist` n'a pas encore été généré sur Plesk, le démarrage s'arrête avec un message indiquant de lancer le build. Le même serveur Express sert les routes `/api/*` et les fichiers du frontend. Les routes React inconnues retombent sur `dist/public/index.html`.

## Déploiement par push Git

Le dossier `dist/` est un résultat généré et est exclu de Git. Il ne doit donc pas être attendu dans le dépôt après un push. Après avoir envoyé les sources dans le répertoire d'application Plesk, le build doit être exécuté sur Plesk pour créer `dist/index.cjs` et `dist/public`.

Avant le premier push, configure dans les variables d'environnement de l'application Plesk :

- `VITE_PUBLIC_SITE_URL=https://sendflow.africa`
- `VITE_CLERK_PUBLISHABLE_KEY` avec la clé publiable de production Clerk (`pk_live_...`)
- `VITE_CLERK_PROXY_URL=/api/__clerk` (valeur par défaut du script)
- `BASE_PATH=/` (valeur par défaut du script)

Dans l'intégration Git Plesk, si une commande après déploiement est disponible, configure :

```bash
pnpm run deploy:plesk
```

Cette commande installe les dépendances du workspace, exécute tests et vérifications TypeScript, construit le frontend et l'API, puis vérifie les fichiers requis pour Plesk. Elle refuse de continuer si la version de Node.js, le domaine public ou la clé publiable Clerk de production ne sont pas configurés. Si l'intégration Git n'exécute pas de commande après chaque push, lance `pnpm run deploy:plesk` depuis l'onglet **Run Node.js commands** après le déploiement des sources.

Après le push, configure le fichier de démarrage `index.cjs`. Lance le build pour créer `dist`, puis règle le Document Root sur `dist/public` et redémarre l'application. Pour chaque push suivant, la commande de déploiement doit reconstruire `dist` avant de redémarrer le serveur.

## Commandes

Installation :

```bash
pnpm install --frozen-lockfile --prod=false
```

Les scripts d'installation nécessaires sont approuvés explicitement dans `pnpm-workspace.yaml` (`esbuild`, `@clerk/shared` et les autres outils du build). Ne pas utiliser `pnpm approve-builds` pour autoriser toutes les dépendances.

Développement frontend + backend :

```bash
pnpm run dev
```

Le script démarre l’API sur `API_PORT` (8080 par défaut) et Vite sur `WEB_PORT` (26095 par défaut). Vite proxyfie `/api` vers l’API.

Build de production :

```bash
pnpm run build
```

Le build :

1. vérifie les types ;
2. compile le frontend ;
3. compile l’API Express en CommonJS ;
4. copie le frontend dans `dist/public` ;
5. produit `dist/index.cjs`.

## Configuration Plesk

- Version Node.js : 24 LTS (version vérifiée : 24.13.0). Vite 7 nécessite au minimum Node 20.19 ou 22.12 dans ces branches ; privilégier une version LTS maintenue.
- Gestionnaire : pnpm 10 (version vérifiée : 10.26.1). Le projet refuse les installations via npm.
- **Application root** : racine du projet, contenant `package.json` et `dist`.
- **Document root** : `dist/public`, si Plesk permet de servir les fichiers statiques directement.
- **Application startup file** : `index.cjs`, relatif à l'Application root.
- Mode de l'application : production ; activer HTTPS.
- Le dossier courant du processus doit être la racine du projet, car Express y résout `dist/public`.
- Les dépendances de développement sont nécessaires pendant le build, d'où `--prod=false` à l'installation.
- L'activation Node.js dans Plesk doit faire parvenir les requêtes `/api/*` et les routes de pages au serveur Express. Vérifier qu'une règle nginx/Apache ne les remplace pas par une erreur 404.
- La commande de démarrage ne charge pas automatiquement un fichier `.env` : renseigner les variables dans la configuration Node.js de Plesk.

Variables API :

- `NODE_ENV=production`
- `PORT` : port numérique fourni/configuré dans l'environnement Plesk. Le serveur actuel refuse de démarrer sans ce port ; vérifier la configuration Node.js/Passenger de l'hébergement.
- `NEON_DATABASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `PUBLIC_SITE_URL=https://votre-domaine.com`
- `BASE_PATH=/`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `PLESK_MEDIA_DIR` : chemin absolu, inscriptible par le processus Node et situé hors de `dist/public`. Stockage persistant des médias sur Plesk.
- `LOG_LEVEL=info` (facultatif)
- `CORS_ORIGINS` (facultatif) : origines HTTPS supplémentaires, séparées par des virgules. L'origine `PUBLIC_SITE_URL` est déjà autorisée.
- `WEB_DIST_DIR` (facultatif) : chemin absolu alternatif du frontend. Par défaut : `dist/public` sous la racine du projet.

Variables nécessaires au build frontend :

- `PORT` (facultatif au build uniquement ; Vite utilise `3000` par défaut)
- `BASE_PATH=/`
- `VITE_PUBLIC_SITE_URL=https://votre-domaine.com`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PROXY_URL=/api/__clerk`

Les variables `VITE_*` sont intégrées au frontend lors de `pnpm run build`. Elles ne doivent jamais contenir de secret serveur. Si elles changent, reconstruire le frontend. Les deux clés publiables Clerk doivent appartenir à la même instance/environnement que `CLERK_SECRET_KEY`.

### Clerk et hébergement externe

L'instance actuelle tourne dans l'environnement de développement du projet. Le test local du build ne valide pas la connexion Clerk sur le futur domaine Plesk. Ne pas présumer que les clés de développement et la configuration de domaine/proxy seront utilisables telles quelles sur un hébergement externe. Avant la mise en service, vérifier des clés de production et une configuration Clerk autorisée pour ce domaine, puis tester connexion et inscription en HTTPS. Aucune clé existante n'a été modifiée pendant la vérification.

## Resend

L’API utilise directement :

```text
https://api.resend.com/emails/batch
```

`RESEND_FROM_EMAIL` doit être une adresse appartenant à un domaine vérifié dans Resend. Le lien de désabonnement est généré avec `PUBLIC_SITE_URL` et chaque destinataire reçoit son propre token.

## Base de données et administration

La base de production utilise `NEON_DATABASE_URL`. Les scripts de provisionnement peuvent également utiliser :

- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD`
- `ADMIN_PANEL_TOKEN`
- `ADMIN_PANEL_EMAIL`

Ne jamais ajouter les valeurs réelles dans le dépôt.

Ces variables ne sont pas lues lors du démarrage normal : l'authentification du panel utilise les données enregistrées en base. Ne pas relancer les scripts de création ou de changement du panel si l'administrateur existe déjà : cela peut changer son accès.

Les nouveaux liens privés transmettent le jeton dans le fragment du navigateur, qui n'est pas envoyé dans la requête HTTP :

```text
https://votre-domaine.com/panel#token=JETON&email=EMAIL
```

L’application efface immédiatement le fragment, puis vérifie le jeton avec une requête POST. Les anciens liens `/panel/:token/:email` sont acceptés uniquement pour compatibilité et nettoyés par l’application, mais le serveur d’accès Plesk peut déjà avoir inscrit leur chemin dans ses journaux. Ne plus diffuser les anciens liens; remplacez-les et faites tourner le jeton avant la mise en service si un ancien lien a été utilisé.

### Variables hors production

- `API_PORT=8080`, `WEB_PORT=26095`, `API_ORIGIN=http://127.0.0.1:8080` : développement uniquement.
- `REFRESH_LEGAL_CONTENT=true` : option du script éditorial ponctuel, pas du serveur.
- `PUBLIC_OBJECT_SEARCH_PATHS` : chemins du stockage d'objets de l'environnement de développement; ignoré si `PLESK_MEDIA_DIR` est défini.
- `SESSION_SECRET` et `DATABASE_URL` : non utilisés par le code actuel. La connexion utilise uniquement `NEON_DATABASE_URL`.

Le fichier `.env.example` contient toutes ces variables sans leurs valeurs sensibles. Si la même base Neon est conservée, ne pas recréer la base ni relancer les seeds. Si une nouvelle base est choisie, son schéma et ses données doivent être provisionnés avant de lancer le site.

## Vérification après démarrage

```text
GET https://votre-domaine.com/api/healthz
```

La réponse attendue est :

```json
{"status":"ok"}
```

## Médias sur Plesk

Avec `PLESK_MEDIA_DIR`, les uploads sont écrits sur le disque du serveur, sous le préfixe `public/`, puis servis par l’API. Le processus Node doit pouvoir créer et lire ce dossier. Il doit être persistant entre redémarrages et ne doit pas être placé sous `dist/public`.

Les médias déjà présents dans la base ne sont pas automatiquement transférés. Avant ouverture, copiez chaque objet existant sous `PLESK_MEDIA_DIR/public/` en conservant son chemin relatif utilisé par `/api/storage/public-objects/<chemin>`. Les images importées dans le code frontend sont, elles, embarquées dans `dist/public/assets`.

## Résultat de la vérification du 8 octobre 2026

- `pnpm run build` : succès. Le build exécute maintenant les tests, les vérifications TypeScript, le frontend, l’API et l’assemblage destiné à Plesk.
- Tests automatisés : 22 réussis, aucun échec.
- Démarrage de `dist/index.cjs` sous `NODE_ENV=production` avec un dossier média local temporaire : succès.
- `/api/healthz` et `/` : 200.
- `/api/landing` : 200, base Neon accessible, 35 médias retournés et aucune ligne masquée dans la réponse publique.
- `/api/admin/landing` sans authentification : 401.
- Ancienne vérification panel par GET : 404. Vérification POST avec une origine étrangère : 403.
- L’ancien chemin contenant les identifiants reçoit `Referrer-Policy: no-referrer` et `Cache-Control: no-store`; le jeton de test n’apparaît pas dans les journaux applicatifs.
- Audit des dépendances : zéro vulnérabilité critique ou élevée. Les scans SAST et HoundDog n’ont remonté aucun résultat critique ou élevé.
- Avertissement non bloquant : le principal fichier JavaScript frontend dépasse le seuil de taille Vite de 500 kB.

Cette vérification a été faite dans l’environnement de travail, pas sur un serveur Plesk accessible. Le domaine réel, les clés et domaines Clerk de production, la connexion au panel authentifié et l’envoi Resend restent à valider sur l’hébergement. Les 35 médias de la base ne sont pas transférés automatiquement vers `PLESK_MEDIA_DIR`; il faut copier les fichiers sources en conservant leurs chemins. L’aperçu de développement utilise des clés Clerk de développement et ne valide pas la connexion Clerk de production. Aucun e-mail n’a été envoyé et aucune donnée administrateur n’a été modifiée.