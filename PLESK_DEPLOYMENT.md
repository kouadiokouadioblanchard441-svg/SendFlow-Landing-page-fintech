# SendFlow — paquet de déploiement Plesk

## Mode de livraison retenu

Le dépôt est relié à GitHub et le projet possède déjà un flux Git/Plesk avec build sur le serveur. Aucun ZIP existant n’a été trouvé; je n’en crée pas un second. `dist/` est un résultat de build ignoré par Git : Plesk le régénère après la synchronisation du code avec `npm run build`. Le paquet exécutable est donc le dossier `dist/` produit par cette commande, avec les sources et manifestes du dépôt nécessaires au build et à l’installation.

Ne retirez pas de fichiers de `dist/` : le bundle Express dépend aussi des workers Pino et le frontend dépend de tous les fichiers de `dist/public`. Ne téléversez pas `node_modules`, caches, fichiers `.env` ou valeurs secrètes.

## Réglages Plesk

- **Application root** : `/sendflow.africa` d’après la configuration montrée. Vérifiez que ce dossier contient le `package.json` racine, `pnpm-workspace.yaml`, `index.cjs` et `artifacts/`.
- **Document root** : `dist/public`, relatif à l’application root.
- **Application Startup File** : `index.cjs` (wrapper à la racine qui charge `dist/index.cjs`).
- **Commande de build** : `npm run build`.
- **Commande de démarrage** : `npm start` (le script racine charge le même serveur compilé via `index.cjs`).
- **Version Node.js** : Node 24 LTS recommandé. Le build requiert Node 20.19+, 22.12+ ou 24+.
- **Gestionnaire de paquets** : pnpm 10, car le projet refuse `npm install`.
- **Mode** : production, avec HTTPS actif. Le processus doit démarrer depuis l’application root.

## Déploiement après synchronisation Git

1. Synchronisez le dépôt Git dans `/sendflow.africa`.
2. Configurez les noms de variables ci-dessous dans Plesk, sans placer de secrets dans Git.
3. Installez avec `pnpm install --frozen-lockfile --prod=false`.
4. Exécutez `npm run build`. Cette commande lance les tests et contrôles TypeScript, construit le frontend et Express puis assemble `dist/`.
5. Vérifiez que `dist/index.cjs` et `dist/public/index.html` existent et ne sont pas vides.
6. Redémarrez l’application Node.js dans Plesk.

Le build dépend des paquets et des sources du monorepo : ne déployez pas seulement `dist/` sans les dépendances runtime installées. Ne lancez aucun script de migration ou de seed lors d’un déploiement normal.

## Noms des variables d’environnement

Configurez les valeurs séparément dans Plesk. Les variables `VITE_*` sont lues pendant le build; les autres sont lues par le serveur au démarrage.

**Build frontend :** `VITE_PUBLIC_SITE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL`, `BASE_PATH`.

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
