// Crash and error reporting (Sentry). Imported first by the root layout so it also catches startup errors.
// The DSN comes from the EAS environment variable EXPO_PUBLIC_SENTRY_DSN, inlined at build/update time:
// without it (or in development) nothing is sent.
import * as Sentry from '@sentry/react-native'

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && !__DEV__,
})

export { Sentry }
