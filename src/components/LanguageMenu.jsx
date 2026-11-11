// src/components/LanguageMenu.jsx
// The nav bar's language picker: a pill with the current code that opens a styled list of the languages,
// each in its own name. A listbox: arrows, Home/End, Enter/Space to pick, Escape or a click outside to close.
import React, { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, toLanguage } from '../i18n/languages'
import './LanguageMenu.css'

export default function LanguageMenu() {
  const { t, i18n } = useTranslation()
  const current = toLanguage(i18n.resolvedLanguage ?? i18n.language)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const id = useId()

  const openList = () => {
    setActive(Math.max(0, LANGUAGES.findIndex((l) => l.code === current)))
    setOpen(true)
  }

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  const choose = (code) => {
    if (code !== current) i18n.changeLanguage(code)
    close()
  }

  // Focus the list once it is shown; a click or a tap outside closes it
  useEffect(() => {
    if (!open) return undefined
    listRef.current?.focus()
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Keep the highlighted option in view
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onButtonKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openList()
    }
  }

  const onListKeyDown = (event) => {
    const last = LANGUAGES.length - 1
    const moves = {
      ArrowDown: () => setActive((i) => (i === last ? 0 : i + 1)),
      ArrowUp: () => setActive((i) => (i === 0 ? last : i - 1)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => choose(LANGUAGES[active].code),
      ' ': () => choose(LANGUAGES[active].code),
      Escape: () => close(),
      Tab: () => close(false),
    }
    const move = moves[event.key]
    if (!move) return
    if (event.key !== 'Tab') event.preventDefault()
    move()
  }

  return (
    <div className="lang-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`lang-menu__button${open ? ' is-open' : ''}`}
        title={t('nav.language')}
        aria-label={`${t('nav.language')} : ${LANGUAGES.find((l) => l.code === current)?.label ?? current}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKeyDown}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span aria-hidden="true">{current.toUpperCase()}</span>
        <svg className="lang-menu__chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="lang-menu__panel">
          <p className="lang-menu__title" aria-hidden="true">{t('nav.language')}</p>
          <ul
            ref={listRef}
            id={`${id}-list`}
            className="lang-menu__list"
            role="listbox"
            tabIndex={-1}
            aria-label={t('nav.language')}
            aria-activedescendant={`${id}-${LANGUAGES[active].code}`}
            onKeyDown={onListKeyDown}
          >
            {LANGUAGES.map(({ code, label }, index) => {
              const selected = code === current
              return (
                <li
                  key={code}
                  id={`${id}-${code}`}
                  role="option"
                  lang={code}
                  aria-selected={selected}
                  className={`lang-menu__option${index === active ? ' is-active' : ''}${selected ? ' is-selected' : ''}`}
                  onPointerMove={() => setActive(index)}
                  onClick={() => choose(code)}
                >
                  <span className="lang-menu__code" aria-hidden="true">{code.toUpperCase()}</span>
                  <span className="lang-menu__label">{label}</span>
                  {selected && (
                    <svg className="lang-menu__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
