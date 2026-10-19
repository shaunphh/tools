# Alternative Dublin tools

The three tools the team makes its pages with, in one repository with one look, deployed as one site:

| Tool | Path | What it does |
| --- | --- | --- |
| Event Guide | `tools/event-guide` → `/tools/event-guide/` | The week's events from the Sheet as day pages for the carousel |
| Guide Studio | `tools/guide-studio` → `/tools/guide-studio/` | Event Guide Picks and What's New carousels from the weekly docs; the team library on Supabase; Published sends stories to the website |
| Tape Type | `tools/tape-type` → `/tools/tape-type/` | Post, inside and video covers with the house tape headline |

What they share lives in `packages/`:

- `packages/ad-tape`: the tape geometry and its settings, the design tokens (`src/ad-tokens.json`, the one file every value comes from, including the `ui` tokens of the chrome) and how the tools read them. Tape Type and Guide Studio import it as `@ad/tape/<module>`; the Event Guide bundles it into `vendor/` before every test and build (`scripts/vendor.mjs`).
- `packages/ad-shell`: the masthead and the chrome every tool wears, built from the Event Guide's: `shell.css` and `shell.ts` (the masthead's markup, the ui tokens as `--ad-ui-*` properties).

Until 19 October 2026 these were three repositories, with the tokens and the geometry copied between them by sync scripts, and three mastheads. Each tool keeps its own notes under `tools/<tool>/notes/`.

## Working on it

```
npm install            # one install for everything (legacy peer resolution, .npmrc; an npm 10 bug otherwise)
npm test               # every tool's tests
npm run build          # dist/: the whole site under /tools/ (SITE_BASE to change it)
npm run dev:guide-studio   npm run dev:tape-type   npm run dev:event-guide
```

The board is a development-only reference at Tape Type’s `/board/`; it is omitted from the Pages build. Design controls use the shared house values by default. Guide Studio’s House style and manual tape-background sizing, and Tape Type’s held controls are available only in an explicit `?unlocked` design session; restoring a guide backup cannot change the locked house style.

A token change is one edit in `packages/ad-tape/src/ad-tokens.json`; every tool and the board follow. The news site (a separate repository, alternative-dublin) takes the tokens and the geometry from this repository with its own sync script.

## Deploying

`.github/workflows/pages.yml` tests every tool, builds the site and deploys it to GitHub Pages on every push to `main`. Guide Studio's team library needs the repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions → Variables), and the Supabase project's Site URL and Redirect URLs need the new address, `https://shaunphh.github.io/tools/guide-studio/`.

## What changed for the team

Same tools, same links from the front door, one look. The addresses moved under `/tools/`; the old ones send you to the new ones. Guides saved in a browser stay in that browser, so open the new Guide Studio address in the browser you used before, or Restore a backup.
