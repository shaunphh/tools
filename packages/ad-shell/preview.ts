export type PreviewMode = 'fit' | 'actual'
export type PreviewSize = { width: number; height: number; scale: number }

/** One display scale for posts across the tools; exports keep their native dimensions. */
export function previewSize({ mode, width, height, availableWidth, availableHeight, viewportWidth, viewportHeight }: {
  mode: PreviewMode; width: number; height: number; availableWidth: number; availableHeight: number; viewportWidth: number; viewportHeight: number
}): PreviewSize {
  if (mode === 'actual') return { width, height, scale: 1 }
  // Reserve the same space for the tools' chrome, rather than making each artwork a different size.
  const commonWidth = viewportWidth >= 1000
    ? Math.max(80, Math.min(432, (viewportHeight - 300) * 4 / 5, viewportWidth - 680))
    : 432
  const scale = Math.max(1 / width, Math.min(1, commonWidth / width, Math.max(1, availableWidth) / width, Math.max(1, availableHeight) / height))
  return { width: width * scale, height: height * scale, scale }
}

export function previewControls(mode: PreviewMode) {
  return `<div class="ad-preview-controls"><div class="ad-segmented" role="group" aria-label="Preview scale"><button type="button" data-preview-mode="fit" aria-pressed="${mode === 'fit'}">Fit</button><button type="button" data-preview-mode="actual" aria-pressed="${mode === 'actual'}" title="One artwork pixel per CSS pixel">100%</button></div><output data-preview-percent aria-label="Displayed scale"></output></div>`
}

/** Size only the preview surface; its scroll container and artwork coordinates stay independent. */
export function attachPreview({ viewport, surface, width, height, mode = 'fit', onResize }: {
  viewport: HTMLElement; surface: HTMLElement; width: number; height: number; mode?: PreviewMode; onResize?: (size: PreviewSize) => void
}) {
  viewport.classList.add('ad-preview-viewport')
  viewport.tabIndex=0
  viewport.setAttribute('role','region')
  viewport.setAttribute('aria-label','Artwork preview')
  surface.classList.add('ad-preview-surface')
  let current = mode
  const refresh = () => {
    const style = getComputedStyle(viewport)
    const size = previewSize({ mode: current, width, height,
      availableWidth: viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      availableHeight: viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      viewportWidth: window.innerWidth, viewportHeight: window.innerHeight })
    surface.style.width = `${size.width}px`
    surface.style.height = `${size.height}px`
    viewport.dataset.previewMode = current
    onResize?.(size)
  }
  const observer = new ResizeObserver(refresh)
  observer.observe(viewport)
  window.addEventListener('resize', refresh)
  refresh()
  return {
    refresh,
    setMode(mode: PreviewMode) { current = mode; refresh(); viewport.scrollTo(0, 0) },
    destroy() { observer.disconnect(); window.removeEventListener('resize', refresh) }
  }
}
