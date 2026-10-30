import { useCallback, useState } from 'react'

const STORAGE_KEY = 'geogame:sections'

function readChoices() {
  try {
    const parsed = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeChoices(choices) {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(choices))
  } catch {
    // Ignore localStorage write failures.
  }
}

/**
 * Open state of a collapsible section: [open, toggle]. Until the player picks, `defaultOpen` rules (it may change while
 * data loads); the choice is then kept per `id` on this device.
 */
export default function useSectionOpen(id, defaultOpen) {
  const [choices, setChoices] = useState(readChoices)
  const stored = choices[id]
  const open = typeof stored === 'boolean' ? stored : Boolean(defaultOpen)

  const toggle = useCallback(() => {
    const next = { ...readChoices(), [id]: !open }
    writeChoices(next)
    setChoices(next)
  }, [id, open])

  return [open, toggle]
}
