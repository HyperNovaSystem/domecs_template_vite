import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

const localDomecs = process.env.DOMECS_LOCAL_DEV === '1'

export default defineConfig({
  base: './',
  cacheDir: localDomecs ? '.tmp/vite' : undefined,
  resolve: localDomecs
    ? {
        alias: {
          '@domecs/core': fileURLToPath(new URL('../domecs/packages/domecs/src/index.ts', import.meta.url)),
          '@domecs/dom': fileURLToPath(new URL('../domecs/packages/domecs-dom/src/index.ts', import.meta.url)),
          '@domecs/input': fileURLToPath(new URL('../domecs/packages/domecs-input/src/index.ts', import.meta.url)),
        },
      }
    : undefined,
  test: {
    environment: 'happy-dom',
  },
})
