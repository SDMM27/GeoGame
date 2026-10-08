# GeoGame Mobile

Application mobile (et export web) de GeoGame, en [Expo](https://expo.dev) avec Expo Router. Le code de jeu partagé vient de `../src` ; voir le [README racine](../README.md) pour l'architecture, les variables d'environnement, les builds EAS et les mises à jour OTA.

## Démarrage

```bash
npm install
npm start          # ou npm run android / ios / web
```

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run lint` | ESLint (`expo lint`) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run build:countries` | Régénère les données pays embarquées |
| `npm run build:flags` | Régénère les drapeaux embarqués |
| `npm run build:silhouettes` | Régénère les silhouettes de pays |
