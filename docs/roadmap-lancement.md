# Feuille de route : lancement Play Store et promotion

Établie le 2026-10-16, mise à jour le 2026-10-20 d'après l'état du dépôt.
Légende : **[toi]** = action dans une console ou un compte, **[code]** = travail dans le dépôt.

## Déjà fait

- Visuels et fiche du Play Store (`store/graphics`, `store/screenshots`, `store/listing.md`), réponses aux questionnaires (`store/play-console.md`).
- Suppression de compte (app + `/delete-account`), confidentialité et conditions prérendues, dans le sitemap.
- Aperçu de lien générique (`public/og.png` 1200×630, `summary_large_image`), manifest complet.
- Partage du score : lien vers le jeu joué, `navigator.share` partout, carte image.
- `SITE_URL` du site lit `VITE_SITE_URL`.
- Vercel Analytics de base (`<Analytics />` dans `src/App.jsx`).
- Depuis le 16/10 : missions et XP, Elo par saisons, collection de drapeaux, Hardcore, Ascension, spectateur.

## Décisions

| Sujet | Choix | État |
| --- | --- | --- |
| Nom de domaine | Vercel Domains (le plus simple) ou Porkbun / Cloudflare (moins cher au renouvellement). `.app` ou `.com`. | **À trancher** avant de remplir les adresses dans la Play Console |
| Suivi des plantages | Android vitals (Play Console, gratuit) au lancement ; Sentry gratuit si on veut des traces JS lisibles et le site couvert | **À trancher** (recommandé, pas bloquant) |
| Mesure d'audience | Vercel Analytics gratuit pour le site + liens UTM + rapports d'acquisition Play Console pour l'app. PostHog ou Umami (offres gratuites) seulement si on veut des événements personnalisés | Proposé |

---

## Étape 1 : lancer le test fermé (le plus long, à démarrer tout de suite)

Google exige 12 testeurs inscrits pendant 14 jours d'affilée avant l'accès à la production.

- [ ] **[toi]** Compte développeur Play Console (25 $, vérification d'identité : compter quelques jours).
- [ ] **[toi]** Recruter 12 testeurs ou plus (comptes Google perso), en prévoir 15 pour garder de la marge. Bonne occasion d'un premier post LinkedIn « je cherche des testeurs ».
- [ ] **[code]** `mobile/eas.json` : remplir `submit.production` (clé de compte de service, `track: internal`). Documenter la publication OTA sur le canal `production` (le workflow ne publie seul que sur `preview`).
- [ ] **[toi]** Créer l'app, remplir « Contenu de l'application » (`store/play-console.md`), public 13 ans et plus.
- [ ] **[toi]** Build `.aab` (`npx eas-cli@latest build -p android --profile production`), créer la piste de test fermé, ajouter les testeurs.
- [ ] **[toi]** Ajouter les deux SHA-1 (clé EAS + clé de signature Play) dans Firebase. Sans elles, la connexion Google ne marche pas sur Android.
- [ ] **[toi]** Vérifier la connexion Google et les notifications sur un vrai téléphone installé depuis le Play Store.

## Étape 2 : pendant les 14 jours de test

### Fiche du store
- [ ] **[code]** Réécrire `store/listing.md` (7 langues) pour mettre en avant les nouveautés : missions et niveaux, Elo et saisons, collection de drapeaux, Hardcore, Ascension.
- [ ] **[toi + code]** Refaire les captures (`store/screenshots/fr` et `en`) avec ces écrans.

### Fiabilité
- [ ] **[code]** Bandeau hors connexion dans l'app (NetInfo). Tester en mode avion, y compris au démarrage à froid.
- [ ] **[code]** Si Sentry est retenu : `@sentry/react-native` (app, avec envoi des source maps par EAS) et `@sentry/react` (site). Mettre à jour la politique de confidentialité et la section « Sécurité des données » (journaux de plantage).
- [ ] **[toi]** Lire les retours des testeurs et Android vitals ; corriger avant la production.

### Domaine (dès qu'il est choisi)
- [ ] **[toi]** Acheter le domaine, l'ajouter au projet Vercel, définir `VITE_SITE_URL`.
- [ ] **[code]** Remplacer `geo-game-delta.vercel.app` codé en dur dans :
  - `src/utils/shareScore.js` ;
  - `mobile/src/links.ts` et `mobile/vercel.json` ;
  - `api/_lib/pushHandler.mjs` (sujet VAPID) ;
  - `store/play-console.md`, le README.
- [ ] **[toi]** Domaines autorisés Firebase Auth et reCAPTCHA / App Check ; nouvelle propriété Search Console ; mettre à jour les adresses dans la Play Console.
- [ ] Rediriger l'ancienne adresse Vercel vers le nouveau domaine (les liens déjà partagés continuent de marcher).

### Android App Links (nécessite l'app créée dans la Play Console et le domaine final)
- [ ] **[code]** `android.intentFilters` avec `autoVerify: true` dans `mobile/app.json` (`/challenge`, `/add/<pseudo>`, `/room`...).
- [ ] **[code]** Publier `/.well-known/assetlinks.json` avec les SHA-256 de la clé EAS et de la clé Play.
- [ ] **[toi]** Vérifier qu'un lien de défi ouvre l'app sur un téléphone où elle est installée.

## Étape 3 : boucle virale (avant le premier post promo)

- [ ] **[code]** Aperçu dynamique des liens de défi : route `api/og` qui génère « X a fait 9/12, à toi ! » (aujourd'hui, l'aperçu générique).
- [ ] **[code]** Grille d'emojis à la Wordle pour Border Guess, Country Clue et le Quiz, comme pour le défi du jour.
- [ ] **[code]** Page d'accueil : bouton « Jouer » bien visible ; badge Play Store à la place du lien APK (`src/utils/appLinks.js`, `AppBanner.jsx`), visible aussi sur ordinateur. À mettre en ligne le jour de la sortie.
- [ ] **[toi]** Liens UTM pour chaque réseau : `?utm_source=instagram&utm_campaign=lancement` côté site, et `&referrer=utm_source%3Dinstagram` sur le lien Play Store (rapports d'acquisition de la Play Console).
- [ ] **[code, optionnel]** Événements personnalisés (`game_start`, `game_end`, `share_click`, `challenge_open`, `invite_open`, `signup`) si l'outil choisi le permet.
- [ ] **[code, optionnel]** Notifications web sur le site (aujourd'hui, les rappels n'atteignent que l'app).

## Étape 4 : sortie et promotion

- [ ] **[toi]** Demander l'accès à la production, publier.
- [ ] **[toi]** Demander aux testeurs de laisser un avis dès l'ouverture.
- [ ] **[toi]** Kit promo : vidéos de 15 s au format vertical (« Devine le pays à sa frontière en 5 s », défi du jour, dernier niveau d'Ascension, duel Elo), un GIF de partie, les visuels de `store/graphics`, l'accroche « Le monde en jeux ».
- [ ] **[toi]** Instagram : Reels et stories avec le défi du jour et le lien.
- [ ] **[toi]** LinkedIn : récit du projet (« je l'ai construit seul, voilà ce que j'ai appris »), une démo en GIF, le lien Play Store.
- [ ] **[toi]** Communautés : r/geography, r/geoguessr, r/WebGames, Discord de géographie ; Product Hunt le jour de la sortie.
- [ ] **[toi]** Rituel quotidien : publier le défi du jour avec son lien.

## Étape 5 : finitions techniques (après la sortie)

- Bundle principal de 1,2 Mo : `ANALYZE=1 npm run build`, isoler Firebase (`manualChunks`), charger auth et Firestore à la demande.
- Géométrie des pays de 3 Mo : TopoJSON ou quantification.
- Service worker (vite-plugin-pwa) : site installable et utilisable hors connexion.
- Pages par langue (`/en/...`) avec `hreflang` et `x-default`.
- Régler puis activer la CSP (aujourd'hui en `Report-Only`).
- Données structurées `VideoGame` sur les pages de jeu.
- Accessibilité : `aria-label` sur les contrôles de carte.
- App Check natif (Play Integrity) si des abus apparaissent.
- iOS, si envisagé : Sign in with Apple, manifeste de confidentialité, APNs, config `submit` iOS.
