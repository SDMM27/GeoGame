# Plan d'action : nouvelles fonctionnalités

Établi le 2026-10-18. Chaque étape est pensée pour une conversation séparée : « fais l'étape N du plan ». Les étapes sont ordonnées par dépendance ; une étape qui en dépend d'une autre le signale.

## Étapes

1. **Reset de « Voyage voyage » à minuit** (bug)
   Le reset quotidien part un peu plus tard que minuit. Aligner l'heure du reset sur minuit (fuseau à confirmer, voir questions) côté site et côté API. Référence : `docs/superpowers/specs/2026-04-28-voyage-voyage-design.md`.

2. **Zoom sur « Voyage voyage »**
   Permettre de zoomer et de se déplacer sur la carte du mode, sur ordinateur et sur mobile. Indépendant des autres étapes.

3. **Décorations de profil**
   Cadres, couleurs ou badges visibles sur le profil et dans les classements. Déblocage via les étapes 5 et 6 ; ici on pose le modèle de données et l'affichage, avec quelques décorations de départ.

4. **Elo et classement des joueurs**
   Calculer un Elo à partir des parties (mode à départager, voir questions), stocker le score et afficher un classement général. S'appuie sur les classements existants.

5. **Défis de la semaine et du jour, XP et items**
   Chaque défi rapporte de l'XP ; l'XP fait monter un niveau qui débloque des items (décorations de profil, etc.). Prérequis des étapes 3, 6 et 10.

6. **Fragments de drapeaux et badges**
   - Les défis remplis donnent des fragments de drapeau ; assez de fragments débloquent un drapeau.
   - Badge « Mythique » : tous les drapeaux débloqués.
   - Badge « Légende » : tous les pays trouvés sans faute (dépend de l'étape 8 ou du mode existant, à confirmer).
   Dépend de l'étape 5.

7. **Mode hardcore : trouver le pays (sans frontières)**
   Nouveau mode où le pays doit être trouvé sans les frontières affichées. Dépend de l'étape 4 pour le classement, optionnel.

8. **Jeu de drapeau avec un élément manquant**
   Un drapeau dont une partie ou une couleur manque ; le joueur doit identifier le pays. Nouveau mode, avec sa propre difficulté, séparée de celle des autres modes.

9. **Spectateur des parties des autres**
   Regarder une partie multijoueur en cours, en lecture seule. Demande une synchro de l'état de partie côté serveur ; le plus gros chantier, à faire après les étapes de scoring.

10. **Rééquilibrer le choix des modes**
    Ne plus choisir la difficulté par défaut, et mettre en avant les modes courts et plus récompensants. Dépend des étapes 5 et 6 pour définir les récompenses.

## Questions à trancher

Ces réponses changent le détail des étapes ; le plan reste valable sans elles pour les étapes 1 et 2.

- **Étape 1** : quel fuseau pour le reset (Paris, ou heure locale du joueur) ?
- **Étape 4** : l'Elo se calcule sur quel mode (défi du jour, duels, tous les modes) ? Classement global ou par mode ?
- **Étape 6** : « sans faute » pour le badge Légende, c'est sur quel mode exactement ? Est-ce que le mode hardcore (étape 7) compte ?
- **Étape 8** : quelle est la règle de réussite (un seul pays par manche, score, temps) ?
- **Étape 9** : spectateur en temps réel, ou partie terminée rejouable ?
- **Étape 10** : quels modes sont « courts » et « récompensants » ? Quelle difficulté reste proposée par défaut, si une ?
