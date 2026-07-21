/**
 * Colour helpers bridging CSS hex strings and pdf-lib's 0–1 RGB triples.
 */
import { rgb, type RGB } from 'pdf-lib'

/** Parse `#rgb` / `#rrggbb` into a pdf-lib RGB colour (channels 0–1). */
export function hexToRgb(hex: string): RGB {
  let value = hex.replace('#', '').trim()
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const int = Number.parseInt(value, 16)
  if (Number.isNaN(int)) return rgb(0, 0, 0)
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255)
}
