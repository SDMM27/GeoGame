import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateShareCard, exportShareCard, GAME_LABELS, generateShareText } from './shareScore'

const makeMockCtx = () => ({
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  roundRect: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
  save: vi.fn(),
  restore: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  font: '',
  textAlign: '',
  globalAlpha: 1,
  lineWidth: 1,
})

describe('GAME_LABELS', () => {
  it('maps all 7 game types', () => {
    expect(GAME_LABELS.FLAGS).toBe('Jeu des Drapeaux')
    expect(GAME_LABELS.PLACEMENT).toBe('Placement')
    expect(GAME_LABELS.CAPITALS).toBe('Capitales')
    expect(GAME_LABELS.BORDER_GUESS).toBe('Deviner la Frontière')
    expect(GAME_LABELS.COUNTRY_CLUE).toBe('Pays Mystère')
    expect(GAME_LABELS.RANKING).toBe('Classement')
    expect(GAME_LABELS.VOYAGE_VOYAGE).toBe('Voyage Voyage')
  })
})

describe('generateShareCard', () => {
  let mockCtx

  beforeEach(() => {
    mockCtx = makeMockCtx()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(cb =>
      cb(new Blob(['png'], { type: 'image/png' }))
    )
  })

  afterEach(() => vi.restoreAllMocks())

  it('returns an image/png Blob', async () => {
    const blob = await generateShareCard({ score: 42, gameType: 'FLAGS', difficulty: 'Difficile', pseudo: 'Pierre' })
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
  })

  it('draws the score as text', async () => {
    await generateShareCard({ score: 42, gameType: 'FLAGS', difficulty: 'Difficile', pseudo: 'Pierre' })
    const texts = mockCtx.fillText.mock.calls.map(c => c[0])
    expect(texts).toContain('42')
  })

  it('rounds fractional scores', async () => {
    await generateShareCard({ score: 7.6, gameType: 'VOYAGE_VOYAGE', difficulty: 'Daily', pseudo: 'X' })
    const texts = mockCtx.fillText.mock.calls.map(c => c[0])
    expect(texts).toContain('8')
  })

  it('displays Anonyme when pseudo is empty', async () => {
    await generateShareCard({ score: 10, gameType: 'FLAGS', difficulty: 'Facile', pseudo: '' })
    const texts = mockCtx.fillText.mock.calls.map(c => String(c[0]))
    expect(texts.some(t => t.includes('Anonyme'))).toBe(true)
  })

  it('uses custom scoreLabel when provided', async () => {
    await generateShareCard({ score: 5, gameType: 'BORDER_GUESS', difficulty: 'Daily', pseudo: '', scoreLabel: 'ESSAIS' })
    const texts = mockCtx.fillText.mock.calls.map(c => String(c[0]))
    expect(texts.some(t => t.includes('ESSAIS'))).toBe(true)
  })

  it('rejects when toBlob returns null', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(cb => cb(null))
    await expect(
      generateShareCard({ score: 0, gameType: 'FLAGS', difficulty: '', pseudo: '' })
    ).rejects.toThrow('Canvas toBlob returned null')
  })
})

describe('exportShareCard', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(makeMockCtx())
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(cb =>
      cb(new Blob(['png'], { type: 'image/png' }))
    )
  })

  afterEach(() => vi.restoreAllMocks())

  it('calls navigator.share when canShare is supported', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'canShare', { value: vi.fn().mockReturnValue(true), configurable: true })
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true })
    await exportShareCard({ score: 42, gameType: 'FLAGS', difficulty: 'Difficile', pseudo: 'P' })
    expect(mockShare).toHaveBeenCalledOnce()
  })

  it('falls back to URL.createObjectURL when canShare is unsupported', async () => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    const createObj = vi.fn(() => 'blob:fake')
    URL.createObjectURL = createObj
    URL.revokeObjectURL = vi.fn()
    const a = { href: '', download: '', click: vi.fn(), style: {} }
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(tag => {
      if (tag === 'a') return a
      return originalCreateElement(tag)
    })
    await exportShareCard({ score: 42, gameType: 'FLAGS', difficulty: 'Difficile', pseudo: '' })
    expect(createObj).toHaveBeenCalled()
  })
})

describe('generateShareText', () => {
  it('includes game label, score, difficulty, pseudo', () => {
    const text = generateShareText({ score: 42, gameType: 'FLAGS', difficulty: 'Difficile', pseudo: 'Pierre', details: '35/50 pays trouvés' })
    expect(text).toContain('Jeu des Drapeaux')
    expect(text).toContain('42')
    expect(text).toContain('Difficile')
    expect(text).toContain('Pierre')
  })

  it('uses Anonyme when pseudo is empty', () => {
    const text = generateShareText({ score: 10, gameType: 'FLAGS', difficulty: 'Facile', pseudo: '', details: '' })
    expect(text).toContain('Anonyme')
  })

  it('includes details line when provided', () => {
    const text = generateShareText({ score: 5, gameType: 'BORDER_GUESS', difficulty: 'Daily', pseudo: 'X', details: 'Trouvé en 2 essais' })
    expect(text).toContain('📊 Trouvé en 2 essais')
  })

  it('omits details line when not provided', () => {
    const text = generateShareText({ score: 5, gameType: 'RANKING', difficulty: 'Daily', pseudo: 'X' })
    expect(text).not.toContain('📊')
  })

  it('rounds fractional score', () => {
    const text = generateShareText({ score: 7.6, gameType: 'VOYAGE_VOYAGE', difficulty: 'Daily', pseudo: 'X', scoreLabel: 'PTS' })
    expect(text).toContain('8 PTS')
  })
})
