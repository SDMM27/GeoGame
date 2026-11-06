# Plan : faire de GeoGame la référence pour apprendre la géographie

**Date :** 2026-11-05, sur la branche `dev` (commit `daa21d2`).
**Usage :** chaque lot de la section 6 est autonome. Dans une nouvelle conversation : « Fais le lot L4 de
`docs/plan-reference-apprentissage.md` ». Le lot indique ses dépendances, ses fichiers et ses critères de fin.

Échelles utilisées :
- **Priorité :** P0 bloquant (à faire avant d'ouvrir le jeu à un large public) → P1 cœur de la promesse « on retient
  vraiment » → P2 élargissement → P3 bonus.
- **Effort :** S (≤ 1 jour), M (2 à 4 jours), L (1 à 2 semaines), XL (plus de 2 semaines). Estimations pour une
  conversation Claude Code + relecture humaine, tests compris.

---

## 1. Périmètre et méthode

**Lu :** `README.md`, `docs/roadmap-lancement.md` (il n'y a pas de fichier `ROADMAP` à la racine : c'est la feuille de
route), `docs/plan-fonctionnalites.md`, `docs/plan-parchemins.md`, `docs/parchemins-sources.md` et les 16 specs de
`docs/superpowers/specs/`. Code parcouru : `src/` (hooks, utils, pages), `mobile/src/`, `api/`, `firestore.rules`,
`vercel.json`, CI.

**Non vérifié** (à garder en tête, chaque point est repris dans un lot) :
- Rien n'a été lancé : pas de partie jouée sur le site, l'app ou un téléphone. L'avis sur l'ergonomie vient du code.
- **Plan Firebase** réel (Spark ou Blaze) et volumes d'écritures actuels : seule la doc parle de Spark.
- **Plan Vercel** (Hobby ou Pro) : il conditionne la fréquence des crons et le nombre de fonctions (11 dans `api/`).
- **`Intl.DisplayNames` sous Hermes** (app Android/iOS native) : voir L0.
- Nombre de joueurs, rétention et usage réels : aucune donnée n'est collectée (voir L1). La seule indication est
  « environ 7 comptes dans le classement au 2 novembre » (`docs/plan-parchemins.md:25`).
- Qualité des traductions (es/pt/de/it/ru/uk/nl) : seules les clés ont été comptées.

---

## 2. État des lieux

### 2.1 Ce qui marche (solide, à préserver)

- **Variété de modes, partagée site + app** : Trouver le pays, Hardcore (sans frontières), Drapeaux, Drapeau incomplet,
  Capitales, Ascension, Border Guess, Country Clue, Voyage Voyage, Classement de pays, Pays du jour, Défi du jour,
  Survie, salons multijoueurs (7 jeux) avec spectateur. La logique de jeu est partagée (`src/hooks` via `@shared`) :
  aucun jeu n'est codé deux fois.
- **Boucle quotidienne riche** : 6 jeux du jour identiques pour tous (`src/utils/dailyGames.js`, tirage déterministe
  `src/utils/dailyPick.js`), Défi du jour à difficulté croissante du lundi au dimanche, série (streak) calculée côté
  serveur, missions du jour et de la semaine, XP et niveaux, fragments de drapeaux, parchemins, ligue hebdomadaire,
  badges, Elo saisonnier, amis, relances « viens me battre », rappels push.
- **Intégrité correcte pour un jeu gratuit** : XP, fragments, Elo, ligue écrits par le serveur seul ; plafonds de score
  générés depuis le code (`scripts/scoreCaps.mjs`) ; règles Firestore testées sur émulateurs (16 fichiers).
- **Qualité d'ingénierie** : CI à 4 jobs, ~137 fichiers de tests, error boundaries, RGPD (suppression de compte, pages
  légales en 9 langues), Inter auto-hébergée, App Check.
- **i18n** : 9 langues d'interface, 1306 clés présentes partout ; noms de pays via `Intl.DisplayNames` + surcharges ;
  capitales traduites (`src/data/capitalNames.json`) ; réponses acceptées dans toutes les langues + alias.
- **Contenu de culture** : Atlas avec fiche pays (capitale, population, superficie, PIB, voisins, difficulté),
  12 parchemins historiques et 5 cartes d'empires interactives.

### 2.2 Ce qui est cassé ou risqué

| # | Constat | Preuve | Impact |
|---|---|---|---|
| C1 | Fuseau horaire **Europe/Paris codé en dur** pour tout le monde : jour, semaine, saison, ligue | `src/utils/dailyKey.js:7`, dupliqué dans `missions.js:169`, `eloRating.js:81`, `api/_lib/dailyReminder.mjs:8`, `api/_lib/elo.mjs:58` | À Tokyo le jour change à 8 h, à Los Angeles à 15 h : série et missions incompréhensibles hors Europe |
| C2 | **Rappel quotidien à 16 h UTC pour tous** | `vercel.json` (cron `0 16 * * *`) | 1 h du matin à Tokyo, 8 h à San Francisco : notification au mauvais moment = désinstallation |
| C3 | **Ligue = un seul classement mondial** dans un document (5 000 joueurs max), seul le 1er gagne un sceau | `api/_lib/weeklyTop.mjs:25,91,126` ; `docs/plan-parchemins.md:25` | Avec 1 000 joueurs, 999 n'ont aucune chance : la ligue démotive au lieu de motiver. Document Firestore limité à 1 Mio |
| C4 | Classements du jour **sans limite** : toute la journée est lue | `src/utils/saveScore.js:164-193` | Lectures en O(joueurs du jour) à chaque affichage |
| C5 | Rappel quotidien lit **toute** la collection `pushTokens` puis l'historique de chacun | `api/_lib/dailyReminder.mjs:25-62`, pas de `maxDuration` | Timeout de la fonction au-delà de quelques milliers de joueurs |
| C6 | Coût en écritures : présence toutes les 2 min + **2 documents par pays répondu** dans `/api/elo` (`eloQuestions`, `eloGains`) | `src/utils/presence.js:10`, `api/_lib/elo.mjs:149,157` | Sur Spark (20 000 écritures/jour), quelques centaines de parties par jour suffisent à saturer |
| C7 | **Noms de pays possiblement en français dans l'app native** hors français | `getCountryName` s'appuie sur `Intl.DisplayNames` (`src/utils/getCountryName.js:29`), aucun polyfill dans `mobile/src/polyfills.ts` ; repli sur `p.ADMIN` (français) dans `mobile/src/app/game/capitals.tsx:22` etc. | Non vérifié sur appareil. Si Hermes ne l'implémente pas : l'app est en partie française pour un Anglais, et les réponses tapées en anglais pourraient être refusées |
| C8 | `dailyKey` d'un score du jour seulement validé comme libellé | `firestore.rules:831` | Un client peut écrire un score pour un autre jour (la ligue ignore les jours futurs, pas les classements) |
| C9 | Badge `night_owl` en heure locale, tout le reste en heure de Paris | `src/utils/achievements.js:75` | Incohérence mineure |
| C10 | Clés de données en français (`'Facile'`, `'Asie'`, `countriesWithDifficulty_FR.json`) | `src/utils/leaderboards.js:12`, `firestore.rules` ~387-476 | Pas un bug visible, mais freine les contributeurs non francophones |
| C11 | Commentaire « TO FILL IN » obsolète (les champs sont remplis) | `src/legal/legalInfo.js:2` | Cosmétique |

### 2.3 Ce qui manque — le constat central

**GeoGame est aujourd'hui un excellent jeu de *test* de géographie, pas encore un outil d'*apprentissage*.**
Vérifié dans le code :

1. **Aucune mémoire de ce que le joueur sait.** `users/{uid}/games` ne stocke que des totaux par partie
   (`src/utils/gameHistory.js:1-10`). `mastery/{uid}` ne garde que les pays trouvés du premier coup, pour un badge. Les
   Elo par pays (`eloQuestions`) sont écrits mais jamais relus. Le serveur reçoit pourtant déjà, à chaque partie, la liste
   `{ country, found, errors }` (`api/_lib/elo.mjs:71-84`) : la donnée existe, elle est jetée.
2. **Aucune répétition espacée, aucune révision des erreurs.** Le choix des questions est `Math.random` sur un palier
   statique (`src/hooks/useGameState.js:84-96`, idem drapeaux, capitales) ou un tirage daté. Un pays raté n'a pas plus
   de chances de revenir demain qu'un pays connu.
3. **Feedback d'erreur pauvre.** En Trouver le pays, un mauvais clic affiche « Faux ! » sans nommer le pays cliqué
   (`useGameState.js:369`) ; la réponse n'est montrée qu'après 3 erreurs. Aucun mode n'explique (voisins, repère,
   moyen mnémotechnique, symbolique du drapeau) sauf la fiche du Pays du jour.
4. **Pas d'apprentissage guidé.** Aucun parcours « découvrir l'Afrique de l'Ouest en 5 pays », aucune phase d'étude
   avant le test. L'Atlas existe mais n'est relié qu'au Pays du jour ; l'histoire des pays ne couvre que FR, US, JP
   (`src/data/countryHistory.json`).
5. **Pas d'accueil.** Ni tutoriel, ni test de positionnement : un débutant choisit seul une difficulté.
6. **Récompenses déconnectées de l'apprentissage.** XP = 10 par partie (jouée, pas réussie), fragments et sceaux
   récompensent l'assiduité, jamais la maîtrise d'une région. La motivation extrinsèque est forte ; le lien « je
   progresse vraiment » est invisible.
7. **Aucune mesure.** Ni événements, ni rétention D1/D7/D30, ni suivi des plantages (seulement Vercel Analytics,
   `src/App.jsx:94`). Impossible de savoir si une amélioration marche.
8. **Contenu limité aux pays.** Les fleuves, montagnes, lacs, déserts, îles (`src/data/geoFeatures.js`) ne sont jouables
   que dans le Quiz, masqué partout (`src/utils/gameAvailability.js:7`) : ils sont aujourd'hui **inaccessibles**. Pas de
   subdivisions (États américains, régions), de villes, de mers et océans.
9. **Accessibilité.** Vert `#3DDC97` / rouge `#FF7A6B` (`src/utils/mapColors.js:3-12`) : confusion pour ~8 % des
   hommes (deutéranopie). Les jeux à clic sur carte ne se jouent pas au clavier sur le site.
10. **Pas de mode classe / enseignant**, alors que l'école est le premier canal d'un outil « de référence ».

---

## 3. Specs qui supposent un usage personnel ou un seul utilisateur

| Spec / doc | Hypothèse | Pourquoi ça casse à plusieurs | Comment la lever | Lot |
|---|---|---|---|---|
| `plan-fonctionnalites.md` §1 et « Décisions » : défis à « minuit à Paris » ; `2026-10-29-pays-du-jour-design.md` : « déployer autour de minuit (heure de Paris) » | Les joueurs sont en France | Hors Europe, le jour de jeu est décalé de 6 à 10 h ; le déploiement « à minuit » n'existe pas pour un public mondial | Jour local du joueur (comme Wordle), puzzle identique par date ; changements de tirage versionnés par date d'effet au lieu d'un déploiement à heure fixe | L5 |
| `plan-parchemins.md` §2 : sceau au seul vainqueur « avec environ 7 comptes » | Petite communauté qui se connaît | Avec N joueurs, la probabilité de gagner tend vers 0 | Ligues par divisions de 30 (promotion/relégation) ; sceau au podium de chaque division | L6 |
| `weeklyTop.mjs` (ligue unique, 5 000 joueurs dans un document) | Quelques dizaines de joueurs | Limite de 1 Mio par document ; classement mondial sans enjeu pour la majorité | Divisions, un document par division | L6 |
| `plan-fonctionnalites.md` « Suivi restant » : présence toutes les 2 min sur le quota Spark | Peu de joueurs connectés | Le quota gratuit est saturé vite | Présence à la demande (seulement quand la liste d'amis est ouverte) ou Realtime Database ; budget Blaze avec alertes | L0 |
| `README.md` « Signalements » et scripts `reports.mjs`, `purge*.mjs` avec `--key serviceAccount.json` | Un seul admin, en ligne de commande | Pas de modération à plusieurs, pas de trace | Rôle `admin` (custom claim) + petite page de modération ; journal des actions | L15 |
| `2026-04-29-i18n-design.md` : traductions « générées par IA, à corriger manuellement » | L'auteur relit | Personne ne relit les 7 autres langues | Processus de relecture native (Crowdin/Weblate gratuit pour l'open source, ou testeurs par langue) | L12 |
| `2026-04-15-ranking-game-design.md`, `pays-du-jour` : progression du jour en `localStorage` | Un appareil par joueur | Un joueur connecté qui change d'appareil peut rejouer ou perdre sa partie | Pour les comptes, reprise depuis `daily_scores`/historique, `localStorage` en cache seulement | L5 |
| `2026-05-08-share-score-design.md` : pseudo en `localStorage`, « Anonyme » par défaut | Usage personnel | Mineur | Prendre le pseudo du compte quand il existe (à vérifier : peut-être déjà fait) | — |
| `src/legal/legalInfo.js` : éditeur et e-mail personnels | Éditeur individuel | Normal pour un particulier ; à changer si une structure reprend le projet | Garder, mais centraliser (déjà fait) | — |

---

## 4. Diagnostic pédagogique et cible

### 4.1 Ce que dit la science de la mémorisation, appliqué ici

- **Rappel actif** : se forcer à retrouver (taper un nom, cliquer sur la carte) ancre mieux que reconnaître parmi des
  choix. GeoGame le fait déjà bien (réponses libres, carte). À garder ; les QCM servent de marchepied aux débutants.
- **Répétition espacée** : revoir un élément juste avant de l'oublier (intervalles croissants : 1 j, 3 j, 7 j, 16 j…).
  C'est le levier n°1 de rétention à long terme, absent aujourd'hui. Algorithme recommandé : **FSRS** (libre,
  meilleur que SM-2) ou un **Leitner à 6 boîtes** pour démarrer simple.
- **Feedback immédiat et élaboré** : après une erreur, montrer *où* est la bonne réponse et *pourquoi* on aurait pu la
  trouver (voisin connu, repère) double l'effet de correction.
- **Découpage (chunking) et entrelacement** : apprendre par petits groupes géographiques (5 à 7 pays voisins), puis
  mélanger les régions dans les révisions.
- **Difficulté désirable** : viser ~85 % de réussite. Trop facile = ennui, trop dur = abandon. Les paliers statiques
  ne le permettent pas ; l'historique du joueur, si.
- **Encodage multiple** : un pays = forme + position + drapeau + capitale + voisins. Les modes existent séparément ;
  il faut les relier sur un même « élément de connaissance ».

### 4.2 Ce que font les références

- **Duolingo** : séance du jour courte (3-5 min), série avec **gel de série**, **ligues par divisions de 30**,
  objectif quotidien choisi, notifications à l'heure habituelle du joueur, parcours visible.
- **Seterra** : maîtrise par carte (pourcentage par quiz), mode « apprendre » où la carte guide, grande largeur de contenu
  (pays, régions, villes, fleuves pour chaque pays).
- **Worldle / Wordle** : un puzzle par jour **à minuit local**, grille partageable sans spoiler.
- **GeoGuessr** : profondeur, compétition classée, contenu communautaire.

### 4.3 La boucle cible

```
Accueil → (1re fois) test de positionnement
   ↓
Séance du jour (≈ 5 min) = révisions dues (FSRS) + 3 à 5 éléments nouveaux du parcours
   ↓
Feedback élaboré à chaque erreur → l'élément revient plus tôt
   ↓
Carte de maîtrise mise à jour (le joueur VOIT ce qu'il sait)
   ↓
Récompenses (XP, fragments, série) indexées sur la séance et la maîtrise
   ↓
Jeux du jour, ligue, amis = la partie sociale et compétitive, qui nourrit aussi la mémoire
```

Le joueur doit pouvoir répondre en une seconde à : « Qu'est-ce que je sais du monde aujourd'hui, et qu'est-ce que je
dois faire maintenant ? »

---

## 5. Vue d'ensemble des lots

| Lot | Titre | Prio | Effort | Dépend de |
|---|---|---|---|---|
| L0 | Vérifications bloquantes : quotas, plans, noms de pays sous Hermes | P0 | S | — |
| L1 | Mesure : événements, rétention, plantages | P0 | M | — |
| L2 | Modèle de connaissance par élément (fondation) | P0 | L | — |
| L3 | Feedback pédagogique après chaque erreur | P1 | M | — (L2 pour la partie « revient plus tôt ») |
| L4 | Révisions espacées et « Séance du jour » | P1 | L | L2 |
| L5 | Jour local du joueur et rappels à son heure | P1 | L | — |
| L6 | Ligues par divisions et gel de série | P1 | L | L5 conseillé |
| L7 | Accueil et test de positionnement | P1 | M | L2 |
| L8 | Carte de maîtrise et récompenses liées à la maîtrise | P1 | M | L2 |
| L9 | Parcours d'apprentissage par région (mode Apprendre) | P1 | L | L2, L3 |
| L10 | Sélection adaptative dans les modes existants | P2 | M | L2 |
| L11 | Accessibilité : daltonisme, clavier, taille de texte | P1 | M | — |
| L12 | Langues : relecture native, nouvelles langues, RTL | P2 | L | L0 |
| L13 | Nouveaux contenus : relief et eaux, subdivisions, villes, mers | P2 | XL | L2 conseillé |
| L14 | Atlas enrichi et relié aux jeux | P2 | M | L3 |
| L15 | Passage à l'échelle et modération | P1 | M | L0 |
| L16 | Intégrité des scores du jour | P2 | S | — |
| L17 | Mode classe / enseignant | P3 | XL | L2, L8 |
| L18 | Boucle virale (reprend l'étape 3 de la feuille de route) | P3 | M | — |
| L19 | Décider du sort du Quiz Géo masqué | P3 | S | L13 si on le réutilise |

**Ordre conseillé :** L0 → L1 et L2 en parallèle → L3, L5, L11, L15 en parallèle → L4 → L7, L8, L9 → le reste.
Lots parallélisables sans conflit de fichiers : {L1, L2}, {L3, L5, L11}, {L6, L12}, {L13, L14}.

---

## 6. Lots détaillés

### L0 — Vérifications bloquantes (P0, S)

**Objectif :** lever les inconnues qui peuvent rendre le reste du plan faux ou coûteux.
**Justification :** C6 et C7 peuvent casser le jeu pour un public non français ou au-delà de quelques centaines de
joueurs ; aucune donnée ne permet aujourd'hui de les écarter.

**Tâches :**
1. Sur un vrai Android (build `preview`) en anglais puis en allemand : vérifier les noms de pays et capitales affichés,
   et qu'une réponse tapée en anglais est acceptée en Drapeaux et Capitales. Tester `typeof Intl.DisplayNames` sous
   Hermes. Si absent : polyfill `@formatjs/intl-displaynames` (+ données des 9 langues seulement) dans
   `mobile/src/polyfills.ts`, ou générer au build une table `isoA2 → nom` par langue (`src/data/countryNames.json`,
   même source pour site et app, plus prévisible).
2. Noter dans le README le plan Firebase et le plan Vercel réels. Si Spark : estimer les écritures par partie
   (présence, `eloQuestions`, `eloGains`, historique, XP) et le nombre de parties/jour supportables. Passer en Blaze avec
   **alerte de budget** (ex. 5 €, 20 €) avant le lancement public.
3. Vérifier la limite de fonctions et la fréquence des crons du plan Vercel (L5 a besoin d'un déclenchement horaire).
4. Réduire la présence : écrire seulement quand l'app est au premier plan et la liste d'amis ou un salon ouvert, ou
   passer à Realtime Database (`onDisconnect`, sans coût par écriture).

**Critères de réussite :** rapport court dans `docs/` avec : résultat Hermes (capture), plans et quotas, coût estimé
par 1 000 joueurs actifs/jour ; si un polyfill ou une table est ajouté, un test `getCountryName('DE','en') === 'Germany'`
passe dans `npm run test:mobile`.

---

### L1 — Mesure (P0, M)

**Objectif :** savoir si les joueurs reviennent et retiennent, pour piloter tout le reste.
**Justification :** sans D1/D7/D30 ni entonnoir, aucun critère de ce plan n'est vérifiable (`src/App.jsx:94` seulement).

**Tâches :**
1. Choisir l'outil (la feuille de route propose PostHog ou Umami ; PostHog gratuit couvre événements, cohortes de
   rétention, entonnoirs, feature flags pour A/B). Mode sans cookie / respect du consentement ; mise à jour de la politique
   de confidentialité (`src/legal/`, date `updated`).
2. Module partagé `src/utils/analytics.js` (+ shim app) avec une liste fermée d'événements : `app_open`,
   `onboarding_step`, `game_start`, `game_end` (mode, durée, score, taux de réussite), `answer` agrégé par partie
   (pas un événement par réponse), `review_session_start/end` (après L4), `share_click`, `signup`, `notification_open`,
   `streak_lost`, `streak_freeze_used`.
3. Suivi des plantages : Sentry (`@sentry/react`, `@sentry/react-native` avec source maps EAS), décision déjà ouverte
   dans `docs/roadmap-lancement.md`.
4. Tableau de bord : rétention D1/D7/D30 par cohorte hebdo, séances/joueur/semaine, taux de complétion du défi du jour,
   part des joueurs avec série ≥ 7.

**Critères de réussite :** les 10 événements arrivent depuis le site et l'app (vérifié en local et en preview) ; une
cohorte de rétention s'affiche ; un plantage provoqué volontairement remonte avec une pile lisible.
**Cibles de référence** (à recalibrer après 4 semaines de données) : D1 ≥ 40 %, D7 ≥ 20 %, D30 ≥ 10 %.

---

### L2 — Modèle de connaissance par élément (P0, L) — fondation

**Objectif :** mémoriser, pour chaque joueur, ce qu'il sait de chaque élément (pays × compétence), sur site et app,
connecté ou non.
**Justification :** L4, L7, L8, L9, L10 et L17 en dépendent. Le serveur reçoit déjà `{ country, found, errors }` par
partie (`api/_lib/elo.mjs:71-84`) mais ne le garde que pour l'Elo et un badge.

**Conception à valider en début de lot :**
- **Élément** = `(compétence, isoA2)` où compétence ∈ `locate` (placement/hardcore), `flag`, `capital`, `shape`
  (border guess), plus tard `river`, `region`… Clé `iso` plutôt que le nom français `ADMIN`.
- **État FSRS** par élément : `{ s: stabilité, d: difficulté, due: jour, reps, lapses, last }` (≈ 40 octets).
- **Stockage** : un document par compétence, `users/{uid}/knowledge/{skill}` = map `iso → état` (≈ 250 × 40 o =
  10 Ko, une écriture par partie et non par réponse). Écrit par le client : c'est le carnet du joueur, tricher n'y
  rapporte rien ; règles = propriétaire seul, taille bornée, lecture privée.
- **Visiteurs** : même structure en `localStorage` / AsyncStorage ; fusion au premier login (garder l'état le plus
  avancé par élément).
- **Bibliothèque** : `ts-fsrs` (MIT) ou implémentation maison de FSRS-4.5/5 dans `src/utils/fsrs.js`, testée.
- **Notation d'une réponse** : 1re tentative juste et rapide = *Easy*, juste = *Good*, juste après erreur(s) = *Hard*,
  révélée / ratée = *Again*.

**Tâches :**
1. `src/utils/knowledge.js` : types, notation, mise à jour pure, fusion, sérialisation ; tests unitaires complets.
2. Hook `useKnowledge` (site + app via `@shared`) : chargement, cache, écriture en fin de partie.
3. Brancher la fin de partie de Trouver, Hardcore, Drapeaux, Drapeau incomplet, Capitales, Border Guess, Défi du jour,
   Survie, Pays du jour, Ascension (là où `/api/elo` est déjà appelé, réutiliser la même liste de résultats).
4. Règles Firestore + tests émulateur (propriétaire seul, taille, forme) ; ajout à la suppression de compte
   (`api/_lib/deleteAccount.mjs`) et à la politique de confidentialité.
5. Migration douce : amorcer l'état à partir de `mastery/{uid}` (pays trouvés du premier coup → stabilité initiale
   moyenne).

**Critères de réussite :** après une partie de Drapeaux sur le site, le document `knowledge/flag` contient chaque pays
joué avec un `due` cohérent ; même résultat dans l'app ; un visiteur qui crée un compte retrouve son état ; une partie
= une écriture ; tests unitaires et émulateur verts.
**Hors périmètre :** toute interface (L4, L8).

---

### L3 — Feedback pédagogique après chaque erreur (P1, M)

**Objectif :** que chaque erreur apprenne quelque chose.
**Justification :** aujourd'hui « Faux ! » sans nommer le pays cliqué (`useGameState.js:369`), réponse seulement
après 3 erreurs. L'erreur est le meilleur moment pour apprendre.

**Tâches :**
1. Trouver le pays / Hardcore : à chaque mauvais clic, nommer le pays cliqué et le colorer brièvement (« Vous avez
   touché le Niger »). Après la 1re erreur, indice de direction (« plus à l'ouest ») ; après 3, montrer la bonne
   réponse **avec ses voisins nommés** pendant 2 s.
2. Drapeaux / Capitales : à la révélation, afficher le pays sur une mini-carte + le drapeau qu'on a tapé à tort
   (« vous avez répondu Roumanie : bandes identiques, nuance de bleu différente ») pour les paires de « drapeaux
   jumeaux » déjà listées dans le Pays du jour.
3. Une phrase-repère par pays (« Le Malawi longe un grand lac à l'est ») : nouveau fichier de données
   `src/data/countryHints/{lang}.json`, généré puis relu, 9 langues ; affiché après une erreur, jamais avant.
4. Écran de fin de partie : liste « À revoir » des pays ratés, avec bouton « Rejouer seulement ceux-ci » (utilise le
   paramètre `overrideCountries` déjà présent dans `useGameState`).
5. Option « mode entraînement » : pas de chrono, réponse affichée tout de suite.

**Critères de réussite :** chaque type d'erreur affiche le pays cliqué / la bonne réponse sur site et app ; « Rejouer
les erreurs » fonctionne ; mesure L1 : le taux de réussite à la 2e rencontre d'un pays raté augmente d'au moins
10 points par rapport à la base (A/B si possible).

---

### L4 — Révisions espacées et « Séance du jour » (P1, L)

**Objectif :** une séance quotidienne de 3 à 5 minutes qui fait revoir ce qui est dû et introduit un peu de neuf.
**Justification :** cœur de la promesse « retenir sur le long terme » ; c'est aussi la meilleure raison de revenir
chaque jour, plus que les récompenses.

**Tâches :**
1. Constructeur de séance (`src/utils/session.js`, pur, testé) : jusqu'à 15 questions = éléments dus (les plus en
   retard d'abord) + 3 à 5 nouveaux du parcours (L9, ou à défaut par palier Facile → Moyen), entrelacement des
   compétences (localiser / drapeau / capitale), jamais deux fois le même pays d'affilée.
2. Écran « Séance du jour » réutilisant les composants de question existants (carte, drapeau, saisie) ; QCM pour un
   élément nouveau, saisie libre ensuite (rappel actif croissant).
3. Mise en avant sur l'accueil (site + app) : carte « 12 révisions vous attendent · 4 min » au-dessus des jeux du jour.
4. La séance compte pour la série et rapporte de l'XP / un fragment (remplace en partie le « 10 XP par partie
   jouée ») ; mission du jour « Faire sa séance ».
5. Notification de rappel qui annonce le nombre de révisions dues (après L5).
6. Rétention visée réglable (FSRS `request_retention`, défaut 0,9).

**Critères de réussite :** un joueur qui fait sa séance 7 jours de suite voit des intervalles croissants ;
taux de rappel mesuré sur les révisions ≥ 85 % (cible FSRS 90 %) ; durée médiane de séance entre 3 et 6 min ;
mesure L1 : D7 des joueurs « séance » vs autres.

---

### L5 — Jour local du joueur et rappels à son heure (P1, L)

**Objectif :** que « aujourd'hui » soit le jour du joueur, partout dans le monde.
**Justification :** C1 et C2 ; c'est le comportement attendu depuis Wordle.

**Tâches :**
1. Décider (début de lot) : **jour local** (puzzle = date locale, comme Wordle) recommandé. Les classements du jour
   regroupent par `dailyKey` ; un joueur ne peut avoir qu'un `dailyKey` ∈ {hier, aujourd'hui, demain} UTC (règles).
2. Centraliser le fuseau : une seule fonction `dayKeyFor(date, timeZone)` au lieu des 5 copies (`dailyKey.js`,
   `missions.js`, `eloRating.js`, `dailyReminder.mjs`, `elo.mjs`). Fuseau stocké dans `users/{uid}.timeZone` (IANA,
   détecté par `Intl.DateTimeFormat().resolvedOptions()`), le serveur l'utilise pour la série, les missions et l'XP.
3. Semaines (missions, ligue) : semaine ISO dans le fuseau du joueur ; saisons Elo : garder un découpage UTC global
   (pas d'enjeu horaire).
4. Garde-fou anti-voyage dans le temps : refuser un changement de fuseau plus d'une fois par 24 h pour la série.
5. Rappels : stocker l'heure de rappel préférée (défaut : heure habituelle de jeu, sinon 18 h locale) dans
   `pushTokens` ; cron **horaire** qui n'envoie qu'aux joueurs dont c'est l'heure (nécessite Vercel Pro, ou un
   déclencheur externe : GitHub Actions planifié, Cloud Scheduler). Requête indexée par `reminderHourUtc`, pas de
   lecture de toute la collection (règle C5).
6. Textes : afficher « nouveaux défis à minuit (votre heure) » et le compte à rebours.
7. Migration : le jour de bascule, ne casser aucune série (tolérance d'un jour).

**Critères de réussite :** tests unitaires sur Tokyo, Los Angeles, Paris, Kiritimati (UTC+14) et changement d'heure ;
un joueur à Tokyo voit le nouveau défi à 0 h locale ; le rappel arrive à ±1 h de l'heure choisie ; aucune série perdue
lors de la bascule (vérifié sur un échantillon).

---

### L6 — Ligues par divisions et gel de série (P1, L)

**Objectif :** une compétition hebdomadaire où chacun a une chance réelle, et une série qui pardonne un oubli.
**Justification :** C3 ; la ligue par groupes de 30 et le gel de série sont deux des mécaniques de rétention les plus
efficaces de Duolingo. La boutique de crédits (`2026-10-29-choix-drapeaux-boutique-design.md`) prévoit déjà un gel :
vérifier son état avant de commencer.

**Tâches :**
1. Divisions (ex. Bronze → Diamant, 6 niveaux), groupes de 30 joueurs actifs formés le lundi à la 1re partie,
   `leagues/{week}_{division}_{n}` (un document par groupe).
2. Points : séance du jour (L4) + jeux du jour + bonus de maîtrise, plafonnés par jour (éviter le grind).
3. Fin de semaine : top 7 promus, bas 5 relégués ; récompenses (fragments, sceau au podium de chaque groupe) ;
   remplacer `weeklyTop/current`.
4. Gel de série : 1 offert, achetable en crédits, appliqué automatiquement (serveur, `api/_lib/xp.mjs`) ; écran
   « votre gel a sauvé votre série de 23 jours ».
5. Réparation de série payante en crédits dans les 48 h (option).

**Critères de réussite :** simulation avec 10 000 joueurs fictifs : aucun document > 100 Ko, calcul < 10 s ; chaque
joueur actif est dans un groupe ; mesure L1 : part des joueurs qui finissent la semaine avec ≥ 5 jours joués.

---

### L7 — Accueil et test de positionnement (P1, M)

**Objectif :** qu'un nouveau joueur, quel que soit son niveau, tombe en 60 s sur un défi à sa mesure.
**Justification :** aucun tutoriel ni positionnement (vérifié) ; le préréglage « Découverte » est fixe.

**Tâches :**
1. Premier lancement : langue (pré-remplie), objectif (« apprendre les pays », « réviser pour un examen », « se
   mesurer »), objectif quotidien (3 / 5 / 10 min).
2. Test adaptatif de 10 questions (localiser + drapeau), qui monte ou descend de palier selon les réponses ; amorce
   l'état L2 (éléments réussis = stabilité initiale, ratés = nouveaux).
3. Résultat : « Vous connaissez environ 60 pays sur 197 » + carte de maîtrise (L8) + 1re séance.
4. Tutoriel contextuel de 3 bulles maximum par mode (première partie de chaque mode seulement).
5. Pouvoir passer chaque étape ; jouer sans compte.

**Critères de réussite :** temps jusqu'à la 1re question < 30 s ; ≥ 70 % des nouveaux terminent le test (L1) ;
taux de réussite de la 1re séance entre 70 et 90 %.

---

### L8 — Carte de maîtrise et récompenses liées à la maîtrise (P1, M)

**Objectif :** rendre visible la progression réelle et récompenser l'apprentissage, pas seulement l'assiduité.
**Justification :** les fragments et l'XP récompensent le fait de jouer ; le joueur ne voit nulle part « ce que je
sais du monde ».

**Tâches :**
1. Carte du monde colorée par maîtrise (par compétence, ou globale) : inconnu / en cours / acquis / maîtrisé (seuils
   de stabilité FSRS : ex. > 21 jours = acquis, > 90 j = maîtrisé). Palette accessible (L11).
2. Pourcentages par continent et sous-région (« Afrique de l'Ouest 8/16 »), sur le profil et l'accueil.
3. Jalons : « Europe maîtrisée » → badge + fragments + sceau. Remplacer à terme le badge `legend_master` (premier coup
   une seule fois) par un critère de maîtrise durable.
4. XP : bonus pour les réponses justes en révision et pour chaque élément qui passe « acquis » ; garder 10 XP par
   partie mais réduire leur poids relatif.
5. Profil public : afficher le nombre de pays maîtrisés (comparaison sociale saine).

**Critères de réussite :** la carte se met à jour juste après une séance ; les seuils sont testés ; un joueur peut
dire en 5 s quelle région travailler ; mesure L1 : clics sur « travailler cette région ».

---

### L9 — Parcours d'apprentissage par région (P1, L)

**Objectif :** apprendre le monde dans un ordre qui a du sens, de zéro à complet.
**Justification :** les modes actuels testent sans enseigner ; le découpage par groupes de voisins est la façon la
plus efficace d'apprendre une carte.

**Tâches :**
1. Découpage pédagogique : 20 à 25 unités de 5 à 10 pays voisins (« Péninsule ibérique et France », « Corne de
   l'Afrique », « Cône Sud »…) dans `src/data/learningPath.json`, avec ordre conseillé (des plus connus vers les moins
   connus, du centre vers la périphérie). Les sous-régions UN M49 peuvent servir de base.
2. Leçon d'une unité : (a) découverte — la carte zoome, chaque pays s'allume avec son nom, son drapeau, sa capitale,
   un repère (L3) ; (b) reconnaissance en QCM ; (c) rappel libre sur carte ; (d) mini-boss mélangé avec l'unité
   précédente.
3. Unités terminées → éléments ajoutés au planning de révision (L4).
4. Écran de parcours (une carte du monde qui se colorie) sur l'accueil.
5. Les unités servent aussi aux enseignants (L17) et aux objectifs (« réviser l'Afrique pour mon examen »).

**Critères de réussite :** 100 % des pays jouables couverts par une unité ; une leçon dure 3 à 5 min ; mesure L1 :
taux de réussite à J+7 sur les pays d'une unité terminée ≥ 80 %.

---

### L10 — Sélection adaptative dans les modes existants (P2, M)

**Objectif :** que Trouver, Drapeaux, Capitales, Border Guess, Survie choisissent mieux leurs questions.
**Justification :** `Math.random` sur paliers statiques ; les Elo par pays (`eloQuestions`) sont calculés mais jamais
utilisés.

**Tâches :**
1. Option « Pour moi » dans la configuration : tirage pondéré (éléments dus ×3, ratés récemment ×2, maîtrisés ×0,5).
2. Recalibrer les paliers statiques à partir de `eloQuestions` (script `scripts/recalibrate-difficulty.mjs` qui propose
   un nouveau palier quand l'Elo d'un pays s'écarte de son palier, avec un nombre minimal de réponses) ; garder la
   relecture humaine.
3. Border Guess infini : respecter la difficulté (aujourd'hui uniforme, `useBorderGuessState.js:304-309`).

**Critères de réussite :** en mode « Pour moi », taux de réussite moyen entre 75 et 90 % ; le script produit un
rapport lisible et ses changements passent `scoreCaps --check`.

---

### L11 — Accessibilité (P1, M)

**Objectif :** jouable par les daltoniens, au clavier, avec de grands textes.
**Tâches :**
1. Palette juste/faux/manqué sûre pour deutéranopie/protanopie (ex. bleu `#3B82F6` / orange `#F97316`) ou option
   « couleurs adaptées » + motifs (hachures sur la carte, icône ✓/✗) ; partager la palette entre `src/utils/mapColors.js`
   et `mobile/src/theme/index.ts` au lieu de la copie manuelle (attention à la contrainte de casse notée en mémoire).
2. Clavier sur le site : recherche du pays au clavier dans les jeux à carte (champ « tapez un pays » qui sélectionne),
   `aria-label` sur les cartes (`PlacementGameLayout.jsx:218`, `LandLayer.jsx`), retirer `keyboard={false}` où ce n'est
   pas nécessaire.
3. App : tester la taille de police système 200 %, plafonner avec `maxFontSizeMultiplier` là où la mise en page casse.
4. Audit Lighthouse / axe sur 5 pages.

**Critères de réussite :** simulation daltonisme (Chrome DevTools) : juste et faux distinguables ; une partie de
Trouver le pays jouable sans souris ; Lighthouse accessibilité ≥ 90 sur l'accueil et une page de jeu.

---

### L12 — Langues : relecture, nouvelles langues, RTL (P2, L)

**Objectif :** « quelle que soit la langue du joueur ».
**Tâches :**
1. Relecture native des 7 langues non relues (fr et en sont la référence) : liste des chaînes identiques à l'anglais
   (fr 78, nl 73, de 46… à trier : beaucoup de noms propres) ; mettre en place Weblate/Crowdin ou des relecteurs.
2. Nouvelles langues à fort public : ar (RTL), zh-Hans, ja, ko, hi, tr, pl, id. Pour chacune : interface, noms de pays
   (L0), capitales (`capitalNames.json`), repères (L3), parchemins, pages légales (ou version anglaise avec mention).
3. RTL : `dir` sur le site, `I18nManager` dans l'app, vérifier cartes et listes.
4. Saisie : normalisation sans accents/diacritiques déjà présente ? Vérifier pour le cyrillique, le chinois (pinyin
   accepté ?), le japonais (kana/kanji).
5. Supprimer la dépendance aux clés françaises dans les données (`'Facile'`, `'Asie'`) au profit de codes neutres —
   **attention** : les règles Firestore et les anciens APK les utilisent (migration en deux temps).

**Critères de réussite :** 0 clé manquante, relecture signée par langue ; une partie complète jouable en arabe
(RTL) et en japonais (saisie) ; test qui vérifie que chaque pays a un nom dans chaque langue.

---

### L13 — Nouveaux contenus (P2, XL, découpable)

**Objectif :** couvrir la géographie au-delà des pays, pour que les joueurs avancés aient toujours de quoi apprendre.
**Justification :** les ~260 éléments physiques de `geoFeatures.js` sont inaccessibles (Quiz masqué) ; Seterra doit
son statut de référence à sa largeur de contenu.
**Sous-lots indépendants :**
- **L13a Relief et eaux (M)** : réutiliser `geoFeatures.js` dans des modes cartographiques (« placez le Danube »,
  « quel fleuve traverse ces pays ? »), données Natural Earth (domaine public).
- **L13b Mers, océans, détroits (M)** : clic sur la carte.
- **L13c Subdivisions (L)** : États-Unis, Canada, Brésil, Inde, Chine, Allemagne, France (régions), Russie (sujets) —
  geoBoundaries (CC BY) ; un pack = une carte + difficulté + compétence L2.
- **L13d Villes (M)** : 300 grandes villes (population, capitale régionale) en placement.
- **L13e Drapeaux et capitales des subdivisions (S)** après L13c.
Chaque pack : données dans `src/data/`, compétence L2, unité de parcours L9, crédits de licence dans les mentions
légales.

**Critères de réussite (par sous-lot) :** jouable site + app, données sous licence compatible créditée, test qui
vérifie que chaque élément a un nom dans les 9 langues, poids des données < 500 Ko compressé par pack.

---

### L14 — Atlas enrichi et relié aux jeux (P2, M)

**Tâches :**
1. Lien « Voir la fiche » depuis chaque révélation (L3), chaque ligne « À revoir » et la carte de maîtrise.
2. Histoire des pays : aujourd'hui FR, US, JP seulement ; étendre aux 50 pays les plus joués puis à tous (texte court,
   relu, 9 langues).
3. Fiche : drapeau expliqué (symbolique), langues, monnaie, fuseau, point culminant, grand fleuve (relie L13).
4. Bouton « M'entraîner sur ce pays et ses voisins ».

**Critères de réussite :** chaque écran d'erreur mène à la fiche en un tap ; 50 histoires relues.

---

### L15 — Passage à l'échelle et modération (P1, M)

**Objectif :** que rien ne tombe à 10 000 joueurs actifs par jour.
**Tâches :**
1. Classements du jour : `limit(100)` + position du joueur par requête de comptage (`count()`), au lieu de tout lire
   (`src/utils/saveScore.js:164-193`).
2. Rappel quotidien : requête indexée par heure (voir L5), pagination, `maxDuration` dans `vercel.json`.
3. `/api/elo` : regrouper `eloGains` par joueur et saison (un document par mode) au lieu d'un par pays ; garder
   `eloQuestions` mais l'agréger (mise à jour par lot quotidien ou compteurs répartis).
4. Nettoyage : vérifier que `cleanupExpired` et la suppression des comptes inactifs suivent le rythme (50 comptes par
   passage, `listUsers` complet).
5. Modération : custom claim `admin`, page `/admin/reports` (lister, supprimer un score, ignorer), journal des actions ;
   remplace l'usage des scripts avec clé de service personnelle.
6. Bandeau hors connexion (déjà prévu dans la feuille de route).

**Critères de réussite :** test de charge sur émulateur (script) avec 10 000 scores du jour : affichage du classement
< 1 s et < 200 lectures ; coût Firestore estimé par 1 000 joueurs/jour documenté.

---

### L16 — Intégrité des scores du jour (P2, S)

**Tâches :** règle qui borne `dailyKey` à hier/aujourd'hui/demain (à adapter après L5) ; badge `night_owl` aligné sur
le fuseau du joueur ; supprimer le commentaire obsolète de `legalInfo.js`.
**Critères de réussite :** tests émulateur qui refusent un `dailyKey` d'il y a 3 jours ou dans une semaine.

---

### L17 — Mode classe / enseignant (P3, XL)

**Objectif :** devenir l'outil que les professeurs donnent à leurs élèves.
**Tâches :** compte enseignant ; classe avec code d'invitation (sans e-mail pour les mineurs, attention RGPD < 15 ans
en France et COPPA) ; devoirs = une unité L9 ou une liste de pays à maîtriser pour une date ; tableau de suivi par élève
(maîtrise L8, erreurs fréquentes) ; export CSV.
**Critères de réussite :** une classe de test (30 comptes) suit un devoir de bout en bout ; mentions légales et
confidentialité mises à jour et relues.

---

### L18 — Boucle virale (P3, M)

Reprend `docs/roadmap-lancement.md` étape 3 : aperçu dynamique des liens de défi (`api/og`), grille d'emojis pour
Border Guess / Country Clue, badge Play Store. Ajouter : partager sa carte de maîtrise (« je connais 142 pays »).
**Critères :** taux de clic des liens partagés mesuré (L1).

---

### L19 — Sort du Quiz Géo masqué (P3, S)

`mobile/src/app/game/quiz.tsx` (848 lignes) et `src/utils/quizQuestions.js` (843 lignes) sont maintenus sans être
jouables. Décider : réutiliser ses questions de relief dans L13a et ses faits dans L3/L14, puis supprimer le mode ; ou
le relancer retravaillé. Ne pas toucher aux règles `dailyAttempts.QUIZ` tant que d'anciens APK écrivent.

---

## 7. Indicateurs de réussite globaux

| Indicateur | Où | Cible à 6 mois (à recalibrer après L1) |
|---|---|---|
| Rétention D1 / D7 / D30 | L1 | 40 % / 20 % / 10 % |
| Joueurs avec série ≥ 7 jours | L1 | 15 % des actifs hebdo |
| Séance du jour faite | L4 | 50 % des actifs quotidiens |
| Taux de rappel en révision | L4 | ≥ 85 % |
| Pays « acquis » médian après 30 jours | L8 | ≥ 60 |
| Part des joueurs hors fuseau Europe | L1 | suivi (doit croître après L5, L12) |
| Coût Firestore par 1 000 joueurs actifs/jour | L0, L15 | connu et sous budget |

## 8. Règles à rappeler dans chaque conversation

- Site et app partagent `src/` (`@shared`) : toute logique va dans `src/utils` ou `src/hooks`, testée par vitest ; les
  écrans sont faits des deux côtés.
- **Règles Firestore et index déployés avant le code** qui en dépend ; les anciens APK continuent d'écrire avec l'ancien
  code.
- Pas de script `test` dans `mobile/package.json` (empreinte OTA), utiliser `npm run test:mobile` à la racine.
- Toute nouvelle donnée collectée ou tout nouveau prestataire → `src/legal/` et date `updated`.
- Textes dans les 9 langues ; fr et en d'abord, les autres signalées « à relire ».
- Travailler sur `dev`, pas de worktree.
