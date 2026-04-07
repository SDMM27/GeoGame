# Mode Multijoueur — Design Spec

**Date :** 2026-04-07  
**Statut :** Approuvé

---

## Vue d'ensemble

Un mode multijoueur en temps réel où des joueurs s'affrontent sur une session de plusieurs jeux enchaînés. Tous les joueurs reçoivent les mêmes pays dans le même ordre (seed partagée), démarrent simultanément, et un classement par points est établi à la fin de chaque jeu puis agrégé en score final.

---

## Flux général

```
/multiplayer
    ├── Host crée une room → configure les jeux
    └── Reçoit un lien /multiplayer/room/{roomId}
            ↓
    Les joueurs rejoignent → entrent leur pseudo
            ↓
    Lobby (liste des joueurs en temps réel, host voit "Lancer")
            ↓
    Countdown synchronisé (5, 4, 3, 2, 1...)
            ↓
    Jeu en cours — même seed pour tous, progression live en sidebar
            ↓
    Tout le monde a fini → classement intermédiaire + points
            ↓
    Jeu suivant... jusqu'au dernier
            ↓
    Classement final (cumul des points de chaque jeu)
            ↓
    Host peut : Revanche / Reconfigurer / Retour accueil
```

---

## Routes

| Route | Description |
|-------|-------------|
| `/multiplayer` | Page d'accueil — créer ou rejoindre une room |
| `/multiplayer/room/:roomId` | Session complète (lobby → jeux → résultats), état interne |

Une seule route pour toute la session afin d'éviter les problèmes de synchronisation lors des transitions.

---

## Technologie temps réel

**Firestore avec `onSnapshot`** — déjà intégré dans le projet.

- Latence ~200-500ms, suffisante pour ce mode (une mise à jour par pays trouvé)
- Logique de room/lobby découplée de la logique de jeu pour permettre l'ajout de RTDB ou WebSocket sur un futur mode racing sans réécriture

---

## Modèle de données Firestore

### `rooms/{roomId}`

```js
{
  hostId: string,               // playerId du host (UUID)
  status: 'lobby' | 'playing' | 'between_games' | 'finished',
  currentGameIndex: number,     // index du jeu en cours (0-based)
  config: {
    games: [
      // Exemple PLACEMENT en mode standard
      { type: 'PLACEMENT', mode: 'standard', difficulty: 'Moyen' },
      // Exemple FLAGS en mode ascension
      { type: 'FLAGS', mode: 'ascension', phases: { Facile: 5, Moyen: 10, Difficile: 8, Impossible: 3 } },
      // Exemple BORDER_GUESS (pas de difficulté)
      { type: 'BORDER_GUESS', countryCount: 10 },
      // Exemple COUNTRY_CLUE (pas de difficulté)
      { type: 'COUNTRY_CLUE', countryCount: 1 },
    ],
  },
  seed: number,                 // seed global — génère localement la séquence de pays
  startAt: timestamp | null,    // timestamp de démarrage (now + 5s quand host lance)
  players: {
    [playerId]: {          // UUID généré côté client via crypto.randomUUID(), stocké en sessionStorage
      pseudo: string,
      totalPoints: number,
      disconnected: boolean,
    }
  },
  createdAt: timestamp,
}
```

### `rooms/{roomId}/progress/{playerId}`

Mis à jour en temps réel pendant le jeu.

```js
{
  gameIndex: number,
  countriesFound: number,   // pour la barre de progression live
  attempts: number,
  elapsedTime: number,
  finished: boolean,
  lastSeen: timestamp,      // pour détecter les déconnexions (>30s = disconnected)
}
```

### `rooms/{roomId}/gameResults/{gameIndex_playerId}`

Écrit quand tous les joueurs ont terminé un jeu.

```js
{
  playerId: string,
  gameIndex: number,
  attempts: number,
  elapsedTime: number,
  rank: number,
  points: number,
}
```

---

## Configuration de la room (host)

Le host configure la session avant de lancer :

### Jeux
- Sélection parmi les 5 jeux : PLACEMENT, FLAGS, CAPITALS, BORDER_GUESS, COUNTRY_CLUE
- Au moins 1 jeu requis
- Réordonnables (boutons haut/bas)

### Par jeu selon le type

**PLACEMENT, FLAGS, CAPITALS :**
- Mode **Standard** : sélection de difficulté (Facile / Moyen / Difficile / Impossible / Hardcore)
- Mode **Ascension** : même interface que solo (presets + sliders par difficulté)

**BORDER_GUESS, COUNTRY_CLUE :**
- Slider nombre de pays : 1 à max (pas de difficulté, pas d'ascension)

### Points
Calculés dynamiquement selon le nombre de joueurs :
- 2 joueurs : 2pts / 1pt
- 3 joueurs : 3pts / 2pts / 1pt
- N joueurs : N pts pour le 1er, N-1 pour le 2ème, ..., 1pt pour le dernier
- Non configurable par le host

---

## Lobby & synchronisation du démarrage

**Status `lobby` :**
- Les joueurs ouvrent le lien → écran "Entrer un pseudo" → "Rejoindre"
- Leur entrée s'ajoute dans `rooms/{roomId}.players` via Firestore
- Tous voient la liste des joueurs se mettre à jour en temps réel (onSnapshot)
- Host : bouton "Lancer la partie" (désactivé si < 2 joueurs)
- Autres : "En attente du lancement..."

**Démarrage synchronisé :**
1. Host clique "Lancer" → Firestore : `status = 'playing'`, `startAt = now() + 5s`
2. Tous les clients lisent `startAt` et affichent un countdown (5, 4, 3, 2, 1...)
3. À `startAt`, le jeu démarre côté client — pas de signal serveur supplémentaire

**Gestion des déconnexions :**
- `lastSeen` dans `progress` mis à jour toutes les 10s pendant le jeu
- Si `lastSeen` > 30s sans update → joueur marqué `disconnected: true`
- La partie continue sans attendre les joueurs déconnectés
- Si le host se déconnecte → le premier joueur non-déconnecté de la liste devient host

---

## Progression live pendant un jeu

Un panneau latéral (sidebar desktop / overlay compact mobile) affiche pour chaque joueur :

```
👤 PlayerA  ████████░░  8/15 pays
👤 PlayerB  ██████░░░░  6/15 pays
👤 Toi      ██████████  10/15 pays ✓ Fini ! (1:23.456)
```

- Mis à jour à chaque fois qu'un joueur trouve un pays (`countriesFound` dans `progress`)
- Quand un joueur termine : ✓ + son temps affiché
- Un joueur ayant fini continue de voir les autres jouer en live

**Seed partagée :**  
Le `seed` stocké dans la room est utilisé par un PRNG déterministe (ex: `mulberry32`) pour générer localement la même séquence de pays sur tous les clients — aucune transmission réseau de la liste.

---

## Transitions entre jeux

Quand tous les joueurs non-déconnectés ont `finished: true` pour le `currentGameIndex` courant :
1. Le client host calcule les rangs et points, les écrit dans `gameResults`
2. `status` passe à `'between_games'`
3. Tous voient l'écran de classement intermédiaire (résultats du jeu + cumul)
4. Après 10 secondes **ou** bouton "Suivant" (host uniquement) :
   - Si ce n'est pas le dernier jeu → `currentGameIndex++`, `status = 'playing'`
   - Si c'est le dernier jeu → `status = 'finished'` (classement final)

---

## Classements

### Classement intermédiaire (après chaque jeu)

Affiché en `between_games` :
- Résultats du jeu qui vient de se terminer (rang, tentatives, temps)
- Cumul des points depuis le début de la session

### Classement final

Affiché quand `status = 'finished'` :

```
🏆 Résultats finaux

1er  PlayerA   9 pts   (3 + 3 + 3)
2ème Toi        5 pts   (2 + 1 + 2)
3ème PlayerB    4 pts   (1 + 2 + 1)

Détail par jeu :
           Drapeaux   Capitales   Placement
PlayerA      🥇 3pt     🥇 3pt      🥇 3pt
Toi          🥈 2pt     🥉 1pt      🥈 2pt
PlayerB      🥉 1pt     🥈 2pt      🥉 1pt
```

---

## Actions en fin de partie (host)

| Action | Comportement |
|--------|-------------|
| **Revanche** | Même config, nouvelle seed, retour lobby |
| **Reconfigurer** | Retour à l'écran de config, puis retour lobby — les autres voient "En attente du host..." |
| **Retour accueil** | Ferme la session |

Lors d'une reconfiguration, le host peut inviter de nouvelles personnes en repartageant le lien (la room repasse en `lobby`).

---

## Ce qui n'est pas dans ce scope

- Authentification (comptes utilisateurs) — les joueurs utilisent un pseudo ephémère
- Historique des parties multijoueur sauvegardé dans Firestore
- Mode racing temps réel (premier à répondre gagne le round) — nécessiterait RTDB/WebSocket, prévu comme mode futur possible
- Chat entre joueurs
