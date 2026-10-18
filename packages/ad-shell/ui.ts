/**
 * The kit's few helpers that need script (19 October 2026): a toast, a dialog, and a binding for a
 * segmented control. The styles are ui.css; the markup conventions are in README.md. The Event Guide,
 * which has no bundler, has these three in its own app.js in the same shape.
 */

/** A message at the foot of the page for a few seconds; `error` for one that stops the work. */
export function toast(message: string, error = false, ms = error ? 7000 : 4000) {
  document.getElementById('ad-toast')?.remove()
  const el = document.createElement('div')
  el.id = 'ad-toast'
  el.className = `ad-toast${error ? ' ad-toast--error' : ''}`
  el.setAttribute('role', error ? 'alert' : 'status')
  el.textContent = message
  document.body.append(el)
  window.setTimeout(() => el.remove(), ms)
  return el
}

/**
 * A modal dialog with the kit's head, body and foot. Reuses one <dialog id="ad-dialog"> on the page (made
 * if missing). `body` and `foot` are markup; the dialog closes on its close button or a click outside.
 */
export function dialog({ title, body, foot = '', eyebrow = '' }: { title: string; body: string; foot?: string; eyebrow?: string }) {
  let d = document.getElementById('ad-dialog') as HTMLDialogElement | null
  if (!d) { d = document.createElement('dialog'); d.id = 'ad-dialog'; d.className = 'ad-dialog'; document.body.append(d) }
  d.innerHTML = `<div class="ad-dialog__head"><div>${eyebrow ? `<span class="ad-eyebrow">${eyebrow}</span>` : ''}<h2>${title}</h2></div><button id="ad-dialog-close" class="ad-btn ad-btn--quiet ad-btn--icon" aria-label="Close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div><div class="ad-dialog__body">${body}</div>${foot ? `<div class="ad-dialog__foot">${foot}</div>` : ''}`
  d.showModal()
  const close = () => d!.close()
  document.getElementById('ad-dialog-close')!.onclick = close
  d.onclick = (e) => { if (e.target === d) close() }
  return d
}

/** Makes the buttons in a .ad-segmented group exclusive, calling `pick` with the chosen button's value. */
export function bindSegmented(group: HTMLElement, pick: (value: string, button: HTMLButtonElement) => void) {
  group.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.addEventListener('click', () => {
      group.querySelectorAll('button').forEach((other) => { other.classList.toggle('active', other === button); other.setAttribute('aria-pressed', String(other === button)) })
      pick(button.dataset.value ?? button.textContent?.trim() ?? '', button)
    })
  })
}
