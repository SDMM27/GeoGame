import { SEEN_KEY, WHATS_NEW, hasPlayedBefore, markSeen, pendingNote, type WhatsNewNote } from './whatsNew'

function storage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries))
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size
    },
  }
}

const note = (id: string): WhatsNewNote => ({ id, icon: 'translate', titleKey: 't', bodyKey: 'b' })
const NOTES = [note('2026-10-a'), note('2026-11-b')]

describe('whatsNew', () => {
  it('tells a returning player from a first launch', () => {
    expect(hasPlayedBefore(storage({ 'geogame-lang': 'fr' }))).toBe(false)
    expect(hasPlayedBefore(storage({ 'geogame-lang': 'fr', 'mp_player_id': 'x' }))).toBe(true)
  })

  it('shows nothing on a first launch, and nothing from before it later', () => {
    const s = storage()
    expect(pendingNote(s, false, NOTES)).toBeNull()
    expect(s.getItem(SEEN_KEY)).toBe('2026-11-b')
    expect(pendingNote(s, true, NOTES)).toBeNull()
  })

  it('shows the newest note once to a player who had the app before', () => {
    const s = storage({ 'mp_player_id': 'x' })
    const shown = pendingNote(s, true, NOTES)
    expect(shown?.id).toBe('2026-11-b')
    markSeen(s, shown!)
    expect(pendingNote(s, true, NOTES)).toBeNull()
  })

  it('shows a newer note to a player who saw an older one', () => {
    expect(pendingNote(storage({ [SEEN_KEY]: '2026-10-a' }), true, NOTES)?.id).toBe('2026-11-b')
  })

  it('has notes with sorted ids', () => {
    const ids = WHATS_NEW.map((n) => n.id)
    expect([...ids].sort()).toEqual(ids)
  })
})
