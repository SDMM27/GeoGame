// Adresse de l'app web (projet Vercel séparé, dossier mobile/). Surchargée par VITE_APP_URL.
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://geogame-app.vercel.app'
// APK Android publié en asset de la dernière release du dépôt public GeoGame-releases (le code reste privé). Surchargé par VITE_APK_URL.
export const APK_URL =
  import.meta.env.VITE_APK_URL || 'https://github.com/SDMM27/GeoGame-releases/releases/latest/download/geogame.apk'

const REDIRECT_DONE_KEY = 'app_redirect_done'
// Navigateurs iOS autres que Safari et navigateurs intégrés (Instagram, Facebook…) :
// l'ajout à l'écran d'accueil n'y marche pas, inutile d'y envoyer le joueur.
const NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV|Snapchat|TikTok/

// Redirection douce vers l'app web : une seule fois, uniquement depuis la page d'accueil
// sur iPhone dans Safari. Les liens profonds (défis, salons, profils, jeux) restent sur le site.
// Renvoie true si la page est en train de partir vers l'app.
export function redirectIphoneToApp() {
  if (typeof window === 'undefined') return false
  const { pathname, search, hash } = window.location
  if (pathname !== '/' || search || hash) return false
  const ua = window.navigator.userAgent
  if (!/iPhone/.test(ua) || NOT_SAFARI.test(ua)) return false
  // Site déjà ajouté à l'écran d'accueil : on n'en sort pas.
  if (window.navigator.standalone === true) return false
  try {
    if (window.localStorage.getItem(REDIRECT_DONE_KEY) === '1') return false
    window.localStorage.setItem(REDIRECT_DONE_KEY, '1')
  } catch {
    // Sans stockage on ne peut pas garantir le « une seule fois » : pas de redirection.
    return false
  }
  window.location.replace(APP_URL)
  return true
}
