# Refonte design — GeoGame « carnet de vol »

Prompt à coller dans une nouvelle session Claude Code ouverte dans ce repo.

```text
Refonte graphique de GeoGame selon le design « carnet de vol » que j'ai validé.

SOURCES DE VÉRITÉ
- Maquettes : canevas https://claude.ai/artifact/Vbxx9FJqKA8saM3UdqQ8wu, artboards « GeoGame-vol.dc.html » (sombre) et « GeoGame-vol-clair.dc.html » (clair). Lis-les avec l'outil Artifact (action read) avant de coder. Ce sont des maquettes HTML ; leurs continents sont dessinés à la main, il faut utiliser les vraies données géographiques du projet.
- Design system : @sdmm/design, à installer avec `npm i github:SDMM27/sdmm-design#v1.0.0`. Lis son README : thème « geogame », CSS pur (`@sdmm/design/css/all-geogame.css`, variables --sd-*), fontsUrl('geogame'), .sd-route, .sd-stamp, initCountUp, mountCanvas, initTheme/themeScript.

DIRECTION VALIDÉE
Univers voyage et exploration. Base bleu nuit #0b1020, accent menthe #3ddc97 (#14a86b en clair), violet en secondaire. Mode sombre (par défaut) ET clair, avec un bouton de bascule.
- Logo-boussole avec une aiguille qui oscille ; « EXPLORE · DÉCOUVRE · VOYAGE » en lettres qui défilent façon panneau d'aéroport.
- Hero : un GLOBE INTERACTIF qu'on fait tourner à la souris ou au doigt (c'est l'élément que je préfère, à soigner), avec escales, itinéraires en arcs de grand cercle pointillés qui défilent, avion qui vole PAR→TYO et mini-jeu « Trouve : <ville> » (viseur au centre, +100, score). Utilise les vraies données (world-atlas/topojson ou ce que le projet utilise déjà, d3-geo par exemple), en canvas pour les performances, avec un rendu statique sous reduced-motion.
- Compte à rebours en direct jusqu'aux défis de minuit.
- Défis du jour en cartes d'embarquement : numéro de vol, porte, code-barres, talon détachable qui pivote au survol, bouton « Embarquer » et bouton ∞.
- Missions et ligue présentées comme un passeport avec des tampons qui s'abattent.
- Liste des jeux en tableau des départs, avec l'effet de lettres qui défilent.

PÉRIMÈTRE
- Site Vite/React : accueil, tous les écrans de jeu (cartes Leaflet incluses : harmonise leurs couleurs avec le thème), multi et salons, classements, profil. Transpose l'univers sur chaque écran sans gêner le jeu : pendant une partie, la lisibilité passe avant la déco.
- Remplace src/styles/theme.css par les variables du design system. Garde les 9 langues : tous les nouveaux textes passent par i18next.
- Ne change ni la logique de jeu (src/hooks, src/utils, partagés avec le mobile), ni Firebase, ni l'API.
- App mobile Expo (mobile/) : hors périmètre de cette PR. Termine par un plan pour la porter ensuite avec `@sdmm/design/native` (getTheme('geogame'), Reanimated).
- prefers-reduced-motion respecté, contraste AA, cibles tactiles ≥ 44 px, aucun scroll horizontal à 360 px.

MÉTHODE
1. Explore le code et propose un plan court, puis attends mon accord.
2. Travaille sur une branche `redesign/carnet-de-vol`, en commits atomiques. La CI doit rester verte, y compris les tests des émulateurs Firebase.
3. Vérifie dans le navigateur : accueil, au moins 3 modes de jeu, multi, en sombre et en clair, sur desktop et mobile.
4. Ouvre une PR avec les captures avant/après et le lien de preview Vercel. Ne merge pas.
```
