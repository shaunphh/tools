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
  it('keeps 100% at native artwork size even in a small viewport', () => {
    expect(previewSize({ ...post, mode: 'actual', availableWidth: 280, availableHeight: 300 })).toEqual({ width: 1080, height: 1350, scale: 1 })
    expect(previewSize({ ...post, mode: 'actual', height: 1920, availableWidth: 280, availableHeight: 300 })).toEqual({ width: 1080, height: 1920, scale: 1 })
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
