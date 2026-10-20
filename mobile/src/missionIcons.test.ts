import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'

import { DAILY_POOL, WEEKLY_POOL } from '@shared/utils/missions'

describe('mission icons', () => {
  it('are all MaterialCommunityIcons glyphs', () => {
    const missing = [...DAILY_POOL, ...WEEKLY_POOL].filter((mission) => !(mission.icon in glyphs)).map((mission) => `${mission.id}: ${mission.icon}`)
    expect(missing).toEqual([])
  })
})
