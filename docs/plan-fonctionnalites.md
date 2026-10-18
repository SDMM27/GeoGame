# Plan d'action : nouvelles fonctionnalités

Établi le 2026-10-18. Chaque étape est pensée pour une conversation séparée : « fais l'étape N du plan ». Les étapes sont ordonnées par dépendance ; une étape qui en dépend d'une autre le signale.

## Étapes

1. **Reset de « Voyage voyage » à minuit** (bug)
   Le reset quotidien partait en UTC (1 h ou 2 h du matin à Paris). Il utilise maintenant `getDailyKey()`, comme les autres défis du jour : minuit à Paris, via l'heure serveur. Référence : `docs/superpowers/specs/2026-04-28-voyage-voyage-design.md`.

2. **Zoom sur « Voyage voyage »**
   Permettre de zoomer et de se déplacer sur la carte du mode, sur ordinateur et sur mobile. Indépendant des autres étapes.

3. **Décorations de profil**
   Cadres, couleurs ou badges visibles sur le profil et dans les classements. Déblocage via les étapes 5 et 6 ; ici on pose le modèle de données et l'affichage, avec quelques décorations de départ.
   Fait : `users/{uid}.decoration = { frame, color }` (catalogue dans `src/utils/decorations.js`, 6 cadres et 7 couleurs de départ, tous débloqués), sélecteur sur le profil, cadre et couleur sur les profils et dans les classements, site et app. Chaque objet porte une règle `unlock` (`starter` aujourd'hui, `level` prévu pour l'étape 5) ; les règles Firestore ne vérifient pas encore le déblocage, à ajouter quand des objets seront verrouillés.

4. **Elo et classement des joueurs**
   - **Duels** : Elo global, mis à jour après chaque duel terminé (score de départ 1000, facteur K standard).
   - **Modes solo** (drapeaux, trouver, Border Guess, survie, etc.) : un Elo par mode. Chaque question a une difficulté qui se met à jour avec les réponses ; le joueur joue contre elle comme dans un duel.
   - **Règles anti-farm** :
     - Gain maximal au premier essai sur un pays, décroissant avec chaque erreur sur ce même pays, avec un plancher (20 % du gain de base).
     - Un seul gain par pays, par mode, par difficulté et par saison : une fois le pays trouvé, plus aucun gain dessus pendant la saison.
     - Les erreurs ne font pas perdre d'Elo en solo.
   - **Saison** : reset à chaque saison (note de base remise à zéro ou partiellement, et pays redevenus « à gagner »). Saison de 3 mois, à confirmer lors de l'étape.
   - S'appuie sur les classements existants.
   Fait : le serveur seul écrit les notes (`POST /api/elo`, `api/_lib/elo.mjs` ; calcul dans `src/utils/eloRating.js`, K = 32, départ 1000). Saison = trimestre civil, heure de Paris ; au changement, chaque note revient à mi-chemin de 1000. Modes solo notés : trouver, drapeaux, capitales, Border Guess (hors défi du jour), survie ; Ascension compte pour son jeu ; rien en salle multi. La difficulté de départ d'un pays vient de sa difficulté dans le mode (800 à 1400). Gain : 100 % au premier essai, −20 % par erreur, plancher 20 %. Duels : salles de 2 comptes connectés, résultats lus côté serveur dans `gameResults`, 3 duels notés par jour et par paire de comptes ; les règles exigent que le `uid` d'un joueur en salle soit le sien. Affichage : onglet Elo des classements et section Elo du profil, site et app.

5. **Défis de la semaine et du jour, XP et items**
   Chaque défi rapporte de l'XP ; l'XP fait monter un niveau qui débloque des items (décorations de profil, etc.). Prérequis des étapes 3, 6 et 10.

6. **Fragments de drapeaux et badges**
   - Les défis remplis donnent des fragments de drapeau ; assez de fragments débloquent un drapeau.
   - Badge « Mythique » : tous les drapeaux débloqués.
   - Badge « Légende » : tous les pays trouvés sans faute, dans les modes drapeaux, trouver et hardcore.
   Dépend de l'étape 5.

7. **Mode hardcore : trouver le pays (sans frontières)**
   Nouveau mode où le pays doit être trouvé sans les frontières affichées. Dépend de l'étape 4 pour le classement, optionnel.

8. **Jeu de drapeau avec un élément manquant**
   Un drapeau dont une partie ou une couleur manque ; le joueur doit identifier le pays. Nouveau mode, avec sa propre difficulté, séparée de celle des autres modes.

9. **Spectateur des parties des autres**
   Regarder une partie multijoueur en cours, en lecture seule. Demande une synchro de l'état de partie côté serveur ; le plus gros chantier, à faire après les étapes de scoring.

10. **Rééquilibrer le choix des modes**
    Ne plus choisir la difficulté par défaut, et mettre en avant les modes courts et plus récompensants. Dépend des étapes 5 et 6 pour définir les récompenses.
    - Mettre en avant le mode **Ascension** sur l'accueil.
    - Pour les nouveaux joueurs, le préréglage par défaut est « Découverte » (10 faciles, 5 moyens, 1 difficile) : des pays faciles au début pour le plaisir de réussir, puis un peu de moyen pour s'entraîner.
    - Les pays difficiles restent accessibles mais ne sont plus le point de départ.

## Questions à trancher

Ces réponses changent le détail des étapes ; le plan reste valable sans elles pour les étapes 1 et 2.

- **Étape 1** : résolu, comme les défis du jour. Ces défis se calculent à minuit à Paris, pas à l'heure locale du joueur.
- **Étape 4** : résolu, duels à Elo global, modes solo à Elo par mode, règles anti-farm et saisons décrites ci-dessus.
- **Étape 6** : résolu, le badge Légende vaut pour les modes drapeaux, trouver et hardcore.
- **Étape 8** : résolu, le mode se joue au score, comme les autres modes à score.
- **Étape 9** : résolu, spectateur en temps réel.
- **Étape 10** : résolu, Ascension mise en avant, préréglage « Découverte » par défaut pour les nouveaux joueurs.
