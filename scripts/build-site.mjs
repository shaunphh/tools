// The tools site: one build of the three tools into dist/, served by GitHub Pages under
// SITE_BASE (/tools/ by default, the repository's name), so the addresses are
//   <site>/event-guide/   <site>/guide-studio/   <site>/tape-type/
// The family board (tape-type/board/) stays a development page since 19 October 2026: Vite copies it
// with Tape Type's public folder, and it is taken out of the build here.
// with site/index.html at the root as the front door. Each tool builds as it always did, told its base.
import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const base = (process.env.SITE_BASE ?? '/tools/').replace(/\/?$/, '/')
const dist = `${root}dist/`
rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })
const run = (command, env = {}) => execSync(command, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } })

run('npm run build -w tools/event-guide')
cpSync(`${root}tools/event-guide/dist/`, `${dist}event-guide/`, { recursive: true })
run('npm run build -w tools/guide-studio', { BASE_PATH: `${base}guide-studio/` })
cpSync(`${root}tools/guide-studio/dist/`, `${dist}guide-studio/`, { recursive: true })
run('npm run build:pages -w tools/tape-type', { BASE_PATH: `${base}tape-type/` })
cpSync(`${root}tools/tape-type/dist/`, `${dist}tape-type/`, { recursive: true })
rmSync(`${dist}tape-type/board/`, { recursive: true, force: true })
cpSync(`${root}site/`, dist, { recursive: true })
writeFileSync(`${dist}.nojekyll`, '')
console.log(`dist/ built for ${base}: event-guide, guide-studio, tape-type and the front door (no board).`)
