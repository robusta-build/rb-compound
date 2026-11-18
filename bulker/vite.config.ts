import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PluginContext } from 'rollup'
import { defineConfig } from 'vitest/config'

const MASALA_DIR = resolve(import.meta.dirname, 'node_modules/@masala/parser')
const MASALA_SOURCES = resolve(MASALA_DIR, 'src')
const MASALA_CHUNK = 'masala-parser'

/** Emits the LICENSE of @masala/parser beside its chunk, byte for byte. */
function masalaLicense() {
  return {
    name: 'masala-license',
    apply: 'build' as const,
    generateBundle(this: PluginContext) {
      this.emitFile({
        type: 'asset',
        fileName: `${MASALA_CHUNK}/LICENSE`,
        source: readFileSync(resolve(MASALA_DIR, 'LICENSE'))
      })
    }
  }
}

export default defineConfig({
  resolve: {
    // The published dist of @masala/parser is minified; its ES sources ship in the same package.
    alias: { '@masala/parser': resolve(MASALA_SOURCES, 'lib/index.js') }
  },
  plugins: [masalaLicense()],
  build: {
    target: 'node20',
    outDir: resolve(import.meta.dirname, '../skills/bulkman-method/scripts'),
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    copyPublicDir: false,
    lib: {
      entry: { bulker: resolve(import.meta.dirname, 'src/bin.ts') },
      formats: ['es']
    },
    rollupOptions: {
      external: [/^node:/],
      output: {
        entryFileNames: '[name].mjs',
        chunkFileNames: `${MASALA_CHUNK}/${MASALA_CHUNK}.mjs`,
        manualChunks: (id) => (id.startsWith(MASALA_SOURCES) ? MASALA_CHUNK : undefined)
      }
    }
  },
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    environment: 'node'
  }
})
