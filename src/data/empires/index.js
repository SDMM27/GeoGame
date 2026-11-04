// The empires that have an interactive map in the scroll sheet, by scroll id. Shared by the site and the app.
// To add one: run scripts/trace-empire.py for it (it writes <id>.json here), add its entry below, and its texts to each
// src/data/empireTexts/<lang>.json.
//  - center / zoom: the opening view, as on a Leaflet map (the app frames the same view)
//  - stages: in order; ids are arbitrary strings (they match `properties.stage` in the JSON); color of the territory
//  - cumulative (default true): the slider shows every stage up to the current one; false shows only the current one,
//    for maps that compare rather than grow
//  - load: the territories (a FeatureCollection, one MultiPolygon per stage), loaded when the map opens
export const EMPIRES = {
  'ottoman-empire': {
    center: [37, 30],
    zoom: 4,
    stages: [
      { id: '1481', color: '#8E7CC3' },
      { id: '1520', color: '#7FB069' },
      { id: '1566', color: '#D9596B' },
      { id: '1683', color: '#EBA046' },
    ],
    load: () => import('./ottoman-empire.json'),
  },
  'rome-395': {
    center: [40, 18],
    zoom: 3,
    stages: [
      { id: 'gaul', color: '#7FB069' },
      { id: 'italy', color: '#8E7CC3' },
      { id: 'illyricum', color: '#EBA046' },
      { id: 'east', color: '#D9596B' },
    ],
    load: () => import('./rome-395.json'),
  },
  'caliphate-750': {
    center: [30, 35],
    zoom: 3,
    stages: [
      { id: '632', color: '#8E7CC3' },
      { id: '656', color: '#7FB069' },
      { id: '750', color: '#D9596B' },
    ],
    load: () => import('./caliphate-750.json'),
  },
  'mongol-dominions': {
    center: [45, 85],
    zoom: 3,
    cumulative: false,
    stages: [
      { id: '1300', color: '#D9596B' },
      { id: '1405', color: '#8E7CC3' },
    ],
    load: () => import('./mongol-dominions.json'),
  },
  'russia-growth': {
    center: [56, 38],
    zoom: 3,
    stages: [
      { id: '1300', color: '#8E7CC3' },
      { id: '1462', color: '#7FB069' },
      { id: '1584', color: '#EBD35B' },
      { id: '1725', color: '#EBA046' },
      { id: '1796', color: '#D9596B' },
    ],
    load: () => import('./russia-growth.json'),
  },
}

export const hasEmpireMap = (id) => Object.hasOwn(EMPIRES, id)

/** The stages to draw when the slider is on `step`: all up to it, or only it for an empire that is not cumulative. */
export const shownStages = (empire, step) => (empire.cumulative === false ? [empire.stages[step]] : empire.stages.slice(0, step + 1))
