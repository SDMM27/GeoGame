# Play Console : réponses et étapes

Brouillon des réponses aux questionnaires de Play Console (section « Contenu de l'application »),
établi à partir de ce que l'app envoie vraiment et de la politique de confidentialité (`src/legal/documents.js`).
Si l'app change (pub, nouvelle donnée, chat…), il faut mettre à jour ces réponses ET la politique.
Revu le 2026-10-26 (missions et XP, collection de drapeaux, Elo, badges, spectateur). Plan d'ensemble : `docs/roadmap-lancement.md`.

Adresses utiles :

- Politique de confidentialité : https://geo-game.app/privacy
- Suppression du compte : https://geo-game.app/delete-account
- Site web : https://geo-game.app
- E-mail de contact : appgeogame@gmail.com (celui de `src/legal/legalInfo.js`)

---

## Avant le premier build de production

Le `.aab` embarque le code du moment : tout ce dont il dépend doit déjà être en ligne.

- [ ] Règles Firestore déployées (`npm run deploy:rules`), puis le site et l'API sur Vercel (`master`) : missions, XP, fragments et Elo sont écrits par `api/` sur geo-game.app. Sinon ces écrans restent vides ou les enregistrements sont refusés.
- [ ] `DAILY_GAME_SINCE` (`src/utils/profileStats.js`) : mettre la vraie date de sortie du Challenge du jour si elle a changé.
- [x] `mobile/app.json` → `android.blockedPermissions` : `android.permission.SYSTEM_ALERT_WINDOW`, `android.permission.READ_EXTERNAL_STORAGE`, `android.permission.WRITE_EXTERNAL_STORAGE`. Le prebuild d'Expo les ajoute par défaut ; l'app ne s'en sert pas et elles font peur sur la fiche.
- [ ] Variables EAS de l'environnement **production** (expo.dev → projet → Environment variables) : rien n'est obligatoire (`EXPO_PUBLIC_API_ORIGIN` vaut geo-game.app par défaut), mais `EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_KEY` doit rester absente tant qu'App Check n'est pas configuré pour Android.

## Étapes, dans l'ordre

1. [ ] Créer le compte développeur (25 $, vérification d'identité : compter quelques jours).
2. [ ] Recruter les testeurs **dès maintenant** : 12 minimum, en viser 15 pour la marge (comptes Google personnels). Récupérer leurs adresses Gmail.
3. [ ] Créer l'app : nom « GeoGame – Jeux de géographie », langue par défaut français, **Jeu**, **Gratuit**.
4. [ ] Remplir « Contenu de l'application » avec les réponses ci-dessous.
5. [ ] Remplir la fiche du Play Store avec `listing.md`, `graphics/` et `screenshots/`. Pour le test fermé, la fiche actuelle suffit ; la réécrire avec les nouveautés (missions, niveaux, Elo, collection, Hardcore, Ascension) avant la production. Captures et bannière n'existent qu'en fr et en : les autres langues reprennent celles de la langue par défaut.
6. [ ] Builder : `cd mobile` puis `npx eas-cli@latest build -p android --profile production` (donne un `.aab` ; le `versionCode` s'incrémente tout seul côté EAS). Accepter qu'EAS génère la clé d'importation.
7. [ ] Test fermé → créer une piste, envoyer le `.aab` **à la main** (Google refuse le tout premier envoi par API), ajouter la liste des testeurs (une liste d'e-mails ou un groupe Google), puis leur envoyer le lien d'inscription.
8. [ ] Firebase → Paramètres du projet → app Android `com.sdmm27.geogame` → ajouter les **deux** empreintes SHA-1 :
   - celle de la clé EAS : `npx eas-cli@latest credentials -p android` ;
   - celle de la clé de signature Play : Play Console → Tester et publier → Configuration → **Intégrité de l'application**.
   Sans elles, la connexion Google échoue sur Android. Pas besoin de rebuilder pour ça. Noter aussi les deux **SHA-256** : ils serviront aux Android App Links (`assetlinks.json`).
9. [ ] Installer depuis le Play Store sur un vrai téléphone : connexion Google, connexion e-mail, notifications d'invitation, une partie multijoueur, une mission validée.
10. [ ] Garder **au moins 12 testeurs inscrits pendant 14 jours d'affilée** (comptes personnels créés après novembre 2023). Les 14 jours comptent à partir du moment où 12 testeurs ont accepté l'invitation, pas de la création de la piste.
11. [ ] Demander l'accès à la production (Google pose des questions sur le test : recrutement des testeurs, retours reçus, ce qui a été corrigé ; garder des notes pendant les 14 jours), puis publier.

### Mises à jour après la sortie

- Code JavaScript seul : mise à jour OTA sur le canal **production**. Le workflow GitHub « EAS Update » ne publie tout seul que sur `preview` : le lancer à la main (onglet Actions → EAS Update → canal `production`).
- Changement natif (module, permission, `app.json`) : nouveau build `production`, puis envoi. `eas submit -p android --profile production` peut le faire à ta place, avec une clé JSON de compte de service Google Cloud ayant accès à la Play Console ; la renseigner dans `submit.production` de `mobile/eas.json` (`serviceAccountKeyPath`, `track`), sans committer la clé.

---

## Accès à l'application

« Toutes les fonctionnalités sont disponibles sans restriction d'accès » n'est pas exact : le profil, les amis et l'historique demandent un compte.
Choisir **« Tout ou partie des fonctionnalités sont limitées »** et fournir un compte de test :

- Nom : `Compte de test`
- Identifiant / mot de passe : un compte e-mail créé exprès pour Google (à créer toi-même dans l'app, pas ton compte perso)
- Instructions : « Le jeu se joue sans compte. Pour le profil, les amis, l'historique, les missions et la collection de drapeaux : onglet Profil → Se connecter avec cet e-mail et ce mot de passe. »

Créer ce compte avant l'envoi en revue, lui choisir un pseudo et jouer quelques parties pour que les écrans ne soient pas vides. Ne pas changer son mot de passe sans mettre à jour la Play Console.

## Publicités

**Non**, l'application ne contient pas de publicités.

## Classification du contenu (questionnaire IARC)

- Catégorie : **Jeu** (quiz / culture générale).
- Violence, peur, sexualité, langage grossier, drogues, alcool, tabac, jeux d'argent : **Non** partout.
- Les utilisateurs peuvent-ils interagir ou échanger du contenu ? **Oui** : pseudos publics, classements, demandes d'amis, salons multijoueurs. Pas de chat ni d'échange de messages libres, pas de photos.
- Partage de la position de l'utilisateur avec d'autres : **Non**.
- Achats numériques : **Non**.
- Objets aléatoires (« loot boxes ») achetables : **Non**. Les drapeaux de la collection sont tirés au hasard, mais avec des fragments gagnés en jouant, jamais avec de l'argent.
- Résultat attendu : PEGI 3 / Tout public (avec la mention « Interactions entre utilisateurs »).

## Public cible et contenu

- Tranches d'âge : **13–15, 16–17 et 18 ans et plus**. Ne pas cocher les tranches de moins de 13 ans : l'app entrerait dans le programme Familles, beaucoup plus strict. C'est cohérent avec la politique de confidentialité (compte à partir de 13 ans).
- « L'app pourrait-elle attirer involontairement des enfants ? » : répondre honnêtement. Si Google demande une justification : jeu de culture générale sans personnage ni style enfantin, textes et interface pensés pour les ados et les adultes.

## Identifiant publicitaire

L'app utilise-t-elle l'identifiant publicitaire ? **Non**. Si la Play Console signale que le manifeste déclare `com.google.android.gms.permission.AD_ID` (ajouté par une bibliothèque), l'ajouter à `android.blockedPermissions` dans `mobile/app.json` et rebuilder, plutôt que de répondre Oui.

## Autorisations

Aucune autorisation sensible à déclarer : Internet, vibration et notifications (`POST_NOTIFICATIONS`, demandée à l'utilisateur). Pas de position, de contacts, de caméra ni de fichiers, une fois les autorisations inutiles bloquées (voir « Avant le premier build »).

## Application d'actualités, gouvernementale, financière, santé

**Non** à chacune.

## Suppression des données

- L'app permet de créer un compte : **Oui**.
- Lien de suppression : https://geo-game.app/delete-account
- On peut aussi demander la suppression de certaines données sans supprimer le compte (score enregistré sans compte, etc.) : **Oui**, par e-mail.

---

## Sécurité des données

### Questions générales

| Question | Réponse |
| --- | --- |
| L'app collecte-t-elle ou partage-t-elle des données parmi les types requis ? | **Oui** |
| Toutes les données sont-elles chiffrées en transit ? | **Oui** (HTTPS) |
| Proposez-vous un moyen de demander la suppression des données ? | **Oui** (dans l'app et via le lien ci-dessus) |
| Données partagées avec des tiers ? | **Non** pour tout. Google, Vercel et Expo agissent comme prestataires, ce qui ne compte pas comme un partage selon Google. |

### Types de données collectées

Pour chacune : **collectée**, **non partagée**, **traitée de façon non éphémère**, **facultative** (on peut jouer sans compte ni notifications).

| Catégorie Google | Type | Ce que c'est dans GeoGame | Finalités à cocher |
| --- | --- | --- | --- |
| Informations personnelles | **Adresse e-mail** | E-mail du compte (Firebase Auth, ou Google) | Fonctionnalité de l'app, Gestion du compte |
| Informations personnelles | **ID utilisateur** | Identifiant du compte et pseudo (public) | Fonctionnalité de l'app, Gestion du compte |
| Activité dans l'application | **Autres contenus générés par l'utilisateur** | Pseudo, scores et Elo des classements, badges affichés publiquement, salons multijoueurs (et spectateurs), signalements | Fonctionnalité de l'app, Prévention des fraudes / sécurité (signalements) |
| Activité dans l'application | **Autres actions effectuées dans l'application** | Historique des parties, séries, succès, missions, XP et niveau, fragments et collection de drapeaux, maîtrise des modes, amis et invitations | Fonctionnalité de l'app |
| Appareil ou autres ID | **Appareil ou autres ID** | Jeton de notification Expo, identifiant aléatoire pour les signalements | Fonctionnalité de l'app (notifications), Prévention des fraudes / sécurité |

À **ne pas** cocher (non collecté par l'app) : nom (Google peut l'envoyer mais il n'est pas utilisé ni stocké), position, contacts, photos, fichiers, messages, données de santé ou financières, historique de navigation, journaux de plantage, diagnostics.

Vercel Analytics ne tourne que sur le site, pas dans l'app : rien à déclarer pour lui. Si un outil est ajouté plus tard, mettre à jour ce tableau et la politique avant l'envoi du build :

- Sentry ou équivalent → cocher **Journaux de plantage** et **Diagnostics** (finalité : Analyse).
- Outil d'événements (PostHog…) → ajouter la finalité **Analyse** à « Autres actions effectuées dans l'application ».

Le mot de passe n'est pas à déclarer comme donnée collectée par l'app : il part directement à Firebase Authentication qui le stocke chiffré, sans que GeoGame y ait accès.
