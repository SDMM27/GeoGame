// What the reward overlays read from an XP claim (onXpClaimed in utils/xp) and from the cached account.
import { readFlags, RARITY_COLORS } from '../../utils/flagCollection'
import { FLAG_POOL } from '../../utils/flagCollectionData'
import { cachedPublicData } from '../../utils/publicProfile'

const RARITY_OF = new Map(FLAG_POOL.map((flag) => [flag.iso, flag.rarity]))

export const rarityOf = (iso) => RARITY_OF.get(iso) ?? 'common'
export const rarityColor = (rarity) => RARITY_COLORS[rarity]

// The flags of the account after the claim (patched in the cache before the listeners run), or null when unknown.
// claim.demoFlags is dev only (see __emitXpClaimed): it stands in for the cached account.
export function flagsAfter(claim, uid) {
  if (claim.demoFlags) return claim.demoFlags
  const data = uid ? cachedPublicData(uid) : null
  return data ? readFlags(data, FLAG_POOL) : null
}

// Style of one piece (a cell of a cols x rows grid) showing only its part of the flag image.
export function pieceStyle(iso, index, cols, rows) {
  const col = index % cols
  const row = Math.floor(index / cols)
  return {
    backgroundImage: `url(/flags/${iso.toLowerCase()}.png)`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${cols > 1 ? (col / (cols - 1)) * 100 : 0}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`,
  }
}
