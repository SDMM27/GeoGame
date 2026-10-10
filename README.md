# GeoGame

[![CI](https://github.com/SDMM27/GeoGame/actions/workflows/ci.yml/badge.svg)](https://github.com/SDMM27/GeoGame/actions/workflows/ci.yml)

Mini-jeux de géographie : trouver un pays sur la carte, quiz, drapeaux, capitales, frontières, classements de pays, mode Ascension, défi quotidien et salons multijoueurs. Le dépôt contient le site, l'application mobile et les fonctions serveur.

- Site : https://geo-game-delta.vercel.app/
- App web (export de l'app mobile) : https://geogame-app.vercel.app/

## Contenu du dépôt

| Dossier | Rôle |
| --- | --- |
| `src/` | Site : Vite + React 18, React Router, i18next (fr, en, ru), Leaflet. La logique de jeu (`src/hooks`, `src/utils`) est aussi utilisée par l'app mobile. |
| `api/` | Fonctions Vercel (`firebase-admin`) : `invite-push.mjs`, `cleanup-expired.mjs`, helpers dans `api/_lib/`. |
| `mobile/` | Application Expo SDK 57 (Expo Router, `mobile/src/app`). Réutilise `../src` via des shims Metro (`mobile/metro.config.js`, `mobile/src/shims/`, alias `@shared`). |
| `firestore.rules`, `firestore.indexes.json`, `firebase.json` | Règles, index et émulateurs Firebase (projet `geogame-sdmm`). |
| `scripts/` | Génération des données géographiques, des plafonds de score, scripts d'administration. |
| `tests/emulator/` | Tests des règles Firestore et de l'API contre les émulateurs. |
| `docs/` | Notes de conception. |

## Lancer le site en local

Prérequis : Node.js LTS.

```sh
npm install
npm run dev
```

Le site est servi sur http://localhost:5173. Variables d'environnement, à mettre dans `.env.local` (ignoré par git) :

| Variable | Rôle |
| --- | --- |
| `VITE_CARTO_API_KEY` | Clé des tuiles de carte CARTO (`src/mapTiles.js`). |
| `VITE_RECAPTCHA_ENTERPRISE_KEY` | Clé de site reCAPTCHA Enterprise pour Firebase App Check (`src/appCheckKey.js`). Vide : App Check est désactivé. |
| `VITE_USE_EMULATORS=1` | Connecte le site aux émulateurs Firebase locaux (Firestore sur `127.0.0.1:8080`) au lieu de la production, et désactive App Check. |
| `VITE_APP_URL`, `VITE_APK_URL` | Facultatives : adresse de l'app web et de l'APK Android (`src/utils/appLinks.js`). |

Pour ne rien écrire dans la base de production pendant le développement, démarrez les émulateurs (voir plus bas) puis lancez `VITE_USE_EMULATORS=1 npm run dev`.

## Application mobile

L'app est dans `mobile/` (Expo SDK 57, Expo Router).

```sh
cd mobile
npm install
npm start          # ou npm run android / ios / web
```

- Le site et l'app partagent le code de `src/` ; les dépendances importées par ce code sont résolues depuis `mobile/node_modules`.
- `EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_KEY` : clé reCAPTCHA Enterprise pour App Check sur l'app web. `EXPO_PUBLIC_API_ORIGIN` : adresse de l'API (par défaut le site de production). `EXPO_PUBLIC_VAPID_PUBLIC_KEY` : la même clé publique que `VAPID_PUBLIC_KEY`, active les notifications de l'app web. `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost` : connexion aux émulateurs.
- Builds avec EAS Build (`mobile/eas.json`) : profils `development`, `preview` (APK interne) et `production`. Les notifications push Android utilisent `google-services.json` (fichier local ou variable de fichier EAS `GOOGLE_SERVICES_JSON`).
- Mises à jour OTA (EAS Update, `runtimeVersion` par empreinte) : le canal `preview` reçoit les mises à jour, par exemple `npx eas update --channel preview` depuis `mobile/`.
- L'app web est exportée par `npx expo export -p web` (voir `mobile/vercel.json`) et déployée comme un projet Vercel distinct dont le dossier racine est `mobile/`.
- Régénération des données embarquées : `npm run build:countries`, `build:flags` et `build:silhouettes` (dans `mobile/`).

## API (`api/`)

Fonctions serverless Vercel déployées avec le site.

| Fonction | Rôle |
| --- | --- |
| `POST /api/invite-push` | Envoie la notification push d'une invitation à un salon (jeton Firebase de l'invitant requis). |
| `GET /api/cleanup-expired` | Supprime les salons, invitations et sondes expirés. Appelée chaque jour à 4 h par Vercel Cron (`vercel.json`). |

Variables d'environnement du projet Vercel du site :

- `FIREBASE_SERVICE_ACCOUNT` : contenu JSON de la clé de compte de service Firebase.
- `EXPO_ACCESS_TOKEN` : facultatif, si la sécurité renforcée des push Expo est activée.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` : clés Web Push (`npx web-push generate-vapid-keys`), pour les notifications de l'app web installée sur l'écran d'accueil (iPhone : iOS 16.4+, sans App Store). `VAPID_SUBJECT` : facultatif, `mailto:` ou URL de contact (par défaut le site).
- `CRON_SECRET` : chaîne aléatoire longue ; Vercel l'envoie en `Authorization: Bearer` à la tâche cron.

Face aux émulateurs, `FIRESTORE_EMULATOR_HOST` (et `FIREBASE_AUTH_EMULATOR_HOST` pour `invite-push`) remplacent la clé. Ne commitez jamais de clé de compte de service.

## Firestore

- `firestore.rules` : règles de sécurité. Les plafonds de score (`validScore`, `validAscension`, `validDaily`) sont générés à partir du code et des données par `scripts/scoreCaps.mjs` :
  - `node scripts/scoreCaps.mjs` affiche les plafonds ;
  - `node scripts/scoreCaps.mjs --check` échoue si les tables des règles diffèrent ;
  - `node scripts/scoreCaps.mjs --write` les réécrit dans `firestore.rules`.
- `firestore.indexes.json` : index composites (classements limités aux 100 meilleurs scores).
- `.firebaserc` : projet Firebase par défaut (`geogame-sdmm`).
- Déploiement en ligne de commande (une fois `npx firebase login` fait). Chaque script lance d'abord `npm test` puis les tests des règles sur les émulateurs (`npm run test:emulator`), et ne déploie que si tout passe :

  ```sh
  npm run deploy:indexes     # firestore.indexes.json
  npm run deploy:rules       # firestore.rules
  npm run deploy:firestore   # les deux
  ```

  Les tests sur émulateurs demandent Java dans le `PATH` ; sous Windows, avec un JDK Adoptium (Git Bash) :

  ```sh
  J=$(ls -d "/c/Program Files/Eclipse Adoptium/"*/bin | head -1)
  JAVA_TOOL_OPTIONS='-Djdk.net.unixdomain.tmpdir=C:Users<toi>jtmp' PATH="$J:$PATH" npm run deploy:rules
  ```

  (`JAVA_TOOL_OPTIONS` contourne un chemin de socket trop long avec les émulateurs ; adaptez le dossier, qui doit exister.)
- Ordre de déploiement : **index d'abord, code ensuite**. Un nouveau classement qui demande un index non construit échoue (« The query requires an index »), et un index met quelques minutes à se construire : `npm run deploy:indexes`, attendre que la console Firebase (Firestore > Index) les affiche « Activé », puis déployer le site / l'app. Les règles peuvent partir avant ou avec le code, mais jamais après un code qui écrit ce qu'elles refuseraient encore (l'APK 1.0.1 continue d'écrire avec l'ancien code : les règles restent compatibles avec lui).
- Pseudos injurieux : le filtre est `src/utils/profanity.js` (liste dans `src/data/bannedWords.json`, français, anglais, russe ; mots à bloquer partout ou seulement comme mot entier pour éviter les faux positifs type « Scunthorpe »). Il est appliqué côté client (comptes, pseudos de visiteur des classements, pseudos de salon) site et app. Les règles n'en ont qu'une version minimale (`cleanName`, quelques insultes explicites en orthographe simple, sans normalisation : RE2 ne sait pas gérer accents ni leetspeak) ; c'est une dernière barrière, pas la protection.
- Signalements : un joueur (connecté ou visiteur) signale un score depuis le petit drapeau à côté d'un nom des classements (site et app). Cela crée `reports/{auteur}_{collection}_{idDuScore}` (création seule, motif dans une liste fermée, texte de 200 caractères au plus ; un seul signalement par auteur et par score). Personne ne peut les lire côté client. Pour les consulter : console Firebase > Firestore > `reports` (le champ `targetCollection`/`targetId` donne le score ; supprimez le document du score dans sa collection `scores`, `ascension_scores` ou `daily_scores`, puis les signalements), ou `scripts/reports.mjs` :

  ```sh
  node scripts/reports.mjs                                   # liste les signalements, par score
  node scripts/reports.mjs --delete-score scores/<id>        # simulation (par défaut)
  node scripts/reports.mjs --delete-score scores/<id> --apply   # supprime le score et ses signalements, après confirmation
  node scripts/reports.mjs --dismiss scores/<id> --apply     # supprime seulement les signalements
  ```

  Identifiants : `--key serviceAccount.json`, ou `FIREBASE_SERVICE_ACCOUNT`, ou les identifiants par défaut de gcloud ; face aux émulateurs, `FIRESTORE_EMULATOR_HOST` suffit.

## Données géographiques

Le jeu de données complet est `src/data/countriesWithDifficulty_FR.json` (environ 90 Mo) ; il n'entre jamais dans le bundle. `node scripts/build-geo-data.mjs [tolérance en mètres]` le découpe en `src/data/countries.meta.json` (propriétés, chargé avec le site) et `src/data/countries.geo.json` (géométries simplifiées, chargées à la demande). `vite.config.mjs` redirige les imports du jeu complet vers le fichier de propriétés.

Scripts d'enrichissement du jeu complet (rarement utiles) : `scripts/difficulte.py`, `enrich_continent.py`, `enrich_iso_a2.py`, `enrich_population.py` (Python), `add-gdp-data.cjs`, `populate-capitals.js`, `generate-borders.mjs` (Node). Autres : `scripts/seedEmulator.mjs` (deux comptes de test dans les émulateurs), `scripts/purgeAnonymousScores.mjs` (purge ponctuelle, nécessite une clé de compte de service) et `scripts/reports.mjs` (signalements, voir Firestore).

## Émulateurs et tests

```sh
npm test                 # tests unitaires (vitest, jsdom), dont scripts/*.test.mjs
npm run emulators        # émulateurs Firestore (8080) et Auth (9099)
npm run test:emulator    # tests des règles et de l'API sur les émulateurs
npm --prefix mobile run typecheck
npm --prefix mobile run lint
npm run test:mobile      # tests de l'app (jest-expo), équivalent de `cd mobile && npx jest`
```

Les émulateurs Firebase demandent un JDK (Java) installé et accessible dans le `PATH`.

Les tests de l'app (`mobile/src/**/*.test.ts`, config dans `mobile/jest.config.js`) couvrent la logique pure : jeux, classements, salons multijoueurs. Ils reprennent les alias de `metro.config.js` (`@/`, `@shared/` vers `../src`, shims) et le jeu de pays allégé de l'app. Il n'y a volontairement pas de script `test` dans `mobile/package.json` : `@expo/fingerprint` hache les scripts de ce fichier, et en ajouter un changerait la version de runtime du binaire (donc les mises à jour OTA de l'APK installé). Le script `test:mobile` est à la racine pour cette raison. Les tests du site (vitest) ignorent `mobile/`.

## Intégration continue

`.github/workflows/ci.yml` s'exécute sur chaque pull request et sur chaque push vers `dev` et `master` (un nouveau push annule le run en cours sur la même branche). Quatre jobs en parallèle, sans aucun secret :

| Job | Commandes |
| --- | --- |
| `site` | `npm ci`, `npm test` |
| `build` | `npm ci`, `npm run build` (les variables `VITE_*` sont facultatives) |
| `emulator` | Java 21 (Temurin), `npm ci`, `npm run test:emulator` (émulateurs en cache) |
| `mobile` | `npm ci` dans `mobile/` (seul : l'app n'a pas besoin des `node_modules` de la racine), `typecheck`, `lint`, `npx jest` |

Node 22 partout. Pour que ces contrôles bloquent réellement un merge, activer dans GitHub (Settings > Branches) une règle de protection de `master` (et `dev`) avec « Require status checks to pass » et les quatre jobs ci-dessus.

## Build et analyse du bundle

```sh
npm run build            # production, dans dist/
npm run preview          # sert dist/ localement
ANALYZE=1 npm run build  # écrit en plus dist/stats.html (treemap) et dist/stats.json
```

Sous PowerShell : `$env:ANALYZE=1; npm run build`.
