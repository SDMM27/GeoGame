// An empire redrawn on the world map, with a slider through its stages. Clicking a territory tells which stage won it.
// The data (src/data/empires, traced by scripts/trace-empire.py) and the texts (src/data/empireTexts) are loaded on demand,
// like the map library this file needs; until they arrive the map shows the land alone.
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GeoJSON, MapContainer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import LandLayer from '../map/LandLayer'
import { EMPIRES, shownStages } from '../../data/empires'
import { loadEmpireText } from '../../data/empireTexts'
import './Scrolls.css'

export default function EmpireMap({ id, language }) {
  const { t } = useTranslation()
  const empire = EMPIRES[id]
  const [step, setStep] = useState(empire.stages.length - 1)
  const [picked, setPicked] = useState(null)
  const [data, setData] = useState(null)
  const [texts, setTexts] = useState({ stages: {} })

  useEffect(() => {
    let cancelled = false
    setData(null)
    empire.load().then(
      (module) => {
        if (!cancelled) setData(module.default ?? module)
      },
      () => {}
    )
    return () => {
      cancelled = true
    }
  }, [empire])
  useEffect(() => {
    let cancelled = false
    setTexts({ stages: {} })
    loadEmpireText(id, language).then((loaded) => {
      if (!cancelled) setTexts(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [id, language])

  const features = useMemo(() => new Map((data?.features ?? []).map((feature) => [feature.properties.stage, feature])), [data])
  const shown = shownStages(empire, step).filter(({ id: stageId }) => features.has(stageId))
  const stage = empire.stages.find((candidate) => candidate.id === picked) ?? empire.stages[step]
  const info = texts.stages[stage.id]
  const go = (index) => {
    setStep(index)
    setPicked(null)
  }

  return (
    <div className="empire-map">
      <MapContainer className="empire-map-canvas map-night" center={empire.center} zoom={empire.zoom} minZoom={3} maxZoom={7} attributionControl={false} worldCopyJump={false}>
        <LandLayer borders />
        {shown.map(({ id: stageId, color }) => (
          <GeoJSON
            key={stageId}
            data={features.get(stageId)}
            style={{ fillColor: color, fillOpacity: picked === stageId ? 0.95 : 0.7, color: '#141a2e', weight: 1 }}
            eventHandlers={{ click: () => setPicked(stageId) }}
          />
        ))}
      </MapContainer>
      <div className="empire-map-steps">
        <input type="range" min={0} max={empire.stages.length - 1} value={step} aria-label={t('scrolls.empire_period')} onChange={(event) => go(Number(event.target.value))} />
        <ol>
          {empire.stages.map(({ id: stageId, color }, index) => (
            <li key={stageId} className={empire.cumulative === false ? (index === step ? 'is-on' : '') : index <= step ? 'is-on' : ''}>
              <button type="button" aria-pressed={index === step} onClick={() => go(index)}>
                <i style={{ background: color }} />
                {texts.stages[stageId]?.label ?? stageId}
              </button>
            </li>
          ))}
        </ol>
      </div>
      {info && (info.title || info.text) && (
        <div className="empire-map-info" style={{ borderColor: stage.color }}>
          {info.title && <strong>{info.title}</strong>}
          {info.text && <p>{info.text}</p>}
        </div>
      )}
      {texts.note && <small className="empire-map-note">{texts.note}</small>}
    </div>
  )
}
