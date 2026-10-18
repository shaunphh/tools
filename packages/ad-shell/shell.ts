/**
 * The shell every Alternative Dublin tool wears (19 October 2026): the masthead with the brand, the tool's
 * name and a switcher to the other tools, as markup, and the ui tokens as custom properties on the page.
 * shell.css styles it. The Event Guide, which has no bundler, writes the same markup in its index.html.
 */
import tokens from '../ad-tape/src/ad-tokens.json'

export type ToolId = 'event-guide' | 'guide-studio' | 'tape-type' | 'board'

/** The tools, in the order the switcher lists them, each at its path under the tools site. */
export const TOOLS: { id: ToolId; name: string; path: string }[] = [
  { id: 'event-guide', name: 'Event Guide', path: 'event-guide/' },
  { id: 'guide-studio', name: 'Guide Studio', path: 'guide-studio/' },
  { id: 'tape-type', name: 'Tape Type', path: 'tape-type/' },
  { id: 'board', name: 'Board', path: 'tape-type/board/' },
]

const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

/**
 * The masthead. `tool` is markup for the middle (a guide's name, a note); `actions` for the right (the
 * tool's own buttons). Links are relative to the tool's folder, so they hold under any site root and in dev.
 */
export function masthead(current: ToolId, { tool = '', actions = '', title = '' }: { tool?: string; actions?: string; title?: string } = {}) {
  const up = current === 'board' ? '../../' : '../'
  const links = TOOLS.map((entry) => `<a href="${up}${entry.path}"${entry.id === current ? ' aria-current="page"' : ''}>${escape(entry.name)}</a>`).join('')
  return `<header class="ad-masthead"><a class="ad-masthead__home" href="${up}" aria-label="Alternative Dublin tools"><span class="ad-masthead__mark">Alternative Dublin</span><span class="ad-masthead__tools">Tools</span></a><nav class="ad-masthead__switch" aria-label="Tools">${links}</nav>${title ? `<h1 class="visually-hidden">${escape(title)}</h1>` : ''}<div class="ad-masthead__tool">${tool}</div><div class="ad-masthead__actions">${actions}</div></header>`
}

/** The ui tokens as --ad-ui-* custom properties on the root, so shell.css and a tool's own styles read them. */
export function applyUiTokens(root: HTMLElement = document.documentElement) {
  for (const token of (tokens as { ui: { tokens: { name: string; value: string }[] } }).ui.tokens) root.style.setProperty(`--ad-ui-${token.name}`, token.value)
}
