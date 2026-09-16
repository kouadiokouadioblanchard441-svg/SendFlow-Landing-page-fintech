# Déploiement SendFlow sur Plesk

## Architecture

Le projet se déploie en deux services :

1. **Web statique** : le contenu de `artifacts/sendflow/dist/public`.
2. **API Node.js** : le serveur compilé dans `artifacts/api-server/dist`.

Le site utilise des URLs relatives pour l’API (`/api/...`). Le domaine Plesk doit donc servir le web et proxyfier `/api/*` vers l’application Node.js, en conservant les en-têtes `Host`, `X-Forwarded-Host` et `X-Forwarded-Proto`.

## Variables Plesk

Copier `.env.example` dans la configuration d’environnement Plesk. Les secrets doivent être saisis dans Plesk, jamais dans le dépôt.

### API Node.js

- `NODE_ENV=production`
- `PORT` : port attribué par Plesk à l’application Node.js
- `NEON_DATABASE_URL` : chaîne de connexion Neon de la base de production
- `RESEND_API_KEY` : clé API Resend
- `RESEND_FROM_EMAIL` : adresse ou nom d’expéditeur appartenant à un domaine vérifié dans Resend
- `PUBLIC_SITE_URL` : URL HTTPS publique complète, sans slash final
- `BASE_PATH=/` pour un domaine à la racine
- `CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY` si l’authentification Clerk est activée
- `LOG_LEVEL=info` (facultatif)

`RESEND_FROM_EMAIL` est volontairement obligatoire. L’API utilise directement `https://api.resend.com/emails/batch` avec `Authorization: Bearer $RESEND_API_KEY`; elle ne dépend plus du connecteur Replit.

### Web

Ces variables sont nécessaires au moment du build Vite :

- `PORT`
- `BASE_PATH=/`
- `VITE_PUBLIC_SITE_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PROXY_URL=/api/__clerk`

Les variables `VITE_*` sont intégrées au JavaScript produit. Elles ne doivent donc jamais contenir de secret serveur.

## Build

Depuis la racine du dépôt :

```bash
pnpm install --frozen-lockfile
pnpm run typecheck

NODE_ENV=production PORT=3000 BASE_PATH=/ \
  VITE_PUBLIC_SITE_URL=https://www.example.com \
  VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx \
  VITE_CLERK_PROXY_URL=/api/__clerk \
  pnpm --filter @workspace/sendflow run build

pnpm --filter @workspace/api-server run build
```

Remplacer les valeurs `example.com` et `pk_live_xxx` par les variables configurées pour le domaine Plesk avant le build final.

## Démarrage de l’API

Dans l’application Node.js Plesk :

```bash
NODE_ENV=production pnpm --filter @workspace/api-server run start
```

Le serveur écoute obligatoirement le `PORT` fourni par Plesk. Le contrôle de santé est disponible sur :

```text
GET /api/healthz
```

## Publication du web

Configurer le document root Plesk sur :

```text
artifacts/sendflow/dist/public
```

Ajouter une réécriture SPA de toutes les routes web vers `/index.html`, sans réécrire `/api/*` qui doit être envoyé à l’application Node.js.

## Base et administration

La base de production doit être initialisée avec `NEON_DATABASE_URL`. Les scripts d’administration utilisent aussi `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `ADMIN_PANEL_TOKEN` et, pour le script du panel, `ADMIN_PANEL_EMAIL`.

Ne jamais afficher ni committer les valeurs de ces variables.

## Point à traiter avant une migration complète

Les routes d’upload et de lecture de médias utilisent encore le sidecar Object Storage de Replit (`127.0.0.1:1106`). Elles ne sont donc pas portables vers Plesk avec des variables d’environnement seules. La landing peut être servie avec des URLs publiques déjà migrées, mais l’upload média de l’admin nécessite soit un stockage compatible Plesk/S3/R2, soit une migration dédiée avant la mise en production complète.