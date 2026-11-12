# GeoGame Mobile

Application mobile (et export web) de GeoGame, en [Expo](https://expo.dev) avec Expo Router. Le code de jeu partagé vient de `../src` ; voir le [README racine](../README.md) pour l'architecture, les variables d'environnement, les builds EAS et les mises à jour OTA.

## Démarrage

```bash
npm install
npm start          # ou npm run android / ios / web
```

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run lint` | ESLint (`expo lint`) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run build:countries` | Régénère les données pays embarquées |
| `npm run build:flags` | Régénère les drapeaux embarqués |
| `npm run build:silhouettes` | Régénère les silhouettes de pays |

## Publication Google Play

Le workflow GitHub **Google Play Release** construit un AAB à chaque push sur
`master` qui modifie l'app ou son code partagé, même si le runtime natif ne change
pas. Il utilise les identifiants Android et la clé Google Play conservés sur EAS,
ainsi que le secret GitHub `EXPO_TOKEN`.

Le build utilise le profil `production`, puis est envoyé automatiquement au
**test interne** avec le profil d'envoi `play-internal`. Le nom du profil de build
ne détermine pas la piste Google Play. Les OTA du workflow **EAS Update** continuent
en parallèle. Chaque changement déclenche donc un build EAS supplémentaire.

Lorsque Google a accordé l'accès à la production, définir la variable du dépôt
GitHub `PLAY_PRODUCTION_ENABLED` à `true` (Settings → Secrets and variables →
Actions → Variables). Les nouveaux builds sont alors aussi soumis à la piste
**production** avec le profil d'envoi `production`, sans seconde compilation.
Sans cette variable, seule la piste interne reçoit les builds.

Pour les comptes personnels créés après le 13 novembre 2023, l'accès à la
production nécessite au moins 12 testeurs inscrits au **test fermé** pendant
14 jours consécutifs, puis l'approbation de la demande par Google. Le test interne
ne remplit pas cette condition : créer la piste fermée et y inscrire les testeurs
dans la Play Console. Voir les [conditions Google](https://support.google.com/googleplay/android-developer/answer/14151465?hl=fr).

Le résumé du workflow contient le lien de suivi EAS. Un build réussi ne confirme
pas à lui seul la publication : vérifier aussi le résultat de la soumission et
les éventuelles validations demandées dans la Play Console.
