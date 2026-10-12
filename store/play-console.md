# Play Console : réponses et étapes

Brouillon des réponses aux questionnaires de Play Console (section « Contenu de l'application »),
établi à partir de ce que l'app envoie vraiment et de la politique de confidentialité (`src/legal/documents.js`).
Si l'app change (pub, nouvelle donnée, chat…), il faut mettre à jour ces réponses ET la politique.

Adresses utiles :

- Politique de confidentialité : https://geo-game-delta.vercel.app/privacy
- Suppression du compte : https://geo-game-delta.vercel.app/delete-account
- Site web : https://geo-game-delta.vercel.app
- E-mail de contact : appgeogame@gmail.com (celui de `src/legal/legalInfo.js`)

---

## Étapes, dans l'ordre

1. [ ] Créer le compte développeur (25 $, vérification d'identité).
2. [ ] Créer l'app : nom « GeoGame – Jeux de géographie », langue par défaut français, **Jeu**, **Gratuit**.
3. [ ] Remplir « Contenu de l'application » avec les réponses ci-dessous.
4. [ ] Remplir la fiche du Play Store avec `listing.md`, `graphics/` et `screenshots/`.
5. [ ] Builder : `cd mobile` puis `npx eas-cli@latest build -p android --profile production` (donne un `.aab`).
6. [ ] Test fermé → créer une piste, envoyer le `.aab` à la main, ajouter la liste des testeurs (une liste d'e-mails ou un groupe Google).
7. [ ] Firebase → Paramètres du projet → app Android `com.sdmm27.geogame` → ajouter les **deux** empreintes SHA-1 :
   - celle de la clé EAS : `npx eas-cli@latest credentials -p android` ;
   - celle de la clé de signature Play : Play Console → Tester et publier → Configuration → **Intégrité de l'application**.
   Sans elles, la connexion Google échoue sur Android.
8. [ ] Garder **au moins 12 testeurs inscrits pendant 14 jours d'affilée** (comptes personnels créés après novembre 2023).
9. [ ] Demander l'accès à la production (Google pose quelques questions sur le test), puis publier.

Pour les envois suivants, `eas submit` peut le faire à ta place, avec une clé JSON de compte de service Google Cloud ayant accès à la Play Console.

---

## Accès à l'application

« Toutes les fonctionnalités sont disponibles sans restriction d'accès » n'est pas exact : le profil, les amis et l'historique demandent un compte.
Choisir **« Tout ou partie des fonctionnalités sont limitées »** et fournir un compte de test :

- Nom : `Compte de test`
- Identifiant / mot de passe : un compte e-mail créé exprès pour Google (à créer toi-même dans l'app, pas ton compte perso)
- Instructions : « Le jeu se joue sans compte. Pour le profil, les amis et l'historique : onglet Profil → Se connecter avec cet e-mail et ce mot de passe. »

## Publicités

**Non**, l'application ne contient pas de publicités.

## Classification du contenu (questionnaire IARC)

- Catégorie : **Jeu** (quiz / culture générale).
- Violence, peur, sexualité, langage grossier, drogues, alcool, tabac, jeux d'argent : **Non** partout.
- Les utilisateurs peuvent-ils interagir ou échanger du contenu ? **Oui** : pseudos publics, classements, demandes d'amis, salons multijoueurs. Pas de chat ni d'échange de messages libres, pas de photos.
- Partage de la position de l'utilisateur avec d'autres : **Non**.
- Achats numériques : **Non**.
- Résultat attendu : PEGI 3 / Tout public (avec la mention « Interactions entre utilisateurs »).

## Public cible et contenu

- Tranches d'âge : **13–15, 16–17 et 18 ans et plus**. Ne pas cocher les tranches de moins de 13 ans : l'app entrerait dans le programme Familles, beaucoup plus strict. C'est cohérent avec la politique de confidentialité (compte à partir de 13 ans).
- « L'app pourrait-elle attirer involontairement des enfants ? » : répondre honnêtement. Si Google demande une justification : jeu de culture générale sans personnage ni style enfantin, textes et interface pensés pour les ados et les adultes.

## Application d'actualités, gouvernementale, financière, santé

**Non** à chacune.

## Suppression des données

- L'app permet de créer un compte : **Oui**.
- Lien de suppression : https://geo-game-delta.vercel.app/delete-account
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
| Activité dans l'application | **Autres contenus générés par l'utilisateur** | Pseudo et scores des classements, salons multijoueurs, signalements | Fonctionnalité de l'app, Prévention des fraudes / sécurité (signalements) |
| Activité dans l'application | **Autres actions effectuées dans l'application** | Historique des parties, séries, succès, amis et invitations | Fonctionnalité de l'app |
| Appareil ou autres ID | **Appareil ou autres ID** | Jeton de notification Expo, identifiant aléatoire pour les signalements | Fonctionnalité de l'app (notifications), Prévention des fraudes / sécurité |

À **ne pas** cocher (non collecté par l'app) : nom (Google peut l'envoyer mais il n'est pas utilisé ni stocké), position, contacts, photos, fichiers, messages, données de santé ou financières, historique de navigation, journaux de plantage, diagnostics.

Le mot de passe n'est pas à déclarer comme donnée collectée par l'app : il part directement à Firebase Authentication qui le stocke chiffré, sans que GeoGame y ait accès.
