// Crops an exported SVG mark (the logo, the swipe arrow) to its artwork and writes it to
// src/assets, where src/furniture.ts reads the viewBox as the mark's size. Design tools export
// marks on a padded frame; the cover places them by their real edges. Paths cut with the even-odd
// rule (letters knocked out of tape, say) are turned to cut the same holes with the default rule,
// which is the only one the covers draw with.
//
// Usage: node scripts/prepare-mark.mjs <exported.svg> <src/assets/name.svg> [decimals]
import { readFileSync, writeFileSync } from 'node:fs'

const [input, output, decimals = '2'] = process.argv.slice(2)
if (!input || !output) {
  console.error('Usage: node scripts/prepare-mark.mjs <exported.svg> <src/assets/name.svg> [decimals]')
  process.exit(1)
}

const source = readFileSync(input, 'utf8')
if (/<(g|use|clipPath|mask)\b|\stransform=/.test(source)) throw new Error('Flatten the mark first: only plain <path> elements are read')
const PARAMETERS = { M: 2, L: 2, H: 1, V: 1, C: 6, Z: 0 }

/** A path as absolute segments. Only the commands design tools write for outlined artwork are read. */
function readPath(d) {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []
  const segments = []
  let at = 0
  while (at < tokens.length) {
    let command = tokens[at]
    at += 1
    if (!(command in PARAMETERS)) throw new Error(`Path command "${command}" is not supported (export with absolute M, L, H, V, C and Z)`)
    do {
      const values = tokens.slice(at, at + PARAMETERS[command]).map(Number)
      if (values.length < PARAMETERS[command] || values.some(Number.isNaN)) throw new Error('Malformed path data')
      at += PARAMETERS[command]
      segments.push({ command, values })
      // Extra coordinate pairs after a move are lines.
      if (command === 'M') command = 'L'
    } while (command !== 'Z' && at < tokens.length && !/^[A-Za-z]$/.test(tokens[at]))
  }
  return segments
}

/** Values of one axis of a cubic curve where it turns around, plus its end. */
function cubicExtremes(p0, p1, p2, p3) {
  const a = -p0 + 3 * p1 - 3 * p2 + p3
  const b = 2 * (p0 - 2 * p1 + p2)
  const c = p1 - p0
  const roots = Math.abs(a) < 1e-9
    ? (Math.abs(b) < 1e-9 ? [] : [-c / b])
    : (b * b - 4 * a * c < 0 ? [] : [(-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a), (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a)])
  return [p3, ...roots.filter((t) => t > 0 && t < 1).map((t) => {
    const u = 1 - t
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
  })]
}

/** A closed shape as its start and its pieces, each to an absolute end: lines and cubic curves. */
function shapesOf(segments) {
  const shapes = []
  let x = 0
  let y = 0
  for (const { command, values } of segments) {
    if (command === 'M') {
      shapes.push({ start: { x: values[0], y: values[1] }, pieces: [] })
      ;[x, y] = values
      continue
    }
    if (!shapes.length) throw new Error('A path must start with a move')
    const { pieces } = shapes.at(-1)
    if (command === 'C') pieces.push({ command, values })
    else if (command === 'L') pieces.push({ command, values })
    else if (command === 'H') pieces.push({ command: 'L', values: [values[0], y] })
    else if (command === 'V') pieces.push({ command: 'L', values: [x, values[0]] })
    if (command !== 'Z') [x, y] = pieces.at(-1).values.slice(-2)
    else [x, y] = [shapes.at(-1).start.x, shapes.at(-1).start.y]
  }
  return shapes
}

/** Points round a shape, close enough to tell which way it runs and what it lies inside. */
function outline({ start, pieces }) {
  const points = [start]
  for (const { command, values } of pieces) {
    const from = points.at(-1)
    if (command === 'L') points.push({ x: values[0], y: values[1] })
    else for (const t of [0.25, 0.5, 0.75, 1]) {
      const u = 1 - t
      points.push({
        x: u * u * u * from.x + 3 * u * u * t * values[0] + 3 * u * t * t * values[2] + t * t * t * values[4],
        y: u * u * u * from.y + 3 * u * u * t * values[1] + 3 * u * t * t * values[3] + t * t * t * values[5],
      })
    }
  }
  return points
}

const areaOf = (points) => points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length]
  return sum + point.x * next.y - next.x * point.y
}, 0) / 2

function inside(point, polygon) {
  let within = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index]
    const b = polygon[previous]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) within = !within
  }
  return within
}

/** The same shape run the other way round. */
function reversed({ start, pieces }) {
  const ends = [start, ...pieces.map(({ values }) => ({ x: values.at(-2), y: values.at(-1) }))]
  return {
    start: ends.at(-1),
    pieces: pieces.map((piece, index) => {
      const to = ends[index]
      return piece.command === 'C'
        ? { command: 'C', values: [piece.values[2], piece.values[3], piece.values[0], piece.values[1], to.x, to.y] }
        : { command: 'L', values: [to.x, to.y] }
    }).reverse(),
  }
}

/**
 * An even-odd path as one that cuts the same holes with the default rule: each shape inside
 * another runs the other way round from it, so the shapes inside an odd number of others are
 * holes and the rest are filled, as before. The shapes are taken as nested, not crossing.
 */
function withDefaultRule(segments) {
  const shapes = shapesOf(segments).map((shape) => ({ shape, points: outline(shape) }))
  for (const entry of shapes) {
    entry.within = shapes.filter((other) => other !== entry && inside(entry.points[0], other.points))
    entry.sign = Math.sign(areaOf(entry.points))
  }
  const byDepth = [...shapes].sort((a, b) => a.within.length - b.within.length)
  for (const entry of byDepth) {
    const parent = entry.within.reduce((closest, other) => (!closest || other.within.length > closest.within.length ? other : closest), null)
    if (parent && entry.sign === parent.sign) {
      entry.shape = reversed(entry.shape)
      entry.sign = -entry.sign
    }
  }
  return shapes.flatMap(({ shape }) => [{ command: 'M', values: [shape.start.x, shape.start.y] }, ...shape.pieces, { command: 'Z', values: [] }])
}

const paths = [...source.matchAll(/<path\b([^>]*)>/g)].map(([, attributes]) => {
  const d = /\sd="([^"]+)"/.exec(attributes)?.[1]
  if (!d) throw new Error('A <path> without path data')
  const rule = /\sfill-rule="([^"]+)"/.exec(attributes)?.[1] ?? 'nonzero'
  if (rule !== 'nonzero' && rule !== 'evenodd') throw new Error(`Fill rule "${rule}" is not supported`)
  return rule === 'evenodd' ? withDefaultRule(readPath(d)) : readPath(d)
})
if (!paths.length) throw new Error('No <path> found')

const xs = []
const ys = []
for (const segments of paths) {
  let x = 0
  let y = 0
  let start = { x: 0, y: 0 }
  for (const { command, values } of segments) {
    if (command === 'C') {
      xs.push(...cubicExtremes(x, values[0], values[2], values[4]))
      ys.push(...cubicExtremes(y, values[1], values[3], values[5]))
      x = values[4]
      y = values[5]
    } else if (command === 'Z') {
      x = start.x
      y = start.y
    } else {
      if (command === 'H') x = values[0]
      else if (command === 'V') y = values[0]
      else [x, y] = values
      if (command === 'M') start = { x, y }
      xs.push(x)
      ys.push(y)
    }
  }
}

const left = Math.min(...xs)
const top = Math.min(...ys)
const factor = 10 ** Number(decimals)
const number = (value) => String(Math.round(value * factor) / factor)
const width = number(Math.max(...xs) - left)
const height = number(Math.max(...ys) - top)
const fill = /fill="(#[0-9a-fA-F]{3,8})"/.exec(source)?.[1] ?? '#000'

const body = paths.map((segments) => {
  const d = segments.map(({ command, values }) => {
    if (command === 'H') return `H${number(values[0] - left)}`
    if (command === 'V') return `V${number(values[0] - top)}`
    return command + values.map((value, index) => number(value - (index % 2 ? top : left))).join(' ')
  }).join('')
  return `<path d="${d}" fill="${fill}"/>`
}).join('\n')

writeFileSync(output, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n${body}\n</svg>\n`)
console.log(`Wrote ${output}: ${paths.length} path${paths.length === 1 ? '' : 's'}, ${width} × ${height}, cropped from ${number(left)},${number(top)}`)
