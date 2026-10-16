# SendFlow — paquet de déploiement Plesk

## Mode de livraison retenu

Le dépôt Git contient le code source et les scripts de déploiement. Après chaque synchronisation Git dans Plesk, une action de déploiement lance `pnpm run deploy:plesk` pour installer les dépendances et générer `dist/` sur l’hébergement. Aucun ZIP n’est nécessaire.

`dist/` reste ignoré par Git : c’est un build généré sur Plesk après le pull, pas une source à conserver dans l’historique du dépôt. Le build contient les workers Pino et tous les fichiers sous `dist/public`; ne supprimez aucun de ces fichiers.

## Réglages Plesk

- **Application root** : `/sendflow.africa` d’après la configuration montrée. Vérifiez que ce dossier contient le `package.json` racine, `pnpm-workspace.yaml`, `index.cjs` et `artifacts/`.
- **Document root** : `dist/public`, relatif à l’application root.
- **Application Startup File** : `index.cjs` (wrapper à la racine qui charge `dist/index.cjs`).
- **Build** : `pnpm run deploy:plesk`, exécuté après chaque synchronisation Git. Le build et la suite de tests ont été exécutés avec Node.js 21.7.3.
- **Commande de démarrage** : `npm start` (le script racine lance `node ./index.cjs`; ce wrapper charge le serveur compilé `dist/index.cjs`).
- **Version Node.js sur l’hébergement** : Node.js 21.7.3, comme indiqué dans le panneau Plesk fourni. Le projet a été testé avec cette version; Vite ne la déclare pas dans sa plage officielle et le script autorise uniquement cette version exacte après validation.
- **Gestionnaire de paquets** : pnpm 10, car le projet refuse `npm install`.
- **Mode** : production, avec HTTPS actif. Le processus doit démarrer depuis l’application root.

## Déploiement après synchronisation Git

1. Configurez le dépôt Git Plesk pour synchroniser le projet dans `/sendflow.africa`.
2. Sélectionnez `pnpm` comme gestionnaire de paquets. Le dépôt autorise les scripts nécessaires d’`esbuild` et `@clerk/shared`.
3. Définissez l’action exécutée après chaque déploiement Git : `pnpm run deploy:plesk`, depuis `/sendflow.africa`. Elle installe les dépendances avec le lockfile, lance les tests et le build, puis vérifie les fichiers produits.
4. Configurez les variables d’environnement de build et de serveur ci-dessous dans Plesk avant d’exécuter l’action.
5. Vérifiez que le build a créé `/sendflow.africa/dist/index.cjs`, `/sendflow.africa/dist/public/index.html`, les workers Pino, le sitemap et `robots.txt`.
6. Réglez le document root sur `/sendflow.africa/dist/public` et le startup file sur `index.cjs`, puis redémarrez l’application Node.js.

Si l’interface Git Plesk n’offre pas d’action après le déploiement, lancez `pnpm run deploy:plesk` depuis l’application root après chaque pull, avant de redémarrer Node.js.

Le build dépend des paquets et des sources du monorepo; conservez-les dans l’application root. Ne lancez aucun script de migration ou de seed lors d’un déploiement normal.

## Noms des variables d’environnement

Les variables `VITE_*` sont consommées lors de l’action de build exécutée dans Plesk. Seule la clé publique Clerk est intégrée au bundle; `CLERK_SECRET_KEY` reste côté serveur.

**Build :** `VITE_PUBLIC_SITE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL`, `BASE_PATH`.

**Serveur :** `NODE_ENV`, `PORT`, `NEON_DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `PUBLIC_SITE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PLESK_MEDIA_DIR`.

**Facultatives selon la configuration :** `CORS_ORIGINS`, `LOG_LEVEL`, `WEB_DIST_DIR`.

Le code actuel ne référence pas `SUPABASE_NEW_DATABASE_URL` ni `SESSION_SECRET`; ne les considérez pas comme des prérequis de cette version. La base actuellement utilisée par le code est identifiée par `NEON_DATABASE_URL`.

## Contrôles après redémarrage

Tester en HTTPS :

- `https://sendflow.africa/` — accueil.
- `https://sendflow.africa/sign-in` — route de connexion définie par l’application.
- `https://sendflow.africa/login` — cette route n’est pas définie dans cette version; ne pas la confondre avec `/sign-in`.
- `https://sendflow.africa/api/healthz` — endpoint santé existant; il répond `{"status":"ok"}`.

`/api/health` n’est pas défini dans cette version; utilisez `/api/healthz`. La vérification du build local ne valide pas les clés Clerk de production, l’accès à la base sur Plesk, les permissions de `PLESK_MEDIA_DIR` ni l’envoi Resend. Aucun accès ou déploiement Plesk n’est effectué par ce guide.
