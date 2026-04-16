# Design : Sélection de catégorie en mode infini

**Date :** 2026-04-16
**Scope :** Mode infini du jeu Classement uniquement

---

## Contexte

En mode infini, le critère (catégorie) est actuellement tiré aléatoirement et le joueur n'a aucun contrôle dessus. L'objectif est de permettre au joueur de choisir sa catégorie avant chaque round, tout en gardant l'option "Aléatoire".

---

## Flow

Le cycle infini devient :

```
choosing-category → playing → submitted → choosing-category → ...
```

- Au premier chargement en mode infini, `status` démarre à `'choosing-category'`
- Après soumission, le bouton "Round suivant" ramène à `'choosing-category'`
- Le mode daily n'est pas affecté

---

## Changements dans `useRankingGameState`

- `initInfiniteRound(criterionKey = null)` : accepte une clé de critère optionnelle. Si `null`, tire au hasard comme avant.
- `startInfiniteRound(criterionKey)` : nouvelle fonction exposée par le hook, appelée depuis la page lors du choix de catégorie.
- Au démarrage en mode infini, le statut est initialisé à `'choosing-category'` au lieu de déclencher directement `initInfiniteRound`.
- `startNextRound()` remet le statut à `'choosing-category'` au lieu d'appeler `initInfiniteRound` directement.

---

## UI dans `RankingGamePage`

Quand `mode === 'infinite'` et `status === 'choosing-category'` :

- Les boutons de difficulté existants restent affichés en haut
- En dessous, un titre "Choisir une catégorie" et 5 boutons empilés verticalement :
  - 🎲 Aléatoire (passe `null`)
  - 👥 Population
  - 🗺️ Superficie
  - 💰 PIB
  - 📍 Densité
- Un clic sur un bouton appelle `startInfiniteRound(criterionKey)` et lance le round immédiatement
- Pas de bouton "Confirmer" séparé
- Le `CriterionBanner` n'est pas affiché pendant cette étape

---

## Ce qui ne change pas

- Boutons de difficulté (Facile / Moyen / Difficile) : comportement et position identiques
- Mode daily : aucun changement
- Logique de scoring, drag & drop, soumission au leaderboard : aucun changement
