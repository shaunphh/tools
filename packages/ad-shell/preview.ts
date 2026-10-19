export type PreviewMode = 'auto' | 'fit' | 'instagram'
export type PreviewSize = { width: number; height: number; scale: number }

/** One display scale for posts across the tools; exports keep their native dimensions. */
export function previewSize({ mode, width, height, availableWidth, availableHeight, viewportWidth, viewportHeight }: {
  mode: PreviewMode; width: number; height: number; availableWidth: number; availableHeight: number; viewportWidth: number; viewportHeight: number
}): PreviewSize {
  // A phone-width feed preview, rather than the export's 1080 CSS pixels.
  if (mode === 'instagram') {
    const scale = Math.min(1, 390 / width, Math.max(1, availableWidth) / width)
    return { width: width * scale, height: height * scale, scale }
  }
  // Reserve the same space for the tools' chrome, rather than making each artwork a different size.
  const commonWidth = viewportWidth >= 1000
    ? Math.max(80, Math.min(432, (viewportHeight - 300) * 4 / 5, viewportWidth - 680))
    : 432
  const fitScale = Math.min(1, commonWidth / width, Math.max(1, availableWidth) / width, Math.max(1, availableHeight) / height)
  const scale = Math.max(1 / width, Math.min(1, fitScale * (mode === 'auto' ? 1.25 : 1), Math.max(1, availableWidth) / width))
  return { width: width * scale, height: height * scale, scale }
}

export function previewControls(mode: PreviewMode) {
  return `<div class="ad-preview-controls"><div class="ad-segmented" role="group" aria-label="Preview scale"><button type="button" data-preview-mode="auto" aria-pressed="${mode === 'auto'}" title="25% larger than Fit">Auto</button><button type="button" data-preview-mode="fit" aria-pressed="${mode === 'fit'}">Fit</button><button type="button" data-preview-mode="instagram" aria-pressed="${mode === 'instagram'}" title="Phone-width Instagram preview (390px)">Instagram</button></div></div>`
}

/** Size only the preview surface; its scroll container and artwork coordinates stay independent. */
export function attachPreview({ viewport, surface, width, height, mode = 'auto', availableHeight, onResize }: {
  viewport: HTMLElement; surface: HTMLElement; width: number; height: number; mode?: PreviewMode; availableHeight?: () => number; onResize?: (size: PreviewSize) => void
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
      availableHeight: availableHeight?.() ?? viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
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
