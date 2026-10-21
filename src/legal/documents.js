// Texts of the legal pages (LegalPage.jsx), per language. They describe what the code really does: change them along
// with it (new data collected, new provider, new retention), and update LEGAL_INFO.updated in legalInfo.js.
// A document: { title, intro: [block], sections: [{ id, title, blocks: [block] }] }. A block is a paragraph (string)
// or { list: [string] }. In strings: {editor}, {email} and {site} are replaced, [label](href) becomes a link.
// Spanish, Portuguese, German, Italian and Ukrainian are in ./translations: update them too.

import de from './translations/de'
import es from './translations/es'
import it from './translations/it'
import pt from './translations/pt'
import uk from './translations/uk'

const fr = {
  privacy: {
    title: 'Politique de confidentialité',
    intro: [
      'GeoGame est un jeu de géographie gratuit, sur le site {site} et dans l’application mobile GeoGame. Cette page explique quelles données nous traitons, pourquoi, combien de temps, et comment exercer vos droits.',
      'Nous collectons le moins de données possible : pas de publicité, pas de revente de données, pas de profilage.',
    ],
    sections: [
      {
        id: 'controller',
        title: 'Responsable du traitement',
        blocks: ['{editor}, joignable à l’adresse {email}.'],
      },
      {
        id: 'data',
        title: 'Les données que nous traitons',
        blocks: [
          'Sans compte, vous pouvez jouer librement. Nous ne recevons alors que ce que vous choisissez de publier : le pseudo et le score que vous enregistrez dans un classement, le pseudo utilisé dans un salon multijoueur, et les signalements que vous faites (avec un identifiant aléatoire créé sur votre appareil).',
          'Avec un compte, nous traitons en plus :',
          {
            list: [
              'votre adresse e-mail et votre mot de passe, que Firebase Authentication conserve chiffré : nous n’y avons jamais accès. Si vous vous connectez avec Google, nous recevons l’adresse e-mail et l’identifiant de votre compte Google (Google peut aussi transmettre votre nom et votre photo de profil, que nous n’utilisons pas) ;',
              'votre pseudo, la date de création du compte et les dates de connexion ;',
              'l’historique de vos parties (jeu, mode, score, temps, date) et vos scores dans les classements, y compris les réponses tentées aux défis du jour ;',
              'vos demandes d’amis, vos amis et les invitations à un salon que vous envoyez ou recevez ;',
              'si vous autorisez les notifications, dans l’application ou dans l’app web ajoutée à l’écran d’accueil : un identifiant de notification de l’appareil (jeton Expo ou abonnement Web Push), la langue, le type d’appareil et votre choix pour le rappel quotidien.',
            ],
          },
          'Pour tout le monde, nos hébergeurs traitent aussi l’adresse IP et les informations techniques de chaque requête (navigateur, appareil) pour faire fonctionner et sécuriser le service. Sur le site, la mesure d’audience Vercel Web Analytics fonctionne sans cookie et ne fournit que des statistiques de visites agrégées, et Firebase App Check utilise Google reCAPTCHA Enterprise, qui analyse des signaux du navigateur pour vérifier que les requêtes viennent bien du jeu.',
        ],
      },
      {
        id: 'public',
        title: 'Ce qui est public',
        blocks: [
          'Votre pseudo, vos scores dans les classements et votre page de profil (date d’inscription, statistiques, historique des parties) sont visibles par tous. Votre adresse e-mail, vos amis et vos invitations ne sont jamais publics. Si vous préférez rester anonyme, choisissez un pseudo qui ne révèle pas votre identité.',
        ],
      },
      {
        id: 'purposes',
        title: 'Pourquoi, et sur quelle base légale',
        blocks: [
          {
            list: [
              'Faire fonctionner le jeu, le compte, les classements, l’historique, les amis et le multijoueur : l’exécution des [conditions d’utilisation](/terms) que vous acceptez en utilisant GeoGame (article 6.1.b du RGPD).',
              'Envoyer les notifications (invitations à un salon, demandes d’amis, rappel des défis du jour) : votre consentement, donné en autorisant les notifications et retirable à tout moment dans les réglages de votre appareil. Le rappel quotidien peut aussi être coupé depuis le profil.',
              'Protéger le service contre la triche et les abus (App Check, signalements, filtre des pseudos) et mesurer l’audience de façon anonyme : notre intérêt légitime à proposer un jeu fiable et à l’améliorer (article 6.1.f du RGPD).',
            ],
          },
          'Nous ne faisons ni publicité, ni profilage, ni décision automatisée vous concernant, et nous ne vendons aucune donnée.',
        ],
      },
      {
        id: 'recipients',
        title: 'Destinataires et prestataires',
        blocks: [
          'Vos données ne sont accessibles qu’à l’éditeur et aux prestataires techniques suivants, qui les traitent pour notre compte :',
          {
            list: [
              'Google (Firebase Authentication, Cloud Firestore, App Check, reCAPTCHA Enterprise) : comptes, base de données et protection contre les abus ;',
              'Vercel Inc. : hébergement du site et des fonctions serveur, mesure d’audience ;',
              'Expo (650 Industries, Inc.) : envoi des notifications et des mises à jour de l’application ;',
              'les services de notification des navigateurs (Apple, Google, Mozilla, Microsoft selon votre appareil) : acheminement des notifications de l’app web ;',
              'Flagpedia (flagcdn.com) : certaines images de drapeaux du site.',
            ],
          },
          'Certains de ces prestataires sont situés hors de l’Union européenne, notamment aux États-Unis. Ces transferts sont encadrés par le Data Privacy Framework UE–États-Unis ou par les clauses contractuelles types de la Commission européenne.',
        ],
      },
      {
        id: 'retention',
        title: 'Durées de conservation',
        blocks: [
          {
            list: [
              'Compte et données liées : tant que le compte existe. Un compte inutilisé pendant 3 ans (ni connexion, ni partie) est supprimé automatiquement avec toutes ses données.',
              'Scores enregistrés sans compte : tant que le classement existe. Vous pouvez demander leur suppression.',
              'Salons multijoueurs : supprimés automatiquement à leur expiration, 10 jours au plus après leur création. Invitations : un jour au plus.',
              'Jetons de notification : jusqu’à la déconnexion de l’appareil, la suppression du compte, ou dès que l’appareil ne peut plus les recevoir.',
              'Signalements : le temps de les traiter.',
              'Journaux techniques des hébergeurs : une durée limitée fixée par l’hébergeur, quelques jours en général.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        title: 'Cookies et stockage sur votre appareil',
        blocks: [
          'GeoGame n’utilise aucun cookie publicitaire ni cookie de mesure d’audience. Le jeu enregistre sur votre appareil ce qui lui sert à fonctionner : votre session de connexion, votre pseudo, votre langue, les salons récents, la progression des défis du jour, et un identifiant aléatoire de visiteur pour les signalements. reCAPTCHA peut déposer un cookie technique nécessaire à la protection contre les abus.',
          'Ces éléments sont strictement nécessaires au service et ne demandent donc pas de consentement. Vous pouvez les effacer à tout moment depuis les réglages de votre navigateur ou en désinstallant l’application.',
        ],
      },
      {
        id: 'rights',
        title: 'Vos droits',
        blocks: [
          'Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, de portabilité et d’opposition sur vos données.',
          'Vous pouvez supprimer vous-même votre compte et toutes ses données à tout moment : voir [Supprimer mon compte](/delete-account). Pour toute autre demande (une copie de vos données, un changement de pseudo, la suppression d’un score enregistré sans compte…), écrivez à {email}. Nous répondons dans un délai d’un mois.',
          'Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL ([cnil.fr](https://www.cnil.fr)).',
        ],
      },
      {
        id: 'minors',
        title: 'Mineurs',
        blocks: [
          'Tout le monde peut jouer à GeoGame sans compte. La création d’un compte est réservée aux personnes d’au moins 13 ans, et, entre 13 et 15 ans, à celles qui ont l’accord d’un parent. Un parent qui constate qu’un enfant a créé un compte sans son accord peut nous écrire pour le faire supprimer.',
        ],
      },
      {
        id: 'security',
        title: 'Sécurité',
        blocks: [
          'Les échanges sont chiffrés (HTTPS). L’accès à la base de données est contrôlé par des règles de sécurité : chacun ne peut lire que ce qui est public ou ce qui le concerne, et ne peut modifier que ses propres données.',
        ],
      },
      {
        id: 'changes',
        title: 'Modifications',
        blocks: [
          'Nous pouvons mettre à jour cette politique ; la date en haut de la page indique la dernière version. En cas de changement important, nous l’annoncerons dans le jeu.',
        ],
      },
    ],
  },

  terms: {
    title: 'Conditions générales d’utilisation',
    intro: [
      'Ces conditions encadrent l’utilisation de GeoGame, sur le site {site} et dans l’application mobile. En utilisant GeoGame, vous les acceptez.',
    ],
    sections: [
      {
        id: 'access',
        title: 'Accès au jeu',
        blocks: [
          'GeoGame est gratuit et se joue sans compte. Un compte permet en plus de réserver un pseudo, de garder un historique, d’ajouter des amis et de recevoir des invitations. L’accès à Internet reste à votre charge.',
          'Le jeu est fourni tel quel. Nous pouvons le faire évoluer, ajouter ou retirer des jeux, ou l’interrompre, notamment pour maintenance, sans préavis.',
        ],
      },
      {
        id: 'account',
        title: 'Compte',
        blocks: [
          'La création d’un compte est réservée aux personnes d’au moins 13 ans, et, entre 13 et 15 ans, à celles qui ont l’accord d’un parent. Vous vous engagez à fournir une adresse e-mail valide et à garder votre mot de passe confidentiel. Vous pouvez supprimer votre compte à tout moment ([Supprimer mon compte](/delete-account)).',
        ],
      },
      {
        id: 'conduct',
        title: 'Règles de conduite',
        blocks: [
          'En utilisant GeoGame, vous vous engagez à ne pas :',
          {
            list: [
              'choisir un pseudo injurieux, haineux, discriminatoire, à caractère sexuel, qui usurpe l’identité de quelqu’un ou qui révèle des informations personnelles sur un tiers ;',
              'tricher : modifier ou falsifier des scores, automatiser des parties, exploiter un bug ;',
              'perturber le service ou tenter d’accéder à des données qui ne vous concernent pas ;',
              'harceler d’autres joueurs, par exemple par des invitations ou des demandes d’amis répétées.',
            ],
          },
        ],
      },
      {
        id: 'moderation',
        title: 'Modération',
        blocks: [
          'Chacun peut signaler un score ou un pseudo depuis le drapeau affiché dans les classements. Nous pouvons supprimer un score, un pseudo ou un compte qui ne respecte pas ces règles, sans préavis dans les cas manifestes.',
        ],
      },
      {
        id: 'ip',
        title: 'Propriété intellectuelle',
        blocks: [
          'Le nom GeoGame, le code, le design et les textes du jeu appartiennent à l’éditeur. Leur reproduction sans autorisation est interdite. Les crédits des contenus tiers (cartes, polices) figurent dans les [mentions légales](/legal).',
        ],
      },
      {
        id: 'liability',
        title: 'Responsabilité',
        blocks: [
          'Les informations géographiques du jeu (frontières, noms, capitales, chiffres) sont fournies pour jouer et peuvent contenir des erreurs ou des simplifications. Elles n’expriment aucune position politique.',
          'Dans les limites prévues par la loi, l’éditeur n’est pas responsable des interruptions du service, ni de la perte de scores ou de données de jeu.',
        ],
      },
      {
        id: 'privacy',
        title: 'Données personnelles',
        blocks: ['Le traitement de vos données est décrit dans la [politique de confidentialité](/privacy).'],
      },
      {
        id: 'changes',
        title: 'Modifications et droit applicable',
        blocks: [
          'Nous pouvons modifier ces conditions ; la date en haut de la page indique la dernière version. Continuer à utiliser GeoGame après une modification vaut acceptation.',
          'Ces conditions sont soumises au droit français. En cas de désaccord, écrivez-nous d’abord à {email} pour chercher une solution amiable.',
        ],
      },
    ],
  },

  legal: {
    title: 'Mentions légales',
    intro: [],
    sections: [
      {
        id: 'editor',
        title: 'Éditeur',
        blocks: ['GeoGame est édité par {editor}.', 'Contact : {email}', 'Directeur de la publication : {editor}.'],
      },
      {
        id: 'hosting',
        title: 'Hébergement',
        blocks: [
          {
            list: [
              'Site et fonctions serveur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis ([vercel.com](https://vercel.com)).',
              'Comptes et base de données : Google Firebase, Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande ([firebase.google.com](https://firebase.google.com)).',
            ],
          },
        ],
      },
      {
        id: 'credits',
        title: 'Crédits',
        blocks: [
          {
            list: [
              'Drapeaux : [Flagpedia](https://flagpedia.net).',
              'Police Inter : Rasmus Andersson, sous licence SIL Open Font License.',
              'Contours détaillés des petits territoires : [geoBoundaries](https://www.geoboundaries.org) (CC BY) et © les contributeurs d’[OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).',
              'Les contours issus d’OpenStreetMap restent sous licence ODbL : ils sont inclus dans les fichiers de géométrie du site et de l’application, que toute personne peut réutiliser aux conditions de cette licence.',
            ],
          },
        ],
      },
      {
        id: 'report',
        title: 'Signaler un contenu',
        blocks: [
          'Pour signaler un contenu illicite, par exemple un pseudo injurieux, utilisez le drapeau de signalement dans les classements ou écrivez à {email}.',
        ],
      },
      {
        id: 'links',
        title: 'Voir aussi',
        blocks: ['[Politique de confidentialité](/privacy) · [Conditions d’utilisation](/terms)'],
      },
    ],
  },

  deleteAccount: {
    title: 'Supprimer votre compte',
    intro: [
      'Vous pouvez supprimer votre compte GeoGame à tout moment, gratuitement. La suppression est immédiate et définitive.',
    ],
    sections: [
      {
        id: 'app',
        title: 'Depuis l’application',
        blocks: ['Ouvrez l’onglet Profil, touchez « Supprimer mon compte » en bas de l’écran, puis confirmez avec votre mot de passe ou avec Google.'],
      },
      {
        id: 'site',
        title: 'Depuis le site',
        blocks: ['Connectez-vous sur la page [Mon compte](/account), cliquez sur « Supprimer mon compte », puis confirmez.'],
      },
      {
        id: 'email',
        title: 'Sans accès à votre compte',
        blocks: [
          'Écrivez à {email} depuis l’adresse e-mail de votre compte, en indiquant votre pseudo. Nous supprimons le compte dans un délai de 30 jours au plus et vous le confirmons.',
        ],
      },
      {
        id: 'deleted',
        title: 'Ce qui est supprimé',
        blocks: [
          {
            list: [
              'votre compte et votre adresse e-mail ;',
              'votre pseudo, qui redevient disponible ;',
              'votre historique de parties et vos statistiques ;',
              'vos scores dans tous les classements ;',
              'vos amis et vos invitations ;',
              'les appareils enregistrés pour les notifications ;',
              'les signalements que vous avez faits, et ceux qui visent vos scores.',
            ],
          },
        ],
      },
      {
        id: 'kept',
        title: 'Ce qui peut rester',
        blocks: [
          {
            list: [
              'votre pseudo dans un salon multijoueur, jusqu’à l’expiration du salon (10 jours au plus) ;',
              'les scores enregistrés sans être connecté, qui ne sont pas liés à votre compte : demandez leur suppression par e-mail ;',
              'les journaux techniques des hébergeurs, effacés après quelques jours.',
            ],
          },
        ],
      },
    ],
  },
}

const en = {
  privacy: {
    title: 'Privacy policy',
    intro: [
      'GeoGame is a free geography game, on the website {site} and in the GeoGame mobile app. This page explains what data we process, why, for how long, and how to exercise your rights.',
      'We collect as little data as we can: no advertising, no selling of data, no profiling.',
    ],
    sections: [
      {
        id: 'controller',
        title: 'Data controller',
        blocks: ['{editor}, who can be reached at {email}.'],
      },
      {
        id: 'data',
        title: 'The data we process',
        blocks: [
          'You can play freely without an account. We then only receive what you choose to publish: the name and score you save to a leaderboard, the name you use in a multiplayer room, and the reports you make (with a random identifier created on your device).',
          'With an account, we also process:',
          {
            list: [
              'your email address and your password, which Firebase Authentication stores encrypted: we never have access to it. If you sign in with Google, we receive the email address and identifier of your Google account (Google may also send your name and profile picture, which we do not use);',
              'your username, the date your account was created and your sign-in dates;',
              'your game history (game, mode, score, time, date) and your scores in the leaderboards, including the answers you tried in the daily challenges;',
              'your friend requests, your friends, and the room invites you send or receive;',
              'if you allow notifications, in the app or in the web app added to your home screen: a device notification identifier (Expo token or Web Push subscription), your language, your device type and your choice for the daily reminder.',
            ],
          },
          'For everyone, our hosting providers also process the IP address and technical information of each request (browser, device) to run and secure the service. On the website, Vercel Web Analytics measures audience without cookies and only provides aggregated visit statistics, and Firebase App Check uses Google reCAPTCHA Enterprise, which analyses browser signals to check that requests really come from the game.',
        ],
      },
      {
        id: 'public',
        title: 'What is public',
        blocks: [
          'Your username, your leaderboard scores and your profile page (sign-up date, statistics, game history) are visible to everyone. Your email address, your friends and your invites are never public. If you would rather stay anonymous, choose a username that does not reveal who you are.',
        ],
      },
      {
        id: 'purposes',
        title: 'Why, and on what legal basis',
        blocks: [
          {
            list: [
              'Running the game, your account, the leaderboards, your history, friends and multiplayer: performance of the [terms of use](/terms) you accept by using GeoGame (Article 6(1)(b) GDPR).',
              'Sending notifications (room invites, friend requests, daily challenge reminder): your consent, given by allowing notifications and which you can withdraw at any time in your device settings. The daily reminder can also be turned off from your profile.',
              'Protecting the service against cheating and abuse (App Check, reports, username filter) and measuring audience anonymously: our legitimate interest in offering a reliable game and improving it (Article 6(1)(f) GDPR).',
            ],
          },
          'We do no advertising, no profiling and no automated decision-making about you, and we do not sell any data.',
        ],
      },
      {
        id: 'recipients',
        title: 'Recipients and providers',
        blocks: [
          'Your data is only accessible to the publisher and to the following technical providers, who process it on our behalf:',
          {
            list: [
              'Google (Firebase Authentication, Cloud Firestore, App Check, reCAPTCHA Enterprise): accounts, database and abuse protection;',
              'Vercel Inc.: hosting of the website and server functions, audience measurement;',
              'Expo (650 Industries, Inc.): delivery of notifications and app updates;',
              'browser push services (Apple, Google, Mozilla or Microsoft depending on your device): delivery of the web app’s notifications;',
              'Flagpedia (flagcdn.com): some flag images on the website.',
            ],
          },
          'Some of these providers are located outside the European Union, in particular in the United States. These transfers are covered by the EU–US Data Privacy Framework or by the European Commission’s standard contractual clauses.',
        ],
      },
      {
        id: 'retention',
        title: 'How long we keep data',
        blocks: [
          {
            list: [
              'Account and related data: as long as the account exists. An account unused for 3 years (no sign-in, no game) is deleted automatically with all its data.',
              'Scores saved without an account: as long as the leaderboard exists. You can ask for them to be deleted.',
              'Multiplayer rooms: deleted automatically when they expire, at most 10 days after being created. Invites: one day at most.',
              'Notification tokens: until the device signs out, the account is deleted, or the device can no longer receive them.',
              'Reports: as long as it takes to handle them.',
              'Hosting providers’ technical logs: a limited period set by the provider, usually a few days.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        title: 'Cookies and storage on your device',
        blocks: [
          'GeoGame uses no advertising or audience-measurement cookies. The game stores on your device what it needs to work: your sign-in session, your name, your language, recent rooms, your progress in the daily challenges, and a random visitor identifier for reports. reCAPTCHA may set a technical cookie needed for abuse protection.',
          'These are strictly necessary for the service and therefore do not require consent. You can clear them at any time in your browser settings or by uninstalling the app.',
        ],
      },
      {
        id: 'rights',
        title: 'Your rights',
        blocks: [
          'You have the right to access, rectify and erase your data, to restrict or object to its processing, and to data portability.',
          'You can delete your account and all its data yourself at any time: see [Delete my account](/delete-account). For any other request (a copy of your data, a change of username, deleting a score saved without an account…), write to {email}. We answer within one month.',
          'If you believe your rights are not respected, you can lodge a complaint with your data protection authority, in France the CNIL ([cnil.fr](https://www.cnil.fr)).',
        ],
      },
      {
        id: 'minors',
        title: 'Minors',
        blocks: [
          'Anyone can play GeoGame without an account. Creating an account is reserved for people aged 13 or over, and, between 13 and 15, for those who have a parent’s agreement. A parent who finds that a child created an account without their agreement can write to us to have it deleted.',
        ],
      },
      {
        id: 'security',
        title: 'Security',
        blocks: [
          'All traffic is encrypted (HTTPS). Access to the database is controlled by security rules: everyone can only read what is public or what concerns them, and can only change their own data.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes',
        blocks: [
          'We may update this policy; the date at the top of the page shows the latest version. If something important changes, we will announce it in the game.',
        ],
      },
    ],
  },

  terms: {
    title: 'Terms of use',
    intro: [
      'These terms govern the use of GeoGame, on the website {site} and in the mobile app. By using GeoGame, you accept them.',
    ],
    sections: [
      {
        id: 'access',
        title: 'Access to the game',
        blocks: [
          'GeoGame is free and can be played without an account. An account also lets you reserve a username, keep a history, add friends and receive invites. Internet access is at your own expense.',
          'The game is provided as is. We may change it, add or remove games, or interrupt it, in particular for maintenance, without notice.',
        ],
      },
      {
        id: 'account',
        title: 'Account',
        blocks: [
          'Creating an account is reserved for people aged 13 or over, and, between 13 and 15, for those who have a parent’s agreement. You agree to give a valid email address and to keep your password confidential. You can delete your account at any time ([Delete my account](/delete-account)).',
        ],
      },
      {
        id: 'conduct',
        title: 'Rules of conduct',
        blocks: [
          'By using GeoGame, you agree not to:',
          {
            list: [
              'choose a username that is insulting, hateful, discriminatory or sexual, that impersonates someone, or that reveals personal information about someone else;',
              'cheat: change or fake scores, automate games, exploit a bug;',
              'disrupt the service or try to access data that does not concern you;',
              'harass other players, for example with repeated invites or friend requests.',
            ],
          },
        ],
      },
      {
        id: 'moderation',
        title: 'Moderation',
        blocks: [
          'Anyone can report a score or a username with the flag shown in the leaderboards. We may delete a score, a username or an account that breaks these rules, without notice in obvious cases.',
        ],
      },
      {
        id: 'ip',
        title: 'Intellectual property',
        blocks: [
          'The GeoGame name, code, design and texts belong to the publisher. Reproducing them without permission is forbidden. Credits for third-party content (maps, fonts) are in the [legal notice](/legal).',
        ],
      },
      {
        id: 'liability',
        title: 'Liability',
        blocks: [
          'The geographic information in the game (borders, names, capitals, figures) is provided for playing and may contain errors or simplifications. It does not express any political position.',
          'To the extent permitted by law, the publisher is not liable for interruptions of the service, nor for the loss of scores or game data.',
        ],
      },
      {
        id: 'privacy',
        title: 'Personal data',
        blocks: ['How your data is processed is described in the [privacy policy](/privacy).'],
      },
      {
        id: 'changes',
        title: 'Changes and governing law',
        blocks: [
          'We may change these terms; the date at the top of the page shows the latest version. Continuing to use GeoGame after a change means you accept it.',
          'These terms are governed by French law. In case of disagreement, please write to us first at {email} to look for an amicable solution.',
        ],
      },
    ],
  },

  legal: {
    title: 'Legal notice',
    intro: [],
    sections: [
      {
        id: 'editor',
        title: 'Publisher',
        blocks: ['GeoGame is published by {editor}.', 'Contact: {email}', 'Publication director: {editor}.'],
      },
      {
        id: 'hosting',
        title: 'Hosting',
        blocks: [
          {
            list: [
              'Website and server functions: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, United States ([vercel.com](https://vercel.com)).',
              'Accounts and database: Google Firebase, Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland ([firebase.google.com](https://firebase.google.com)).',
            ],
          },
        ],
      },
      {
        id: 'credits',
        title: 'Credits',
        blocks: [
          {
            list: [
              'Flags: [Flagpedia](https://flagpedia.net).',
              'Inter typeface: Rasmus Andersson, under the SIL Open Font License.',
              'Detailed outlines of small territories: [geoBoundaries](https://www.geoboundaries.org) (CC BY) and © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL).',
              'Outlines taken from OpenStreetMap remain under the ODbL license: they are included in the geometry files of the website and the app, which anyone may reuse under the terms of that license.',
            ],
          },
        ],
      },
      {
        id: 'report',
        title: 'Reporting content',
        blocks: [
          'To report unlawful content, such as an offensive username, use the report flag in the leaderboards or write to {email}.',
        ],
      },
      {
        id: 'links',
        title: 'See also',
        blocks: ['[Privacy policy](/privacy) · [Terms of use](/terms)'],
      },
    ],
  },

  deleteAccount: {
    title: 'Delete your account',
    intro: ['You can delete your GeoGame account at any time, free of charge. Deletion is immediate and permanent.'],
    sections: [
      {
        id: 'app',
        title: 'From the app',
        blocks: ['Open the Profile tab, tap “Delete my account” at the bottom of the screen, then confirm with your password or with Google.'],
      },
      {
        id: 'site',
        title: 'From the website',
        blocks: ['Sign in on the [My account](/account) page, click “Delete my account”, then confirm.'],
      },
      {
        id: 'email',
        title: 'If you can no longer sign in',
        blocks: [
          'Write to {email} from your account’s email address, giving your username. We delete the account within 30 days at most and confirm it to you.',
        ],
      },
      {
        id: 'deleted',
        title: 'What is deleted',
        blocks: [
          {
            list: [
              'your account and email address;',
              'your username, which becomes available again;',
              'your game history and statistics;',
              'your scores in every leaderboard;',
              'your friends and invites;',
              'the devices registered for notifications;',
              'the reports you made, and those about your scores.',
            ],
          },
        ],
      },
      {
        id: 'kept',
        title: 'What may remain',
        blocks: [
          {
            list: [
              'your name in a multiplayer room, until the room expires (10 days at most);',
              'scores saved while signed out, which are not tied to your account: ask for their deletion by email;',
              'hosting providers’ technical logs, erased after a few days.',
            ],
          },
        ],
      },
    ],
  },
}

const ru = {
  privacy: {
    title: 'Политика конфиденциальности',
    intro: [
      'GeoGame — бесплатная игра по географии на сайте {site} и в мобильном приложении GeoGame. На этой странице объясняется, какие данные мы обрабатываем, зачем, как долго и как вы можете воспользоваться своими правами.',
      'Мы собираем как можно меньше данных: без рекламы, без продажи данных, без профилирования.',
    ],
    sections: [
      {
        id: 'controller',
        title: 'Оператор данных',
        blocks: ['{editor}, адрес для связи: {email}.'],
      },
      {
        id: 'data',
        title: 'Какие данные мы обрабатываем',
        blocks: [
          'Играть можно без аккаунта. В этом случае мы получаем только то, что вы сами публикуете: имя и результат, сохранённые в таблице рекордов, имя в многопользовательской комнате и ваши жалобы (со случайным идентификатором, созданным на вашем устройстве).',
          'С аккаунтом мы также обрабатываем:',
          {
            list: [
              'ваш адрес электронной почты и пароль, который Firebase Authentication хранит в зашифрованном виде: у нас нет к нему доступа. Если вы входите через Google, мы получаем адрес почты и идентификатор вашего аккаунта Google (Google может также передать ваше имя и фото профиля, которые мы не используем);',
              'ваш никнейм, дату создания аккаунта и даты входа;',
              'историю ваших игр (игра, режим, очки, время, дата) и ваши результаты в таблицах рекордов, включая ответы в ежедневных заданиях;',
              'ваши заявки в друзья, список друзей и приглашения в комнаты, которые вы отправляете или получаете;',
              'если вы разрешили уведомления в приложении или в веб-приложении на главном экране: идентификатор уведомлений устройства (токен Expo или подписка Web Push), язык, тип устройства и ваш выбор для ежедневного напоминания.',
            ],
          },
          'Для всех пользователей наши хостинг-провайдеры также обрабатывают IP-адрес и технические данные каждого запроса (браузер, устройство), чтобы сервис работал и был защищён. На сайте статистика Vercel Web Analytics работает без cookie и даёт только сводные данные о посещениях, а Firebase App Check использует Google reCAPTCHA Enterprise, который анализирует сигналы браузера, чтобы убедиться, что запросы действительно идут из игры.',
        ],
      },
      {
        id: 'public',
        title: 'Что видно всем',
        blocks: [
          'Ваш никнейм, результаты в таблицах рекордов и страница профиля (дата регистрации, статистика, история игр) видны всем. Ваш адрес почты, друзья и приглашения никогда не публикуются. Если хотите остаться анонимным, выберите никнейм, который не раскрывает вашу личность.',
        ],
      },
      {
        id: 'purposes',
        title: 'Зачем и на каком правовом основании',
        blocks: [
          {
            list: [
              'Работа игры, аккаунта, таблиц рекордов, истории, друзей и мультиплеера: исполнение [условий использования](/terms), которые вы принимаете, пользуясь GeoGame (ст. 6(1)(b) GDPR).',
              'Отправка уведомлений (приглашения в комнаты, заявки в друзья, напоминание о заданиях дня): ваше согласие, данное при разрешении уведомлений, которое можно отозвать в любой момент в настройках устройства. Ежедневное напоминание можно также отключить в профиле.',
              'Защита от читерства и злоупотреблений (App Check, жалобы, фильтр никнеймов) и анонимная статистика посещений: наш законный интерес в надёжной игре и её улучшении (ст. 6(1)(f) GDPR).',
            ],
          },
          'Мы не показываем рекламу, не профилируем вас, не принимаем автоматизированных решений и не продаём данные.',
        ],
      },
      {
        id: 'recipients',
        title: 'Получатели и подрядчики',
        blocks: [
          'Доступ к вашим данным есть только у издателя и у следующих технических подрядчиков, которые обрабатывают их по нашему поручению:',
          {
            list: [
              'Google (Firebase Authentication, Cloud Firestore, App Check, reCAPTCHA Enterprise): аккаунты, база данных и защита от злоупотреблений;',
              'Vercel Inc.: хостинг сайта и серверных функций, статистика посещений;',
              'Expo (650 Industries, Inc.): доставка уведомлений и обновлений приложения;',
              'службы уведомлений браузеров (Apple, Google, Mozilla или Microsoft, в зависимости от устройства): доставка уведомлений веб-приложения;',
              'Flagpedia (flagcdn.com): некоторые изображения флагов на сайте.',
            ],
          },
          'Некоторые подрядчики находятся за пределами Европейского союза, в частности в США. Такая передача данных регулируется Рамочным соглашением ЕС–США о конфиденциальности данных (Data Privacy Framework) или стандартными договорными положениями Европейской комиссии.',
        ],
      },
      {
        id: 'retention',
        title: 'Сроки хранения',
        blocks: [
          {
            list: [
              'Аккаунт и связанные данные: пока существует аккаунт. Аккаунт, который не использовался 3 года (ни входов, ни игр), удаляется автоматически вместе со всеми данными.',
              'Результаты, сохранённые без аккаунта: пока существует таблица рекордов. Вы можете попросить их удалить.',
              'Многопользовательские комнаты: удаляются автоматически по истечении срока, не позднее 10 дней после создания. Приглашения: не дольше одного дня.',
              'Токены уведомлений: до выхода из аккаунта на устройстве, удаления аккаунта или пока устройство может их получать.',
              'Жалобы: на время их рассмотрения.',
              'Технические журналы хостинг-провайдеров: ограниченный срок, установленный провайдером, обычно несколько дней.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        title: 'Cookie и хранение на устройстве',
        blocks: [
          'GeoGame не использует рекламные cookie и cookie для статистики. Игра хранит на вашем устройстве то, что нужно для работы: сессию входа, ваше имя, язык, недавние комнаты, прогресс ежедневных заданий и случайный идентификатор посетителя для жалоб. reCAPTCHA может установить технический cookie, необходимый для защиты от злоупотреблений.',
          'Эти данные строго необходимы для работы сервиса, поэтому согласие на них не требуется. Вы можете удалить их в любой момент в настройках браузера или удалив приложение.',
        ],
      },
      {
        id: 'rights',
        title: 'Ваши права',
        blocks: [
          'Вы имеете право на доступ к своим данным, их исправление и удаление, ограничение обработки, возражение против неё и переносимость данных.',
          'Вы можете сами удалить аккаунт и все его данные в любой момент: см. [Удалить аккаунт](/delete-account). По любому другому вопросу (копия ваших данных, смена никнейма, удаление результата, сохранённого без аккаунта…) пишите на {email}. Мы отвечаем в течение месяца.',
          'Если вы считаете, что ваши права нарушены, вы можете подать жалобу в орган по защите данных, во Франции это CNIL ([cnil.fr](https://www.cnil.fr)).',
        ],
      },
      {
        id: 'minors',
        title: 'Несовершеннолетние',
        blocks: [
          'Играть в GeoGame без аккаунта может любой. Создать аккаунт можно с 13 лет, а с 13 до 15 лет — с согласия родителя. Если родитель узнал, что ребёнок создал аккаунт без его согласия, он может написать нам, и мы удалим аккаунт.',
        ],
      },
      {
        id: 'security',
        title: 'Безопасность',
        blocks: [
          'Все соединения зашифрованы (HTTPS). Доступ к базе данных регулируется правилами безопасности: каждый может читать только общедоступные данные или данные о себе и изменять только свои данные.',
        ],
      },
      {
        id: 'changes',
        title: 'Изменения',
        blocks: [
          'Мы можем обновлять эту политику; дата вверху страницы указывает последнюю версию. О важных изменениях мы сообщим в игре.',
        ],
      },
    ],
  },

  terms: {
    title: 'Условия использования',
    intro: [
      'Эти условия регулируют использование GeoGame на сайте {site} и в мобильном приложении. Пользуясь GeoGame, вы их принимаете.',
    ],
    sections: [
      {
        id: 'access',
        title: 'Доступ к игре',
        blocks: [
          'GeoGame бесплатна, играть можно без аккаунта. Аккаунт позволяет закрепить никнейм, сохранять историю, добавлять друзей и получать приглашения. Доступ в интернет оплачиваете вы.',
          'Игра предоставляется «как есть». Мы можем менять её, добавлять или убирать игры или прерывать работу, в частности для обслуживания, без предупреждения.',
        ],
      },
      {
        id: 'account',
        title: 'Аккаунт',
        blocks: [
          'Создать аккаунт можно с 13 лет, а с 13 до 15 лет — с согласия родителя. Вы обязуетесь указать действующий адрес почты и не раскрывать свой пароль. Вы можете удалить аккаунт в любой момент ([Удалить аккаунт](/delete-account)).',
        ],
      },
      {
        id: 'conduct',
        title: 'Правила поведения',
        blocks: [
          'Пользуясь GeoGame, вы обязуетесь не:',
          {
            list: [
              'выбирать оскорбительный, ненавистнический, дискриминационный или сексуальный никнейм, выдавать себя за другого человека или раскрывать чужие личные данные;',
              'жульничать: изменять или подделывать результаты, автоматизировать игры, использовать ошибки;',
              'нарушать работу сервиса или пытаться получить доступ к чужим данным;',
              'преследовать других игроков, например повторяющимися приглашениями или заявками в друзья.',
            ],
          },
        ],
      },
      {
        id: 'moderation',
        title: 'Модерация',
        blocks: [
          'Любой может пожаловаться на результат или никнейм с помощью флажка в таблицах рекордов. Мы можем удалить результат, никнейм или аккаунт, нарушающий эти правила, в очевидных случаях без предупреждения.',
        ],
      },
      {
        id: 'ip',
        title: 'Интеллектуальная собственность',
        blocks: [
          'Название GeoGame, код, дизайн и тексты игры принадлежат издателю. Их воспроизведение без разрешения запрещено. Сведения о стороннем контенте (карты, шрифты) приведены в [правовой информации](/legal).',
        ],
      },
      {
        id: 'liability',
        title: 'Ответственность',
        blocks: [
          'Географические сведения в игре (границы, названия, столицы, цифры) приводятся для игры и могут содержать ошибки или упрощения. Они не выражают никакой политической позиции.',
          'В пределах, допускаемых законом, издатель не несёт ответственности за перерывы в работе сервиса и за потерю результатов или игровых данных.',
        ],
      },
      {
        id: 'privacy',
        title: 'Персональные данные',
        blocks: ['Обработка ваших данных описана в [политике конфиденциальности](/privacy).'],
      },
      {
        id: 'changes',
        title: 'Изменения и применимое право',
        blocks: [
          'Мы можем изменять эти условия; дата вверху страницы указывает последнюю версию. Продолжая пользоваться GeoGame после изменения, вы его принимаете.',
          'Эти условия регулируются правом Франции. В случае разногласий сначала напишите нам на {email}, чтобы найти решение мирным путём.',
        ],
      },
    ],
  },

  legal: {
    title: 'Правовая информация',
    intro: [],
    sections: [
      {
        id: 'editor',
        title: 'Издатель',
        blocks: ['Издатель GeoGame: {editor}.', 'Контакт: {email}', 'Ответственный за публикацию: {editor}.'],
      },
      {
        id: 'hosting',
        title: 'Хостинг',
        blocks: [
          {
            list: [
              'Сайт и серверные функции: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, США ([vercel.com](https://vercel.com)).',
              'Аккаунты и база данных: Google Firebase, Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ирландия ([firebase.google.com](https://firebase.google.com)).',
            ],
          },
        ],
      },
      {
        id: 'credits',
        title: 'Благодарности',
        blocks: [
          {
            list: [
              'Флаги: [Flagpedia](https://flagpedia.net).',
              'Шрифт Inter: Rasmus Andersson, лицензия SIL Open Font License.',
              'Подробные контуры малых территорий: [geoBoundaries](https://www.geoboundaries.org) (CC BY) и © участники [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).',
              'Контуры, взятые из OpenStreetMap, остаются под лицензией ODbL: они включены в файлы геометрии сайта и приложения, которые каждый может использовать на условиях этой лицензии.',
            ],
          },
        ],
      },
      {
        id: 'report',
        title: 'Сообщить о нарушении',
        blocks: [
          'Чтобы сообщить о незаконном контенте, например об оскорбительном никнейме, используйте флажок жалобы в таблицах рекордов или напишите на {email}.',
        ],
      },
      {
        id: 'links',
        title: 'См. также',
        blocks: ['[Политика конфиденциальности](/privacy) · [Условия использования](/terms)'],
      },
    ],
  },

  deleteAccount: {
    title: 'Удаление аккаунта',
    intro: ['Вы можете удалить свой аккаунт GeoGame в любой момент бесплатно. Удаление происходит сразу и безвозвратно.'],
    sections: [
      {
        id: 'app',
        title: 'В приложении',
        blocks: ['Откройте вкладку «Профиль», нажмите «Удалить аккаунт» внизу экрана и подтвердите паролем или через Google.'],
      },
      {
        id: 'site',
        title: 'На сайте',
        blocks: ['Войдите на странице [Мой аккаунт](/account), нажмите «Удалить аккаунт» и подтвердите.'],
      },
      {
        id: 'email',
        title: 'Если вы не можете войти',
        blocks: [
          'Напишите на {email} с адреса почты вашего аккаунта и укажите никнейм. Мы удалим аккаунт не позднее чем через 30 дней и подтвердим это.',
        ],
      },
      {
        id: 'deleted',
        title: 'Что удаляется',
        blocks: [
          {
            list: [
              'ваш аккаунт и адрес почты;',
              'ваш никнейм, который снова становится свободным;',
              'история игр и статистика;',
              'ваши результаты во всех таблицах рекордов;',
              'друзья и приглашения;',
              'устройства, зарегистрированные для уведомлений;',
              'ваши жалобы и жалобы на ваши результаты.',
            ],
          },
        ],
      },
      {
        id: 'kept',
        title: 'Что может остаться',
        blocks: [
          {
            list: [
              'ваше имя в многопользовательской комнате до истечения её срока (не более 10 дней);',
              'результаты, сохранённые без входа в аккаунт, которые с ним не связаны: попросите удалить их по почте;',
              'технические журналы хостинг-провайдеров, которые стираются через несколько дней.',
            ],
          },
        ],
      },
    ],
  },
}

export const LEGAL_DOCUMENTS = { fr, en, es, pt, de, it, ru, uk }
