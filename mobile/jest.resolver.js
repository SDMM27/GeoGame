// Mirrors the metro.config.js rule: a bare import made from the website code (../src) is resolved
// from the app's own node_modules, never from the website's (React 18).
const path = require('path')

const sharedRoot = path.resolve(__dirname, '../src') + path.sep
const isBare = (name) => !name.startsWith('.') && !path.isAbsolute(name)

module.exports = (request, options) => {
  const fromShared = options.basedir.startsWith(sharedRoot) || options.basedir + path.sep === sharedRoot
  if (fromShared && isBare(request)) {
    return options.defaultResolver(request, { ...options, basedir: __dirname })
  }
  return options.defaultResolver(request, options)
}
