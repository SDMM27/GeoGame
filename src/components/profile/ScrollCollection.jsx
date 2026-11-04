// Scroll collection of an account, in the profile: on your own, the count, the seals toward the next scroll and the link
// to the collection page; on another player's profile only the count (no titles, no grid, no link: the maps stay private
// to their owner). Rules and data: utils/scrollCollection.js. Nothing while it loads.
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SCROLLS, SEALS_PER_SCROLL, fetchScrolls } from '../../utils/scrollCollectionData'
import { onPublicDataPatched } from '../../utils/publicProfile'
import CollapsibleSection from '../CollapsibleSection'
import './ScrollCollection.css'

export function ScrollCollectionView({ scrolls, own = false, sectionId = 'scrolls' }) {
  const { t } = useTranslation()
  const total = SCROLLS.length
  const count = scrolls.unlocked.length
  const progress = t('scrolls.progress', { count, total })

  if (!own) return <p className="scroll-public-count">{progress}</p>

  const complete = count >= total
  return (
    <CollapsibleSection id={sectionId} title={t('scrolls.title')} summary={<strong className="scroll-collection-progress">{progress}</strong>} defaultOpen>
      <div className="scroll-collection">
        {complete ? (
          <p className="scroll-collection-note">{t('scrolls.complete')}</p>
        ) : (
          <div className="scroll-collection-seals">
            <span className="scroll-collection-pips" aria-hidden="true">
              {Array.from({ length: SEALS_PER_SCROLL }, (_, index) => (
                <i key={index} className={index < scrolls.seals ? 'scroll-collection-pip scroll-collection-pip--full' : 'scroll-collection-pip'} />
              ))}
            </span>
            <strong>{t('scrolls.seals', { count: scrolls.seals, total: SEALS_PER_SCROLL })}</strong>
          </div>
        )}
        <small className="scroll-collection-hint">{t('scrolls.hint', { total: SEALS_PER_SCROLL })}</small>
        <Link to="/parchments" className="scroll-collection-link">{t('scrolls.open_collection')}</Link>
      </div>
    </CollapsibleSection>
  )
}

export default function ScrollCollection({ uid, own = false }) {
  const [scrolls, setScrolls] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchScrolls(uid).then((result) => {
        if (!cancelled) setScrolls(result)
      })
    setScrolls(null)
    load()
    // A claim patches the cached account: the seals and scrolls it paid show at once
    const stop = onPublicDataPatched((patched) => patched === uid && load())
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])

  if (!scrolls) return null
  return <ScrollCollectionView scrolls={scrolls} own={own} sectionId={own ? 'own.scrolls' : 'player.scrolls'} />
}
