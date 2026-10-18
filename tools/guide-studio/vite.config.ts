import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// One of the Alternative Dublin tools (the repository's README): built for GitHub Pages under
// BASE_PATH (the tools site's /guide-studio/ by default); `vite preview` serves the build the same
// way, the dev server stays at the root. @ad/tape is the shared package, read as source.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? process.env.BASE_PATH ?? '/guide-studio/' : '/',
  resolve: { alias: { '@ad/tape': fileURLToPath(new URL('../../packages/ad-tape/src', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5193, strictPort: true, fs: { allow: ['../..'] } },
}))
