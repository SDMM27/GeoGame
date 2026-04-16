# Design : Filtrage par continent (Placement, Drapeaux, Capitales)

**Date :** 2026-04-16  
**Statut :** Validé

---

## Objectif

Permettre aux joueurs de jouer aux jeux de Placement, Drapeaux et Capitales filtrés par continent, en alternative au filtrage par difficulté existant.

---

## Continents

5 valeurs : `"Europe"`, `"Asie"`, `"Afrique"`, `"Amériques"`, `"Océanie"`.  
Pas d'Antarctique.

---

## 1. Données — Script Python

**Fichier :** `scripts/enrich_continent.py`

- Utilise `pycountry-convert` pour assigner automatiquement un champ `continent` à chaque pays via `ISO_A2`
- Mapping des continents anglais → français :
  - `AF` → `"Afrique"`
  - `AS` → `"Asie"`
  - `EU` → `"Europe"`
  - `NA` / `SA` → `"Amériques"`
  - `OC` → `"Océanie"`
- Un dictionnaire de fallback dans le script couvre les pays sans `ISO_A2` valide (ex : Kosovo → `"Europe"`)
- Le script patch `src/data/countriesWithDifficulty_FR.json` in-place

**Résultat dans le JSON :**
```json
{ "ADMIN": "France", "ISO_A2": "FR", "continent": "Europe", ... }
```

---

## 2. Interface — HomePage.jsx

Pour chacun des 3 jeux (Placement, Drapeaux, Capitales), la zone de sélection gagne deux onglets :

```
[ Par difficulté ]  [ Par continent ]
```

**Onglet "Par difficulté"** : boutons existants inchangés (Facile, Moyen, Difficile, Impossible, Hardcore).

**Onglet "Par continent"** : 5 boutons, chacun affichant le nombre de pays disponibles pour ce jeu spécifique.

```
[ Europe (45) ]  [ Asie (48) ]  [ Afrique (54) ]  [ Amériques (35) ]  [ Océanie (14) ]
```

- Cliquer un continent lance le jeu avec **tous** les pays de ce continent (sans filtre de difficulté)
- L'onglet actif est géré en state local par jeu — indépendant entre les 3 jeux
- Par défaut : onglet "Par difficulté" actif

---

## 3. Logique — Hooks

Les trois hooks concernés : `useGameState.js`, `useFlagGameState.js`, `useCapitalsGameState.js`.

**Changement :** accepter un paramètre `continent` (string | null) en alternative à `difficulty`.

- Si `continent` est fourni → filtrer `feature.properties.continent === continent`
- Si `difficulty` est fourni → comportement actuel inchangé
- Les deux sont mutuellement exclusifs

Le paramètre est transmis via le state de navigation React Router (comme `difficulty` actuellement).

---

## 4. Périmètre

| Composant | Modifié |
|---|---|
| `scripts/enrich_continent.py` | Nouveau |
| `src/data/countriesWithDifficulty_FR.json` | Champ `continent` ajouté |
| `src/pages/HomePage.jsx` | Onglets + boutons continent |
| `src/hooks/useGameState.js` | Filtre continent |
| `src/hooks/useFlagGameState.js` | Filtre continent |
| `src/hooks/useCapitalsGameState.js` | Filtre continent |

**Non touché :** BorderGuess, CountryClue, Ranking, Ascension, Multiplayer.
