# Plan : parchemins de cartes historiques

**Date :** 2026-11-02. **État :** proposition, rien n'est implémenté.

## 1. L'idée

Le joueur gagne en jouant des parchemins scellés. Il ouvre chacun pour découvrir une carte historique zoomable et son
histoire. Il ne peut consulter que les siens ; sur le profil d'un autre joueur, il voit seulement « 12/40 parchemins ».

## 2. Décisions proposées

| Sujet | Décision |
|---|---|
| Nom | « Parchemins » à l'écran, `scrolls` dans le code |
| Taille | 12 parchemins au lancement, puis 40 au total, et d'autres ensuite |
| Gain | 2 sceaux = 1 parchemin, tiré au hasard parmi ceux qui manquent |
| Sources de sceaux | Bonus des missions de la semaine : 1. Tous les 5 niveaux : 1. Victoire en ligue : 1 |
| Rythme | Environ 1 parchemin toutes les 2 à 3 semaines pour un joueur régulier, soit 40 en 18 mois environ, à recalculer après simulation |
| Premier parchemin | Offert à tous : la Pangée de Snider-Pellegrini, pour faire découvrir la fonction |
| Rareté | Réutilise common / uncommon / rare / legendary et les poids 4/3/2/1. Elle change les chances de tirage, pas le prix |
| Fragments et crédits | Sans lien : ni achat, ni échange, pour ne pas ralentir les drapeaux |
| Argent réel | Jamais |
| Collection complète | Les sceaux restent en réserve, 4 au plus, pour les prochains parchemins |

La ligue ne paie un sceau qu'au vainqueur : avec environ 7 comptes dans le classement au 2 novembre, un sceau pour le
podium serait presque automatique.

## 3. Ce que voit le joueur

- **Gain :** la carte de fragments reste telle quelle. Un toast indique « +1 sceau (1/2) ».
- **Parchemin obtenu :** une animation montre le parchemin scellé. Le joueur touche le sceau et la carte se déroule. Cet
  écran n'interrompt pas une partie, il s'affiche sur l'écran de fin ou à l'accueil, comme les autres récompenses.
- **Sur son profil :** une section « Parchemins », avec le compteur et l'accès à la collection.
- **Collection :** une grille groupée par époque. Les parchemins manquants sont scellés et n'indiquent que l'époque.
- **Fiche :** carte avec zoom, titre, date, auteur, 3 ou 4 phrases d'histoire, un détail à repérer, et le crédit de la
  source. La date de réalisation est toujours affichée : voir « Deux familles de cartes ».
- **Profil d'un autre joueur :** le compteur seul, sans grille, sans titres et sans lien vers une fiche.

### Limite de la confidentialité

Le blocage porte sur l'interface. `users/{uid}` reste public (`allow read: if true`) et les images sont des fichiers
publics, donc une personne motivée pourrait les retrouver. Ce n'est pas un problème de sécurité : il n'y a rien à
gagner, et les cartes sont dans le domaine public. Protéger vraiment les images demanderait de passer par le serveur à
chaque ouverture, pour un coût sans rapport avec l'enjeu.

## 4. Catalogue

### Deux familles de cartes

- **Documents d'époque :** la carte a été réalisée à l'époque indiquée (Peutinger, Hereford, Mercator).
- **Atlas historiques :** la carte a été dessinée bien après les faits. C'est le cas de presque tous les empires :
  **il n'existe pas de carte de l'Empire romain à son apogée dessinée par les Romains**, et une carte de Shepherd date
  de 1923. Chaque fiche l'indique clairement : « Empire romain en 117, carte dressée en 1923 ».

**Oui, on peut donc inclure l'Empire romain, l'Empire russe, l'Égypte et les autres.** Ils forment même la partie la
plus parlante pour les joueurs. Sources principales : les atlas de Shepherd (1911-1923), Droysen (1886) et les cartes
historiques d'Ortelius (fin du XVIe siècle).

### Liste (40)

Le lot de lancement est marqué **L**. Licence : **vérifiée** veut dire que j'ai vu une page qui l'indique pour ce
fichier ou cette série ; tout le reste est à contrôler, voir section 5.

#### Temps géologiques (3)

| Parchemin | Source pressentie | Rareté | Licence |
|---|---|---|---|
| **L** Avant et après la séparation des continents | Snider-Pellegrini, 1858 | common | vérifiée |
| Pangée | Reconstitution dessinée pour le jeu | uncommon | à faire |
| Gondwana et Laurasia | Reconstitution dessinée pour le jeu | rare | à faire |

#### Antiquité (9)

| Parchemin | Source pressentie | Rareté | Licence |
|---|---|---|---|
| **L** Égypte antique | Ortelius, *Aegyptus Antiqua*, exemplaire de Stanford | common | vérifiée |
| **L** Papyrus de Turin, vers 1150 av. J.-C. | Photo du Museo Egizio (CC0) | legendary | vérifiée |
| Imago Mundi babylonienne, vers 600 av. J.-C. | Tablette du British Museum | legendary | voir section 5 |
| Monde d'Hérodote | Reconstitution du XIXe siècle | uncommon | à vérifier |
| Empire perse | Shepherd ou Droysen | common | à vérifier |
| Empire d'Alexandre | Shepherd ou Droysen | common | à vérifier |
| **L** Empire romain en 395 | Shepherd | common | vérifiée |
| Table de Peutinger | Copie médiévale d'une carte romaine | rare | à vérifier |
| Monde de Ptolémée | Édition imprimée du XVe siècle | rare | à vérifier |

#### Moyen Âge (10)

| Parchemin | Source pressentie | Rareté | Licence |
|---|---|---|---|
| Empire byzantin | Shepherd | common | à vérifier |
| Empire de Charlemagne | Shepherd ou Droysen | common | à vérifier |
| **L** Califat en 750 | Shepherd | uncommon | vérifiée |
| **L** Saint-Empire romain germanique | Shepherd (Hohenstaufen, 1138-1254) | uncommon | vérifiée |
| **L** Empire mongol | Shepherd, 1300-1405 | uncommon | vérifiée, scan à remplacer |
| **L** Tabula Rogeriana d'al-Idrisi, 1154 | Reconstitution de Konrad Miller | rare | vérifiée |
| Mappa mundi d'Hereford, vers 1300 | Fac-similé | rare | bloquée, voir section 5 |
| Empire du Mali | Atlas catalan (détail de Mansa Moussa) | rare | à vérifier |
| Atlas catalan, 1375 | BnF | legendary | à vérifier |
| Carte Kangnido, 1402 | Copie japonaise | legendary | à vérifier |

#### Grandes découvertes (9)

| Parchemin | Source pressentie | Rareté | Licence |
|---|---|---|---|
| **L** Planisphère de Waldseemüller, 1507 | Library of Congress | rare | vérifiée sur Commons |
| Carte de Piri Reis, 1513 | Reproduction | legendary | bloquée, voir section 5 |
| Planisphère de Cantino, 1502 | Reproduction | rare | à vérifier |
| Empire aztèque, plan de Tenochtitlan, 1524 | Édition imprimée | rare | à vérifier |
| Empire inca | Atlas ancien | uncommon | à vérifier |
| Mercator, 1569 | Reproduction | uncommon | bloquée, voir section 5 |
| **L** Empire ottoman, 1481-1683 | Shepherd | common | vérifiée |
| Empire moghol | Atlas ancien | uncommon | à vérifier |
| Chine des Ming | Atlas du XVIIe siècle (Martini ou Blaeu) | uncommon | à vérifier |

#### Époque moderne (9)

| Parchemin | Source pressentie | Rareté | Licence |
|---|---|---|---|
| **L** Croissance de la Russie, 1300-1796 | Shepherd | common | vérifiée |
| Carte de Cassini, France | Feuille du XVIIIe siècle | uncommon | à vérifier |
| Empire de Napoléon, 1812 | Shepherd | common | à vérifier |
| **L** Empire britannique en 1886 | Walter Crane | common | vérifiée sur Commons |
| Empire espagnol | Atlas ancien | common | à vérifier |
| Empire portugais | Atlas ancien | uncommon | à vérifier |
| Empire du Japon, Edo | Carte d'Ino Tadataka | rare | à vérifier |
| Empire austro-hongrois | Atlas vers 1900 | uncommon | à vérifier |
| Afrique avant la conférence de Berlin | Atlas du XIXe siècle | uncommon | à vérifier |

### Règles de contenu

- **Pas de limite de date :** des cartes plus récentes sont permises (1914-1918, URSS, etc.). Aucune n'est dans le lot
  de lancement. Chacune ne sort qu'après relecture de sa fiche, et ses droits sont à contrôler avec plus de soin : une
  carte récente peut encore être protégée.
- **Empires et colonies :** les fiches sont factuelles et mentionnent les peuples conquis. Elles ne présentent pas une
  conquête comme une réussite.
- **Sujets sensibles :** le jeu a des joueurs ukrainiens, russes et autres. Les fiches Empire russe, Empire ottoman et
  Afrique sont relues avec une attention particulière. Elles parlent du territoire de l'époque et ne laissent jamais
  entendre qu'il fonderait une frontière actuelle.
- **Texte sur les cartes :** il reste dans sa langue d'origine (latin, anglais, arabe). La fiche, elle, est traduite.
- **Faits :** chaque fiche garde au moins une source dans le fichier de suivi, et le français est relu avant traduction.

## 5. Droits des images

- **Politique :** domaine public uniquement, ou dessins faits pour le jeu. Pas de CC BY-SA ni de licence non commerciale.
- **Lot de lancement :** le détail, fichier par fichier, est dans [parchemins-sources.md](parchemins-sources.md).
  Le droit dépend du scan, pas seulement de l'ancienneté de la carte.
- **Bloquées :** Mercator (le photographe garde ses droits sur les photos en haute définition, et le scan de la BnF
  relève d'une licence pour l'usage commercial), Hereford (pas de conditions publiées par le Trust) et Piri Reis (scan
  d'origine mal documenté).
- **Objets de musée :** une photo peut avoir ses propres droits. L'Imago Mundi (British Museum) reste à traiter à part,
  et sort du catalogue sans source sûre.
- **Pangée et Gondwana :** pas de reprise d'une reconstitution moderne (Scotese ou autre), dont je n'ai pas pu confirmer
  la licence. On dessine notre propre carte à partir de l'idée scientifique, qui n'est pas protégée.
- **Suivi :** un fichier `docs/parchemins-sources.md` note pour chaque image l'URL, le statut constaté et la date. Une
  image sans cette ligne ne part pas en production. Ces crédits sont aussi affichés sur chaque fiche.

## 6. Technique

### Données : `users/{uid}.scrolls`

Écrit par le serveur seul. Les règles actuelles (`hasOnly` sur `badges`, `challenges`, `decoration`) refusent déjà ce
nouveau champ au joueur : **aucune règle à déployer**.

```
{ unlocked: [id, ...], seals: n }
```

### Fichiers

| Fichier | Rôle |
|---|---|
| `src/utils/scrollCollection.js` | Règles pures, sans Firebase, testées : `readScrolls`, `addSeals`, tirage. Réutilise `RARITY_WEIGHTS` ; `seedOf` est à exporter de `flagCollection.js` |
| `src/data/scrolls.js` | Catalogue : id stable, époque, rareté, famille, année, crédit |
| `src/data/scrollTexts/<lang>.json` | Textes des fiches, chargés à la demande comme `geoNames`. Pas dans les fichiers `locales` : ils pèseraient sur tous les joueurs |
| `src/i18n/locales/*.json` | Libellés de l'interface, 9 langues |
| `api/_lib/xp.mjs` | Paie les sceaux dans la même transaction que l'XP, et offre le premier parchemin |
| `src/utils/missions.js` | `grantXp` renvoie aussi `seals` : le bonus hebdomadaire nouvellement payé, et les multiples de 5 niveaux franchis |
| `api/_lib/weeklyTop.mjs` | Ajoute 1 sceau au vainqueur, à côté de `update.league` |
| `public/scrolls/<id>/` | Images WebP : vignette (400 px) et grande (2 400 px environ). Grande image sous 1 Mo si possible |
| Site | `ScrollCollection.jsx` sur le profil, page `/parchments`, `ScrollUnlockOverlay.jsx` |
| App | `mobile/src/components/profile/ScrollCollection.tsx`, `mobile/src/app/parchments.tsx`, overlay |
| `tests/emulator/xp.test.mjs`, `weeklyTop.test.mjs` | Paiement, idempotence, pas de double sceau |

### Points d'attention

- **Pas de nouvelle fonction Vercel :** tout passe par `/api/xp` et le cron existant. Le design de la boutique notait
  10 fonctions sur 12 autorisées.
- **Bonus hebdomadaire :** `pay` sert aux missions du jour et de la semaine. Seul le bonus de la semaine paie un sceau.
- **Images dans l'app :** contrairement aux drapeaux, intégrés à l'APK (`mobile/src/flags.ts`), les cartes sont
  téléchargées depuis `https://geo-game.app/scrolls/...` et mises en cache par `expo-image`. L'application ne grossit
  pas, et un nouveau parchemin ne demande pas de nouvelle version.
- **Zoom dans l'app :** `react-native-gesture-handler` et `reanimated` sont déjà installés. Pas de dépendance native
  nouvelle, donc une mise à jour EAS suffit, sous réserve de la vérification habituelle du fingerprint.
- **Anciennes versions de l'app :** elles ignorent `scrolls` et les nouveaux champs de la réponse. Les sceaux sont payés
  quand même, et tout apparaît à la mise à jour.
- **Profil public :** `ScrollCollection` n'affiche le compteur que si `own` est faux. `/parchments` lit uniquement le
  compte connecté et n'accepte aucun `uid`.
- **Boutique de drapeaux :** son design du 29 octobre n'est pas implémenté. Les deux chantiers se croisent dans
  `api/_lib/xp.mjs` mais restent indépendants.
- **Fiabilité :** comme pour les fragments, les missions se basent sur l'historique écrit par le client. Une partie
  inventée peut rapporter un sceau, dans les mêmes limites : une fois par semaine et par niveau.

## 7. Découpage

1. **Sources :** fait pour le lot de lancement. Reste à trouver un meilleur scan de l'Empire mongol et à regarder les
   aperçus non contrôlés.
2. **Règles et serveur :** `scrollCollection.js`, sceaux dans `/api/xp` et la ligue, tests unitaires et émulateur.
3. **Site :** section du profil, collection, fiche avec zoom, animation.
4. **App :** les mêmes écrans, tests et chargement distant.
5. **Contenu :** 12 fiches en français, relecture, puis traduction en 8 langues.
6. **Lancement :** Vercel d'abord, puis l'app par mise à jour EAS.
7. **Suite :** selon l'intérêt mesuré, ajout des 28 autres parchemins par petits lots.

### Volume de contenu

- Lancement : 12 fiches × 9 langues = **108 textes**.
- Catalogue complet : 40 × 9 = **360 textes**.
- Les traductions sont faites par machine, comme le reste du jeu. Une relecture native reste souhaitable.

## 8. Décisions de l'utilisateur (2026-11-02)

1. **Rythme :** 2 sceaux par parchemin, soit environ 18 mois pour 40 parchemins.
2. **Date :** pas de limite de 1914.

## Sources consultées

- [Snider-Pellegrini, Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Antonio_Snider-Pellegrini_Opening_of_the_Atlantic.jpg)
- [Aegyptus Antiqua, Stanford](https://purl.stanford.edu/xk589cf3149) et [exemplaire de Stellenbosch](https://digital.lib.sun.ac.za/handle/10019.2/818)
- [Cartes de Shepherd, Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Maps_showing_history_by_William_R._Shepherd)
- [Atlas de Shepherd 1923, université du Texas](https://maps.lib.utexas.edu/maps/historical/history_shepherd_1923.html)
- [Empire romain en 117, Shepherd](https://www.emersonkent.com/map_archive/roman_empire_117.htm)
- [Papyrus de Turin, Wikipedia](https://en.wikipedia.org/wiki/Turin_Papyrus_Map)
