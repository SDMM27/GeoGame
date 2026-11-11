// The flight the home globe offers once the player has put the city in the reticle: a daily not played today first,
// then a game not played today. Shared with the app (@shared/utils/nextFlight).

/**
 * `flights`: [{ type, daily }] in the order of the home page (dailies first). `dailyStatus` ({ [type]: 'won' | 'played' })
 * and `playedToday` ([type]) say what the player already did; null when unknown (visitor, loading), then every flight
 * counts as still to do. `turn` (how many finds so far) rotates through what is left, so each find offers the next one.
 * Returns the flight, or null when everything was played today.
 */
export function nextFlight(flights, { dailyStatus = null, playedToday = null, turn = 0 } = {}) {
  const played = new Set(playedToday ?? [])
  const todo = (flight) => (flight.daily ? !dailyStatus?.[flight.type] : !played.has(flight.type))
  const dailies = flights.filter((flight) => flight.daily && todo(flight))
  const pending = dailies.length > 0 ? dailies : flights.filter((flight) => !flight.daily && todo(flight))
  if (pending.length === 0) return null
  return pending[((turn % pending.length) + pending.length) % pending.length]
}
