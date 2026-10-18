import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { templatesServer } from './scripts/templates-server.mjs'

export default defineConfig(({ mode }) => ({
  // GitHub project sites are served from /<repository-name>/.
  // Keep local development and any future custom-domain deployment at root.
  base: mode === 'github-pages' ? process.env.BASE_PATH ?? '/tape-type/' : '/',
  // The shared package (packages/ad-tape), read as source.
  resolve: { alias: { '@ad/tape': fileURLToPath(new URL('../../packages/ad-tape/src', import.meta.url)), '@ad/shell': fileURLToPath(new URL('../../packages/ad-shell', import.meta.url)) } },
  server: { fs: { allow: ['../..'] } },
  // "Save as template" writes into src/templates while the dev server runs.
  plugins: [react(), templatesServer()],
}))
