# Feuille de route : lancement Play Store et promotion

Établie le 2026-10-16 à partir de trois audits du dépôt (store, site/SEO/partage, inventaire).

## Déjà prêt

- Visuels du Play Store (`store/graphics`, `store/screenshots`), fiche (`store/listing.md`) et réponses aux questionnaires de la Play Console (`store/play-console.md`).
- Suppression de compte dans l'app et sur le site (`/delete-account`), politique de confidentialité et conditions en 5 langues.
- Défi du jour, séries, classements, rappels push (crons `daily-reminder`, `weekly-top`), invitations d'amis (`/add/<pseudo>`), liens de défi.
- Tests : 59 fichiers côté site (vitest), 8 côté app (jest), 13 côté émulateurs ; CI sur `dev` et `master`.

## Fait le 2026-10-16 (lots A et B, pas encore commités au moment de l'écriture)

- **Aperçu de lien** : `public/og.png` en 1200×630, `twitter:card` en `summary_large_image`.
- **Domaine** : `SITE_URL` lit `VITE_SITE_URL` (repli sur `geo-game-delta.vercel.app`).
- **Langues** : plus de `og:locale:alternate` ni de `inLanguage` multilingue, puisque le HTML prérendu est en français.
- **Pages légales** : `/privacy` et `/terms` prérendues et dans le sitemap.
- **Manifest** : `id`, icône maskable, `theme_color` aligné sur `#0b1020`.
- **Partage du score** :
  - le lien ouvre le jeu joué ;
  - `navigator.share` est utilisé aussi sur ordinateur ;
  - la carte image du score est branchée (partage ou téléchargement).

## Décisions à prendre

1. **Nom de domaine** (ex. geogame.app). À faire avant de déclarer les adresses de confidentialité et de suppression dans la Play Console.
2. **Sentry** (suivi des plantages, offre gratuite), sur l'app et le site. Si oui, mettre à jour la politique de confidentialité et la section « Sécurité des données ».
3. **Mesure d'audience** : événements personnalisés Vercel Analytics (plan Pro) ou Plausible (sans cookie).

## Phase 1 : avant le test fermé Play Store

Le test fermé demande 12 testeurs pendant 14 jours d'affilée, donc il faut le lancer au plus tôt (étapes dans `store/play-console.md`).

1. Domaine : l'acheter, le brancher sur Vercel, définir `VITE_SITE_URL`.
   Mettre à jour ensuite :
   - `mobile/src/links.ts` et `mobile/vercel.json` ;
   - `api/_lib/pushHandler.mjs` (sujet VAPID) ;
   - `store/play-console.md` et le README ;
   - les domaines autorisés de Firebase Auth et de reCAPTCHA/App Check ;
   - une nouvelle propriété Search Console.
2. Sentry : `@sentry/react-native` pour l'app et `@sentry/react` pour le site.
3. Android App Links :
   - ajouter `android.intentFilters` avec `autoVerify: true` dans `mobile/app.json` ;
   - publier `/.well-known/assetlinks.json` avec les SHA-256 de la clé EAS et de la clé de signature Play ;
   - ajouter les SHA-1 dans Firebase, sinon la connexion Google échoue ;
   - ce point demande que l'app existe déjà dans la Play Console.
4. Bandeau hors connexion dans l'app (NetInfo). Tester en mode avion, y compris un démarrage à froid.
5. `eas.json` : configurer `submit.production` (clé de compte de service, `track: internal`). Documenter le flux OTA vers le canal `production` : le workflow actuel ne publie automatiquement que sur `preview`.
6. Play Console : public 13 ans et plus (pas le programme Familles). Remplir « Sécurité des données » d'après `store/play-console.md`.

## Phase 2 : boucle virale

1. **Aperçu dynamique des liens de défi** : une route `api/og` qui génère « X a fait 9/12, à toi ! ». Aujourd'hui, `/challenge?...` montre l'aperçu générique.
2. **Grille d'emojis** à la Wordle pour Border Guess, Country Clue et le Quiz, comme pour le défi du jour.
3. **Événements d'audience** :
   - `game_start`, `game_end` ;
   - `share_click` ;
   - `challenge_open` (quand `parseChallenge` renvoie un défi) ;
   - `invite_open`, `signup`.
4. **Page d'accueil** :
   - un bouton « Jouer » clair ;
   - le badge Play Store à la place du lien APK (`src/utils/appLinks.js`, `AppBanner.jsx`), visible aussi sur ordinateur.
5. **Notifications web** : inscription aux push et service worker côté site. Aujourd'hui, les rappels n'atteignent que l'app.

## Phase 3 : promotion

- **Vidéos courtes** (TikTok, Reels, Shorts) : « Devine le pays à sa frontière en 5 s », défi du jour filmé, dernier niveau d'Ascension, duels multijoueurs.
- **Communautés** : r/geography, r/geoguessr, r/WebGames, serveurs Discord de géographie. Product Hunt à la sortie sur le Play Store.
- **Rituel quotidien** : publier le défi du jour sur un compte X ou Threads, avec le lien de défi (dont l'aperçu dynamique, phase 2).
- **Lancement** : utiliser les 12 testeurs du test fermé comme premiers ambassadeurs (avis Play Store dès l'ouverture).
- **Kit presse** : visuels de `store/graphics`, captures, un GIF de partie, une phrase d'accroche (« Le monde en jeux »).

## Phase 4 : finitions techniques

- Bundle principal à 1,2 Mo : analyser avec `ANALYZE=1 npm run build`, isoler Firebase (`manualChunks`), charger auth/Firestore à la demande.
- Géométrie des pays à 3 Mo : passer en TopoJSON ou quantifier.
- Service worker (vite-plugin-pwa) pour un site installable et le hors connexion.
- Pages par langue (`/en/...`) avec `hreflang` et `x-default`.
- Régler puis activer la CSP (aujourd'hui en `Report-Only`).
- Données structurées `VideoGame` sur les pages de jeu.
- Accessibilité : `aria-label` sur les contrôles de carte ; garder les modes à saisie comme parcours clavier.
- App Check natif (Play Integrity) si des abus apparaissent.
- iOS, si envisagé :
  - Sign in with Apple (obligatoire avec Google Sign-In) ;
  - manifeste de confidentialité ;
  - APNs ;
  - config `submit` iOS.
