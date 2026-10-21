# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `NEON_DATABASE_URL` for the external Neon database, with `DATABASE_URL` retained as a fallback
- Exécuter les opérations SQL ponctuelles depuis le package `@workspace/db` : sous pnpm, sa dépendance `pg` n’est pas nécessairement accessible au résolveur de modules du dépôt racine. Ne jamais afficher la chaîne de connexion.

### SEO de SendFlow

- Après la première publication, obtenir le domaine de production auprès du service de publication, puis définir `VITE_PUBLIC_SITE_URL` avec cette origine HTTPS vérifiée (sans chemin).
- La compilation génère les URLs absolues dans le HTML, le sitemap et robots.txt. Les fichiers sources restent des modèles sans domaine.
- Sans cette variable, la première compilation reste possible, mais affiche un avertissement SEO : la configuration publique n’est pas terminée.
- Après avoir renseigné la variable, republier : Vite intègre les variables `VITE_*` à la compilation, pas au démarrage du site.
- `pnpm --filter @workspace/sendflow run test:seo` vérifie la génération.
- `pnpm --filter @workspace/sendflow run seo:verify -- https://DOMAINE-PUBLIE` contrôle le HTML d’accueil et les fichiers SEO sur le domaine publié. Contrôler aussi les canoniques des pages dans un navigateur avant l’envoi dans Search Console.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

### Version Node.js des contrôles CI

- Le workflow `.github/workflows/validate-plesk-build.yml` valide Node.js 24, comme le workspace Replit, avec pnpm 10.26.1 (version fixée dans `package.json`).
- Ce choix évite de valider uniquement Node.js 22 alors que le développement utilise Node.js 24. La CI ne constitue pas une matrice de compatibilité avec les anciennes versions.
- `pnpm run deploy:plesk` installe les dépendances avec `--frozen-lockfile --prod=false`, puis exécute les tests, le contrôle des types et la compilation de production. Le workflow démarre ensuite le bundle et vérifie `/api/healthz`, `/`, `/fonctionnalites/` et `/en/`.
- Le démarrage en CI utilise un service PostgreSQL 16 éphémère avec des identifiants locaux de test, sans secret de production. Ce smoke-test ne vérifie ni le schéma ni les requêtes métier : `/api/healthz` contrôle uniquement que le serveur répond.
- Les versions acceptées par les scripts Plesk et cPanel restent inchangées ; leur harmonisation relève de la politique de déploiement, distincte de cet alignement CI.

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
