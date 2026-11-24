import type { ImageSourcePropType } from 'react-native'
import { getFlag } from '@/flags'

// Metro requires static paths for the copies of the historical flag artwork bundled with the app.
const SOURCES: Record<string, ImageSourcePropType> = {
  ussr: require('../assets/historical-flags/ussr.png'),
  'east-germany': require('../assets/historical-flags/east-germany.png'),
  yugoslavia: require('../assets/historical-flags/yugoslavia.png'),
  qing: require('../assets/historical-flags/qing.png'),
  'brazil-empire': require('../assets/historical-flags/brazil-empire.png'),
  'ethiopia-empire': require('../assets/historical-flags/ethiopia-empire.png'),
  'fiji-kingdom': require('../assets/historical-flags/fiji-kingdom.png'),
}

export const getHistoricalFlag = (id: string) => SOURCES[id]
export const getAvatarFlag = (id: string) => getHistoricalFlag(id) ?? getFlag(id)
