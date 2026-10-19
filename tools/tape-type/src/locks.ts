import type { Look } from './formats'
import type { GeneratorSettings } from '@ad/tape/types'
import { AD_TYPE } from '@ad/tape/adTokens'

/**
 * The text block's choices that are held to the cover's look for now (a post's is black words on
 * a light block of tape, left aligned; each kind of video has its own; a Partner post's is the
 * Feature style). Every other value of these stays on the page, greyed out, so people can see
 * what is coming. To open one up again, take it off this list. A look can leave some values of a
 * held setting open beside its own (`look.tapes`, since 18 October 2026: a post may go without
 * tape, a video may take any house tape). The line height is held too (LINE_HEIGHT), and BARRED
 * switches off single choices, such as the narrow column. Beyond the text block only one thing
 * is held, in App: the arrow takes the logo's colour. Photo, logo and the logo's colour are free.
 */
export const HELD = ['style', 'tone', 'perLine', 'align', 'coverFormat', 'hugStrength', 'rotationVariance', 'lineGap', 'stagger', 'gapVariance'] as const
export type HeldSetting = (typeof HELD)[number]

/** Single choices that are switched off for now, whatever is being made. The others of each stay open. */
export const BARRED = { column: ['narrow'] } as const satisfies { [K in keyof GeneratorSettings]?: readonly GeneratorSettings[K][] }
export type BarredSetting = keyof typeof BARRED

export const isBarred = <K extends BarredSetting>(setting: K, value: GeneratorSettings[K], open = unlocked()) =>
  !open && (BARRED[setting] as readonly unknown[]).includes(value)

/** Lines are set this far apart, baseline to baseline, as a share of the type size. */
export const LINE_HEIGHT = AD_TYPE.coverHeadline.lineHeight

/**
 * The line gap that sets lines LINE_HEIGHT apart. The engine spaces lines by the height of the
 * letters plus a gap, so the gap is whatever is left of the line height.
 */
export const lockedLineGap = (fontSize: number, letterHeight: number, lineHeight = LINE_HEIGHT) => fontSize * lineHeight - letterHeight

/** Opening the tool with ?unlocked in the address lifts every lock. */
export const unlocked = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('unlocked')

/**
 * Opening it with ?tune opens only Fine-tune (cling, line gap, turns, stagger), every other lock
 * kept, for finding a look's values by eye (19 October 2026). They go back to the look's on reload.
 */
export const tuning = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('tune')

const lookValue = <K extends HeldSetting>(look: Look, setting: K) =>
  (setting === 'style' ? look.style : setting === 'coverFormat' ? look.coverFormat : look.treatment[setting as 'tone' | 'perLine' | 'align' | 'hugStrength' | 'rotationVariance' | 'lineGap' | 'stagger' | 'gapVariance']) as GeneratorSettings[K]

/** The values of a held setting the look leaves open beside its own: the tapes it allows, and any other alignments. */
const openTo = (look: Look, setting: HeldSetting): readonly unknown[] => (setting === 'tone' ? look.tapes : setting === 'align' ? look.aligns ?? [] : [])

export const isLocked = <K extends HeldSetting>(setting: K, value: GeneratorSettings[K], look: Look, open = unlocked()) =>
  !open && value !== lookValue(look, setting) && !openTo(look, setting).includes(value)

/** Settings saved before the locks went on, or under another look, are put back to this one. */
export function applyLocks(settings: GeneratorSettings, look: Look, open = unlocked()): GeneratorSettings {
  if (open) return settings
  // A different style takes its whole treatment (strips, centring, torn ends) with it.
  let next = settings.style === look.style ? settings : { ...settings, ...look.treatment, style: look.style }
  for (const setting of HELD) {
    if (isLocked(setting, next[setting], look, open)) next = { ...next, [setting]: lookValue(look, setting) }
  }
  for (const setting of Object.keys(BARRED) as BarredSetting[]) {
    if (isBarred(setting, next[setting], open)) next = { ...next, [setting]: look.treatment[setting] }
  }
  // The type size is the fit's (19 October 2026): a chosen size is a design session's.
  if (!next.autoSize) next = { ...next, autoSize: true }
  return next
}

// v3: the Feature style, so Partner posts, took the Rough cut (19 October 2026); v2: videos took
// the Tape cut (30 September 2026).
export const HOUSE_CUT_KEY = 'tape-type-house-cut-v3'

/**
 * Whether the tool is opening for the first time since the house cut changed. The cut is a free
 * choice, so a new house cut would never reach a browser that had already remembered one: on
 * that first opening the cover takes the look's cut, and after it the choice is the person's
 * again. Asking marks the opening, so it is asked once per page. For the next change of house
 * cut, count the key up.
 */
export function firstSinceHouseCut(storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage) {
  try {
    if (!storage || storage.getItem(HOUSE_CUT_KEY)) return false
    storage.setItem(HOUSE_CUT_KEY, 'seen')
    return true
  } catch {
    return false
  }
}

/** The settings with the look's cut, on a first opening. */
export const withHouseCut = (settings: GeneratorSettings, look: Look, first: boolean): GeneratorSettings =>
  (first ? { ...settings, mode: look.treatment.mode } : settings)

/**
 * What every cover starts with each time the tool opens, whatever was picked last time, which
 * lasts until then and not into the next cover: the look's column, the medium one (Shaun,
 * 1 October 2026), and its alignment (a Partner post starts left, though it may be centred), with
 * the tag switched off, its words waiting in the box, to go on only where it says something
 * (Shaun, 19 October 2026: tags were going on everything).
 */
export const withLookStart = (settings: GeneratorSettings, look: Look): GeneratorSettings =>
  ({ ...settings, column: look.treatment.column, align: look.treatment.align, eyebrowEnabled: false })
