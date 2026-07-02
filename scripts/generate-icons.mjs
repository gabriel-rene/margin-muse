// Generates the PWA icons without any image dependency: draws the mark into
// an RGBA buffer (4x supersampled for smooth edges) and encodes PNG by hand
// with node's zlib. Outputs are committed; rerun with `npm run icons` after
// changing the design.
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Paper tones from lib/paper.ts (cream, the default tone).
const PAPER = [0xf0, 0xea, 0xd8]
const INK = [0x2c, 0x28, 0x26]
const RULE = [0x6f, 0x66, 0x60]
const MUSE = [0x7a, 0x70, 0x68]

const SS = 4 // supersampling factor

function drawIcon(size) {
  const s = size * SS
  const px = new Float64Array(s * s * 3)
  const put = (x, y, rgb) => {
    const i = (y * s + x) * 3
    px[i] = rgb[0]
    px[i + 1] = rgb[1]
    px[i + 2] = rgb[2]
  }

  for (let y = 0; y < s; y += 1) for (let x = 0; x < s; x += 1) put(x, y, PAPER)

  const rect = (x0, y0, x1, y1, rgb) => {
    for (let y = Math.round(y0 * s); y < Math.round(y1 * s); y += 1) {
      for (let x = Math.round(x0 * s); x < Math.round(x1 * s); x += 1) put(x, y, rgb)
    }
  }

  // Six lines of prose, ragged right edge.
  const barH = 0.038
  const tops = [0.2, 0.31, 0.42, 0.53, 0.64, 0.75]
  const rights = [0.58, 0.52, 0.58, 0.46, 0.58, 0.5]
  tops.forEach((top, i) => rect(0.14, top, rights[i], top + barH, INK))

  // The margin rule.
  rect(0.66, 0.14, 0.672, 0.86, RULE)

  // The muse's note in the margin: a dot and two short answering lines.
  const cx = 0.79 * s
  const cy = (tops[1] + barH / 2) * s
  const r = 0.042 * s
  for (let y = Math.ceil(cy - r); y <= Math.floor(cy + r); y += 1) {
    for (let x = Math.ceil(cx - r); x <= Math.floor(cx + r); x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(x, y, MUSE)
    }
  }
  rect(0.73, tops[3], 0.86, tops[3] + barH * 0.7, MUSE)
  rect(0.73, tops[4], 0.82, tops[4] + barH * 0.7, MUSE)

  // Box-downsample SS×SS → final RGBA.
  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r0 = 0
      let g0 = 0
      let b0 = 0
      for (let dy = 0; dy < SS; dy += 1) {
        for (let dx = 0; dx < SS; dx += 1) {
          const i = ((y * SS + dy) * s + x * SS + dx) * 3
          r0 += px[i]
          g0 += px[i + 1]
          b0 += px[i + 2]
        }
      }
      const n = SS * SS
      const o = (y * size + x) * 4
      out[o] = Math.round(r0 / n)
      out[o + 1] = Math.round(g0 / n)
      out[o + 2] = Math.round(b0 / n)
      out[o + 3] = 255
    }
  }
  return out
}

// --- minimal PNG encoder ---
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buf) {
  let c = -1
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const targets = [
  { size: 192, file: 'public/icons/icon-192.png' },
  { size: 512, file: 'public/icons/icon-512.png' },
  { size: 180, file: 'app/apple-icon.png' }, // Next serves + links this automatically
]

for (const { size, file } of targets) {
  const abs = path.join(rootDir, file)
  mkdirSync(path.dirname(abs), { recursive: true })
  writeFileSync(abs, encodePng(drawIcon(size), size))
  console.log(`wrote ${file} (${size}x${size})`)
}
