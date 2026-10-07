// Extends app.json. Push notifications on Android need Firebase's google-services.json (Android app com.sdmm27.geogame):
// either the EAS file environment variable GOOGLE_SERVICES_JSON, or the file next to app.json.
const fs = require('fs')
const path = require('path')

module.exports = ({ config }) => {
  const local = path.join(__dirname, 'google-services.json')
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? (fs.existsSync(local) ? './google-services.json' : undefined)
  return googleServicesFile ? { ...config, android: { ...config.android, googleServicesFile } } : config
}
