# Design : choix du drapeau, doublons, crédits et boutique

**Date :** 2026-10-29

## Contexte

Aujourd'hui, quand un drapeau est terminé, le suivant est **imposé** (tirage pondéré par rareté parmi ceux qui
manquent, `drawFlag` dans `src/utils/flagCollection.js`). On veut :

1. **Choisir** le prochain drapeau parmi 3.
2. Accepter les **doublons** : les 3 sont tirés parmi les 239, y compris ceux qu'on a déjà.
3. Un doublon reconstruit rapporte des **crédits**.
4. Une **boutique** où les crédits achètent un drapeau précis, une relance ou un gel de série.

Prérequis : les fragments des défis du jour et de la série (autre chantier, même fichiers) sont commités avant de
commencer. Ce design s'appuie sur leur rythme (~35 fragments/semaine pour un joueur parfait).

### Rythme simulé (200 tirages par scénario)

| Scénario | Parfait | Régulier | Occasionnel |
|---|---|---|---|
| Actuel (1 drapeau imposé) | 6,0 mois | 11,7 mois | 28 mois |
| **Retenu : doublons + boutique à 1,5×** | **6,7 mois** | **13,1 mois** | **31 mois** |

La relance gratuite hebdomadaire est comptée ; les achats de relances et de gels ne le sont pas (ils allongent un peu).

---

## 1. Décisions

| Sujet | Décision |
|---|---|
| Tirage | 3 drapeaux **distincts** parmi les 239, pondérés par rareté (`RARITY_WEIGHTS` inchangé : 4/3/2/1) |
| Doublon | Possible. On le reconstruit avec des fragments comme un autre ; terminé, il rapporte `piecesFor(rarity)` crédits (2/3/4/6) |
| Joueur qui ne choisit pas | Ses fragments vont dans une **réserve** sans limite, versée sur le drapeau quand il choisit. Pas de choix automatique |
| Changer d'avis en cours de route | Non : le drapeau choisi est gardé jusqu'à ce qu'il soit terminé |
| Relance | **1 gratuite par semaine** (semaine de `weekKeyOf`, Paris), puis payante en crédits |
| Prix d'un drapeau en boutique | **1,5 × son coût en pièces**, arrondi au supérieur : 3 / 5 / 6 / 9 crédits |
| Argent réel | **Jamais** : les crédits se gagnent seulement en jouant (pas d'achat intégré, pas de loot box payante) |

### Catalogue de la boutique

| Article | Prix | Règle |
|---|---|---|
| Un drapeau précis | 3 / 5 / 6 / 9 crédits selon la rareté | Seulement un drapeau pas encore débloqué. Débloqué tout de suite (animation de déblocage). Ne touche ni au drapeau en cours ni aux 3 proposés |
| Relance des 3 drapeaux proposés | 2 crédits (après la relance gratuite de la semaine) | Seulement quand un choix est en attente |
| Gel de série | 5 crédits | Protège 1 jour manqué de la série. 2 gels en stock au plus |

Le gel de série dépend de la façon dont l'autre chantier calcule la série côté serveur : il s'implémente **en dernier**
(phase 3), une fois ce code en place. S'il pose problème, il sort du lancement sans bloquer le reste.

---

## 2. Données : `users/{uid}.flags`

Toujours écrit par le serveur seul (les règles Firestore refusent déjà `flags` au joueur : aucun changement de règles).

```
{
  unlocked: [iso, ...],        // inchangé : dans l'ordre de déblocage
  current: iso | null,         // drapeau en reconstruction (peut être un doublon)
  pieces: n,                   // pièces de current, 0..piecesFor - 1
  choices: [iso, iso, iso] | null,  // les 3 proposés ; non null => current est null
  bank: n,                     // fragments en réserve tant qu'aucun drapeau n'est choisi
  credits: n,
  draws: n,                    // nombre de tirages de 3 faits (graine des tirages)
  freeRerollWeek: 'YYYY-Www' | null,  // semaine où la relance gratuite a servi
  freezes: n                   // gels de série en stock (phase 3)
}
```

- **Graine** des tirages : `${uid}:${draws}`. Un même état donne toujours les 3 mêmes drapeaux : recharger ne relance
  pas. `draws` augmente à chaque tirage (nouveau choix ou relance), ce qui évite que les doublons (qui n'augmentent pas
  `unlocked.length`) fassent ressortir le même trio.
- **Lecture tolérante** (`readFlags`) : les champs absents valent `null` / `0`. Un `choices` qui contient un iso inconnu
  ou un doublon interne est jeté (le prochain passage serveur retire). `current` et `choices` à la fois : `choices` est
  ignoré.
- Ces champs sont dans le profil public (comme aujourd'hui `flags`) : les crédits des autres joueurs sont visibles.
  Sans enjeu, on ne les affiche simplement pas ailleurs que sur son propre profil.

### Migration

Aucune. Un ancien document (`unlocked`, `current`, `pieces`) se lit tel quel : le drapeau en cours se termine
normalement, et le choix de 3 arrive au suivant. Un joueur sans `current` reçoit un choix à son premier fragment.

---

## 3. Règles pures (`src/utils/flagCollection.js`)

Le fichier reste sans import Firebase ni JSON (l'API le bundle). Nouvelles constantes et fonctions :

```js
export const CHOICE_COUNT = 3
export const SHOP_PRICE_FACTOR = 1.5
export const shopPriceOf = (rarity) => Math.ceil(piecesFor(rarity) * SHOP_PRICE_FACTOR)   // 3 / 5 / 6 / 9
export const REROLL_PRICE = 2
export const FREEZE_PRICE = 5
export const MAX_FREEZES = 2
```

- `drawChoices(pool, seed)` : 3 iso distincts parmi tout le pool, pondérés par rareté (même PRNG `mulberry32`).
- `addFragments(state, count, pool, seed)` (modifiée) :
  - pas de `current` et pas de `choices` : tire `choices` (`draws += 1`) ;
  - `choices` en attente : les fragments vont dans `bank` ;
  - sinon, pièces sur `current` comme aujourd'hui. Quand `current` est terminé : nouveau → `unlocked` ; doublon →
    `credits += piecesFor(rarity)`. Puis nouveau tirage de `choices`, et les fragments restants vont dans `bank`.
  - Retourne `{ state, unlocked: [...], credited: n }` (`credited` pour le toast).
  - Une fois les 239 débloqués : plus de tirage ; les fragments deviennent des crédits au taux 1:1 (pour que jouer reste
    utile ; les crédits ne servent plus qu'au gel).
- `chooseFlag(state, iso, pool, seed)` : `iso` doit être dans `choices`, sinon erreur `not_offered`. Fixe `current`,
  vide `choices`, puis verse `bank` avec `addFragments` (qui peut terminer le drapeau et proposer un nouveau trio).
- `rerollChoices(state, pool, seed, week)` : exige `choices`. Gratuit si `freeRerollWeek !== week` (le fixe à `week`),
  sinon `credits >= REROLL_PRICE` (sinon erreur `not_enough_credits`). `draws += 1`, nouveaux `choices`.
- `buyFlag(state, iso, pool)` : `iso` connu, pas dans `unlocked`, pas égal à `current`, `credits >= shopPriceOf` ;
  l'ajoute à `unlocked`. S'il fait partie de `choices`, ce trio reste tel quel (le joueur verra qu'il l'a déjà).
- `buyFreeze(state)` (phase 3) : `freezes < MAX_FREEZES` et `credits >= FREEZE_PRICE`.

Toutes ces fonctions sont pures et testées dans `src/utils/flagCollection.test.js` (graines fixes, cas limites :
réserve qui termine plusieurs drapeaux d'un coup, collection complète, état ancien sans les nouveaux champs).

---

## 4. API : `POST /api/xp` (pas de nouvelle fonction Vercel)

`api/` compte déjà 10 fonctions (limite 12 sur l'offre gratuite). On étend la route existante avec un corps
optionnel :

| Corps | Effet |
|---|---|
| *(vide)* | Comme aujourd'hui : paie l'XP et les fragments |
| `{ "action": "choose", "iso": "FR" }` | `chooseFlag` |
| `{ "action": "reroll" }` | `rerollChoices` |
| `{ "action": "buy", "item": "flag", "iso": "FR" }` | `buyFlag` |
| `{ "action": "buy", "item": "freeze" }` | `buyFreeze` (phase 3) |

- `api/xp.mjs` passe `req.body` à `handleXp` ; `api/_lib/xp.mjs` route selon `action`.
- Chaque action se fait dans **une transaction** sur `users/{uid}` (relit `flags`, applique la règle pure, écrit).
- Erreurs : `400 bad_request` (corps invalide), `409 not_offered` / `not_owned_choice` / `already_unlocked` /
  `no_choice`, `402 not_enough_credits`. Le client affiche un message et relit l'état.
- Réponse 200 : même forme qu'aujourd'hui (`flags`, `unlockedFlags`, ...) plus `credited`, pour que les écouteurs de
  `onXpClaimed` (toasts, animation de déblocage) servent aussi aux achats.
- Les actions n'appellent pas `grantXp` : choisir ou acheter ne paie pas d'XP. L'appel sans corps reste idempotent.

Tests : `tests/emulator/xp.test.mjs` (choix valide et refusé, réserve versée, relance gratuite puis payante, achat
avec et sans assez de crédits, deux achats simultanés du même drapeau → un seul passe).

---

## 5. Écrans (site `src/` et app `mobile/`)

La logique est partagée (`flagCollection.js`) ; seuls les composants sont faits deux fois. Côté client, un helper
`flagAction(uid, body)` à côté de `claimXp` (`src/utils/xp.js` et son équivalent mobile) appelle la route et patche le
cache public comme `claimXp`.

### Choix du drapeau

- **Après un déblocage** (`FlagUnlockOverlay`) : sous le drapeau débloqué (ou « Doublon : +4 crédits »), le titre
  « Choisis ton prochain drapeau » et 3 cartes : drapeau, nom du pays, couleur de rareté, prix en pièces, et un badge
  « Déjà obtenu » sur les doublons. Un toucher choisit. Bouton « Relancer » (« gratuit » ou « 2 crédits »).
  Fermer sans choisir est permis.
- **Profil** (`FlagCollection`) : tant qu'un choix est en attente, la zone « En cours » devient ce même bloc de 3
  cartes, avec « 3 fragments en réserve ».
- **Toast de fragment** (`FragmentToast`) : sans drapeau en cours, « +1 en réserve » ; doublon terminé,
  « +4 crédits ».

### Boutique

- Entrée : un bouton « Boutique · 12 crédits » dans la section collection du profil (son propre profil seulement).
- Site : un panneau modal ; app : une feuille (bottom sheet) ou un écran `mobile/src/app/shop.tsx`.
- Contenu : le solde, la relance (si un choix est en attente), le gel (phase 3), puis la liste des drapeaux manquants
  avec recherche et filtre par rareté, chacun avec son prix. Achat après une confirmation (« Acheter Tonga pour 9
  crédits ? »). Les articles trop chers sont grisés.

### Textes

Nouvelles clés `collection.*` et `shop.*` dans les 9 fichiers de `src/i18n/locales/` (l'app les partage). Le français est la référence ; les autres langues suivent dans la même PR.

---

## 6. Déploiement

Aucune règle Firestore à déployer (sauf si la phase 3 en demande une). Ordre : **Vercel d'abord** (le serveur sait lire
les anciens et les nouveaux états), puis le site et l'app. Une ancienne version de l'app qui reçoit un état avec
`choices` affiche « pas de drapeau en cours » : c'est le seul effet, et il disparaît à la mise à jour. Si on veut
l'éviter, le serveur peut choisir automatiquement pour les clients qui n'envoient pas l'en-tête de version : à décider
à l'implémentation selon le parc d'app.

## 7. Découpage

1. **Phase 1** : règles pures + API (`choose`, `reroll`) + choix sur le site et dans l'app + toasts.
2. **Phase 2** : crédits visibles, boutique (drapeau précis, relance payante).
3. **Phase 3** : gel de série (dépend du calcul serveur de la série).
