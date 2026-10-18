/**
 * The one icon set for the tools' chrome (19 October 2026): 18px line icons, 1.7 stroke, round caps, drawn
 * in the current colour. Guide Studio drew these first; Tape Type's Lucide icons are the same style and stay
 * where they match. The painted arrow on the exported pages is the family's only drawn mark; these are chrome.
 */
export const ICON_PATHS: Record<string, string> = {
  plus: 'M12 5v14M5 12h14',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
  download: 'M12 4v12m-5-5 5 5 5-5M4 17v3h16v-3',
  undo: 'M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14',
  redo: 'm16 4 5 5-5 5m5-5H11a7 7 0 0 0 0 14',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  arrow: 'm9 5 7 7-7 7',
  'arrow-right': 'M4 12h16m-6-6 6 6-6 6',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  chevron: 'm6 9 6 6 6-6',
  sliders: 'M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6',
  copy: 'M8 8h12v13H8zM16 8V3H3v13h5',
  trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  image: 'M3 3h18v18H3zM3 16l6-6 5 5 3-3 4 4M16 7h.01',
  up: 'm6 14 6-6 6 6',
  down: 'M12 4v12m-5-5 5 5 5-5M4 17v3h16v-3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  file: 'M6 3h8l4 4v14H6zM14 3v5h5M9 12h6m-6 4h6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  photo: 'M4 7h3l2-3h6l2 3h3v12H4zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5',
  external: 'M14 4h6v6M20 4l-9 9M19 14v6H5V6h6',
}

/** An icon as inline SVG, 18px unless `size` says otherwise. */
export const icon = (name: string, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_PATHS[name] || ICON_PATHS.file}"/></svg>`
