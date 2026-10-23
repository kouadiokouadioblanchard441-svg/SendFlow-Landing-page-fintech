---
name: plesk-deployment-engineer
description: "Préparer, diagnostiquer et réparer les déploiements sur un serveur Plesk externe : Git, builds Node.js/React/Vite, Passenger, racines de dossiers, Apache/Nginx, HTTPS et vérification en production. À utiliser pour les demandes de déploiement, configuration ou dépannage Plesk ; distinct du déploiement géré par Replit."
---

# Plesk Deployment Engineer

## Procédure de référence

Lire [le document fourni par l’utilisateur](references/plesk-deployment-engineer.md)
avant une intervention Plesk. Il contient les procédures détaillées de découverte,
configuration, déploiement Git, diagnostic, sécurité, sauvegarde et vérification.
Son contenu original est conservé intégralement comme référence.

Les exemples génériques du document ne prouvent pas la configuration d’un serveur.
Les indications ci-dessous précisent comment les appliquer à SendFlow, sans
modifier les réglages de production lors du simple chargement de cette compétence.

## Découvrir avant de modifier

1. Identifier les accès réellement disponibles : workspace, connexion SSH
   authentifiée, API Plesk ou intervention manuelle. Un fichier joint ou une
   capture ne fournit pas de connexion au serveur.
2. Inspecter les scripts, le gestionnaire de paquets, le lockfile, le point
   d’entrée et les dossiers générés dans le dépôt actuel.
3. Distinguer le dossier de checkout Git, le dossier de déploiement,
   l’Application Root, le Document Root et le fichier de démarrage relatif à
   l’Application Root.
4. Établir la cause avec les éléments disponibles ; ne pas déduire un crash
   Node.js précis d’une simple réponse HTTP 500 ou d’un journal d’accès.

## Appliquer au projet SendFlow

Lire `PLESK_DEPLOYMENT.md`, puis vérifier les scripts qu’il cite :

- `scripts/plesk-git-deploy.sh` : action après le déploiement Git.
- `scripts/plesk-deploy.sh` : installation verrouillée, tests et build complet.
- `scripts/prepare-plesk-build.mjs` : préparation du paquet et des fichiers publics.

Utiliser les versions et commandes déclarées par le dépôt actuel, pas les
exemples npm du document. Ne pas modifier le gestionnaire de paquets.

Ne pas considérer `/httpdocs` comme le checkout confirmé uniquement parce que
Plesk l’affiche comme racine d’application. Vérifier le dossier où Git déploie
réellement les sources avant de donner des chemins absolus. Le schéma documenté
doit être vérifié sur le serveur :

```text
<checkout>/dist/index.cjs
<checkout>/dist/package.json
<checkout>/dist/public/index.html
```

Le sélecteur **Document Root** choisit un dossier, pas le fichier de démarrage.
Si `dist` n’existe pas encore sur Plesk, vérifier d’abord l’exécution et la sortie
de l’action de déploiement Git. Un build local n’envoie pas `dist` au serveur ;
ne pas l’ajouter automatiquement à Git pour contourner un hook manquant.

### Particularité Passenger

L’exemple `process.env.PORT || 3000` du document n’est pas une instruction à
appliquer à SendFlow sous Passenger. Inspecter son écouteur actuel : Passenger
gère son socket et n’exige pas un `PORT` numérique. Conserver le test sans
`PORT` ; une simulation Passenger n’est pas une vérification sur l’hôte Plesk.

### Périmètre et données

Les composants cités comme possibles dans le document ne sont pas forcément
présents. Ne pas ajouter Clerk, un prestataire de paiement ou une autre
dépendance pour suivre un exemple. Ne pas lancer de seed ni de migration de
production pendant le build ou le démarrage.

## Vérification et compte rendu

Vérifier les fichiers produits, leur lecture et le démarrage depuis le bon
répertoire de travail. En production, contrôler les routes publiques, assets et
API, puis les fonctions concernées par le changement avec des tests non destructifs.
Si le paquet fournit un identifiant de build public, le comparer avec celui
affiché par l’action de déploiement Plesk, pas avec celui d’un build local séparé.

Séparer dans le compte rendu : actions locales effectuées, actions réellement
effectuées sur Plesk, résultats vérifiés et opérations manuelles restantes.
Ne pas annoncer un déploiement terminé sur la seule base d’un build local.
