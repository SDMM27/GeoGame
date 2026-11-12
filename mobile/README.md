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

Le workflow **EAS Update** publie les mises à jour OTA des changements de l'app
et du code partagé. À runtime natif identique, les changements JavaScript et UI
arrivent par OTA aux applications compatibles, sans nouveau build AAB.
Un lancement manuel limité au canal preview ne déclenche pas de publication Play.

Après l'OTA production, le workflow réutilisable **Google Play Release** recherche
les builds Android du profil `production` pour ce runtime. Il ne construit un AAB
avec soumission automatique que si aucun build compatible terminé avec une archive,
ni aucun build en attente ou en cours, n'existe. Un nouveau runtime natif déclenche
donc un build ; les builds déjà en file sont dédupliqués. Les builds en erreur ou
annulés permettent une nouvelle tentative ; un statut inconnu bloque la détection.
Il utilise les identifiants Android et la clé Google Play conservés sur EAS,
ainsi que le secret GitHub `EXPO_TOKEN`.

Par défaut, le build utilise le profil `production` et le profil d'envoi
`play-alpha` pour les **tests fermés Alpha**. Le nom du profil de build ne détermine
pas la piste Google Play.

Lorsque Google a accordé l'accès à la production, définir la variable du dépôt
GitHub `PLAY_PRODUCTION_ENABLED` à `true` (Settings → Secrets and variables →
Actions → Variables). Lorsqu'un runtime nécessite un nouveau build natif, deux
builds du même code sont alors construits et soumis : tests fermés Alpha et piste
**production** (profil d'envoi `production`). Chaque piste reçoit un code de
version distinct. La décision est prise une seule fois avant ces deux builds.
Activer cette variable pour un runtime existant ne reconstruit pas l'app :
promouvoir manuellement la version existante dans la Play Console.

Pour les comptes personnels créés après le 13 novembre 2023, l'accès à la
production nécessite au moins 12 testeurs inscrits au **test fermé** pendant
14 jours consécutifs, puis l'approbation de la demande par Google. Le test interne
ne remplit pas cette condition : créer la piste fermée et y inscrire les testeurs
dans la Play Console. Voir les [conditions Google](https://support.google.com/googleplay/android-developer/answer/14151465?hl=fr).

Un AAB déjà téléversé sur une autre piste peut être ajouté à Alpha depuis la
bibliothèque dans la Play Console, sans téléverser à nouveau le même code de version.

Le résumé du workflow contient le lien de suivi EAS. Un build réussi ne confirme
pas à lui seul la publication : vérifier aussi le résultat de la soumission et
les éventuelles validations demandées dans la Play Console. Un build compatible
ne prouve ni son installation ni l'acceptation de sa soumission par Google Play.
En cas d'échec de soumission lié aux identifiants ou aux autorisations Play,
corriger ces paramètres et relancer la soumission du build existant, sans
reconstruire l'app : les autorisations de publication sont indépendantes du runtime.
