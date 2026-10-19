import { describe, expect, it } from 'vitest'
import { previewSize } from '@ad/shell/preview'

const post = { width: 1080, height: 1350, viewportWidth: 1280, viewportHeight: 720, mode: 'fit' as const }
describe('shared preview scale', () => {
  it('shows posts at the same size despite different editor panels', () => {
    const event = previewSize({ ...post, availableWidth: 800, availableHeight: 420 })
    const guide = previewSize({ ...post, availableWidth: 600, availableHeight: 525 })
    const tape = previewSize({ ...post, availableWidth: 900, availableHeight: 430 })
    expect(event).toEqual(guide)
    expect(guide).toEqual(tape)
    expect(event.width).toBe(336)
    expect(event.height).toBe(420)
  })
  it('zooms videos by the same amount without changing their shape', () => {
    const fit = previewSize({ ...post, height: 1920, availableWidth: 800, availableHeight: 420 })
    const zoom = previewSize({ ...post, mode: 'zoom', height: 1920, availableWidth: 800, availableHeight: 420 })
    expect(zoom.width / fit.width).toBeCloseTo(1.2)
    expect(zoom.height / fit.height).toBeCloseTo(1.2)
    expect(zoom.width / zoom.height).toBeCloseTo(9 / 16)
  })
  it('zooms 20% beyond Fit, including when the fitted view fills a narrow screen', () => {
    const size = previewSize({ ...post, mode: 'zoom', availableWidth: 800, availableHeight: 420 })
    expect(size.width).toBeCloseTo(403.2)
    expect(size.height).toBeCloseTo(504)
    const narrow = previewSize({ ...post, mode: 'zoom', viewportWidth: 390, availableWidth: 240, availableHeight: 330 })
    expect(narrow.width).toBeCloseTo(288)
    expect(narrow.height).toBeCloseTo(360)
  })
  it('fits a video without stretching it into a post', () => {
    const size = previewSize({ ...post, height: 1920, availableWidth: 800, availableHeight: 420 })
    expect(size.height).toBe(420)
    expect(size.width / size.height).toBeCloseTo(9 / 16)
  })
  it('fits narrow screens without upscaling or overflowing', () => {
    const size = previewSize({ ...post, viewportWidth: 390, viewportHeight: 844, availableWidth: 240, availableHeight: 330 })
    expect(size.width).toBe(240)
    expect(size.height).toBe(300)
    expect(size.scale).toBeLessThan(1)
  })
  it('caps a large desktop preview at the common post size', () => {
    const size = previewSize({ ...post, viewportWidth: 1920, viewportHeight: 1200, availableWidth: 1200, availableHeight: 900 })
    expect(size.width).toBe(432)
    expect(size.height).toBe(540)
  })
})
