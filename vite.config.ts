import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        vite: fileURLToPath(new URL('./src/vite/index.mjs', import.meta.url)),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (entryName === 'vite') return format === 'es' ? 'vite.js' : 'vite.cjs'
        return format === 'es' ? 'index.js' : 'index.cjs'
      },
    },
    rollupOptions: {
      external: [
        'vue',
        'vite',
        '@vue/compiler-dom',
        '@vue/compiler-sfc',
        'fast-glob',
        'svgo',
        'typescript',
        /^node:/,
      ],
      output: {
        exports: 'named',
      },
    },
  },
})
