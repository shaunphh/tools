import { describe, expect, it } from 'vitest'
import { coverDefaults, sanitizeCover } from './cover'
import { PARTNER_LOOK, POST_LOOK, VIDEO_LOOKS, lookFor } from './formats'
import { HELD, HOUSE_CUT_KEY, applyLocks, firstSinceHouseCut, isBarred, isLocked, withHouseCut, withLookColumn } from './locks'
import { defaults, stylePresets } from '@ad/tape/settings'
import type { GeneratorSettings } from '@ad/tape/types'

describe('locked choices', () => {
  it('holds a post to the one house look, and leaves the cut styles open', () => {
    expect(isLocked('style', 'feature', POST_LOOK, false)).toBe(true)
    expect(isLocked('style', 'headline', POST_LOOK, false)).toBe(false)
    expect((['dark', 'yellow', 'none'] as const).every((tone) => isLocked('tone', tone, POST_LOOK, false))).toBe(true)
    expect(isLocked('tone', 'light', POST_LOOK, false)).toBe(false)
    // Ghost, the dark tape seen through, is a post's one other tape (18 October 2026).
    expect(isLocked('tone', 'ghost', POST_LOOK, false)).toBe(false)
    expect(POST_LOOK.tapes).toEqual(['light', 'ghost'])
    expect(isLocked('perLine', true, POST_LOOK, false)).toBe(true)
    expect(isLocked('perLine', false, POST_LOOK, false)).toBe(false)
    expect(isLocked('align', 'center', POST_LOOK, false)).toBe(true)
    expect(isLocked('align', 'right', POST_LOOK, false)).toBe(true)
    expect(isLocked('align', 'left', POST_LOOK, false)).toBe(false)
    expect(isLocked('coverFormat', 'series', POST_LOOK, false)).toBe(true)
    expect(HELD).not.toContain('mode')
  })

  it('holds the tape’s cling where the look has it', () => {
    expect(isLocked('hugStrength', 1, POST_LOOK, false)).toBe(false)
    expect(isLocked('hugStrength', 1.1, POST_LOOK, false)).toBe(true)
    expect(applyLocks({ ...defaults, hugStrength: 0.9 }, POST_LOOK, false).hugStrength).toBe(1)
    expect(applyLocks({ ...defaults, hugStrength: 0.9 }, POST_LOOK, true).hugStrength).toBe(0.9)
  })

  it('opens every time in the look’s medium column, whatever column was picked last time', () => {
    for (const look of [POST_LOOK, ...Object.values(VIDEO_LOOKS)]) {
      expect(look.treatment.column).toBe('medium')
      expect(withLookColumn({ ...defaults, column: 'wide', headline: 'Kept' }, look)).toMatchObject({ column: 'medium', headline: 'Kept' })
    }
  })

  it('gives a post the rough cut and a video the tape cut as their house cuts, once, and leaves the choice open after', () => {
    expect(POST_LOOK.treatment.mode).toBe('rough')
    expect(Object.values(VIDEO_LOOKS).map((look) => look.treatment.mode)).toEqual(['tape', 'tape', 'tape'])
    expect(withHouseCut({ ...defaults, mode: 'plain' }, VIDEO_LOOKS.presenter, true).mode).toBe('tape')
    const kept = new Map<string, string>()
    const storage = { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => { kept.set(key, value) } }
    // A browser that remembered the old cut takes the new one the first time it opens.
    const first = firstSinceHouseCut(storage)
    expect(first).toBe(true)
    expect(kept.has(HOUSE_CUT_KEY)).toBe(true)
    expect(withHouseCut({ ...defaults, mode: 'plain', headline: 'Kept' }, POST_LOOK, first)).toMatchObject({ mode: 'rough', headline: 'Kept' })
    // Drawn twice with that answer, it comes out the same.
    expect(withHouseCut({ ...defaults, mode: 'plain' }, POST_LOOK, first).mode).toBe('rough')
    // After that the cut is the person's own.
    const chosen = { ...defaults, mode: 'torn' as const }
    expect(firstSinceHouseCut(storage)).toBe(false)
    expect(withHouseCut(chosen, POST_LOOK, false)).toBe(chosen)
    // Storage that cannot be used leaves the settings as they are.
    expect(firstSinceHouseCut(undefined)).toBe(false)
    expect(firstSinceHouseCut({ getItem: () => { throw new Error('blocked') }, setItem: () => undefined })).toBe(false)
  })

  it('never locks a default of the settings it holds, so the house look is always reachable', () => {
    for (const setting of HELD) expect(isLocked(setting, defaults[setting], POST_LOOK, false), setting).toBe(false)
    expect(applyLocks(defaults, POST_LOOK, false)).toEqual({ ...defaults, column: 'medium' })
  })

  it('holds each kind of video to its own tape, or Ghost', () => {
    expect(isLocked('tone', 'yellow', VIDEO_LOOKS.report, false)).toBe(false)
    expect(isLocked('tone', 'light', VIDEO_LOOKS.report, false)).toBe(true)
    expect(isLocked('tone', 'dark', VIDEO_LOOKS.presenter, false)).toBe(false)
    expect(isLocked('tone', 'yellow', VIDEO_LOOKS.presenter, false)).toBe(true)
    // Ghost, the dark tape seen through, is the one change on a video cover too (18 October 2026): no other colour.
    for (const look of Object.values(VIDEO_LOOKS)) {
      expect(look.tapes).toEqual([look.treatment.tone, 'ghost'])
      expect(isLocked('tone', 'ghost', look, false)).toBe(false)
      expect(isLocked('tone', 'none', look, false)).toBe(true)
    }
    expect(isLocked('style', 'feature', VIDEO_LOOKS.feature, false)).toBe(false)
    expect(isLocked('style', 'headline', VIDEO_LOOKS.feature, false)).toBe(true)
    for (const look of Object.values(VIDEO_LOOKS)) {
      expect(isLocked('align', 'left', look, false)).toBe(false)
      expect(isLocked('perLine', true, look, false)).toBe(true)
    }
  })

  it('puts settings saved before the locks back to the house look, keeping the words and the cut', () => {
    const saved: GeneratorSettings = { ...defaults, ...stylePresets.feature, style: 'feature', tone: 'yellow', coverFormat: 'series', headline: 'Kept', seed: 42 }
    const next = applyLocks(saved, POST_LOOK, false)
    expect(next).toMatchObject({ ...POST_LOOK.treatment, style: 'headline', tone: 'light', coverFormat: 'regular', headline: 'Kept', seed: 42 })
    expect(POST_LOOK.treatment).toEqual({ ...stylePresets.headline, column: 'medium', mode: 'rough' })
    const cut: GeneratorSettings = { ...defaults, mode: 'torn', align: 'right', perLine: true, column: 'wide' }
    expect(applyLocks(cut, POST_LOOK, false)).toMatchObject({ mode: 'torn', align: 'left', perLine: false, column: 'wide' })
  })

  it('puts settings saved under another look into the one in use, keeping a tape the look leaves open', () => {
    const post: GeneratorSettings = { ...defaults, mode: 'torn', headline: 'Kept' }
    expect(applyLocks(post, VIDEO_LOOKS.report, false)).toMatchObject({ tone: 'yellow', style: 'headline', mode: 'torn', headline: 'Kept' })
    expect(applyLocks(post, VIDEO_LOOKS.feature, false)).toMatchObject({ style: 'feature', tone: 'light', perLine: false, align: 'left' })
    const report = applyLocks(post, VIDEO_LOOKS.report, false)
    expect(applyLocks(report, POST_LOOK, false)).toMatchObject({ tone: 'light', mode: 'torn' })
    // Ghost is every look's, so it is kept; no tape at all is nobody's now, so it goes back to the look's own.
    expect(applyLocks({ ...post, tone: 'ghost' }, VIDEO_LOOKS.report, false).tone).toBe('ghost')
    expect(applyLocks({ ...post, tone: 'ghost' }, POST_LOOK, false).tone).toBe('ghost')
    expect(applyLocks({ ...post, tone: 'none' }, POST_LOOK, false).tone).toBe('light')
  })

  it('opens the Feature style to a post only as a Partner post, which keeps to a post’s tapes', () => {
    expect(lookFor('post', 'report', true)).toBe(PARTNER_LOOK)
    expect(lookFor('post', 'report')).toBe(POST_LOOK)
    expect(lookFor('video', 'report', true)).toBe(VIDEO_LOOKS.report)
    expect(PARTNER_LOOK).toMatchObject({ label: 'Partner post', style: 'feature', eyebrow: 'Partner', tapes: POST_LOOK.tapes, position: { x: 50, y: 50 } })
    // Roughly left aligned (each line set in or out by turns) or centred, the strips about touching,
    // some overlapping, and the tag off to start with, its words in the box (19 October 2026).
    // Set by eye on 19 October 2026: Rough cut, cling 104%, 13px apart ± 18, turned up to 2.8°.
    expect(PARTNER_LOOK.treatment).toEqual({ ...stylePresets.feature, mode: 'rough', align: 'left', hugStrength: 1.04, rotationVariance: 2.8, lineGap: 13, gapVariance: 18, stagger: 10 })
    expect(PARTNER_LOOK.eyebrowOn).toBe(false)
    expect(isLocked('align', 'center', PARTNER_LOOK, false)).toBe(false)
    expect(isLocked('align', 'right', PARTNER_LOOK, false)).toBe(true)
    expect(isLocked('align', 'center', POST_LOOK, false)).toBe(true)
    expect(applyLocks({ ...defaults, style: 'feature', align: 'center' }, PARTNER_LOOK, false).align).toBe('center')
    // Heavier than every other cover, and the words stay in the middle (19 October 2026).
    expect(PARTNER_LOOK).toMatchObject({ weight: 178, fixed: true })
    expect(POST_LOOK.fixed).toBeUndefined()
    expect(isLocked('style', 'feature', PARTNER_LOOK, false)).toBe(false)
    expect(isLocked('style', 'headline', PARTNER_LOOK, false)).toBe(true)
    expect(isLocked('style', 'feature', POST_LOOK, false)).toBe(true)
    expect(isLocked('tone', 'ghost', PARTNER_LOOK, false)).toBe(false)
    expect(isLocked('tone', 'yellow', PARTNER_LOOK, false)).toBe(true)
    expect(isLocked('tone', 'none', PARTNER_LOOK, false)).toBe(true)
    // A post saved as a headline opens as a Partner post in the Feature look, words kept.
    expect(applyLocks({ ...defaults, headline: 'Kept' }, PARTNER_LOOK, false)).toMatchObject({ ...PARTNER_LOOK.treatment, style: 'feature', headline: 'Kept' })
  })

  it('switches off the narrow column, and moves covers saved in it to the medium one', () => {
    expect(isBarred('column', 'narrow', false)).toBe(true)
    expect(isBarred('column', 'medium', false)).toBe(false)
    expect(isBarred('column', 'wide', false)).toBe(false)
    expect(isBarred('column', 'narrow', true)).toBe(false)
    for (const look of [POST_LOOK, ...Object.values(VIDEO_LOOKS)]) {
      expect(look.treatment.column).toBe('medium')
      expect(applyLocks({ ...defaults, style: look.style, column: 'narrow' }, look, false).column).toBe('medium')
      // A wider column that was chosen is kept.
      expect(applyLocks({ ...defaults, style: look.style, column: 'wide' }, look, false).column).toBe('wide')
    }
    expect(applyLocks({ ...defaults, column: 'narrow' }, POST_LOOK, true).column).toBe('narrow')
  })

  it('leaves everything alone when unlocked', () => {
    const saved: GeneratorSettings = { ...defaults, style: 'feature', tone: 'dark', align: 'center' }
    expect(applyLocks(saved, POST_LOOK, true)).toBe(saved)
    expect(isLocked('style', 'feature', POST_LOOK, true)).toBe(false)
  })
})

describe('cover options', () => {
  it('start as a post with the logo, the swipe arrow and a darkened photo, colours picked automatically', () => {
    expect(coverDefaults).toEqual({ kind: 'post', page: 'cover', video: 'report', logo: 'right', logoColour: 'auto', arrow: true, arrowColour: 'auto', darken: true, eyebrowColour: 'auto', partner: false })
  })

  it('replaces invalid stored values instead of trusting them', () => {
    expect(sanitizeCover({ kind: 'story', page: 'back', video: 'vlog', logo: 'middle', logoColour: 'pink', arrow: 'yes', arrowColour: 7, darken: 0, eyebrowColour: 'green', partner: 'yes' })).toEqual(coverDefaults)
    const chosen = { kind: 'video', page: 'inside', video: 'presenter', logo: 'left', logoColour: 'light', arrow: false, arrowColour: 'dark', darken: false, eyebrowColour: 'yellow', partner: true }
    expect(sanitizeCover(chosen)).toEqual(chosen)
    expect(sanitizeCover({})).toEqual(coverDefaults)
  })
})

describe('line height', () => {
  it('sets lines 0.94 of the type size apart, whatever the letters measure', async () => {
    const { LINE_HEIGHT, lockedLineGap } = await import('./locks')
    const { buildShape } = await import('@ad/tape/geometry')
    expect(LINE_HEIGHT).toBe(0.94)
    const cases = [
      { fontSize: 76, bounds: { ascent: 54, descent: 15 }, style: 'headline' as const },
      { fontSize: 90, bounds: { ascent: 65, descent: 18 }, style: 'headline' as const },
      // Capitals have no descenders, so their letters are shorter: the lines still sit 0.94 apart.
      { fontSize: 88, bounds: { ascent: 62, descent: 2 }, style: 'feature' as const },
    ]
    for (const { fontSize, bounds, style } of cases) {
      const lineGap = lockedLineGap(fontSize, bounds.ascent + bounds.descent)
      const shape = buildShape({ ...defaults, style, fontSize, lineGap }, ['One Line', 'And Another', 'And a Third'], [300, 420, 380], [], bounds)
      const baselines = shape.lines.map((line) => line.baseline)
      expect(baselines[1] - baselines[0]).toBeCloseTo(fontSize * 0.94, 6)
      expect(baselines[2] - baselines[1]).toBeCloseTo(fontSize * 0.94, 6)
    }
  })
})
