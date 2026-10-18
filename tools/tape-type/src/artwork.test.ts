import { describe, expect, it } from 'vitest'
import { BRAND, PHOTO_DARKEN, TAPE_GHOST, buildLayers, fillTracked, getPlacement, layersToSvg, paintOrder, placementRange, svgMarkup, type Layer, type LayerOptions } from './artwork'
import { buildShape } from '@ad/tape/geometry'
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH, SAFE_MARGIN, defaults, sanitizeSettings } from '@ad/tape/settings'
import type { GeneratorSettings, Point } from '@ad/tape/types'

const settings: GeneratorSettings = { ...defaults, seed: 11 }
const labels = ['How to Make the', 'Most of a Weekend', 'Visit to Dublin']
const widths = [520, 560, 470]
const bounds = { ascent: 62, descent: 17 }
const eyebrow = { text: 'BREAKING', fontSize: 40, width: 170, originOffset: -2, capHeight: 28 }
const options = (overrides: Partial<LayerOptions> = {}): LayerOptions => ({ tone: 'light', background: 'charcoal', weight: 700, ...overrides })

function inside(point: Point, polygon: Point[]) {
  let hit = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]
    const b = polygon[j]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) hit = !hit
  }
  return hit
}

describe('placement', () => {
  it('keeps all lettering, rotated strips included, inside the 80px safe area wherever the artwork goes', () => {
    for (const perLine of [false, true]) {
      const shape = buildShape({ ...settings, perLine, rotationVariance: perLine ? 2 : 0, fontSize: 80 }, labels, widths, [], bounds, { eyebrow })
      for (const position of [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 100, y: 0 }, { x: 50, y: 50 }]) {
        const { x, y } = getPlacement(shape, position)
        const ink = shape.inkBox!
        expect(ink.left + x).toBeGreaterThanOrEqual(SAFE_MARGIN - 0.01)
        expect(ink.right + x).toBeLessThanOrEqual(ARTBOARD_WIDTH - SAFE_MARGIN + 0.01)
        expect(ink.top + y).toBeGreaterThanOrEqual(SAFE_MARGIN - 0.01)
        expect(ink.bottom + y).toBeLessThanOrEqual(ARTBOARD_HEIGHT - SAFE_MARGIN + 0.01)
      }
    }
  })

  it('maps 0–100% onto the movable range, so every step moves the artwork (no dead zones)', () => {
    const shape = buildShape({ ...settings, fontSize: 80 }, labels, widths, [], bounds, { eyebrow })
    const range = placementRange(shape)
    expect(getPlacement(shape, { x: 0, y: 0 })).toEqual({ x: Math.round(range.x.minimum * 100) / 100, y: Math.round(range.y.minimum * 100) / 100 })
    expect(getPlacement(shape, { x: 100, y: 100 })).toEqual({ x: Math.round(range.x.maximum * 100) / 100, y: Math.round(range.y.maximum * 100) / 100 })
    let previous = getPlacement(shape, { x: 0, y: 0 })
    for (let step = 5; step <= 100; step += 5) {
      const next = getPlacement(shape, { x: step, y: step })
      expect(next.x).toBeGreaterThan(previous.x)
      expect(next.y).toBeGreaterThan(previous.y)
      previous = next
    }
  })

  it('reports how far lettering bigger than the safe area overflows it', () => {
    const fits = buildShape({ ...settings, fontSize: 80 }, labels, widths, [], bounds)
    expect(placementRange(fits).x.excess).toBe(0)
    const wide = buildShape({ ...settings, fontSize: 80 }, ['A very long line indeed'], [960], [], bounds)
    expect(placementRange(wide).x.excess).toBeCloseTo(960 - 920, 5)
    expect(getPlacement(wide, { x: 0, y: 50 }).x).toBe(getPlacement(wide, { x: 100, y: 50 }).x)
  })

  it('lets the tape and tag reach into the margin while the lettering sits on the safe line', () => {
    const shape = buildShape({ ...settings, fontSize: 80 }, labels, widths, [], bounds, { eyebrow })
    const { x } = getPlacement(shape, { x: 0, y: 50 })
    expect(Math.min(...shape.lines.map((line) => line.inkX ?? 0)) + x).toBeCloseTo(SAFE_MARGIN, 1)
    expect(shape.eyebrow!.box.x + x).toBeLessThan(SAFE_MARGIN)
  })
})

describe('layers and SVG', () => {
  it('draws no tape for None, and flips the eyebrow to white on yellow tape or a yellow background', () => {
    const shape = buildShape(settings, labels, widths, [], bounds, { eyebrow })
    const none = buildLayers(shape, options({ tone: 'none' }), 80)
    expect(none.filter((layer) => layer.kind === 'path')).toHaveLength(1)
    expect(none.filter((layer) => layer.kind === 'text' && layer.text !== 'BREAKING').every((layer) => layer.fill === BRAND.white)).toBe(true)
    const tagFill = (layerOptions: LayerOptions) => buildLayers(shape, layerOptions, 80).find((layer) => layer.kind === 'path' && layer.d === shape.eyebrow!.path)?.fill
    expect(tagFill(options({ tone: 'yellow' }))).toBe(BRAND.white)
    expect(tagFill(options({ tone: 'light', background: 'yellow' }))).toBe(BRAND.white)
    expect(tagFill(options({ tone: 'light', background: 'photo' }))).toBe(BRAND.yellow)
    expect(buildLayers(shape, options({ tone: 'yellow' }), 80).find((layer) => layer.kind === 'path' && layer.d === shape.path)?.fill).toBe(BRAND.yellow)
  })

  it('sets headline lettering in the style weight and the eyebrow in ExtraBold, like every tag', () => {
    const shape = buildShape(settings, labels, widths, [], bounds, { eyebrow })
    const texts = buildLayers(shape, options({ weight: 900 }), 80).filter((layer) => layer.kind === 'text')
    expect(texts.filter((layer) => layer.text !== 'BREAKING').every((layer) => layer.kind === 'text' && layer.weight === 900)).toBe(true)
    expect(texts.find((layer) => layer.text === 'BREAKING')).toMatchObject({ weight: 800 })
  })

  it('draws Ghost tape as the dark tape seen through, its strips painted as one so an overlap stays one layer', () => {
    const shape = buildShape({ ...settings, perLine: true }, labels, widths, [], bounds, { eyebrow })
    const layers = buildLayers(shape, options({ tone: 'ghost' }), 80)
    const tapes = layers.filter((layer) => layer.kind === 'path' && layer.d !== shape.eyebrow!.path)
    expect(tapes).toHaveLength(3)
    expect(TAPE_GHOST).toBe(0.6)
    expect(tapes.every((layer) => layer.kind === 'path' && layer.fill === BRAND.dark && layer.opacity === TAPE_GHOST)).toBe(true)
    // The eyebrow's tag stays whole, the usual yellow; the lettering is light.
    const tag = layers.find((layer) => layer.kind === 'path' && layer.d === shape.eyebrow!.path)
    expect(tag).toMatchObject({ fill: BRAND.yellow })
    expect(tag).not.toHaveProperty('opacity')
    expect(layers.filter((layer) => layer.kind === 'text' && layer.text !== 'BREAKING').every((layer) => layer.fill === BRAND.white)).toBe(true)
    const painted = paintOrder(layers)
    expect(painted[0]).toMatchObject({ kind: 'group', fill: BRAND.dark, opacity: TAPE_GHOST })
    expect((painted[0] as { layers: Layer[] }).layers).toHaveLength(3)
    expect(painted.slice(1).every((entry) => entry.kind !== 'group')).toBe(true)
    const svg = layersToSvg(layers)
    expect(svg.match(/<g opacity="0.6">/g)).toHaveLength(1)
    expect(svg).not.toContain('fill-opacity')
    expect(svg.indexOf('</g>')).toBeLessThan(svg.indexOf(`d="${shape.eyebrow!.path}"`))
    expect(layersToSvg(buildLayers(shape, options(), 80))).not.toContain('<g opacity')
  })

  it('tracks the headline’s letters as the layout says, in the layers and the SVG, and leaves the eyebrow alone', () => {
    const shape = buildShape(settings, labels, widths, [], bounds, { eyebrow })
    const layers = buildLayers(shape, options({ letterSpacing: -1.6 }), 80)
    const texts = layers.filter((layer) => layer.kind === 'text')
    expect(texts.filter((layer) => layer.text !== 'BREAKING').every((layer) => layer.kind === 'text' && layer.letterSpacing === -1.6)).toBe(true)
    expect(texts.find((layer) => layer.text === 'BREAKING')).not.toHaveProperty('letterSpacing')
    expect(layersToSvg(layers).match(/ letter-spacing="-1.6"/g)).toHaveLength(3)
    expect(layersToSvg(buildLayers(shape, options(), 80))).not.toContain('letter-spacing')
  })

  it('draws tracked text letter by letter where canvas has no letterSpacing, keeping the font’s kerning', () => {
    const drawn: [string, number][] = []
    // T is wide, and "Ta" kerns 10 tight.
    const advance = (text: string) => [...text].reduce((total, letter) => total + (letter === 'T' ? 50 : 40), 0) - (text.includes('Ta') ? 10 : 0)
    const context = { measureText: (text: string) => ({ width: advance(text) }), fillText: (text: string, x: number) => { drawn.push([text, x]) } } as unknown as CanvasRenderingContext2D
    fillTracked(context, 'Tap', 100, 0, -2)
    expect(drawn).toEqual([['T', 100], ['a', 100 + 50 - 10 - 2], ['p', 100 + 50 - 10 + 40 - 4]])
    // No tracking: the run as it is.
    fillTracked(context, 'Tap', 0, 0, 0)
    expect(drawn.at(-1)).toEqual(['Tap', 0])
    // With letterSpacing the browser does it, and the context is left as it was found.
    const native: [string, number][] = []
    const withSpacing = { letterSpacing: '1px', measureText: () => ({ width: 0 }), fillText: (text: string, x: number) => { native.push([text, x]) } } as unknown as CanvasRenderingContext2D & { letterSpacing: string }
    fillTracked(withSpacing, 'Tap', 100, 0, -2)
    expect(native).toEqual([['Tap', 100]])
    expect(withSpacing.letterSpacing).toBe('1px')
  })

  it('paints tape before any text so strips never cover letters', () => {
    const shape = buildShape({ ...settings, perLine: true }, labels, widths, [], bounds, { eyebrow })
    const kinds = buildLayers(shape, options(), 80).map((layer) => layer.kind)
    expect(kinds.lastIndexOf('path')).toBeLessThan(kinds.indexOf('text'))
  })

  it('draws nothing for an empty headline, eyebrow included', () => {
    const shape = buildShape({ ...settings, perLine: true }, [' '], [12], [], bounds, { eyebrow })
    expect(shape.eyebrow).toBeUndefined()
    expect(buildLayers(shape, options(), 80)).toHaveLength(0)
  })

  it('escapes markup and drops characters XML cannot hold, so exports stay valid', () => {
    const bell = String.fromCharCode(7)
    const nonCharacter = String.fromCharCode(0xfffe)
    const loneSurrogate = String.fromCharCode(0xd83d)
    const svg = layersToSvg([{ kind: 'text', text: `Fish & <Chips> "5${bell}${nonCharacter}${loneSurrogate}" 🎡`, x: 0, y: 0, size: 80, weight: 700, fill: '#111', angle: 0, cx: 0, cy: 0 }])
    expect(svg).toContain('Fish &amp; &lt;Chips&gt; "5" 🎡</text>')
    expect(svg).toContain('font-weight="700"')
  })

  it('embeds the photo once, as xlink:href, and adds font CSS when given', () => {
    const shape = buildShape(settings, labels, widths, [], bounds)
    const layers = buildLayers(shape, options({ background: 'photo' }), 80)
    const svg = svgMarkup(layers, shape, { background: 'photo', photo: 'data:image/jpeg;base64,AAA', fontCss: '@font-face{}' })
    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"')
    expect(svg.split('data:image/jpeg;base64,AAA')).toHaveLength(2)
    expect(svg).toContain('<image xlink:href="data:image/jpeg;base64,AAA"')
    expect(svg).toContain('<defs><style>@font-face{}</style></defs>')
  })

  it('darkens the photo by the set amount, or not at all', () => {
    const shape = buildShape(settings, labels, widths, [], bounds)
    const layers = buildLayers(shape, options({ background: 'photo' }), 80)
    const photo = 'data:image/jpeg;base64,AAA'
    expect(svgMarkup(layers, shape, { background: 'photo', photo })).toContain(`fill="#000" opacity="${PHOTO_DARKEN}"`)
    expect(svgMarkup(layers, shape, { background: 'photo', photo, darken: 0 })).not.toContain('opacity=')
  })

  it('draws the logo and swipe arrow on the artboard, under the artwork, and leaves them out of cutouts', () => {
    const shape = buildShape(settings, labels, widths, [], bounds)
    const layers = buildLayers(shape, options({ background: 'photo' }), 80)
    const furniture: Layer[] = [{ kind: 'path', d: 'M0 0H10V10Z', fill: BRAND.yellow, angle: 0, cx: 0, cy: 0, place: { x: 750, y: 80, scale: 0.165 } }]
    const svg = svgMarkup(layers, shape, { background: 'photo', photo: 'data:image/jpeg;base64,AAA', furniture })
    const mark = `<path d="M0 0H10V10Z" fill="${BRAND.yellow}" transform="translate(750 80) scale(0.165)"/>`
    expect(svg).toContain(mark)
    expect(svg.indexOf('<image')).toBeLessThan(svg.indexOf(mark))
    expect(svg.indexOf('opacity=')).toBeLessThan(svg.indexOf(mark))
    expect(svg.indexOf(mark)).toBeLessThan(svg.indexOf('<g transform="translate('))
    expect(svgMarkup(layers, shape, { artboard: false, furniture })).not.toContain('scale(')
  })

  it('places the artwork in exports where the preview does, marks taken into account', () => {
    const shape = buildShape({ ...settings, column: 'wide', fontSize: 80 }, ['A Line That Fills the Whole Width'], [900], [], bounds)
    const layers = buildLayers(shape, options(), 80)
    const obstacles = [{ left: 694, top: 24, right: 1056, bottom: 240 }]
    const placed = getPlacement(shape, { x: 0, y: 0 }, obstacles)
    expect(placed.y).toBeGreaterThan(getPlacement(shape, { x: 0, y: 0 }).y)
    expect(svgMarkup(layers, shape, { position: { x: 0, y: 0 }, obstacles })).toContain(`<g transform="translate(${placed.x} ${placed.y})">`)
  })

  it('uses the brand colours', () => {
    expect(BRAND).toMatchObject({ yellow: '#FFED1F', light: '#F0F0F0', dark: '#101010' })
  })

  it('exports the Dark background as brand black', () => {
    const shape = buildShape(settings, labels, widths, [], bounds)
    expect(svgMarkup(buildLayers(shape, options(), 80), shape, { background: 'charcoal' })).toContain(`fill="${BRAND.dark}"`)
  })
})

describe('settings', () => {
  it('replaces invalid or out-of-range stored values instead of trusting them', () => {
    const cleaned = sanitizeSettings({ style: 'poster', tone: 'red', fontSize: 200, hugStrength: 0.2, seed: -5, headline: 42, lineGap: Number.NaN, column: 'huge', mode: 'zigzag' })
    expect(cleaned.style).toBe(defaults.style)
    expect(cleaned.tone).toBe(defaults.tone)
    expect(cleaned.fontSize).toBe(90)
    expect(cleaned.hugStrength).toBe(0.82)
    expect(cleaned.seed).toBe(1)
    expect(cleaned.headline).toBe(defaults.headline)
    expect(cleaned.lineGap).toBe(defaults.lineGap)
    expect(cleaned.column).toBe(defaults.column)
    expect(cleaned.mode).toBe('plain')
    expect(sanitizeSettings({ mode: 'torn' }).mode).toBe('torn')
    expect(sanitizeSettings({ tone: 'ghost' }).tone).toBe('ghost')
  })
})

describe('connected joins', () => {
  it('never bend into the letters of the line that reaches further, even with a negative line gap', () => {
    const cases = [
      { labels: ['A Long First Line Here', 'Short'], widths: [600, 220] },
      { labels: ['Short', 'A Long Second Line Here'], widths: [220, 600] },
      { labels: ['Medium Line', 'The Longest Line Of All', 'Tiny'], widths: [380, 620, 150] },
    ]
    for (const lineGap of [2, 0, -8]) {
      for (const align of ['left', 'center', 'right'] as const) {
        for (const layout of cases) {
          for (let seed = 1; seed <= 25; seed += 1) {
            const shape = buildShape({ ...settings, mode: 'cling', align, perLine: false, fontSize: 80, lineGap, seed }, layout.labels, layout.widths, [], bounds)
            shape.lines.forEach((line, index) => {
              const inkX = line.inkX ?? line.x
              const bands = []
              if (index < shape.lines.length - 1) bands.push(line.baseline + bounds.descent * 0.9)
              if (index > 0) bands.push(line.baseline - bounds.ascent * 0.9)
              for (const y of bands) {
                for (let x = inkX + 3; x <= inkX + line.width - 3; x += 6) {
                  expect(inside({ x, y }, shape.points), `gap ${lineGap} ${align} seed ${seed} line ${index} at ${x},${y}`).toBe(true)
                }
              }
            })
          }
        }
      }
    }
  })
})
