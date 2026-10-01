# Déploiement SendFlow sur Plesk

## Structure de production

Le projet garde ses packages frontend et backend séparés dans le monorepo, mais le build de production les assemble pour Plesk :

- Frontend React/Vite : `artifacts/sendflow`
- Backend Express : `artifacts/api-server`
- Build final Plesk : `dist/index.cjs`
- Frontend servi par Express : `dist/public`
- Fichiers annexes de logs et sourcemaps : conserver tout le dossier `dist`.

Plesk doit exécuter uniquement :

```bash
node dist/index.cjs
```

Le même serveur Express sert les routes `/api/*` et les fichiers du frontend. Les routes React inconnues retombent sur `dist/public/index.html`.

## Commandes

Installation :

```bash
pnpm install --frozen-lockfile --prod=false
```

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
- **Application startup file** : `dist/index.cjs`, relatif à l'Application root.
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

L'instance actuelle est gérée par Replit. Le test local du build ne valide pas la connexion Clerk sur le futur domaine Plesk. Ne pas présumer que les clés de développement et la configuration de domaine/proxy seront utilisables telles quelles hors Replit. Avant la mise en service, vérifier des clés de production et une configuration Clerk autorisée pour ce domaine, puis tester connexion et inscription en HTTPS. Aucune clé existante n'a été modifiée pendant la vérification.

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

Ces variables ne sont pas lues lors du démarrage normal : l'authentification du panel utilise les données enregistrées en base. Ne pas relancer les scripts de création ou de changement du panel si l'administrateur existe déjà : cela peut changer son accès. La route privée reste `/panel/:token/:email`.

### Variables hors production

- `API_PORT=8080`, `WEB_PORT=26095`, `API_ORIGIN=http://127.0.0.1:8080` : développement uniquement.
- `REFRESH_LEGAL_CONTENT=true` : option du script éditorial ponctuel, pas du serveur.
- `PUBLIC_OBJECT_SEARCH_PATHS` : chemins du stockage Replit, pas une solution de stockage Plesk.
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

## Limite actuelle des médias

Les routes d’upload et de lecture de médias utilisent encore un service de stockage local (`127.0.0.1:1106`). Les visuels importés dans le frontend sont présents dans `dist/public/assets`, mais les uploads médias nécessitent encore une migration vers un stockage compatible Plesk, S3 ou R2. Renseigner `PUBLIC_OBJECT_SEARCH_PATHS` ne remplace pas ce service.

## Résultat de la vérification du 1er octobre 2026

- TypeScript, frontend, backend et assemblage Plesk : succès.
- Démarrage réel du bundle sous `NODE_ENV=production` : succès.
- `/api/healthz` : 200, `{"status":"ok"}`.
- `/`, `/download`, `/fonctionnalites`, fichiers JS/CSS : 200.
- `/api/landing` : 200, lecture de la base Neon réussie.
- `/api/admin/landing` sans authentification : 401.
- Route API inexistante : 404, sans renvoyer le HTML du frontend.
- Avertissements non bloquants : sourcemap d'un composant UI et taille du bundle frontend.

Cette vérification a été faite dans l'environnement de travail, pas sur un serveur Plesk accessible. Restent à vérifier sur le vrai hébergement : reverse proxy/port, domaine HTTPS, connexion Clerk, panel authentifié et envoi Resend. Aucun e-mail de test n'a été envoyé, et aucune donnée administrateur n'a été modifiée.