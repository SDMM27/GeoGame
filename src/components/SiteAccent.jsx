// Mounted once at the root: while a globe skin is worn (and the player kept the option on), its colors replace the
// site's accent (--sd-accent*, --gg-accent-*) on <html>; classic, a signed-out player or the option off leave the
// theme's own. Follows the light/dark switch and the skin picker live. Game feedback has its own --gg-success.
import { useEffect, useState } from 'react'
import { useAccount } from '../auth'
import { useActiveGlobeSkin } from '../hooks/useActiveGlobeSkin'
import { useColorScheme } from './theme/useColorScheme'
import { loadAccentEnabled, onGlobeSkinChange, skinAccent } from '../utils/globeSkins'

const VARS = ['--sd-accent', '--sd-accent-strong', '--sd-accent-ink', '--gg-accent-soft', '--gg-accent-line']

const rgba = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export default function SiteAccent() {
  const { account } = useAccount()
  const { skin } = useActiveGlobeSkin(account?.uid ?? null)
  const { scheme } = useColorScheme()
  const [enabled, setEnabled] = useState(loadAccentEnabled)
  useEffect(() => onGlobeSkinChange(() => setEnabled(loadAccentEnabled())), [])

  const colors = skinAccent(skin, scheme, enabled)
  useEffect(() => {
    const style = document.documentElement.style
    if (!colors) {
      VARS.forEach((name) => style.removeProperty(name))
      return undefined
    }
    const dark = scheme === 'dark'
    style.setProperty('--sd-accent', colors.accent)
    style.setProperty('--sd-accent-strong', colors.strong)
    style.setProperty('--sd-accent-ink', colors.ink)
    style.setProperty('--gg-accent-soft', rgba(colors.accent, dark ? 0.14 : 0.08))
    style.setProperty('--gg-accent-line', rgba(colors.accent, dark ? 0.35 : 0.4))
    return () => VARS.forEach((name) => style.removeProperty(name))
  }, [colors, scheme])

  return null
}
