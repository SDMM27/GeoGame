// scripts/add-gdp-data.cjs
// Adds `gdp` field (nominal GDP in billion USD, IMF 2023) to each country feature.
// Run with: node scripts/add-gdp-data.cjs

const fs = require('fs')
const path = require('path')

// Nominal GDP in billion USD (IMF World Economic Outlook 2023).
// null = no reliable data (micro-states, territories, sanctioned economies).
const GDP_BY_ISO = {
  // Americas
  USA: 26944, CAN: 2090, MEX: 1463, BRA: 2127, ARG: 640,
  COL: 363,  CHL: 344,  PER: 268,  ECU: 115,  VEN: 97,
  BOL: 44,   PRY: 45,   URY: 78,   GTM: 95,   DOM: 113,
  CUB: 107,  CRI: 70,   PAN: 77,   HND: 32,   SLV: 34,
  NIC: 16,   HTI: 20,   JAM: 16,   TTO: 27,   GUY: 17,
  SUR: 4,    BLZ: 3,    ATG: 2,    BRB: 6,    DMA: 1,
  GRD: 1,    KNA: 1,    LCA: 2,    VCT: 1,
  // Europe
  DEU: 4430, GBR: 3070, FRA: 2923, ITA: 2170, ESP: 1582,
  NLD: 1081, CHE: 869,  POL: 748,  SWE: 597,  BEL: 628,
  NOR: 546,  AUT: 516,  IRL: 550,  DNK: 404,  FIN: 305,
  CZE: 335,  ROU: 284,  PRT: 267,  HUN: 207,  SVK: 115,
  BGR: 90,   HRV: 75,   SVN: 66,   LTU: 73,   LVA: 43,
  EST: 41,   LUX: 86,   ISL: 28,   SRB: 63,   BLR: 73,
  UKR: 160,  MDA: 17,   GEO: 28,   ARM: 24,   AZE: 78,
  ALB: 20,   MKD: 14,   BIH: 24,   MNE: 7,    MLT: 18,
  CYP: 32,   RUS: 1862,
  // Asia & Middle East
  CHN: 17700, JPN: 4231, IND: 3730, KOR: 1710, IDN: 1371,
  SAU: 1069,  TUR: 1029, THA: 514,  SGP: 467,  MYS: 408,
  VNM: 430,   PHL: 404,  BGD: 460,  PAK: 341,  IRN: 367,
  ARE: 504,   QAT: 220,  KWT: 163,  IRQ: 268,  OMN: 104,
  ISR: 539,   JOR: 46,   LBN: 23,   KAZ: 225,  UZB: 91,
  TKM: 59,   MNG: 17,   NPL: 40,   LKA: 74,   MMR: 65,
  KHM: 30,   LAO: 15,   BRN: 15,   TLS: 3,    TJK: 11,
  KGZ: 11,   AFG: 14,   MDV: 7,    BTN: 3,    YEM: 21,
  SYR: null, PRK: null, PSE: null,
  // Oceania
  AUS: 1693, NZL: 247, PNG: 28, FJI: 5, SLB: 2,
  VUT: 1,    WSM: 1,   TON: 1,
  // Africa
  NGA: 473, ZAF: 378, EGY: 378, DZA: 190, ETH: 126,
  GHA: 77,  KEN: 110, TZA: 78,  AGO: 84,  MOZ: 18,
  CMR: 44,  CIV: 68,  SDN: 34,  COD: 67,  UGA: 48,
  MAR: 141, TUN: 49,  LBY: 48,  SEN: 27,  BFA: 19,
  MLI: 20,  NER: 17,  TCD: 12,  GIN: 22,  BEN: 20,
  TGO: 9,   MDG: 16,  ZMB: 27,  ZWE: 28,  RWA: 13,
  BWA: 20,  NAM: 13,  MWI: 14,  SOM: 9,   DJI: 4,
  LSO: 3,   SWZ: 5,   GAB: 22,  COG: 15,  CAF: 3,
  GNQ: 12,  MRT: 10,  GMB: 2,   GNB: 2,   SLE: 4,
  LBR: 4,   COM: 1,   MUS: 14,  SYC: 2,   CPV: 2,
  BDI: 3,   ERI: null, STP: null,
}

const jsonPath = path.join(__dirname, '../src/data/countriesWithDifficulty_FR.json')
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

let patched = 0
let missing = 0

data.features = data.features.map((feature) => {
  const iso = feature.properties?.ISO_A3
  if (iso && iso !== '-99' && iso in GDP_BY_ISO) {
    feature.properties.gdp = GDP_BY_ISO[iso]
    patched++
  } else {
    feature.properties.gdp = null
    missing++
  }
  return feature
})

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8')
console.log(`Patched: ${patched} countries with GDP data`)
console.log(`Set to null: ${missing} countries (no data or unknown ISO)`)
