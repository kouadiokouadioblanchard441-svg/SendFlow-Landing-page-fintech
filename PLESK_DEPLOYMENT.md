# SendFlow — déploiement GitHub vers Plesk

## Mode de livraison

Tu fais toi-même le push sur `main`. Le workflow GitHub Actions `.github/workflows/deploy-plesk.yml` s’exécute ensuite : il installe avec pnpm, lance les tests et le build sous Node.js 21.7.3, transfère `dist/` et `index.cjs` en SSH vers Plesk, puis demande le redémarrage de l’application. Aucun ZIP n’est créé et `dist/` reste exclu du dépôt Git.

Ce workflow déploie directement les fichiers compilés sur Plesk. **Il ne fait pas un pull Git depuis Plesk.**

## Réglages Plesk

- **Application root** : `/sendflow.africa` selon les captures. Le chemin absolu système doit correspondre à la valeur de `PLESK_APP_ROOT` dans GitHub.
- **Document root** : `dist/public`, relatif à l’application root.
- **Application Startup File** : `index.cjs`, qui charge `dist/index.cjs`.
- **Node.js** : 21.7.3.
- **Gestionnaire** : pnpm 10.26.1.
- **Mode** : production.
- **Redémarrage** : le workflow met à jour `tmp/restart.txt` après le transfert. Vérifie dans Plesk que l’application redémarre bien via ce mécanisme; sinon utilise le bouton Restart App.

## Configuration GitHub requise avant le premier push de déploiement

Dans les paramètres du dépôt GitHub, ajoute les Actions secrets suivants. Ne les mets jamais dans le code ni dans les journaux :

- `PLESK_HOST` — hôte SSH du serveur, pas l’URL d’administration `:8443`.
- `PLESK_PORT` — port SSH.
- `PLESK_USER` — utilisateur SSH autorisé à écrire dans l’application root.
- `PLESK_APP_ROOT` — chemin absolu de l’application root sur le système de fichiers Plesk. Vérifie-le par SSH ou auprès de l’hébergeur; ne suppose pas que `/sendflow.africa` est son chemin absolu.
- `PLESK_SSH_PRIVATE_KEY` — clé privée dédiée au déploiement; configure la clé publique correspondante sur l’hébergement.
- `PLESK_KNOWN_HOSTS` — clé d’hôte SSH vérifiée hors bande, au format `known_hosts`; ne désactive pas la vérification SSH.
- `VITE_CLERK_PUBLISHABLE_KEY` — clé publique Clerk de production (`pk_live_...`), utilisée uniquement pendant le build.

La clé SSH doit être dédiée au déploiement et limitée aux droits nécessaires sur l’application root. `CLERK_SECRET_KEY`, `NEON_DATABASE_URL`, `RESEND_API_KEY` et les autres secrets serveur ne sont pas envoyés par le workflow; ils restent configurés dans Plesk.

Le workflow se déclenche sur chaque push vers `main` et peut aussi être lancé manuellement depuis l’onglet **Actions** du dépôt. Tant que les secrets ci-dessus ne sont pas configurés, le déploiement échouera explicitement au lieu de publier des fichiers partiels.

## Vérifications après le premier déploiement

Confirme dans Plesk que `dist/index.cjs` et `dist/public/index.html` existent, règle le Document Root sur `dist/public`, vérifie le Startup File `index.cjs`, puis teste :

- `https://sendflow.africa/`
- `https://sendflow.africa/sign-in`
- `https://sendflow.africa/api/healthz`

`/api/health` et `/login` ne sont pas les routes de cette version; utilise `/api/healthz` et `/sign-in`. Le build local ou GitHub ne vérifie pas les accès production à la base, les variables serveur, les permissions de `PLESK_MEDIA_DIR` ni les envois Resend.

Si des dépendances serveur de production sont ajoutées ou mises à jour ultérieurement, elles doivent également être installées sur Plesk; le workflow actuel transfère les fichiers compilés, pas `node_modules`.
