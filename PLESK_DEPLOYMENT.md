# Déploiement SendFlow sur Plesk

## Structure de production

Le projet garde ses packages frontend et backend séparés dans le monorepo, mais le build de production les assemble pour Plesk :

- Frontend React/Vite : `artifacts/sendflow`
- Backend Express : `artifacts/api-server`
- Build final Plesk : `dist/index.cjs`
- Frontend servi par Express : `dist/public`

Plesk doit exécuter uniquement :

```bash
node dist/index.cjs
```

Le même serveur Express sert les routes `/api/*` et les fichiers du frontend. Les routes React inconnues retombent sur `dist/public/index.html`.

## Commandes

Installation :

```bash
pnpm install --frozen-lockfile
```

Développement frontend + backend :

```bash
npm run dev
```

Le script démarre l’API sur `API_PORT` (8080 par défaut) et Vite sur `WEB_PORT` (26095 par défaut). Vite proxyfie `/api` vers l’API.

Build de production :

```bash
npm run build
```

Le build :

1. vérifie les types ;
2. compile le frontend ;
3. compile l’API Express en CommonJS ;
4. copie le frontend dans `dist/public` ;
5. produit `dist/index.cjs`.

## Configuration Plesk

Configurer le document root ou le dossier de l’application sur la racine du projet, puis utiliser `dist/index.cjs` comme fichier de démarrage.

Variables API :

- `NODE_ENV=production`
- `PORT` : port fourni par Plesk
- `NEON_DATABASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `PUBLIC_SITE_URL=https://votre-domaine.com`
- `BASE_PATH=/`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `LOG_LEVEL=info` (facultatif)

Variables nécessaires au build frontend :

- `PORT`
- `BASE_PATH=/`
- `VITE_PUBLIC_SITE_URL=https://votre-domaine.com`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PROXY_URL=/api/__clerk`

Les variables `VITE_*` sont intégrées au frontend lors de `npm run build`. Elles ne doivent jamais contenir de secret serveur.

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

## Vérification après démarrage

```text
GET https://votre-domaine.com/api/healthz
```

La réponse attendue est :

```json
{"status":"ok"}
```

## Limite actuelle des médias

Les routes d’upload et de lecture de médias utilisent encore un service de stockage local (`127.0.0.1:1106`). Le build unifié Plesk est prêt pour le frontend, l’API et Resend, mais les uploads médias nécessitent encore une migration vers un stockage compatible Plesk, S3 ou R2.