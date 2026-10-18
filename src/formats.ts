import { BRAND, type Position } from './artwork'
import type { ColourChoice } from './furniture'
import { POST_FRAME, SAFE_MARGIN, stylePresets, type Frame, type Treatment } from './settings'
import type { CoverFormat, CoverStyle, TapeTone } from './types'

export type CoverKind = 'post' | 'video'
export type VideoType = 'report' | 'presenter' | 'feature'

/**
 * What the profile grid keeps of a video cover. Tiles are 3:4 and show the middle of the 9:16
 * cover, so the top and bottom 240px are cut off there.
 */
export const GRID_CROP = { top: 240, bottom: 1680 }

/**
 * A video cover is 1080 × 1920. Its lettering stays inside what the grid shows; the logo and the
 * arrow sit in the corners of the whole cover.
 */
export const VIDEO_FRAME: Frame = {
  width: 1080,
  height: 1920,
  safe: { left: SAFE_MARGIN, top: GRID_CROP.top + SAFE_MARGIN, right: 1080 - SAFE_MARGIN, bottom: GRID_CROP.bottom - SAFE_MARGIN },
}

/** How one kind of cover sets its text block: the choices it is held to for now. */
export interface Look {
  label: string
  description: string
  style: CoverStyle
  coverFormat: CoverFormat
  treatment: Treatment
  /**
   * The tapes open to the team (18 October 2026): the look's own, or Ghost, the dark tape seen
   * through, the same on every photo. Never a free colour, and never another look's tape, since
   * the grid reads by them: light is the posts', yellow the video covers'. The lettering follows
   * the tape.
   */
  tapes: readonly TapeTone[]
  /** The tag's colours, where it isn't the usual yellow one. */
  tag?: { tape: string; text: string }
  /** The tag a cover of this kind starts with, or null for none. */
  eyebrow: string | null
  /** Where the text block starts out, across the room lettering has. */
  position: Position
}

// The narrow column is switched off for now, so every look starts in the medium one.
const house: Treatment = { ...stylePresets.headline, column: 'medium' }
// Videos start in the Tape cut, its pointed ends (Shaun, 30 September 2026).
const videoHouse: Treatment = { ...house, mode: 'tape' }
/** A look's tapes: its own, or Ghost. */
const withGhost = (tone: TapeTone): readonly TapeTone[] => [tone, 'ghost']

/**
 * Posts: black words on a light block of tape, rough cut, left aligned. The block starts low, 90%
 * of the way down the room its lettering has, where Shaun had been putting it by hand and where it
 * suits most photos (30 September 2026).
 */
export const POST_LOOK: Look = {
  label: 'Post',
  description: 'Light tape · black words',
  style: 'headline',
  coverFormat: 'regular',
  treatment: { ...house, mode: 'rough' },
  tapes: withGhost('light'),
  eyebrow: 'Breaking',
  position: { x: 0, y: 90 },
}

/**
 * Partner posts (18 October 2026): the Feature style, capitals on stacked torn strips, centred
 * and slightly turned, for partnerships and special posts only, so they stand apart in a grid of
 * posts. Behind the Partner post switch, off to start with, and it suggests a PARTNER tag.
 */
export const PARTNER_LOOK: Look = {
  label: 'Partner post',
  description: 'Capitals · torn strips',
  style: 'feature',
  coverFormat: 'regular',
  treatment: stylePresets.feature,
  tapes: withGhost('light'),
  eyebrow: 'Partner',
  position: { x: 50, y: 50 },
}

/** The three kinds of video, as on the cover mock-ups. */
export const VIDEO_LOOKS: Record<VideoType, Look> = {
  report: {
    label: 'Quick report',
    description: 'Yellow tape · bottom left',
    style: 'headline',
    coverFormat: 'regular',
    treatment: { ...videoHouse, tone: 'yellow' },
    tapes: withGhost('yellow'),
    tag: { tape: BRAND.dark, text: BRAND.light },
    eyebrow: 'Quick watch',
    position: { x: 0, y: 100 },
  },
  presenter: {
    label: 'Presenter led',
    description: 'Dark tape · top left',
    style: 'headline',
    coverFormat: 'regular',
    treatment: { ...videoHouse, tone: 'dark' },
    tapes: withGhost('dark'),
    tag: { tape: BRAND.light, text: BRAND.dark },
    eyebrow: 'Quick guide',
    position: { x: 0, y: 0 },
  },
  feature: {
    label: 'Feature video',
    description: 'Capitals · light tape',
    style: 'feature',
    coverFormat: 'regular',
    treatment: videoHouse,
    tapes: withGhost('light'),
    eyebrow: null,
    position: { x: 0, y: 50 },
  },
}

/** The eyebrow tag in each brand colour, with lettering that reads on it. */
export const TAGS: Record<Exclude<ColourChoice, 'auto'>, { tape: string; text: string }> = {
  yellow: { tape: BRAND.yellow, text: BRAND.dark },
  light: { tape: BRAND.light, text: BRAND.dark },
  dark: { tape: BRAND.dark, text: BRAND.light },
}

/**
 * The tag's colours: the chosen ones; or the look's own, on the look's own tape; or undefined
 * for the usual tag, yellow, which turns light on yellow tape. On Ghost tape (or none) every tag
 * is the usual one: a dark tag would be lost on the dark seen through, and yellow reads.
 */
export function tagFor(choice: ColourChoice, look: Look, tone: TapeTone = look.treatment.tone) {
  if (choice !== 'auto') return TAGS[choice]
  return tone === look.treatment.tone ? look.tag : undefined
}

export const VIDEO_TYPES = Object.keys(VIDEO_LOOKS) as VideoType[]
export const frameFor = (kind: CoverKind) => (kind === 'video' ? VIDEO_FRAME : POST_FRAME)
/** The look of what is being made: a kind of video, a Partner post, or a post. */
export const lookFor = (kind: CoverKind, video: VideoType, partner = false) => (kind === 'video' ? VIDEO_LOOKS[video] : partner ? PARTNER_LOOK : POST_LOOK)
