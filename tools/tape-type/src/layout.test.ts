import { describe, expect, it } from 'vitest'
import { EYEBROW_SCALE, FEATURE_WEIGHT, HEADLINE_TRACKING, HEADLINE_WEIGHT, eyebrowSizeFor, layoutHeadline, lettersOf, trackedBy, type LayoutInput, type Measure } from './layout'

// Monospace stand-in for canvas: every character is half an em wide.
const measure: Measure = (text, size) => ({
  width: text.length * size * 0.5,
  originOffset: -size * 0.05,
  ascent: size * 0.7,
  descent: /[gjpqy]/.test(text) ? size * 0.2 : 0,
})

const input = (overrides: Partial<LayoutInput> = {}): LayoutInput => ({
  text: 'How to Make the Most of a Weekend Visit to Dublin',
  style: 'headline',
  titleCase: true,
  coverFormat: 'regular',
  column: 'narrow',
  autoSize: true,
  fontSize: 90,
  autoWrap: true,
  eyebrow: '',
  // Untracked unless a test says: the sizes below were worked out letter by letter.
  tracking: 0,
  ...overrides,
})

describe('headline layout', () => {
  it('sets short headlines at 90px and keeps every line inside the column', () => {
    const layout = layoutHeadline(input({ text: 'Dublin Gets a New Night Market' }), measure)
    expect(layout.fontSize).toBe(90)
    expect(layout.overflow).toBeNull()
    expect(layout.widths.every((width) => width <= layout.measureWidth)).toBe(true)
    expect(layout.weight).toBe(HEADLINE_WEIGHT)
  })

  it('gives up a few pixels when that saves a whole line', () => {
    // At 78px each 16-character pair is 624px, just too wide for the 620px column; at 77px it fits.
    const text = 'aaaaaaa bbbbbbbb cccccc dddddddd eeeeeee ffffffff'
    const layout = layoutHeadline(input({ text, titleCase: false }), measure)
    expect(layout.fontSize).toBe(77)
    expect(layout.labels).toEqual(['aaaaaaa bbbbbbbb', 'cccccc dddddddd', 'eeeeeee ffffffff'])
  })

  it('never starts a Title Case line with a lowercase minor word', () => {
    for (const column of ['narrow', 'medium', 'wide'] as const) {
      const layout = layoutHeadline(input({ column }), measure)
      expect(layout.labels.slice(1).filter((line) => /^[a-z]/.test(line)), layout.labels.join(' / ')).toEqual([])
    }
  })

  it('starts features at full size, in the same Bold as headlines, and only shrinks them to fit', () => {
    const short = layoutHeadline(input({ style: 'feature', text: 'THE BIG WHEEL', column: 'wide' }), measure)
    expect(short.fontSize).toBe(90)
    expect(short.weight).toBe(FEATURE_WEIGHT)
    expect(FEATURE_WEIGHT).toBe(HEADLINE_WEIGHT)
    expect(HEADLINE_WEIGHT).toBe(700)
    // Seven lines at 90px (20 characters a line), so it has to come down to fit six.
    const text = 'ONE OF DUBLIN’S BEST-KNOWN INDEPENDENT CINEMAS HAS ANNOUNCED IT’S CLOSING AFTER THIRTY YEARS OF LATE SHOWS AND DOUBLE BILLS'
    const long = layoutHeadline(input({ style: 'feature', column: 'wide', text }), measure)
    expect(long.fontSize).toBeLessThan(90)
    expect(long.labels.length).toBeLessThanOrEqual(6)
    expect(long.overflow).toBeNull()
  })

  it('names what overflowed', () => {
    const tooLong = layoutHeadline(input({ text: Array.from({ length: 30 }, () => 'Dublin').join(' ') }), measure)
    expect(tooLong.overflow).toBe('lines')
    const unwrapped = layoutHeadline(input({ autoWrap: false, text: 'This single typed line is far too long for the column' }), measure)
    expect(unwrapped.overflow).toBe('width')
    const series = layoutHeadline(input({ coverFormat: 'series', text: 'A Series Title That Runs On Far Too Long' }), measure)
    expect(series.fontSize).toBe(172)
    expect(series.maxLines).toBe(2)
    expect(series.overflow).toBe('lines')
  })

  it('shrinks a long eyebrow to fit the safe area, and flags one that still cannot fit', () => {
    const long = layoutHeadline(input({ eyebrow: 'X'.repeat(60) }), measure)
    expect(long.eyebrow!.fontSize).toBeLessThan(eyebrowSizeFor(72))
    expect(long.eyebrow!.width + 2 * 0.45 * long.eyebrow!.fontSize).toBeLessThanOrEqual(920)
    expect(long.overflow).toBeNull()
    const impossible = layoutHeadline(input({ eyebrow: 'X'.repeat(90) }), measure)
    expect(impossible.overflow).toBe('eyebrow')
    const normal = layoutHeadline(input({ eyebrow: 'BREAKING' }), measure)
    expect(normal.eyebrow!.fontSize).toBe(eyebrowSizeFor(normal.fontSize))
  })

  it('sets the eyebrow at nine tenths of the published labels, whatever the headline size', () => {
    expect(EYEBROW_SCALE).toBe(0.9)
    expect([72, 80, 90, 172].map(eyebrowSizeFor)).toEqual([34, 37, 41, 41])
  })

  it('treats an empty headline as empty: no overflow and no eyebrow', () => {
    const layout = layoutHeadline(input({ text: '', eyebrow: 'NEWS' }), measure)
    expect(layout.empty).toBe(true)
    expect(layout.overflow).toBeNull()
    expect(layout.eyebrow).toBeUndefined()
  })

  it('respects a manual size, clamped to the approved range', () => {
    expect(layoutHeadline(input({ autoSize: false, fontSize: 60 }), measure).fontSize).toBe(72)
    expect(layoutHeadline(input({ autoSize: false, fontSize: 84 }), measure).fontSize).toBe(84)
  })

  it('counts the lines the writer typed', () => {
    expect(layoutHeadline(input({ text: 'One\nTwo\nThree' }), measure).paragraphs).toBe(3)
    expect(layoutHeadline(input({ text: '' }), measure).paragraphs).toBe(0)
    const typed = layoutHeadline(input({ text: 'A\nB\nC\nD\nE\nF\nG', autoWrap: false }), measure)
    expect(typed.overflow).toBe('lines')
    expect(typed.paragraphs).toBeGreaterThan(typed.maxLines)
  })

  it('never keeps a lowercase line opener when a size up to 8px smaller would avoid it', () => {
    const lowercaseStart = (labels: string[]) => labels.slice(1).some((line) => /^[a-z]/.test(line))
    const headlines = [
      'Ten of the Best Pints of Guinness in Dublin',
      'The Best Things to Do in Dublin This Weekend',
      'A Protest in Dublin Is Planned for Tomorrow',
      'How to Make the Most of a Weekend Visit to Dublin',
      'Dublin’s Last Late-Night Bus Could Be About to Change',
      'A Massive Night Market Is Coming to Smithfield This Weekend',
      'Where to Eat and Drink in Dublin on a Budget',
    ]
    let cleanedUp = 0
    for (const text of headlines) {
      for (const column of ['narrow', 'medium', 'wide'] as const) {
        const auto = layoutHeadline(input({ text, column }), measure)
        if (!lowercaseStart(auto.labels)) {
          cleanedUp += 1
          continue
        }
        // It kept one, so no nearby smaller size may offer a clean break that still fits.
        for (let size = Math.max(72, auto.fontSize - 8); size < auto.fontSize; size += 1) {
          const manual = layoutHeadline(input({ text, column, autoSize: false, fontSize: size }), measure)
          const cleanFit = !manual.overflow && manual.labels.length <= auto.labels.length && !lowercaseStart(manual.labels)
          expect(cleanFit, `${column} ${size}px: ${manual.labels.join(' / ')}`).toBe(false)
        }
      }
    }
    expect(cleanedUp).toBeGreaterThan(headlines.length)
  })
})

describe('tracking', () => {
  it('tracks cover headlines −2%, the token, between the letters only', () => {
    expect(HEADLINE_TRACKING).toBe(-0.02)
    expect(lettersOf('Dublin')).toHaveLength(6)
    // A letter with its accent, and a flag: one each, as letter-spacing counts them.
    expect(lettersOf('e\u0301🇮🇪')).toHaveLength(2)
    expect(trackedBy('Dublin', 90, -0.02)).toBeCloseTo(-0.02 * 90 * 5, 6)
    expect(trackedBy('D', 90, -0.02)).toBe(0)
  })

  it('wraps and fits lines by their tracked widths, and says the tracking in px', () => {
    // 16 characters at 78px are 624px, over the 620px column untracked; tracked −2% they come in under it.
    const text = 'aaaaaaa bbbbbbbb cccccc dddddddd eeeeeee ffffffff'
    const untracked = layoutHeadline(input({ text, titleCase: false }), measure)
    const tracked = layoutHeadline(input({ text, titleCase: false, tracking: -0.02 }), measure)
    expect(untracked.fontSize).toBe(77)
    expect(untracked.letterSpacing).toBe(0)
    expect(tracked.fontSize).toBeGreaterThan(77)
    expect(tracked.letterSpacing).toBeCloseTo(-0.02 * tracked.fontSize, 2)
    tracked.labels.forEach((label, index) => expect(tracked.widths[index]).toBeCloseTo(label.length * tracked.fontSize * 0.5 + trackedBy(label, tracked.fontSize, -0.02), 6))
    expect(tracked.widths.every((width) => width <= tracked.measureWidth)).toBe(true)
    // The token's tracking is what the tool uses.
    expect(layoutHeadline(input({ text, titleCase: false, tracking: undefined }), measure)).toMatchObject({ fontSize: tracked.fontSize, letterSpacing: tracked.letterSpacing })
  })

  it('leaves the eyebrow untracked, a tag like every other', () => {
    const layout = layoutHeadline(input({ eyebrow: 'BREAKING', tracking: -0.02 }), measure)
    expect(layout.eyebrow!.width).toBe('BREAKING'.length * layout.eyebrow!.fontSize * 0.5)
  })
})
