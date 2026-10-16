# SendFlow — paquet de déploiement Plesk

## Mode de livraison retenu

Le code source est synchronisé par Git. Le build de production est ensuite téléversé séparément, car le Plesk montré ne propose que Node.js 21.7.3, alors que la version actuelle de Vite exige Node.js 20.19+ ou 22.12+ pour construire le frontend. Le build est produit ici avec Node.js 24 et empaqueté dans `generated-artifacts/sendflow-plesk-dist.zip`. L’archive contient le dossier `dist/` à sa racine.

`dist/` reste ignoré par Git : le paquet est fourni pour téléversement manuel dans Plesk, sans ajouter environ 40 Mo de fichiers générés à l’historique du dépôt. N’en retirez aucun fichier : le serveur Express dépend des workers Pino et le frontend de l’ensemble des fichiers de `dist/public`. L’archive n’inclut ni `node_modules`, ni cache, ni fichier `.env`, ni secret.

## Réglages Plesk

- **Application root** : `/sendflow.africa` d’après la configuration montrée. Vérifiez que ce dossier contient le `package.json` racine, `pnpm-workspace.yaml`, `index.cjs` et `artifacts/`.
- **Document root** : `dist/public`, relatif à l’application root.
- **Application Startup File** : `index.cjs` (wrapper à la racine qui charge `dist/index.cjs`).
- **Build** : généré sur Node.js 24 avant téléversement ; ne lancez pas `npm run build` sur Node.js 21.7.3.
- **Commande de démarrage** : `npm start` (le script racine charge le même serveur compilé via `index.cjs`).
- **Version Node.js sur l’hébergement** : utilisez Node.js 21.7.3, la version visible dans le panneau Plesk fourni. Le démarrage du serveur sur cette version doit être confirmé par les tests après redémarrage.
- **Gestionnaire de paquets** : pnpm 10, car le projet refuse `npm install`.
- **Mode** : production, avec HTTPS actif. Le processus doit démarrer depuis l’application root.

## Déploiement après synchronisation Git

1. Synchronisez le dépôt Git dans `/sendflow.africa`.
2. Dans Plesk, installez les dépendances avec le gestionnaire `pnpm`. Le dépôt autorise maintenant les scripts d’installation nécessaires de `esbuild` et `@clerk/shared`.
3. Téléversez `generated-artifacts/sendflow-plesk-dist.zip` dans `/sendflow.africa` et extrayez-le à cet endroit. Vérifiez que cela crée `/sendflow.africa/dist/index.cjs` et `/sendflow.africa/dist/public/index.html` — pas un dossier imbriqué `/dist/dist`.
4. Vérifiez aussi la présence de tous les workers Pino ainsi que de `dist/public/sitemap.xml` et `dist/public/robots.txt`.
5. Réglez le document root sur `/sendflow.africa/dist/public` et le startup file sur `index.cjs`.
6. Configurez les variables d’environnement listées ci-dessous, puis redémarrez l’application Node.js.

Ne lancez pas `pnpm run deploy:plesk` sur Node.js 21.7.3 : ce script reconstruit le frontend et exige une version de Node.js compatible avec Vite. Le build précompilé et les tests de démarrage sur l’hébergement restent deux vérifications distinctes.

Le build dépend des paquets et des sources du monorepo : ne déployez pas seulement `dist/` sans les dépendances runtime installées. Ne lancez aucun script de migration ou de seed lors d’un déploiement normal.

## Noms des variables d’environnement

Les variables `VITE_*` sont consommées avant le téléversement, pendant le build précompilé. La clé publique dédiée `PLESK_VITE_CLERK_PUBLISHABLE_KEY` est stockée dans les secrets du workspace et transmise à Vite au moment de construire l’archive ; seule cette clé publique est intégrée au bundle. Elle n’est pas nécessaire dans Plesk.

**Build précompilé :** `VITE_PUBLIC_SITE_URL`, `PLESK_VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL`, `BASE_PATH`.

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
