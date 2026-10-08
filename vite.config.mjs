import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// ANALYZE=1 npm run build writes dist/stats.html (treemap) and dist/stats.json (raw sizes, gzip)
const analyze = process.env.ANALYZE
  ? [
      visualizer({ filename: 'dist/stats.html', template: 'treemap', gzipSize: true }),
      visualizer({ filename: 'dist/stats.json', template: 'raw-data', gzipSize: true }),
    ]
  : []

export default defineConfig({
  plugins: [react(), ...analyze],
  // App.js and Firebase.js use JSX syntax but keep .js extension.
  // Both blocks are needed: esbuild covers the transform pass,
  // optimizeDeps covers the pre-bundling pass.
  // These can be removed once App.js is renamed to App.jsx (Task 3).
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    // Without an explicit exclude, Vite defaults to /\.js$/ which cancels the include.
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    globals: true,
    // tests/emulator needs the Firebase emulators: npm run test:emulator
    exclude: ['**/node_modules/**', '**/.worktrees/**', ...(process.env.FIRESTORE_EMULATOR_HOST ? [] : ['tests/emulator/**'])],
  },
})
