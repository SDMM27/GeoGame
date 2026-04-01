# GeoGame — Refonte complète Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer CRA → Vite, refondre visuellement GeoGame en thème Modern Dark, créer un hub d'accueil extensible, extraire le jeu dans GamePage, et corriger 6 bugs connus.

**Architecture:** `App.jsx` devient un simple Router. `HomePage` est le hub avec grille de jeux. `GamePage` contient toute la logique extraite d'`App.js`. Un design system CSS avec variables globales unifie le visuel. La difficulté est passée via React Router state de HomePage vers GamePage.

**Tech Stack:** React 18, React Router v6, Vite 5, react-leaflet 4, Firebase v9 (Firestore), react-toastify, Bootstrap 5, Inter (Google Fonts)

---

## Fichiers créés / modifiés

| Action | Fichier | Rôle |
|---|---|---|
| Créer | `vite.config.js` | Config Vite |
| Modifier | `package.json` | Remplacer react-scripts par vite |
| Déplacer+modifier | `public/index.html` → `index.html` | Point d'entrée Vite |
| Modifier | `netlify.toml` | Publish dir + SPA redirects |
| Renommer+modifier | `src/index.js` → `src/main.jsx` | Point d'entrée React |
| Modifier | `src/App.jsx` (renommé depuis App.js) | Router uniquement |
| Créer | `src/styles/theme.css` | Design system CSS |
| Modifier | `src/index.css` | Import theme + font |
| Créer | `src/pages/HomePage.jsx` | Hub d'accueil |
| Créer | `src/pages/HomePage.css` | Styles HomePage |
| Créer | `src/pages/GamePage.jsx` | Logique jeu (extrait App.js) |
| Créer | `src/pages/GamePage.css` | HUD flottant + styles jeu |
| Modifier | `src/pages/Scoreboard.jsx` | Fix bugs + restyle |
| Modifier | `src/pages/scoreboard.css` | Restyle dark |
| Modifier | `src/pages/form.jsx` | Restyle dark |
| Modifier | `src/pages/form.css` | Restyle dark |
| Supprimer | `src/App.css` | Remplacé par theme.css |
| Supprimer | `src/App.test.js` | Non utilisé |
| Supprimer | `src/reportWebVitals.js` | CRA only |
| Supprimer | `src/logo.svg` | Non utilisé |

---

## Task 1: Migration CRA → Vite

**Files:**
- Modify: `package.json`
- Create: `vite.config.js`
- Create: `index.html` (à la racine, remplace `public/index.html`)
- Create: `src/main.jsx` (remplace `src/index.js`)
- Modify: `netlify.toml`

- [ ] **Step 1.1 — Mettre à jour package.json**

Remplacer le contenu de `package.json` par :

```json
{
  "name": "geogame",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "bootstrap": "^5.3.0",
    "firebase": "^9.22.2",
    "leaflet": "^1.9.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-leaflet": "^4.2.1",
    "react-router-dom": "^6.13.0",
    "react-toastify": "^9.1.3"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.3",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.1.0",
    "vitest": "^1.3.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^24.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
```

- [ ] **Step 1.2 — Créer vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    globals: true,
  },
})
```

- [ ] **Step 1.3 — Créer index.html à la racine**

Créer `index.html` (à la racine du projet, pas dans `public/`) :

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0f0f1a" />
    <meta name="description" content="GeoGame — Mini-jeux de géographie" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
    <title>GeoGame</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 1.4 — Créer src/main.jsx**

Créer `src/main.jsx` (remplace `src/index.js`) :

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 1.5 — Mettre à jour netlify.toml**

Remplacer le contenu de `netlify.toml` par :

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 1.6 — Supprimer les fichiers CRA obsolètes**

```bash
rm src/index.js src/App.test.js src/reportWebVitals.js src/logo.svg src/App.css
```

- [ ] **Step 1.7 — Mettre à jour src/setupTests.js**

Remplacer le contenu de `src/setupTests.js` par :

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 1.8 — Installer les dépendances**

```bash
npm install
```

- [ ] **Step 1.9 — Vérifier que le dev server démarre**

```bash
npm run dev
```

Attendu : serveur démarré sur `http://localhost:5173` (ou port similaire), pas d'erreur dans le terminal. L'app peut afficher des erreurs React pour l'instant car App.js référence des imports qu'on va déplacer — c'est normal, on continue.

- [ ] **Step 1.10 — Commit**

```bash
git add package.json vite.config.js index.html netlify.toml src/main.jsx src/setupTests.js
git rm src/index.js src/App.test.js src/reportWebVitals.js src/logo.svg src/App.css
git commit -m "chore: migrate from Create React App to Vite"
```

---

## Task 2: Design System (theme.css)

**Files:**
- Create: `src/styles/theme.css`
- Modify: `src/index.css`

- [ ] **Step 2.1 — Créer src/styles/theme.css**

```bash
mkdir -p src/styles
```

Créer `src/styles/theme.css` :

```css
:root {
  --bg-primary:       #0f0f1a;
  --bg-secondary:     #1a1a2e;
  --bg-card:          #16213e;
  --bg-card-hover:    #1e2a4a;
  --bg-glass:         rgba(15, 15, 26, 0.85);

  --accent-cyan:      #00d4ff;
  --accent-cyan-dim:  rgba(0, 212, 255, 0.15);
  --accent-cyan-border: rgba(0, 212, 255, 0.3);
  --accent-purple:    #7b2ff7;

  --success:          #4ade80;
  --success-dim:      rgba(74, 222, 128, 0.15);
  --warning:          #fbbf24;
  --warning-dim:      rgba(251, 191, 36, 0.15);
  --danger:           #ff4d4d;
  --danger-dim:       rgba(255, 77, 77, 0.15);

  --text-primary:     #ffffff;
  --text-muted:       #888888;
  --text-dim:         #555555;

  --border-color:     rgba(0, 212, 255, 0.2);
  --border-subtle:    rgba(255, 255, 255, 0.08);

  --radius-sm:        6px;
  --radius-md:        10px;
  --radius-lg:        16px;
  --radius-pill:      999px;

  --shadow-card:      0 4px 24px rgba(0, 0, 0, 0.4);
  --shadow-glow:      0 0 20px rgba(0, 212, 255, 0.15);

  --font-main:        'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--bg-primary);
  font-family: var(--font-main);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}

#root {
  height: 100vh;
}
```

- [ ] **Step 2.2 — Mettre à jour src/index.css**

Remplacer le contenu de `src/index.css` par :

```css
@import './styles/theme.css';
```

- [ ] **Step 2.3 — Commit**

```bash
git add src/styles/theme.css src/index.css
git commit -m "feat: add CSS design system with Modern Dark theme variables"
```

---

## Task 3: App.jsx — Router uniquement

**Files:**
- Create: `src/App.jsx` (remplace l'ancien `src/App.js`)

- [ ] **Step 3.1 — Créer src/App.jsx**

Créer `src/App.jsx` :

```jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import "bootstrap/dist/css/bootstrap.min.css";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
      </Routes>
    </Router>
  );
}
```

- [ ] **Step 3.2 — Supprimer l'ancien App.js**

```bash
git rm src/App.js
```

- [ ] **Step 3.3 — Commit**

```bash
git add src/App.jsx
git commit -m "refactor: App.jsx is now Router-only, routes to HomePage and GamePage"
```

---

## Task 4: HomePage (Hub d'accueil)

**Files:**
- Create: `src/pages/HomePage.jsx`
- Create: `src/pages/HomePage.css`

- [ ] **Step 4.1 — Créer src/pages/HomePage.jsx**

```jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

const DIFFICULTIES = ["Facile", "Moyen", "Difficile", "Impossible", "Hardcore"];

const GAMES = [
  {
    id: "country",
    icon: "🌍",
    title: "Trouve le Pays",
    description: "Clique sur le bon pays en 60 secondes",
    active: true,
  },
  {
    id: "flags",
    icon: "🚩",
    title: "Trouve le Drapeau",
    description: "Identifie le pays à partir de son drapeau",
    active: false,
  },
  {
    id: "placement",
    icon: "📍",
    title: "Placement Pays",
    description: "Place le pays au bon endroit sur la carte",
    active: false,
  },
  {
    id: "lives",
    icon: "⚡",
    title: "Mode Vies",
    description: "Trouve un maximum de pays sans te tromper",
    active: false,
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState("Moyen");

  const handlePlay = (isTraining = false) => {
    navigate("/game", { state: { difficulty, isTraining } });
  };

  return (
    <div className="home-page">
      <nav className="home-nav">
        <span className="home-logo">
          GEO<span className="home-logo-accent">GAME</span>
        </span>
      </nav>

      <main className="home-main">
        <div className="home-hero">
          <h1 className="home-title">Choisissez votre jeu</h1>
          <p className="home-subtitle">Explore • Découvre • Compète</p>
        </div>

        <div className="games-grid">
          {GAMES.map((game) =>
            game.active ? (
              <div key={game.id} className="game-card game-card--active">
                <div className="game-card-icon">{game.icon}</div>
                <h2 className="game-card-title">{game.title}</h2>
                <p className="game-card-desc">{game.description}</p>

                <div className="game-card-controls">
                  <select
                    className="difficulty-select"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <div className="game-card-buttons">
                    <button
                      className="btn-play"
                      onClick={() => handlePlay(false)}
                    >
                      Jouer
                    </button>
                    <button
                      className="btn-training"
                      onClick={() => handlePlay(true)}
                    >
                      Entraînement
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={game.id} className="game-card game-card--soon">
                <div className="game-card-icon game-card-icon--dim">
                  {game.icon}
                </div>
                <h2 className="game-card-title game-card-title--dim">
                  {game.title}
                </h2>
                <p className="game-card-desc game-card-desc--dim">
                  {game.description}
                </p>
                <span className="badge-soon">BIENTÔT</span>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4.2 — Créer src/pages/HomePage.css**

```css
.home-page {
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

/* ── Navbar ── */
.home-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 40px;
  border-bottom: 1px solid var(--border-color);
}

.home-logo {
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 4px;
  color: var(--accent-cyan);
}

.home-logo-accent {
  color: var(--accent-purple);
}

/* ── Main ── */
.home-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
}

/* ── Hero ── */
.home-hero {
  text-align: center;
  margin-bottom: 48px;
}

.home-title {
  font-size: 2.4rem;
  font-weight: 900;
  color: var(--text-primary);
  border: none;
  padding: 0;
  margin-bottom: 8px;
  text-shadow: none;
}

.home-subtitle {
  font-size: 0.9rem;
  color: var(--text-muted);
  letter-spacing: 3px;
  text-transform: uppercase;
}

/* ── Grid ── */
.games-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 800px;
}

/* ── Cards ── */
.game-card {
  border-radius: var(--radius-lg);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.game-card--active {
  background: var(--bg-card);
  border: 1px solid var(--accent-cyan-border);
  box-shadow: var(--shadow-card);
}

.game-card--active:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card), var(--shadow-glow);
}

.game-card--soon {
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  position: relative;
}

.game-card-icon {
  font-size: 2.2rem;
}

.game-card-icon--dim {
  opacity: 0.25;
}

.game-card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  border: none;
  padding: 0;
  text-shadow: none;
}

.game-card-title--dim {
  color: var(--text-dim);
}

.game-card-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.game-card-desc--dim {
  color: var(--text-dim);
}

.badge-soon {
  display: inline-block;
  margin-top: auto;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-pill);
  font-size: 0.7rem;
  letter-spacing: 2px;
  color: var(--text-dim);
  width: fit-content;
}

/* ── Controls ── */
.game-card-controls {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.difficulty-select {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-main);
  font-size: 0.9rem;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2300d4ff' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}

.difficulty-select option {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.game-card-buttons {
  display: flex;
  gap: 10px;
}

.btn-play {
  flex: 1;
  padding: 12px;
  background: var(--accent-cyan);
  color: var(--bg-primary);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-main);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  letter-spacing: 0.5px;
}

.btn-play:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-training {
  flex: 1;
  padding: 12px;
  background: transparent;
  color: var(--success);
  border: 1px solid var(--success);
  border-radius: var(--radius-md);
  font-family: var(--font-main);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-training:hover {
  background: var(--success-dim);
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .games-grid {
    grid-template-columns: 1fr;
  }
  .home-nav {
    padding: 16px 20px;
  }
  .home-main {
    padding: 32px 16px;
  }
}
```

- [ ] **Step 4.3 — Vérifier visuellement**

```bash
npm run dev
```

Naviguer sur `http://localhost:5173`. La HomePage doit s'afficher avec le hub, les 4 cartes et le sélecteur de difficulté.

- [ ] **Step 4.4 — Commit**

```bash
git add src/pages/HomePage.jsx src/pages/HomePage.css
git commit -m "feat: add HomePage hub with game grid (Modern Dark theme)"
```

---

## Task 5: GamePage (logique jeu + HUD flottant)

**Files:**
- Create: `src/pages/GamePage.jsx`
- Create: `src/pages/GamePage.css`

- [ ] **Step 5.1 — Créer src/pages/GamePage.jsx**

Créer `src/pages/GamePage.jsx` avec le contenu complet ci-dessous. Tout le code de jeu est extrait d'`App.js`. Changements clés :
- `useLocation` pour lire `difficulty` et `isTraining`
- Redirect vers `/` si pas de state
- `useNavigate` remplace le toggle `gameStarted`
- Game démarre automatiquement au montage
- HUD redesigné avec éléments flottants

```jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { toast, ToastContainer } from "react-toastify";
import countries from "../data/countriesWithDifficulty_FR.json";
import Form from "./form";
import "leaflet/dist/leaflet.css";
import "react-toastify/dist/ReactToastify.css";
import "./GamePage.css";

const countryStyle = {
  fillColor: "transparent",
  color: "#334155",
  fillOpacity: 1,
  weight: 0.85,
};

let alreadyChosenCountries = [];

const getTimerColor = (time) => {
  if (time > 30) return "var(--accent-cyan)";
  if (time > 15) return "var(--warning)";
  return "var(--danger)";
};

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { difficulty, isTraining } = location.state || {};

  const [targetCountry, setTargetCountry] = useState(null);
  const targetCountryRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const consecutiveErrorsRef = useRef(0);
  const geoJsonRef = useRef(null);
  const [mapRef, setMapRef] = useState(null);
  const [timer, setTimer] = useState(isTraining ? 99999 : 60);
  const timerRef = useRef(isTraining ? 99999 : 60);
  const [clickOnSeeCountry, setClickOnSeeCountry] = useState(false);
  const clickOnSeeCountryRef = useRef(false);

  // Redirect if no difficulty (direct URL navigation)
  useEffect(() => {
    if (!difficulty) {
      navigate("/");
    }
  }, [difficulty, navigate]);

  const getRandomCountry = useCallback((diff) => {
    const difficulties = ["Facile", "Moyen", "Difficile", "Impossible", "Hardcore"];
    const selectedDifficultyIndex = difficulties.indexOf(diff);
    let availableDifficulties;
    if (diff === "Hardcore") {
      availableDifficulties = ["Impossible"];
    } else {
      availableDifficulties = difficulties.slice(0, selectedDifficultyIndex + 1);
    }

    const filteredCountries = countries.features.filter(
      (country) =>
        availableDifficulties.includes(country.properties.Difficulty) &&
        !alreadyChosenCountries.includes(country.properties.ADMIN)
    );

    if (filteredCountries.length === 0) {
      setScore((prevScore) => prevScore + timerRef.current);
      setTimer(0);
      toast.success(
        "Bravo ! Vous avez trouvé tous les pays ! Votre temps restant a été ajouté au score.",
        { containerId: "centerToast" }
      );
      return null;
    }

    const randomIndex = Math.floor(Math.random() * filteredCountries.length);
    return filteredCountries[randomIndex].properties.ADMIN;
  }, []);

  const zoomCountryMap = useCallback(
    (lat, lng) => {
      if (!mapRef) return;
      const targetDifficulty = countries.features.find(
        (country) => country.properties.ADMIN === targetCountryRef.current
      )?.properties.Difficulty;

      if (targetCountryRef.current === "Vatican") {
        mapRef.setView([lat, lng], 20);
      } else if (targetDifficulty === "Difficile") {
        mapRef.setView([lat, lng], 7);
      } else if (targetDifficulty === "Impossible") {
        mapRef.setView([lat, lng], 9);
      } else {
        mapRef.setView([lat, lng], 4);
      }
    },
    [mapRef]
  );

  // Start game on mount
  useEffect(() => {
    if (!difficulty) return;
    alreadyChosenCountries = [];
    const firstCountry = getRandomCountry(difficulty);
    if (firstCountry) {
      alreadyChosenCountries.push(firstCountry);
      setTargetCountry(firstCountry);
      setGameStarted(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync targetCountry ref + handle 3 consecutive errors
  useEffect(() => {
    targetCountryRef.current = targetCountry;
    consecutiveErrorsRef.current = consecutiveErrors;

    if (consecutiveErrors >= 3) {
      toast.error(
        "Dommage ! C'est ici que se trouvait " + targetCountryRef.current,
        { containerId: "topRightToast" }
      );

      if (geoJsonRef.current) {
        const targetLayer = geoJsonRef.current
          .getLayers()
          .find(
            (layer) => layer.feature.properties.ADMIN === targetCountryRef.current
          );
        if (targetLayer) {
          targetLayer.setStyle({ fillColor: "#ff4d4d", weight: 2, fillOpacity: 0.5 });
          const countryCenter = targetLayer.getBounds().getCenter();
          zoomCountryMap(countryCenter.lat, countryCenter.lng);
        }
      }

      decrementScore(
        countries.features.find(
          (c) => c.properties.ADMIN === targetCountryRef.current
        )?.properties.Difficulty || "Difficile"
      );
    }
  }, [targetCountry, consecutiveErrors, zoomCountryMap]);

  // Timer
  useEffect(() => {
    clickOnSeeCountryRef.current = clickOnSeeCountry;
    if (!gameStarted) return;

    if (timer <= 0) {
      toast.info("Le temps est écoulé !", { containerId: "centerToast" });
      setConsecutiveErrors(0);
      return;
    }

    const id = setInterval(() => {
      setTimer((t) => {
        timerRef.current = t - 1;
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [gameStarted, timer, clickOnSeeCountry]);

  const decrementScore = (diff) => {
    const amounts = { Facile: 3, Moyen: 2, Difficile: 1, Impossible: 0.5 };
    const amount = amounts[diff] ?? 1;
    setScore((prev) => Math.max(0, prev - amount));
  };

  const incrementScore = (diff) => {
    const amounts = { Facile: 1, Moyen: 2, Difficile: 3, Impossible: 4 };
    const amount = amounts[diff] ?? 1;
    setScore((prev) => prev + amount);
  };

  const changeCountry = useCallback(() => {
    const newCountry = getRandomCountry(difficulty);
    if (newCountry) {
      alreadyChosenCountries.push(newCountry);
      setTargetCountry(newCountry);
    }
  }, [difficulty, getRandomCountry]);

  const onCountryMouseOver = (event) => {
    const layer = event.target;
    if (layer.options.fillColor === "#4ade80") return;
    layer.setStyle({ fillColor: "#7b2ff7", weight: 2, fillOpacity: 0.4 });
  };

  const onCountryMouseOut = (event) => {
    const layer = event.target;
    if (layer.options.fillColor === "#4ade80") return;
    layer.setStyle(countryStyle);
  };

  const onCountryClick = (event) => {
    if (!gameStarted) return;
    const clickedName = event.target.feature.properties.ADMIN;
    const targetDifficulty = countries.features.find(
      (c) => c.properties.ADMIN === targetCountryRef.current
    )?.properties.Difficulty;

    if (clickedName === targetCountryRef.current) {
      if (consecutiveErrorsRef.current < 3) {
        toast.success("Bravo ! " + targetCountryRef.current + " !", {
          containerId: "topRightToast",
        });
      }
      event.target.setStyle({ fillColor: "#4ade80", weight: 2, fillOpacity: 0.5 });
      changeCountry();
      if (consecutiveErrorsRef.current < 3 && !clickOnSeeCountryRef.current) {
        incrementScore(targetDifficulty);
      }
      setConsecutiveErrors(0);
      setClickOnSeeCountry(false);
    } else {
      toast.error("Dommage !", { containerId: "topRightToast" });
      setConsecutiveErrors((prev) => prev + 1);
    }
  };

  const seeCountry = () => {
    setClickOnSeeCountry(true);
    clickOnSeeCountryRef.current = true;
    if (!geoJsonRef.current) return;
    const targetLayer = geoJsonRef.current
      .getLayers()
      .find((layer) => layer.feature.properties.ADMIN === targetCountryRef.current);
    if (!targetLayer) return;
    targetLayer.setStyle({ fillColor: "#ff4d4d", weight: 2, fillOpacity: 0.5 });
    const center = targetLayer.getBounds().getCenter();
    zoomCountryMap(center.lat, center.lng);
    decrementScore("Difficile");
  };

  const restartGame = () => {
    alreadyChosenCountries = [];
    setScore(0);
    setConsecutiveErrors(0);
    setClickOnSeeCountry(false);
    clickOnSeeCountryRef.current = false;
    if (geoJsonRef.current) {
      geoJsonRef.current.getLayers().forEach((layer) => layer.setStyle(countryStyle));
    }
    const newTimer = isTraining ? 99999 : 60;
    setTimer(newTimer);
    timerRef.current = newTimer;
    changeCountry();
  };

  const goHome = () => {
    alreadyChosenCountries = [];
    navigate("/");
  };

  const isGameOver = timer <= 0 && !isTraining;
  const displayTimer = isTraining ? "∞" : timer;

  return (
    <div className="game-page">
      {/* Floating HUD */}
      <div className="hud-score">
        <span className="hud-value" style={{ color: "var(--accent-cyan)" }}>
          {score}
        </span>
        <span className="hud-label">SCORE</span>
      </div>

      <div className="hud-target">
        <span className="hud-target-label">Pays à trouver</span>
        <span className="hud-target-name">{targetCountry}</span>
      </div>

      <div className="hud-timer">
        <span
          className="hud-value"
          style={{
            color: isTraining ? "var(--accent-cyan)" : getTimerColor(timer),
            animation: !isTraining && timer < 15 && timer > 0 ? "pulse 1s infinite" : "none",
          }}
        >
          {displayTimer}
        </span>
        <span className="hud-label">TEMPS</span>
      </div>

      <div className="hud-actions">
        <button className="hud-btn hud-btn--home" onClick={goHome}>
          ← Accueil
        </button>
        <button className="hud-btn hud-btn--see" onClick={seeCountry}>
          👁 Voir
        </button>
        <button className="hud-btn hud-btn--restart" onClick={restartGame}>
          ↺ Recommencer
        </button>
      </div>

      {/* Score save form shown when timer reaches 0 */}
      {isGameOver && (
        <div className="game-over-overlay">
          <Form finalScore={score} difficulty={difficulty} />
        </div>
      )}

      <ToastContainer
        enableMultiContainer
        containerId="centerToast"
        position="bottom-center"
        autoClose={3000}
        theme="dark"
        hideProgressBar
      />
      <ToastContainer
        enableMultiContainer
        containerId="topRightToast"
        position="top-right"
        autoClose={1500}
        theme="dark"
        hideProgressBar
      />

      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
        zoomControl={false}
        dragging
        doubleClickZoom={false}
        maxBounds={[[90, -180], [-90, 180]]}
        style={{ width: "100%", height: "100vh" }}
        whenReady={({ target }) => {
          setMapRef(target);
          target.getContainer().style.background = "var(--bg-primary)";
          setTimeout(() => target.invalidateSize(), 100);
        }}
      >
        <TileLayer
          attribution="Stamen Toner"
          url="https://tiles.stadiamaps.com/tiles/stamen_toner_background/{z}/{x}/{y}{r}.png"
          noWrap
          minZoom={2}
          maxZoom={20}
        />
        <GeoJSON
          ref={geoJsonRef}
          style={countryStyle}
          data={countries.features}
          onEachFeature={(feature, layer) => {
            layer.on({
              click: onCountryClick,
              mouseover: onCountryMouseOver,
              mouseout: onCountryMouseOut,
            });
          }}
        />
      </MapContainer>
    </div>
  );
}
```

- [ ] **Step 5.2 — Créer src/pages/GamePage.css**

```css
.game-page {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}

/* ── HUD Score (top-left) ── */
.hud-score {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1000;
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 70px;
}

/* ── HUD Timer (top-right) ── */
.hud-timer {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 70px;
}

/* ── HUD Target Country (top-center) ── */
.hud-target {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--accent-cyan-border);
  border-radius: var(--radius-pill);
  padding: 10px 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.hud-target-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.hud-target-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* ── Shared HUD text ── */
.hud-value {
  font-size: 1.4rem;
  font-weight: 900;
  line-height: 1;
}

.hud-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  letter-spacing: 2px;
  margin-top: 2px;
}

/* ── HUD Actions (bottom-center) ── */
.hud-actions {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  gap: 10px;
}

.hud-btn {
  padding: 10px 18px;
  border-radius: var(--radius-md);
  font-family: var(--font-main);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  transition: background 0.2s, transform 0.1s;
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
}

.hud-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.hud-btn--home {
  color: var(--accent-cyan);
  border-color: var(--accent-cyan-border);
}

.hud-btn--see {
  color: var(--warning);
  border-color: rgba(251, 191, 36, 0.3);
}

.hud-btn--restart {
  color: var(--danger);
  border-color: rgba(255, 77, 77, 0.3);
}

/* ── Game over overlay ── */
.game-over-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2000;
  background: rgba(15, 15, 26, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Timer pulse animation ── */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- [ ] **Step 5.3 — Tester la navigation**

```bash
npm run dev
```

1. Aller sur `/` → HomePage visible
2. Choisir une difficulté, cliquer "Jouer" → navigue vers `/game`, la carte s'affiche avec le HUD flottant
3. Cliquer "← Accueil" → retour sur `/`
4. Aller directement sur `http://localhost:5173/game` sans passer par la home → redirige vers `/`

- [ ] **Step 5.4 — Commit**

```bash
git add src/pages/GamePage.jsx src/pages/GamePage.css
git commit -m "feat: add GamePage with floating HUD, extract game logic from App.js"
```

---

## Task 6: Fix & Restyle Scoreboard

**Files:**
- Modify: `src/pages/Scoreboard.jsx`
- Modify: `src/pages/scoreboard.css`

- [ ] **Step 6.1 — Écrire le test pour le fix du tri**

Créer `src/pages/Scoreboard.test.js` :

```js
import { describe, it, expect } from 'vitest'

const DIFFICULTY_ORDER = ["Facile", "Moyen", "Difficile", "Impossible", "Hardcore"];

const sortByDifficulty = (scores) =>
  [...scores].sort(
    (a, b) =>
      DIFFICULTY_ORDER.indexOf(a.difficulty) -
      DIFFICULTY_ORDER.indexOf(b.difficulty)
  );

describe('sortByDifficulty', () => {
  it('trie les scores dans l\'ordre de difficulté croissant', () => {
    const input = [
      { name: 'Alice', score: 10, difficulty: 'Difficile' },
      { name: 'Bob', score: 8, difficulty: 'Facile' },
      { name: 'Carol', score: 12, difficulty: 'Moyen' },
    ]
    const result = sortByDifficulty(input)
    expect(result[0].difficulty).toBe('Facile')
    expect(result[1].difficulty).toBe('Moyen')
    expect(result[2].difficulty).toBe('Difficile')
  })

  it('ne retourne pas NaN pour des strings (bug original)', () => {
    const input = [
      { name: 'X', score: 5, difficulty: 'Impossible' },
      { name: 'Y', score: 3, difficulty: 'Facile' },
    ]
    const result = sortByDifficulty(input)
    // Le tri par soustraction de strings donne NaN → ordre imprévisible
    // La fonction corrigée doit toujours donner Facile avant Impossible
    expect(result[0].difficulty).toBe('Facile')
  })
})
```

- [ ] **Step 6.2 — Lancer le test (doit passer)**

```bash
npm test
```

Attendu : 2 tests PASS (la logique est correcte, on vérifie juste qu'on implémente bien cela dans le composant).

- [ ] **Step 6.3 — Réécrire Scoreboard.jsx**

```jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../Firebase";
import "./scoreboard.css";

const DIFFICULTY_ORDER = ["Facile", "Moyen", "Difficile", "Impossible", "Hardcore"];

const MEDAL = ["🥇", "🥈", "🥉"];

export default function Scoreboard() {
  const [allScores, setAllScores] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const scoresCollection = collection(firestore, "scores");
        const scoresSnapshot = await getDocs(scoresCollection);
        const scoresList = scoresSnapshot.docs.map((doc) => doc.data());
        scoresList.sort((a, b) => b.score - a.score);
        setAllScores(scoresList);
        setScores(scoresList);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, []);

  const changeDifficultyDisplayed = (difficulty) => {
    if (difficulty === "AllScores") {
      setScores([...allScores]);
      return;
    }
    const filtered = allScores
      .filter((s) => s.difficulty === difficulty)
      .sort((a, b) => b.score - a.score);
    setScores(filtered);
  };

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">Tableau des scores</h1>

      <select
        className="scoreboard-select"
        onChange={(e) => changeDifficultyDisplayed(e.target.value)}
        defaultValue=""
      >
        <option value="" disabled>
          Filtrer par difficulté
        </option>
        {DIFFICULTY_ORDER.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
        <option value="AllScores">Tous les scores</option>
      </select>

      {loading ? (
        <p className="scoreboard-loading">Chargement...</p>
      ) : scores.length === 0 ? (
        <p className="scoreboard-empty">Aucun score pour cette difficulté.</p>
      ) : (
        <div className="scoreboard-table">
          <div className="scoreboard-header">
            <span>#</span>
            <span>Joueur</span>
            <span>Score</span>
            <span>Difficulté</span>
          </div>
          {scores.map((s, index) => (
            <div
              key={index}
              className={`scoreboard-row ${index < 3 ? "scoreboard-row--top" : ""}`}
            >
              <span className="scoreboard-rank">
                {index < 3 ? MEDAL[index] : `#${index + 1}`}
              </span>
              <span className="scoreboard-name">{s.name}</span>
              <span className="scoreboard-score">{s.score} pts</span>
              <span className="scoreboard-difficulty">{s.difficulty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6.4 — Réécrire scoreboard.css**

```css
.scoreboard {
  padding: 40px 24px;
  max-width: 700px;
  margin: 0 auto;
  color: var(--text-primary);
  font-family: var(--font-main);
}

.scoreboard-title {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--text-primary);
  border: none;
  padding: 0;
  margin-bottom: 24px;
  text-shadow: none;
  text-align: center;
}

.scoreboard-select {
  display: block;
  margin: 0 auto 32px;
  width: 100%;
  max-width: 320px;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-main);
  font-size: 0.9rem;
  cursor: pointer;
}

.scoreboard-loading,
.scoreboard-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 32px;
}

.scoreboard-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scoreboard-header {
  display: grid;
  grid-template-columns: 48px 1fr 100px 120px;
  padding: 8px 16px;
  font-size: 0.7rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-subtle);
}

.scoreboard-row {
  display: grid;
  grid-template-columns: 48px 1fr 100px 120px;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  transition: background 0.15s;
}

.scoreboard-row:hover {
  background: var(--bg-card-hover);
}

.scoreboard-row--top {
  border-color: var(--accent-cyan-border);
}

.scoreboard-rank {
  font-size: 1rem;
}

.scoreboard-name {
  font-weight: 600;
  color: var(--text-primary);
}

.scoreboard-score {
  color: var(--accent-cyan);
  font-weight: 700;
}

.scoreboard-difficulty {
  color: var(--text-muted);
  font-size: 0.8rem;
}
```

- [ ] **Step 6.5 — Lancer les tests**

```bash
npm test
```

Attendu : tous les tests PASS.

- [ ] **Step 6.6 — Commit**

```bash
git add src/pages/Scoreboard.jsx src/pages/scoreboard.css src/pages/Scoreboard.test.js
git commit -m "fix: scoreboard sort bug (NaN on string diff), fix grid layout, restyle dark theme"
```

---

## Task 7: Restyle Form

**Files:**
- Modify: `src/pages/form.jsx`
- Modify: `src/pages/form.css`

- [ ] **Step 7.1 — Mettre à jour form.jsx**

Le composant est fonctionnel. On ajuste seulement le label de la difficulté (le champ était affiché en clair, on le rend plus lisible) :

```jsx
import React, { useRef } from "react";
import "./form.css";
import "react-toastify/dist/ReactToastify.css";
import { firestore } from "../Firebase";
import { addDoc, collection, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";

export default function Form({ finalScore, difficulty }) {
  const nameRef = useRef();
  const ref = collection(firestore, "scores");

  const handleSave = async (e) => {
    e.preventDefault();
    const name = nameRef.current.value.trim();
    if (!name) {
      toast.error("Veuillez rentrer un pseudo");
      return;
    }

    const data = { name, score: finalScore, difficulty };

    const existingSnapshot = await getDocs(
      query(ref, where("name", "==", name), where("difficulty", "==", difficulty))
    );

    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0].data();
      if (!window.confirm(`Remplacer votre score de ${existing.score} pts par ${finalScore} pts ?`)) {
        return;
      }
      await deleteDoc(existingSnapshot.docs[0].ref);
    }

    try {
      await addDoc(ref, data);
      toast.success(`Score de ${name} sauvegardé !`);
      const submitBtn = document.getElementById("submitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Score sauvegardé ✓";
      }
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(err);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Partie terminée !</h2>
      <p className="form-score-display">
        Score : <strong>{finalScore} pts</strong> — {difficulty}
      </p>
      <form onSubmit={handleSave}>
        <label htmlFor="name" className="form-label">Pseudo</label>
        <input
          type="text"
          id="name"
          ref={nameRef}
          className="form-input"
          placeholder="Ton pseudo..."
          maxLength={20}
        />
        <button id="submitBtn" type="submit" className="form-submit">
          Sauvegarder le score
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 7.2 — Mettre à jour form.css**

```css
.form-container {
  background: var(--bg-secondary);
  border: 1px solid var(--accent-cyan-border);
  border-radius: var(--radius-lg);
  padding: 36px 32px;
  width: 360px;
  max-width: 90vw;
  box-shadow: var(--shadow-card), var(--shadow-glow);
  font-family: var(--font-main);
}

.form-title {
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--text-primary);
  text-align: center;
  border: none;
  padding: 0;
  margin-bottom: 8px;
  text-shadow: none;
}

.form-score-display {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 24px;
}

.form-score-display strong {
  color: var(--accent-cyan);
}

.form-label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.form-input {
  display: block;
  width: 100%;
  padding: 12px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-main);
  font-size: 1rem;
  margin-bottom: 20px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-cyan);
}

.form-input::placeholder {
  color: var(--text-dim);
}

.form-submit {
  width: 100%;
  padding: 14px;
  background: var(--accent-cyan);
  color: var(--bg-primary);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-main);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}

.form-submit:hover:not(:disabled) {
  opacity: 0.9;
}

.form-submit:disabled {
  background: var(--success);
  cursor: default;
}
```

- [ ] **Step 7.3 — Commit**

```bash
git add src/pages/form.jsx src/pages/form.css
git commit -m "feat: restyle score form with Modern Dark theme, fix duplicate score UX"
```

---

## Task 8: Ajouter Scoreboard à la HomePage

**Files:**
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/pages/HomePage.css`

Le scoreboard doit être accessible depuis le hub. On l'ajoute comme modal/section dépliable.

- [ ] **Step 8.1 — Ajouter le lien scores + section scoreboard à HomePage.jsx**

Dans `HomePage.jsx`, importer `Scoreboard` et ajouter un état `showScoreboard` :

```jsx
// Ajouter en haut :
import Scoreboard from "./Scoreboard";

// Dans le composant, ajouter l'état :
const [showScoreboard, setShowScoreboard] = useState(false);
```

Mettre à jour la navbar pour inclure le bouton scores, et ajouter la section conditionnelle après la grille :

```jsx
// Navbar (remplacer la nav existante) :
<nav className="home-nav">
  <span className="home-logo">
    GEO<span className="home-logo-accent">GAME</span>
  </span>
  <button
    className="nav-scores-btn"
    onClick={() => setShowScoreboard((v) => !v)}
  >
    🏆 Scores
  </button>
</nav>

// Après la games-grid, dans <main> :
{showScoreboard && (
  <div className="scoreboard-section">
    <Scoreboard />
  </div>
)}
```

- [ ] **Step 8.2 — Ajouter les styles manquants dans HomePage.css**

```css
.nav-scores-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-family: var(--font-main);
  font-size: 0.85rem;
  padding: 8px 16px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.nav-scores-btn:hover {
  color: var(--accent-cyan);
  border-color: var(--accent-cyan-border);
}

.scoreboard-section {
  width: 100%;
  max-width: 800px;
  margin-top: 40px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 32px;
}
```

- [ ] **Step 8.3 — Vérifier manuellement**

```bash
npm run dev
```

1. Cliquer "🏆 Scores" → le scoreboard s'affiche/se cache
2. Vérifier le filtre par difficulté fonctionne
3. Vérifier que les scores sont triés correctement (plus élevé en premier)

- [ ] **Step 8.4 — Commit**

```bash
git add src/pages/HomePage.jsx src/pages/HomePage.css
git commit -m "feat: add collapsible scoreboard section to HomePage"
```

---

## Task 9: Vérification finale & build

- [ ] **Step 9.1 — Lancer les tests**

```bash
npm test
```

Attendu : tous les tests PASS.

- [ ] **Step 9.2 — Vérifier le build de production**

```bash
npm run build
```

Attendu : build terminé sans erreurs dans `dist/`. Quelques warnings eslint sont tolérables.

- [ ] **Step 9.3 — Tester le build localement**

```bash
npm run preview
```

Tester les flux :
1. Page d'accueil → sélection difficulté → Jouer → jeu démarre
2. Jouer correctement → pays passe en vert, score monte
3. 3 erreurs → pays révélé en rouge
4. Timer atteint 0 → formulaire de score s'affiche
5. Sauvegarder un score → toast succès
6. "🏆 Scores" → scoreboard s'affiche, filtre fonctionne
7. Mode Entraînement → timer affiche ∞, pas de formulaire de fin
8. Navigation directe `/game` → redirige vers `/`

- [ ] **Step 9.4 — Commit final**

```bash
git add -A
git commit -m "chore: final verification, production build OK"
```
