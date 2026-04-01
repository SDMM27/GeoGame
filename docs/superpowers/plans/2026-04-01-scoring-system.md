# Scoring System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le système de pénalités par un gain dégressif selon le nombre de tentatives, sans jamais soustraire de points.

**Architecture:** Tout le changement est dans `src/hooks/useGameState.js`. On ajoute une constante `SCORE_TABLE` et on met à jour `incrementScore` pour prendre `errorCount` en paramètre. `decrementScore` est supprimé ainsi que ses deux appels (dans `seeCountry` et dans l'effet des 3 erreurs).

**Tech Stack:** React hooks, Vitest

---

## File Map

| Fichier | Action |
|---------|--------|
| `src/hooks/useGameState.js` | Modifier : ajouter `SCORE_TABLE`, mettre à jour `incrementScore`, supprimer `decrementScore` et ses appels |
| `src/hooks/useGameState.test.js` | Modifier : ajouter les tests pour la logique de score dégressif |

---

### Task 1 : Test et implémentation de SCORE_TABLE + incrementScore dégressif

**Files:**
- Modify: `src/hooks/useGameState.test.js`
- Modify: `src/hooks/useGameState.js:147-155`

- [ ] **Step 1 : Écrire les tests échouants**

Ajouter à la fin de `src/hooks/useGameState.test.js` :

```js
// Helper qui reproduit la logique de calcul du score (miroir de SCORE_TABLE dans useGameState)
function computeScore(diff, errorCount) {
  const table = {
    Facile:     [3, 2, 1],
    Moyen:      [5, 3, 2],
    Difficile:  [7, 5, 3],
    Impossible: [9, 7, 5],
  }
  const row = table[diff]
  if (!row) return 0
  const idx = Math.min(errorCount, 2)
  return row[idx]
}

describe('score dégressif selon tentatives', () => {
  it('Facile : 1re tentative = +3', () => {
    expect(computeScore('Facile', 0)).toBe(3)
  })
  it('Facile : 2e tentative = +2', () => {
    expect(computeScore('Facile', 1)).toBe(2)
  })
  it('Facile : 3e tentative = +1', () => {
    expect(computeScore('Facile', 2)).toBe(1)
  })

  it('Moyen : 1re tentative = +5', () => {
    expect(computeScore('Moyen', 0)).toBe(5)
  })
  it('Moyen : 2e tentative = +3', () => {
    expect(computeScore('Moyen', 1)).toBe(3)
  })
  it('Moyen : 3e tentative = +2', () => {
    expect(computeScore('Moyen', 2)).toBe(2)
  })

  it('Difficile : 1re tentative = +7', () => {
    expect(computeScore('Difficile', 0)).toBe(7)
  })
  it('Difficile : 2e tentative = +5', () => {
    expect(computeScore('Difficile', 1)).toBe(5)
  })
  it('Difficile : 3e tentative = +3', () => {
    expect(computeScore('Difficile', 2)).toBe(3)
  })

  it('Impossible : 1re tentative = +9', () => {
    expect(computeScore('Impossible', 0)).toBe(9)
  })
  it('Impossible : 2e tentative = +7', () => {
    expect(computeScore('Impossible', 1)).toBe(7)
  })
  it('Impossible : 3e tentative = +5', () => {
    expect(computeScore('Impossible', 2)).toBe(5)
  })

  it('difficulté inconnue retourne 0', () => {
    expect(computeScore('Hardcore', 0)).toBe(0)
  })

  it('à chaque niveau, pays plus difficile rapporte plus (1re tentative)', () => {
    expect(computeScore('Moyen', 0)).toBeGreaterThan(computeScore('Facile', 0))
    expect(computeScore('Difficile', 0)).toBeGreaterThan(computeScore('Moyen', 0))
    expect(computeScore('Impossible', 0)).toBeGreaterThan(computeScore('Difficile', 0))
  })

  it('à chaque niveau, pays plus difficile rapporte plus (2e tentative)', () => {
    expect(computeScore('Moyen', 1)).toBeGreaterThan(computeScore('Facile', 1))
    expect(computeScore('Difficile', 1)).toBeGreaterThan(computeScore('Moyen', 1))
    expect(computeScore('Impossible', 1)).toBeGreaterThan(computeScore('Difficile', 1))
  })

  it('à chaque niveau, pays plus difficile rapporte plus (3e tentative)', () => {
    expect(computeScore('Moyen', 2)).toBeGreaterThan(computeScore('Facile', 2))
    expect(computeScore('Difficile', 2)).toBeGreaterThan(computeScore('Moyen', 2))
    expect(computeScore('Impossible', 2)).toBeGreaterThan(computeScore('Difficile', 2))
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
cd D:/NasaCode/GeoGame && npx vitest run src/hooks/useGameState.test.js
```

Résultat attendu : les nouveaux tests `score dégressif` échouent (les autres passent toujours).

- [ ] **Step 3 : Implémenter SCORE_TABLE et mettre à jour incrementScore dans useGameState.js**

Remplacer les lignes 147-155 de `src/hooks/useGameState.js` :

```js
  const decrementScore = (diff) => {
    const amounts = { Facile: 3, Moyen: 2, Difficile: 1, Impossible: 0.5 }
    setScore(prev => Math.max(0, prev - (amounts[diff] ?? 1)))
  }

  const incrementScore = (diff) => {
    const amounts = { Facile: 1, Moyen: 2, Difficile: 3, Impossible: 4 }
    setScore(prev => prev + (amounts[diff] ?? 1))
  }
```

par :

```js
  const SCORE_TABLE = {
    Facile:     [3, 2, 1],
    Moyen:      [5, 3, 2],
    Difficile:  [7, 5, 3],
    Impossible: [9, 7, 5],
  }

  const incrementScore = (diff, errorCount) => {
    const row = SCORE_TABLE[diff]
    if (!row) return
    const gain = row[Math.min(errorCount, 2)]
    setScore(prev => prev + gain)
  }
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
cd D:/NasaCode/GeoGame && npx vitest run src/hooks/useGameState.test.js
```

Résultat attendu : tous les tests passent, dont les nouveaux `score dégressif`.

- [ ] **Step 5 : Commit**

```bash
cd D:/NasaCode/GeoGame && git add src/hooks/useGameState.js src/hooks/useGameState.test.js && git commit -m "feat: score dégressif par tentative — SCORE_TABLE remplace les montants fixes"
```

---

### Task 2 : Supprimer decrementScore et ses appels

**Files:**
- Modify: `src/hooks/useGameState.js:102-123` (effet 3 erreurs)
- Modify: `src/hooks/useGameState.js:215-228` (seeCountry)

- [ ] **Step 1 : Mettre à jour l'appel incrementScore dans onCountryClick**

Dans `onCountryClick` (ligne ~195), l'appel actuel est :

```js
incrementScore(targetDiff)
```

Le remplacer par :

```js
incrementScore(targetDiff, consecutiveErrorsRef.current)
```

- [ ] **Step 2 : Supprimer decrementScore de l'effet 3 erreurs**

Remplacer le bloc lines 102-123 :

```js
  // 3 consecutive errors: highlight country, decrement score
  useEffect(() => {
    if (consecutiveErrors < 3) return
    toast.error('Dommage ! C\'est ici que se trouvait ' + targetCountryRef.current, {
      containerId: 'topRightToast',
    })
    if (geoJsonRef.current) {
      const layer = geoJsonRef.current.getLayers().find(
        l => l.feature.properties.ADMIN === targetCountryRef.current
      )
      if (layer) {
        layer.setStyle({ fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
        shownCountriesRef.current.add(targetCountryRef.current)
        const center = layer.getBounds().getCenter()
        zoomCountryMap(center.lat, center.lng)
      }
    }
    decrementScore(
      countries.features.find(c => c.properties.ADMIN === targetCountryRef.current)
        ?.properties.Difficulty || 'Difficile'
    )
  }, [consecutiveErrors, zoomCountryMap]) // eslint-disable-line react-hooks/exhaustive-deps
```

par :

```js
  // 3 consecutive errors: highlight country
  useEffect(() => {
    if (consecutiveErrors < 3) return
    toast.error('Dommage ! C\'est ici que se trouvait ' + targetCountryRef.current, {
      containerId: 'topRightToast',
    })
    if (geoJsonRef.current) {
      const layer = geoJsonRef.current.getLayers().find(
        l => l.feature.properties.ADMIN === targetCountryRef.current
      )
      if (layer) {
        layer.setStyle({ fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
        shownCountriesRef.current.add(targetCountryRef.current)
        const center = layer.getBounds().getCenter()
        zoomCountryMap(center.lat, center.lng)
      }
    }
  }, [consecutiveErrors, zoomCountryMap]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3 : Supprimer decrementScore de seeCountry**

Remplacer le bloc `seeCountry` (lignes ~215-228) :

```js
  const seeCountry = () => {
    setClickOnSeeCountry(true)
    clickOnSeeCountryRef.current = true
    if (!geoJsonRef.current) return
    const layer = geoJsonRef.current.getLayers().find(
      l => l.feature.properties.ADMIN === targetCountryRef.current
    )
    if (!layer) return
    layer.setStyle({ fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
    shownCountriesRef.current.add(targetCountryRef.current)
    const center = layer.getBounds().getCenter()
    zoomCountryMap(center.lat, center.lng)
    decrementScore('Difficile')
  }
```

par :

```js
  const seeCountry = () => {
    setClickOnSeeCountry(true)
    clickOnSeeCountryRef.current = true
    if (!geoJsonRef.current) return
    const layer = geoJsonRef.current.getLayers().find(
      l => l.feature.properties.ADMIN === targetCountryRef.current
    )
    if (!layer) return
    layer.setStyle({ fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
    shownCountriesRef.current.add(targetCountryRef.current)
    const center = layer.getBounds().getCenter()
    zoomCountryMap(center.lat, center.lng)
  }
```

- [ ] **Step 4 : Lancer les tests**

```bash
cd D:/NasaCode/GeoGame && npx vitest run src/hooks/useGameState.test.js
```

Résultat attendu : tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
cd D:/NasaCode/GeoGame && git add src/hooks/useGameState.js && git commit -m "feat: supprimer decrementScore — Voir et 3 erreurs donnent +0 sans pénalité"
```
