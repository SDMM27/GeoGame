// Your scroll collection (/parchments): the scrolls by era, and the sheet of the ones you own. It reads the signed-in
// account only and takes no player id: nobody else's scrolls can be opened. `?scroll=<id>` opens a sheet (from the reward).
import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import ScrollGrid from '../components/scrolls/ScrollGrid'
import ScrollSheet from '../components/scrolls/ScrollSheet'
import { useAccount } from '../auth'
import { SCROLLS, SEALS_PER_SCROLL, fetchScrolls, scrollById } from '../utils/scrollCollectionData'
import { onPublicDataPatched } from '../utils/publicProfile'
import { claimXp } from '../utils/xp'
import './AccountPage.css'

// The grid and the sheet from loaded data. A sheet opens only for an owned scroll: `requested` is ignored otherwise.
export function ScrollsView({ scrolls, requested = null }) {
  const { t } = useTranslation()
  const owned = (id) => (id && scrolls.unlocked.includes(id) ? scrollById(id) : null)
  const [openId, setOpenId] = useState(requested)
  const open = owned(openId)
  return (
    <>
      <p className="account-pitch">{t('scrolls.progress', { count: scrolls.unlocked.length, total: SCROLLS.length })}</p>
      <div className="league-card">
        <strong>{t('scrolls.seals', { count: scrolls.seals, total: SEALS_PER_SCROLL })}</strong>
        <p className="profile-muted">{t('scrolls.hint', { total: SEALS_PER_SCROLL })}</p>
      </div>
      <ScrollGrid unlocked={scrolls.unlocked} onOpen={(id) => owned(id) && setOpenId(id)} />
      {open && <ScrollSheet scroll={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

export default function ScrollsPage() {
  const { t } = useTranslation()
  const { loading, account } = useAccount()
  const [params] = useSearchParams()
  const uid = account?.username ? account.uid : null
  const [scrolls, setScrolls] = useState(null)

  useEffect(() => {
    if (!uid) return undefined
    let cancelled = false
    const load = () =>
      fetchScrolls(uid).then((result) => {
        if (!cancelled) setScrolls(result)
      })
    load()
    // A claim pays what is due, the free first scroll included, and patches the account, which reloads the page
    claimXp(uid)
    const stop = onPublicDataPatched((patched) => patched === uid && load())
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])

  return (
    <div className="account-page">
      <NavBar />
      <main className="account-main account-main--wide">
        <h1 className="account-title">{t('scrolls.title')}</h1>
        {loading ? null : !uid ? (
          <div className="league-card">
            <p className="profile-muted">{t('scrolls.need_account')}</p>
            <Link to="/account" className="friends-btn friends-btn--primary">{t('friends.add_page.login_button')}</Link>
          </div>
        ) : scrolls ? (
          <ScrollsView key={params.get('scroll') ?? ''} scrolls={scrolls} requested={params.get('scroll')} />
        ) : null}
      </main>
    </div>
  )
}
