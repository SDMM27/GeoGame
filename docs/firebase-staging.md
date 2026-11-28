# Préparer un environnement Firebase de staging

Les aperçus Vercel de `dev` partagent aujourd’hui `geogame-sdmm` avec les clients publics. Isoler le projet Firebase permet de vérifier App Check, la connexion et les écritures de score avec des comptes de test. Voir la [séparation des projets Firebase par environnement](https://firebase.google.com/docs/projects/dev-workflows/overview-environments).

## Raccordements à mettre en place

| Composant | Configuration nécessaire |
| --- | --- |
| Firebase | Créer un projet de test distinct, sans importer de données réelles. Activer Firestore et les fournisseurs Auth utiles aux essais. Appliquer les règles et index de `dev` après les tests sur émulateurs, via la CLI avec l’identifiant du projet passé explicitement à `--project`. Les scripts `npm run deploy:*` ciblent `geogame-sdmm`. |
| Site Vite et app Expo web | Rendre la configuration publique de `src/Firebase.js` sélectionnable au build pour les deux clients. Exiger une configuration complète lorsque le build cible le staging. Dans Vercel, limiter les variables Preview à `dev` sur les deux projets. Autoriser les hôtes de staging dans Firebase Auth et dans la clé reCAPTCHA Enterprise du projet de test. |
| API Vercel | Exiger au runtime un compte de service du projet de test et `FIREBASE_WEB_API_KEY` pour ce même projet. Sans cette clé, les chemins serveur de compte pseudo et de migration de session peuvent utiliser la clé publique actuelle de `geogame-sdmm`. Vérifier les origines autorisées et les appels vers l’API. Définir `EXPO_PUBLIC_API_ORIGIN` sur l’API de staging. Le site en aperçu peut actuellement renvoyer certaines requêtes de connexion vers l’API publique dans `src/utils/usernameAccount.js`. Supprimer ce repli pour le staging. |
| APK de test | Ajouter un profil EAS distinct, avec une application Android et un `GOOGLE_SERVICES_JSON` enregistrés dans le Firebase de staging, ainsi qu’un identifiant Android et un canal EAS distincts des clients publics. Utiliser l’API de staging. Pour tester Google sur Android, remplacer le client OAuth web de production dans `mobile/src/account/google.ts` par celui du staging et enregistrer les SHA-1 du certificat de test pour le package de staging. Distribuer cet APK en interne pour pouvoir l’installer à côté de l’APK public. |

Vérifier les paramètres Vercel par branche avant de rebâtir `dev`. Une variable Preview générale peut s’appliquer par défaut même si l’aperçu porte un autre domaine. [Variables Vercel par environnement](https://vercel.com/docs/environment-variables#preview-environment-variables)

## Vérifier l’isolation avant les tests

1. Confirmer l’identifiant du projet dans les deux bundles web, la configuration Firebase native et le compte de service de l’API. Tester qu’un build de staging échoue si une valeur nécessaire manque ou désigne `geogame-sdmm`.
2. Ouvrir les deux aperçus authentifiés et installer l’APK interne. Avant de saisir les identifiants de test, vérifier les destinations réseau de Firebase Auth, Firestore et de l’API. Vérifier la requête `OPTIONS` de l’app Expo web vers l’API du site si leurs origines diffèrent. La protection Vercel peut répondre avant la fonction qui gère CORS. Garder les tâches planifiées, les notifications de production et le canal EAS public hors de ces essais.
3. Sur chaque client, se connecter, enregistrer un score de test, le relire puis supprimer le compte. Vérifier la présence du compte et du score uniquement dans le projet de staging pendant le test.
4. Vérifier la connexion Google sur les deux aperçus et la remontée des rapports CSP dans le projet Vercel du site, où la collecte est configurée. Pour App Check, confirmer une attestation réelle sur chaque plateforme cible, puis mesurer les requêtes vérifiées en mode observation dans le projet de staging avant d’y essayer l’enforcement. [Mesures App Check](https://firebase.google.com/docs/app-check/monitor-metrics)

Le code qui sélectionne le projet de staging et le profil EAS restent à ajouter. L’APK public utilise les SDK natifs Firebase pour Auth et Firestore, et `src/appCheck.native.js` n’initialise aucun fournisseur d’attestation. Valider séparément un APK installé directement et un build installé par le Play Store avant de proposer une activation sur le projet partagé. [Firebase App Check avec Play Integrity](https://firebase.google.com/docs/app-check/android/play-integrity-provider)
