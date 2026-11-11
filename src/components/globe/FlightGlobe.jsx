// The home page's interactive globe: turn it with the mouse, a finger or the arrow keys to put the city in the
// reticle. The land (world-atlas, ~55 kB) and the drawing code load after the page, in their own chunk.
// `onFind` runs when the player (not the globe on its own) finds the city; `overlay` is drawn over the globe.
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './FlightGlobe.css'

export default function FlightGlobe({ onScore, onFind, overlay = null }) {
  const { t } = useTranslation()
  const box = useRef(null)
  const hooks = useRef(null)
  const [target, setTarget] = useState(0)
  const [found, setFound] = useState(false)
  const [touched, setTouched] = useState(false)
  const [cities, setCities] = useState(null)
  const onScoreRef = useRef(onScore)
  onScoreRef.current = onScore
  const onFindRef = useRef(onFind)
  onFindRef.current = onFind

  useEffect(() => {
    let cleanup = () => {}
    let cancelled = false
    Promise.all([
      import('@sdmm/design/js'),
      import('topojson-client'),
      import('world-atlas/land-110m.json'),
      import('./globeScene'),
    ]).then(([{ mountCanvas }, { feature }, atlas, { createGlobeScene, CITIES }]) => {
      if (cancelled || !box.current) return
      const land = feature(atlas.default ?? atlas, (atlas.default ?? atlas).objects.land)
      const setup = createGlobeScene(land, {
        onTarget: (index) => { setTarget(index); setFound(false) },
        onFound: (_index, score, manual) => {
          setFound(true)
          onScoreRef.current?.(score)
          if (manual) onFindRef.current?.()
        },
      })
      setCities(CITIES)
      cleanup = mountCanvas(box.current, (s) => {
        const h = setup(s)
        hooks.current = { ...h, state: s }
        return h
      })
    })
    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  const cityName = cities ? t(`globe.city.${cities[target].key}`) : ''

  const onKeyDown = (event) => {
    const step = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] }[event.key]
    if (!step || !hooks.current) return
    event.preventDefault()
    setTouched(true)
    hooks.current.nudge(hooks.current.state, ...step)
    if (hooks.current.state.reduced) hooks.current.frame(hooks.current.state, 0)
  }

  return (
    <figure className="flight-globe">
      <div
        ref={box}
        className="flight-globe-canvas"
        role="img"
        tabIndex={0}
        aria-label={t('globe.label', { city: cityName })}
        onPointerDown={() => setTouched(true)}
        onKeyDown={onKeyDown}
      />
      {cities && (
        <p className={`flight-globe-chip${found ? ' flight-globe-chip--found' : ''}`} aria-live="polite">
          {found ? `✓ ${t('globe.found', { city: cityName })}` : t('globe.find', { city: cityName })}
        </p>
      )}
      {overlay}
      <figcaption className="flight-globe-hint">{touched ? t('globe.hint_center') : t('globe.hint_drag')}</figcaption>
    </figure>
  )
}
