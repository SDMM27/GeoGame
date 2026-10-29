# Design : le Pays du jour (et le Quiz Géo masqué)

**Date :** 2026-10-29

## Contexte

Le Quiz Géo n'est pas assez abouti. On le **masque** (sans le supprimer) et le **Pays du jour** prend sa place parmi les
jeux du jour : on reste à 6.

Le principe : chaque jour, un même pays pour tout le monde. On le découvre en 4 étapes, puis on lit sa fiche.

1. **Frontières** : on voit sa silhouette, on devine le pays.
2. **Drapeau** : on choisit son drapeau.
3. **Capitale** : on trouve sa capitale.
4. **Placement** : on le place sur la carte du monde.
5. **Fiche** : ce qu'il faut retenir du pays.

Nom du type : `GAME_TYPES.COUNTRY_OF_DAY`. Route du site : `/country-of-the-day`. Route de l'app : `/game/country-of-the-day`.
Nom affiché : « Le Pays du jour ».

---

## 1. Avant de jouer : choix du mode

Une carte de départ propose deux modes :

| Mode | Frontières | Drapeau | Capitale | Placement |
|---|---|---|---|---|
| **Choix multiples** | 4 noms de pays | 4 drapeaux | 4 capitales | clic sur la carte |
| **Réponse libre** | saisie du nom | 8 drapeaux | saisie du nom | clic sur la carte |

- Le choix est **verrouillé pour la journée** dès la première réponse, et enregistré dans la progression locale.
  Sinon on jouerait en libre, puis on recommencerait en choix multiples après un échec.
- La réponse libre rapporte **×1,5** (voir §3).
- Le drapeau ne se tape pas. En réponse libre, la difficulté vient donc du nombre de drapeaux proposés : 8 au lieu de 4.

## 2. Les étapes

Règle commune : **3 essais par étape**. Une erreur grise le choix (ou affiche l'indice en saisie libre) et on
réessaie. Après 3 erreurs, la bonne réponse s'affiche, l'étape vaut 0 et on passe à la suite. Une étape ratée ne bloque
jamais la partie : le pays est révélé quoi qu'il arrive à la fin de l'étape 1.

### 2.1 Frontières
- Même rendu de silhouette que Border Guess (`BorderGuessReveal`).
- **Saisie libre** : même reconnaissance des noms que Border Guess (alias, 7 langues, abréviations). Une erreur affiche
  la distance et la direction, comme Border Guess. Une saisie qui ne correspond à aucun pays ne compte pas comme essai.
- **Choix multiples** : 4 pays. Les 3 leurres viennent du même continent, de taille comparable si possible, pour que la
  silhouette compte vraiment.

### 2.2 Drapeau
- Grille de 4 ou 8 drapeaux (`public/flags/<iso en minuscules>.png`).
- Les leurres ressemblent au bon drapeau : même continent en priorité, puis une difficulté de drapeau voisine
  (`DifficultyFlag`). Une liste de « drapeaux jumeaux » écrite à la main (Tchad/Roumanie, Indonésie/Monaco/Pologne,
  Irlande/Côte d'Ivoire…) est tirée en premier quand elle existe.

### 2.3 Capitale
- **Saisie libre** : même vérification que le jeu des capitales (`matchKnownAnswer` avec la capitale, ses alias et
  `getAllCapitalNames`). « Pékin » et « Beijing » sont donc tous deux acceptés.
- **Choix multiples** : 4 capitales, les leurres étant des capitales du même continent.

### 2.4 Placement
- Carte du monde sans noms. On clique sur le pays, avec **3 essais** comme dans le jeu classique (`useGameState`) :
  une erreur affiche juste « faux », sans indice de distance.
- Après 3 erreurs, la carte zoome sur le pays, qui s'affiche en rouge (même chose que `seeCountry`).
- Les très petits pays restent cliquables par leur nom dans la liste, comme dans le jeu classique.

### 2.5 Fiche
- Elle est tirée de `getCountryInfo` (`src/utils/countryInfo.js`) : drapeau, capitale, continent, population,
  superficie, densité, PIB, PIB par habitant avec leur **rang mondial**, et les pays voisins.
- On réutilise les blocs de la fiche Atlas (site `src/pages/atlas`, app `mobile/src/app/atlas.tsx`), avec un bouton
  « Voir dans l'Atlas ».
- **Version 1 sans texte rédigé.** Une phrase ou une anecdote par pays, ce sont 239 pays × 7 langues à faire relire :
  on l'ajoutera plus tard dans un fichier de données à part. La fiche s'affiche alors sans elle, sans rien casser.
- La fiche reste consultable toute la journée en revenant sur le jeu (comme la réponse de Border Guess et de Country Clue).

## 3. Score et partage

Points par étape selon l'essai où on trouve :

| Essai | Choix multiples | Réponse libre (×1,5) |
|---|---|---|
| 1ᵉʳ | 100 | 150 |
| 2ᵉ | 60 | 90 |
| 3ᵉ | 30 | 45 |
| raté | 0 | 0 |

Maximum : 400 en choix multiples, 600 en réponse libre. Un seul classement du jour, trié par score puis par temps.

Texte de partage (`shareScore.js`) :

```
🌍 Le Pays du jour · 29/10 · réponse libre
🧭 2/3 · 🏳️ 1/3 · 🏛️ 1/3 · 📍 ❌
330 pts
```

## 4. Tirage du pays

- `pickDaily(pool, 'country-of-day:<jour>', admin)` (`src/utils/dailyPick.js`), indépendant de la taille de la liste.
- Le pool contient les pays de Border Guess (`BORDER_GUESS_COUNTRIES`, donc pas de micro-États illisibles en silhouette)
  qui ont un code ISO, une capitale et un drapeau.
- On **exclut le pays de Border Guess et celui de Country Clue du même jour**. Sinon on joue deux fois le même pays.

## 5. Données enregistrées

### Progression locale
`localStorage` sous la clé `country-of-day:<jour>` : `{ mode, step, steps: [n, n, n, n], startedAt, elapsedTime, status }`.
Quand on revient, on reprend à l'étape en cours. Le hook partagé `src/hooks/useCountryOfDayState.js` sert au site et à
l'app.

### Classement du jour : `daily_scores`
Nouvelle forme, `validCountryOfDay` dans `firestore.rules` :

```
{ name, uid?, gameType: 'COUNTRY_OF_DAY', dailyKey, mode: 'choice' | 'free', steps: [int ×4], score, elapsedTime }
```

- `steps[i]` vaut le numéro de l'essai réussi (1 à 3), ou 0 si l'étape est ratée.
- Les règles **recalculent le score** à partir de `steps` et `mode` et le comparent à `score`. On ne peut donc pas
  envoyer un score incohérent.
- `elapsedTime` a un minimum, comme `challengeCaps.minTime`, ajouté à `scripts/scoreCaps.mjs`.
- Le score est enregistré même à 0, puisqu'on finit toujours la partie.

### Historique : `users/{uid}/games`
`daily_COUNTRY_OF_DAY_<jour>` avec `{ gameType, mode: 'daily', dailyKey, score, attempts, solved, elapsedTime }`.
Le mode de saisie n'est pas gardé là : `validGame` n'a pas de champ prévu, et il n'en faut pas un de plus.
`solved` = les 4 étapes réussies.

### Liste des jeux du jour
- `DAILY_GAME_TYPES` (`profileStats.js`) : `QUIZ` est remplacé par `COUNTRY_OF_DAY`.
- `DAILY_GAME_SINCE[COUNTRY_OF_DAY]` = jour du lancement, et `DAILY_GAME_UNTIL[QUIZ]` (nouveau) = veille du lancement.
  Les journées complètes déjà faites avec le quiz restent valides.

## 6. Missions, badges, XP

- Mission `daily_quiz` → `daily_country_of_day` (« Joue le Pays du jour »).
- Nouvelles missions : « Trouve le pays du jour du premier coup » et « Fais un sans-faute au Pays du jour ».
- Badges proposés : « Globe-trotter » (pays du jour joués : 7 / 30 / 100) et « Sans faute » (4 étapes au 1ᵉʳ essai).
- XP : le Pays du jour est un jeu du jour comme les autres et rapporte la même XP par partie.
- **Pas de fragment de drapeau** à la fin de la partie : seuls les missions et les niveaux en donnent, et c'est le
  serveur qui les écrit. Les missions ci-dessus en rapportent déjà indirectement.

## 7. Masquer le Quiz Géo

Il n'existe pas encore de système pour masquer un jeu. On crée `src/utils/gameAvailability.js` :
`HIDDEN_GAME_TYPES = [GAME_TYPES.QUIZ]` et `isGameHidden(type)`.
- C'est un module pur, en ESM, sans Firebase ni `import.meta.env`, pour que trois cibles puissent le lire : le site,
  l'app (via `@shared`) et l'API (Node, qui importe déjà `missions.js`).
- Pas de variable d'environnement : Vite, Expo et Node ne les lisent pas de la même façon.

**Principe : on filtre là où les jeux sont *listés*, on ne retire rien des catalogues.** L'historique, les anciens
salons, les profils et plusieurs `find(...)!` ont toujours besoin des métadonnées du quiz. Ses fichiers sont aussi importés
par le Challenge du jour et la Survie (`pages/quiz/constants`, `QuizPage.css`) : on ne les supprime jamais.

### 7.1 Ce qui change

**Site**
- Accueil : `src/pages/home/gameData.js:157` → `active: !isGameHidden(QUIZ)`. La carte du Pays du jour prend sa place.
- Multijoueur : filtrer `ROOM_GAMES` à l'affichage dans `MultiplayerHomePage.jsx:88` et `RoomConfig.jsx:191`, mais
  pas dans `roomGames.js`. `typeOf()` n'a pas de garde contre l'absence. Les salons déjà créés continuent de fonctionner.
- Route `/quiz` : garde dans `QuizPage.jsx`, qui redirige vers `/country-of-the-day` (thème Histoire compris, voir 7.2).
- SEO : retirer `/quiz` de `src/seo/seoPages.js:22` **et** de `vercel.json:12` en même temps (`seo.test.jsx` vérifie
  qu'ils concordent). On y ajoute `/country-of-the-day`.

**App**
- `mobile/src/games.ts` : l'entrée QUIZ reste, mais on filtre avec `isGameHidden` dans l'accueil
  (`(tabs)/index.tsx:18`), les classements (`(tabs)/leaderboards.tsx:49`) et `MULTI_GAMES` (`games.ts:167`).
- `app/game/quiz.tsx` reste joignable par URL : `<Redirect>` au début de l'écran.
- Notifications : `notifications/push.ts:83` traite le quiz masqué comme introuvable. `public/sw.js:33` (fichier
  autonome) : retirer `QUIZ` de `DAILY_ROUTES` et ajouter la route du Pays du jour.

**Logique partagée**
- Jeux du jour : `DAILY_GAME_UNTIL[QUIZ]` (§5). Il ne faut **pas** filtrer `DAILY_GAME_TYPES` directement : la cible du badge
  `daily_sweep` baisserait et les anciennes journées complètes deviendraient fausses.
- Missions (`missions.js`) : retirer les familles des jeux masqués **avant** `seededShuffle`, dans `DAILY_POOL` et dans
  les tirages hebdomadaires.
  - Le serveur (`api/_lib/xp.mjs`) et les clients lisent ce même fichier, ils restent donc d'accord entre eux.
  - Le tirage du jour change pour tout le monde : **déployer autour de minuit (heure de Paris)**, sinon le bonus du jour
    peut devenir impossible pour ceux qui ont déjà avancé.
  - `week_types_10` (10 types de jeux différents) devient plus dur : sa cible est à revoir.
- Badges (`achievements.js`) :
  - Dans `computeAchievements`, on masque les badges du quiz **encore verrouillés** : `quiz_flawless`, `quiz_streak_10`,
    `quiz_streak_25` et `no_hint` (qui ne concerne que le quiz malgré son nom). On ne les retire pas
    d'`ACHIEVEMENTS` : `badges.js` effacerait sans bruit les badges déjà mis en avant par les joueurs.
  - `all_games` : on exclut les types masqués de la cible, sinon le badge devient impossible.
- API : `api/_lib/dailyNudge.mjs:119` refuse les relances sur un jeu masqué. `NUDGE_GAMES` reçoit `COUNTRY_OF_DAY`.

**On ne touche pas à**
- Les règles Firestore du quiz (`dailyAttempts.QUIZ`, `dailyHints.QUIZ`) : d'anciennes versions de l'app peuvent encore
  enregistrer un score.
- `shareScore.js`, `challenge.js`, le code des salons et `useDailyPlayedElsewhere` : ils ne servent que depuis le jeu
  lui-même, ou de façon générique.

### 7.2 Tout le quiz est masqué (décision du 2026-10-29)
Le quiz disparaît **partout**, thème Histoire et manches de Survie compris. Le code reste en place pour pouvoir le
réactiver.

- **Quiz Histoire** (un thème du même jeu) :
  - On retire le bouton « Me tester sur son histoire » de la fiche Atlas (`src/pages/atlas/CountrySheet.jsx:95`,
    `mobile/src/app/atlas.tsx:207`).
  - `/quiz` et `/game/quiz` redirigent quel que soit le thème.
- **Survie** :
  - `SURVIVAL_ROUND_TYPES` devient `ALL_SURVIVAL_ROUND_TYPES.filter((type) => !isGameHidden(type))`, et
    `ALL_SURVIVAL_ROUND_TYPES` garde la liste complète.
  - Le quiz sort des réglages, du tirage des manches et de la clé « tous les jeux »
    (`PLACEMENT+FLAGS+CAPITALS+BORDER_GUESS`).
  - Le classement « tous les jeux » et toutes les combinaisons avec QUIZ **repartent de zéro**. C'est accepté. Les
    combinaisons sans quiz (`FLAGS+CAPITALS`…) gardent leurs scores, puisque leur clé ne change pas.
  - Les règles refusent les nouveaux scores avec QUIZ : on retire QUIZ de `validSurvivalModes` (`firestore.rules:831`).
  - Ménage : un script `scripts/purgeQuizSurvivalScores.mjs`, sur le modèle de `purgeAnonymousScores.mjs`, supprime les
    entrées `survival_scores` dont `modes` contient QUIZ. Il tourne en `--dry-run` d'abord, puis pour de vrai après accord.
  - Anciens liens et salons de Survie : `normalizeSurvivalModes` retire déjà les types inconnus. Si la liste devient vide
    (un salon « QUIZ seul »), on retombe sur les réglages par défaut au lieu de planter.
  - Le tableau de la Survie multijoueur et le spectateur (`SurvivalRounds`, `Spectator`) affichent encore les anciennes
    manches QUIZ d'une partie en cours. Ils lisent donc `ALL_SURVIVAL_ROUND_TYPES`.

### 7.3 Tests à mettre à jour
- `mobile/src/games.test.ts` : listes du jour et multijoueur.
- `src/utils/profileStats.test.js`, `achievements.test.js` et `ProfileView.test.jsx` : journées complètes avec ou sans quiz.
- `src/seo/seo.test.jsx` : plan du site.
- `missions.test.js` reste valide si le filtre ne s'applique qu'au tirage.
- Survie : `survival.test.js`, `useSurvivalState.test.js` et `Spectator.test.jsx` (types de manches et clé « tous les
  jeux »), plus `roomRules.test.mjs` et `scoreRules.test.mjs` côté émulateur (`validSurvivalModes`).
- Tests émulateur : `dailyNudge.test.mjs` (boucle sur `NUDGE_GAMES`) et `scoreRules.test.mjs` (nouvelle forme
  `COUNTRY_OF_DAY`).

## 8. Ordre de livraison

1. Règles Firestore (`validCountryOfDay`, plafonds `scoreCaps`) : `npm run deploy:rules` **avant** les clients.
2. API : `dailyNudge` / `dailyReminder` connaissent le nouveau type, et le quiz n'y figure plus.
3. Hook partagé et tests unitaires : tirage, leurres, score, reprise de partie.
4. Page du site, puis écran de l'app.
5. Masquage du quiz, missions, badges, traductions (fr et en d'abord, les autres à faire relire). Déployer autour de
   minuit (heure de Paris) à cause des missions (§7.1).

## Points à valider

- Le multiplicateur ×1,5 et le barème 100/60/30.
- 8 drapeaux en réponse libre.
- La liste des « drapeaux jumeaux » écrite à la main.
- Le nom technique de la route (`/country-of-the-day`).
- ~~Quiz Histoire et manches de Survie~~ : tranché, tout le quiz est masqué et les classements de Survie avec quiz
  repartent de zéro (§7.2).
