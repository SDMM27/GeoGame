# Plan d'action : nouvelles fonctionnalités

Établi le 2026-10-18. Chaque étape est pensée pour une conversation séparée : « fais l'étape N du plan ». Les étapes sont ordonnées par dépendance ; une étape qui en dépend d'une autre le signale.

## Étapes

1. **Reset de « Voyage voyage » à minuit** (bug)
   Le reset quotidien partait en UTC (1 h ou 2 h du matin à Paris). Il utilise maintenant `getDailyKey()`, comme les autres défis du jour : minuit à Paris, via l'heure serveur. Référence : `docs/superpowers/specs/2026-04-28-voyage-voyage-design.md`.

2. **Zoom sur « Voyage voyage »**
   Permettre de zoomer et de se déplacer sur la carte du mode, sur ordinateur et sur mobile. Indépendant des autres étapes.
   Fait : zoom molette/contrôles tactiles et déplacement sur le site ; zoom pincé et déplacement sur l’application mobile.

3. **Décorations de profil**
   Cadres, couleurs ou badges visibles sur le profil et dans les classements. Déblocage via les étapes 5 et 6 ; ici on pose le modèle de données et l'affichage, avec quelques décorations de départ.
   Fait : `users/{uid}.decoration = { frame, color }` (catalogue dans `src/utils/decorations.js`, 6 cadres et 7 couleurs de départ), sélecteur sur le profil, cadre et couleur sur les profils et dans les classements, site et app. Les décorations de niveau sont débloquées par les missions de l'étape 5 ; les règles Firestore vérifient le niveau requis et la cohérence avec le catalogue.

4. **Elo et classement des joueurs**
   - **Duels** : Elo global, mis à jour après chaque duel terminé (score de départ 1000, facteur K standard).
   - **Modes solo** (drapeaux, trouver, Border Guess, survie, etc.) : un Elo par mode. Chaque question a une difficulté qui se met à jour avec les réponses ; le joueur joue contre elle comme dans un duel.
   - **Règles anti-farm** :
     - Gain maximal au premier essai sur un pays, décroissant avec chaque erreur sur ce même pays, avec un plancher (20 % du gain de base).
     - Un seul gain par pays, par mode, par difficulté et par saison : une fois le pays trouvé, plus aucun gain dessus pendant la saison.
     - Les erreurs ne font pas perdre d'Elo en solo.
   - **Saison** : reset tous les trois mois ; les notes reviennent à mi-chemin de 1000 et les pays redeviennent « à gagner ».
   - S'appuie sur les classements existants.
   Fait : le serveur seul écrit les notes (`POST /api/elo`, `api/_lib/elo.mjs` ; calcul dans `src/utils/eloRating.js`, K = 32, départ 1000). Saison = trimestre civil, heure de Paris ; au changement, chaque note revient à mi-chemin de 1000. Modes solo notés : trouver, drapeaux, capitales, Border Guess (hors défi du jour), survie ; Ascension compte pour son jeu ; rien en salle multi. La difficulté de départ d'un pays vient de sa difficulté dans le mode (800 à 1400). Gain : 100 % au premier essai, −20 % par erreur, plancher 20 %. Duels : salles de 2 comptes connectés, résultats lus côté serveur dans `gameResults`, 3 duels notés par jour et par paire de comptes, 20 par compte, comptes de plus de 3 jours, résultats invraisemblables non notés ; les règles exigent que le `uid` d'un joueur en salle soit le sien. Affichage : onglet Elo des classements et section Elo du profil, site et app.

5. **Défis de la semaine et du jour, XP et items**
   Chaque défi rapporte de l'XP ; l'XP fait monter un niveau qui débloque des items (décorations de profil, etc.). Prérequis des étapes 3, 6 et 10.
   Fait : appelés « Missions » dans l'interface (« Défi du jour » désignait déjà les jeux quotidiens). Chaque jour 3 missions du jour (60 XP chacune, +40 de bonus pour les 3), chaque semaine ISO 3 missions de la semaine (250 XP, +250), tirées au sort et identiques pour tous, heure de Paris ; plus 10 XP par partie, 10 parties par jour au maximum. Règles dans `src/utils/missions.js` ; le serveur seul écrit `users/{uid}.xp` (`POST /api/xp`, `api/_lib/xp.mjs`) en relisant l'historique des parties, appelé après chaque partie et à l'affichage. Niveau n → n+1 : 100 + 50 × (n − 1) XP. 12 nouvelles décorations débloquées du niveau 2 au niveau 30 ; les règles Firestore refusent un objet verrouillé (`decorationLevel`, test de cohérence avec le catalogue). Affichage : carte Missions sur l'accueil, niveau sur les profils, toast « +N XP », site et app. Traductions es/pt/de/it/ru relues.

6. **Fragments de drapeaux et badges**
   - Les défis remplis donnent des fragments de drapeau ; assez de fragments débloquent un drapeau.
   - Badge « Mythique » : tous les drapeaux débloqués.
   - Badge « Légende » : tous les pays trouvés sans faute, dans les modes drapeaux, trouver et hardcore.
   Dépend de l'étape 5.
   Fait : chaque mission payée donne des fragments (1 par mission du jour et pour son bonus, 3 par mission de la semaine et pour son bonus, environ 40 par semaine), versés par le serveur dans la même transaction que l'XP (`users/{uid}.flags = { unlocked, current, pieces }`). 4 fragments reconstituent le drapeau en cours ; le suivant est tiré au sort parmi les 239 restants, pondéré par la rareté (Facile = commun ×4, Moyen = peu commun ×3, Difficile = rare ×2, Impossible = légendaire ×1, d'après `DifficultyFlag`). Règles dans `src/utils/flagCollection.js`. Le serveur Elo note pour toujours les pays trouvés du premier coup en trouver, drapeaux et hardcore (`mastery/{uid}`). Badges `mythic` (239 drapeaux) et `legend_master` (705 pays : 238 trouver + 229 drapeaux + 238 hardcore), rang légende. Affichage : collection sur les profils, fragments sur la carte Missions et dans le toast d'XP, site et app. Traductions es/pt/de/it/ru relues.

7. **Mode hardcore : trouver le pays (sans frontières)**
   Nouveau mode où le pays doit être trouvé sans les frontières affichées. Dépend de l'étape 4 pour le classement, optionnel.
   Fait : mode jouable sur le site et l'application mobile, sélection de pays comme dans Trouver, sans frontières visibles avant la réponse (y compris après « Recommencer ») et sans bouton Révéler ni Ascension. Une seule tentative par pays ; 1 000 points si la carte est touchée dans le pays, sinon un score réduit selon la distance (0 à 2 000 km). Elo et maîtrise du premier essai enregistrés sous `HARDCORE`, avec classements et historique dédiés.

8. **Jeu de drapeau avec un élément manquant**
   Un drapeau dont une partie ou une couleur manque ; le joueur doit identifier le pays. Nouveau mode, avec sa propre difficulté, séparée de celle des autres modes.
   Fait : mode « Drapeau incomplet » sur le site et l'application mobile ; un tiers horizontal du drapeau est masqué, toujours le même pour un pays. Elo, classement et plafonds de score dédiés (`MISSING_FLAG` dans `scripts/scoreCaps.mjs`) ; la difficulté d'un pays reprend pour l'instant celle du jeu des drapeaux (`DifficultyFlag`). Pas d'Ascension. Accessible depuis l'accueil et les classements.

9. **Spectateur des parties des autres**
   Regarder une partie multijoueur en cours, en lecture seule. Demande une synchro de l'état de partie côté serveur ; le plus gros chantier, à faire après les étapes de scoring.
   Fait sur le site : un visiteur peut ouvrir une salle en cours en lecture seule sans la rejoindre ; roster, classement et progression se synchronisent en temps réel. Les règles Firestore limitent les écritures de progression et résultats aux membres de la salle. L'application mobile n'a pas encore de mode spectateur.

10. **Rééquilibrer le choix des modes**
    Ne plus choisir la difficulté par défaut, et mettre en avant les modes courts et plus récompensants. Dépend des étapes 5 et 6 pour définir les récompenses.
    - Mettre en avant le mode **Ascension** sur l'accueil.
    - Pour les nouveaux joueurs, le préréglage par défaut est « Découverte » (10 faciles, 5 moyens, 1 difficile) : des pays faciles au début pour le plaisir de réussir, puis un peu de moyen pour s'entraîner.
    - Les pays difficiles restent accessibles mais ne sont plus le point de départ.
   Fait : entrée Ascension mise en avant sur l'accueil du site, ouvrant directement sa configuration ; le préréglage initial est « Découverte » (10 faciles, 5 moyens, 1 difficile) sur le site et l'application. L'accueil de l'application n'a pas encore d'entrée Ascension mise en avant.

## Décisions actées

Toutes les décisions listées ici sont prises ; elles ne représentent pas des étapes restant à implémenter.

- **Étape 1** : résolu, comme les défis du jour. Ces défis se calculent à minuit à Paris, pas à l'heure locale du joueur.
- **Étape 4** : résolu, duels à Elo global, modes solo à Elo par mode, règles anti-farm et saisons décrites ci-dessus.
- **Étape 6** : résolu, le badge Légende vaut pour les modes drapeaux, trouver et hardcore.
- **Étape 8** : résolu, le mode se joue au score, comme les autres modes à score.
- **Étape 9** : résolu, spectateur en temps réel.
- **Étape 10** : résolu, Ascension mise en avant, préréglage « Découverte » par défaut pour les nouveaux joueurs.

## Suivi restant

Les étapes 1 à 10 sont implémentées et les traductions des missions, fragments et badges en es/pt/de/it/ru ont été relues. Reste :

- **Déployer les règles Firestore** (`npm run deploy:rules`) avant de publier les modes Hardcore et Drapeau incomplet : sans les plafonds `HARDCORE_*` et `MISSING_FLAG_*`, leurs scores sont refusés.
- **Spectateur sur l'application mobile** (étape 9, site seulement).
- **Ascension mise en avant sur l'accueil de l'application** (étape 10, site seulement).
- **Drapeau incomplet** : une difficulté propre au mode, et une partie masquée choisie selon le drapeau (bande verticale pour la France ou l'Italie ; sur un drapeau uni, masquer un tiers n'enlève presque rien).
