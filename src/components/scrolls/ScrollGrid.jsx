// The scrolls grouped by era: an owned one shows its thumbnail, title and year and opens its sheet; a missing one is a
// sealed tile that only names its era (no title, no image, not clickable).
import React from 'react'
import { useTranslation } from 'react-i18next'
import { formatScrollDate, scrollsByEra } from '../../utils/scrollCollectionData'
import { RARITY_COLORS } from '../../utils/flagCollection'
import ScrollImage from './ScrollImage'
import './Scrolls.css'

export default function ScrollGrid({ unlocked, onOpen }) {
  const { t } = useTranslation()
  return (
    <div className="scroll-grid-groups">
      {scrollsByEra(unlocked).map(({ era, scrolls }) => (
        <section key={era} className="scroll-era">
          <h3>{t(`scrolls.era.${era}`)}</h3>
          <ul className="scroll-grid">
            {scrolls.map((scroll) =>
              scroll.owned ? (
                <li key={scroll.id} className="scroll-tile" style={{ borderColor: RARITY_COLORS[scroll.rarity] }}>
                  <button type="button" onClick={() => onOpen(scroll.id)}>
                    <ScrollImage id={scroll.id} className="scroll-tile-image" />
                    <strong>{t(`scrolls.title_${scroll.id}`)}</strong>
                    <small>{formatScrollDate(t, scroll)}</small>
                  </button>
                </li>
              ) : (
                <li key={scroll.id} className="scroll-tile scroll-tile--sealed" aria-label={t('scrolls.sealed')}>
                  <span className="scroll-seal" aria-hidden="true" />
                  <small>{t(`scrolls.era.${era}`)}</small>
                </li>
              )
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}
