import { useMemo, useSyncExternalStore } from 'react'

function createQueue(uid) {
  const key = uid ? `geogame:flag-reveals:${uid}` : null
  /** @type {{ id: number, iso: string, count: number | null, replay?: boolean }[]} */
  let queue = []
  if (key) {
    try {
      const saved = JSON.parse(globalThis.localStorage?.getItem(key) ?? '[]')
      if (Array.isArray(saved)) queue = saved
    } catch {
      // The queue also works in memory when device storage is unavailable.
    }
  }
  let nextId = queue.reduce((max, item) => Math.max(max, item.id + 1), 0)
  const listeners = new Set()

  const update = (items) => {
    queue = items
    if (key) {
      try {
        const pending = items.filter((item) => !item.replay)
        if (pending.length) globalThis.localStorage?.setItem(key, JSON.stringify(pending))
        else globalThis.localStorage?.removeItem(key)
      } catch {
        // Storage failure must not interrupt an active reveal.
      }
    }
    listeners.forEach((listener) => listener())
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => queue,
    enqueue(isos, collectionCount, historical = []) {
      const flags = [...isos, ...historical]
      if (!flags.length) return
      const items = flags.map((iso, index) => ({
        id: nextId++,
        iso,
        count: index >= isos.length || collectionCount == null ? null : collectionCount - (isos.length - 1 - index),
      }))
      update([...queue, ...items])
    },
    replay(iso) {
      if (!queue.length) update([{ id: nextId++, iso, count: null, replay: true }])
    },
    advance(id) {
      if (queue[0]?.id === id) update(queue.slice(1))
    },
    skipThrough(id) {
      update(queue.filter((item) => item.id > id))
    },
  }
}

// Persist real unlocks until the player has finished each reveal on this device.
export function useFlagRevealQueue(uid) {
  const store = useMemo(() => createQueue(uid), [uid])
  const queue = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return { queue, store }
}
