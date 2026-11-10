// The passport page of the home: stamps from the signed-in player's own progress (level, daily streak, missions and
// dailies of the day), or a sample page for visitors. The stamps slam down once the page scrolls into view.
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

function useInView() {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (seen || !ref.current) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return undefined
    }
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true), { threshold: 0.3 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [seen])
  return [ref, seen]
}

function stampsOf(missions, t) {
  const level = missions?.xp?.level
  const streak = missions?.streak?.count
  const daily = missions?.daily ?? []
  const dailies = missions?.dailies
  if (!level) return null
  return [
    { top: t('home.stamp_level'), label: String(level), bottom: t('home.stamp_xp', { count: missions.xp.total ?? 0 }), tone: 'accent', rotate: '-8deg' },
    { top: t('home.stamp_streak'), label: t('missions.streak_days', { count: streak ?? 0 }), bottom: t('home.daily_title'), tone: 'accent2', rotate: '6deg' },
    { top: t('missions.title'), label: `${daily.filter((entry) => entry.done || entry.paid).length}/${daily.length}`, bottom: t('home.stamp_today'), tone: 'accent', rotate: '-3deg' },
    dailies && { top: t('home.stamp_dailies'), label: `${dailies.won}/${dailies.total}`, bottom: t('home.stamp_won'), tone: 'accent2', rotate: '9deg' },
  ].filter(Boolean)
}

export default function PassportStamps({ missions }) {
  const { t } = useTranslation()
  const [ref, seen] = useInView()
  const own = stampsOf(missions, t)
  const stamps = own ?? [
    { top: t('home.stamp_level'), label: '4', bottom: t('home.stamp_xp', { count: 1240 }), tone: 'accent', rotate: '-8deg' },
    { top: t('home.stamp_streak'), label: t('missions.streak_days', { count: 7 }), bottom: t('home.daily_title'), tone: 'accent2', rotate: '6deg' },
    { top: t('missions.title'), label: '3/3', bottom: t('home.stamp_today'), tone: 'accent', rotate: '-3deg' },
    { top: t('home.stamp_dailies'), label: '6/6', bottom: t('home.stamp_won'), tone: 'accent2', rotate: '9deg' },
  ]
  return (
    <div className="passport-stamps-wrap" ref={ref}>
      {!own && <p className="gg-mono passport-example">{t('home.passport_example')}</p>}
      <ul className="passport-stamps">
        {stamps.map((stamp, i) => (
          <li
            key={stamp.top}
            className={`passport-stamp passport-stamp--${stamp.tone}${seen ? ' sd-stamp' : ' passport-stamp--waiting'}`}
            style={{ '--sd-stamp-rotate': stamp.rotate, '--i': i * 3 }}
          >
            <span className="passport-stamp-top">{stamp.top}</span>
            <strong className="passport-stamp-label">{stamp.label}</strong>
            <span className="passport-stamp-bottom">{stamp.bottom}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
