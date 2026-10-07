// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // @shared/* resolves to the website code (../src) through metro.config.js
    rules: { "import/no-unresolved": ["error", { ignore: ["^@shared/"] }] },
  },
]);
