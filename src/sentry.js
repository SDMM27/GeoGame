// Suivi des erreurs en production (Sentry). Sans VITE_SENTRY_DSN (dev, tests, preview sans clé), rien n'est envoyé.
// Sur Vercel, VITE_VERCEL_ENV et VITE_VERCEL_GIT_COMMIT_SHA sont fournis automatiquement au build.
import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_VERCEL_ENV ?? import.meta.env.MODE,
    release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || undefined,
  })
}
