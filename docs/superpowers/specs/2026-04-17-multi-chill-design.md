# Multi Chill Mode — Design Spec

**Date:** 2026-04-17  
**Status:** Approved

---

## Overview

Mode multijoueur détendu sans pression de chrono global. Tous les joueurs voient le même pays simultanément et ont un compte à rebours commun pour répondre. À la fin de chaque manche (groupe de N pays), une phase de revue collective montre les bons résultats ensemble puis les erreurs une par une.

---

## 1. Architecture

### Approche
Variante `mode: 'chill'` dans la structure de rooms Firestore existante. Toute l'infrastructure (rooms, players, scoring, leaderboard final) est réutilisée sans modification.

### Extension de la config de room
```javascript
config: {
  games: [...],          // inchangé
  chillConfig: {
    mancheSize: 10,      // nombre de pays par manche (5 | 10 | 15 | 20)
  }
}
```

### Nouvel état Firestore `chillState`
Champ ajouté au document room pendant une partie chill :
```javascript
chillState: {
  phase: 'playing' | 'review',
  currentCountryIndex: number,
  countdownEnd: Timestamp,       // timestamp absolu — base de synchronisation commune
  mancheStartIndex: number,      // index du début de la manche en cours
  playerAnswers: {
    [playerId]: {
      [countryIndex]: { answer: string } | { lat: number, lng: number } | null
    }
  }
}
```

### Durées par difficulté (presets automatiques, non configurables)
| Difficulté | Durée |
|------------|-------|
| Facile     | 6s    |
| Moyen      | 8s    |
| Difficile  | 10s   |
| Impossible | 15s   |

En mode Ascension, la durée s'adapte automatiquement à chaque phase.

---

## 2. Nouveaux composants

| Composant | Rôle |
|-----------|------|
| `ChillCountdown` | Barre de progression synchronisée sur `countdownEnd` |
| `ChillReview` | Phase de revue : bons résultats ensemble, mauvais un par un |
| `ChillTextInput` | Input texte sans validation temps réel, soumis à `countdownEnd` |
| `ChillPlacementMarker` | Marqueur déplaçable jusqu'à `countdownEnd`, verrouillé ensuite |

---

## 3. Flux de jeu

### Création de room
- Hôte active le toggle **"Mode Chill"** dans `MultiplayerCreatePage.jsx`
- Choisit `mancheSize` (5 / 10 / 15 / 20 pays par manche)
- Les durées par difficulté s'affichent en lecture seule
- Le chrono global disparaît des options

### Tour synchronisé (par pays)
1. Hôte écrit `chillState.countdownEnd = now + durationForDifficulty`
2. Tous les clients affichent le pays + `ChillCountdown`
3. Chaque joueur place son marqueur / tape sa réponse (stocké localement)
4. À `countdownEnd` : chaque client soumet sa réponse dans `chillState.playerAnswers`
5. **Seul le client hôte** écrit dans Firestore pour toutes les transitions d'état (pays suivant, début de manche, fin de revue) — les autres clients sont read-only sur `chillState`

### Fin de manche
Déclenchée quand `currentCountryIndex - mancheStartIndex === mancheSize` :
- `phase = 'review'`
- `ChillReview` s'affiche pour tous

### Phase de revue
1. **Bons résultats affichés ensemble** (tous les joueurs corrects en vert)
2. **Mauvais résultats un par un** (joueur, réponse donnée, réponse correcte + position sur carte si placement)
3. Hôte clique "Suivant" pour chaque erreur
4. Hôte clique "Continuer" → `phase = 'playing'`, `mancheStartIndex` mis à jour

### Fin de partie
Leaderboard final inchangé (`FinalLeaderboard` existant).

---

## 4. Scoring

Identique au multijoueur existant (`scoringRules.js`), avec une seule tentative par pays :
- **Correct** → points pleins (comme 0 erreur)
- **Incorrect ou pas répondu** → 0 point (comme 3 erreurs / skip)

Pour le placement, la distance est calculée normalement sur le marqueur posé. En phase de revue, **"bon"** = score > 0 points, **"mauvais"** = 0 points (marqueur trop loin ou absent).

---

## 5. Cas limites

| Cas | Comportement |
|-----|-------------|
| Joueur déconnecté pendant un tour | `null` soumis automatiquement à `countdownEnd`, marqué `disconnected` |
| Retard réseau / décalage d'horloge | Acceptable (~1-2s) — mode chill, pas de compétition précise |
| Hôte déconnecté pendant la revue | Room figée — même comportement que multi existant |
| Joueur rejoint en cours de manche | Voit le pays en cours, pays précédents marqués `null` |
| Joueur ne répond pas | `null` soumis automatiquement à `countdownEnd` |

---

## 6. Ce qui n'est PAS dans ce scope

- Mode chill solo (hors multijoueur)
- Durées configurables manuellement par l'hôte
- Replay/replay de parties chill
- Statistiques spécifiques au mode chill dans les leaderboards globaux
