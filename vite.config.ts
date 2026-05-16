import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

const localDomecs = process.env.DOMECS_LOCAL_DEV === '1'

// Override at build time for subdirectory deploys:
//   BASE_PATH=/my-game/ npm run build      # GitHub Pages project site
//   BASE_PATH=./ npm run build             # itch.io / generic static host
const basePath = process.env.BASE_PATH ?? './'

const domecsPackages = ['@domecs/core', '@domecs/dom', '@domecs/input'] as const

export default defineConfig({
  base: basePath,
  cacheDir: localDomecs ? '.tmp/vite' : undefined,
  resolve: {
    // pnpm hoists differently across workspaces; dedupe ensures a single
    // @domecs/core instance so component identity stays stable.
    dedupe: [...domecsPackages],
    alias: localDomecs
      ? {
          '@domecs/core': fileURLToPath(new URL('../domecs/packages/domecs/src/index.ts', import.meta.url)),
          '@domecs/dom': fileURLToPath(new URL('../domecs/packages/domecs-dom/src/index.ts', import.meta.url)),
          '@domecs/input': fileURLToPath(new URL('../domecs/packages/domecs-input/src/index.ts', import.meta.url)),
        }
      : undefined,
  },
  optimizeDeps: {
    // Treat the engine packages as source — Vite serves their ESM directly
    // and HMR reflects engine edits without a pre-bundle cache miss.
    exclude: [...domecsPackages],
  },
  test: {
    // Default to node so pure-logic specs stay fast; opt into happy-dom only
    // for files that actually touch the DOM (`*.dom.test.ts`).
    environment: 'node',
    environmentMatchGlobs: [['**/*.dom.test.ts', 'happy-dom']],
  },
})
