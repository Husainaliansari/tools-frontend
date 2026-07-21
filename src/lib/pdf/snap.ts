/**
 * Snapping & alignment guides — pure geometry.
 *
 * Given a box being moved/resized and the static boxes around it (plus the page
 * rectangle), find the nearest edge/centre alignment within a threshold and
 * return the adjusted position together with the guide lines to draw.
 */
import type { Box } from './types'

export interface Guide {
  orientation: 'v' | 'h'
  /** Position in PDF points (x for vertical guides, y for horizontal). */
  pos: number
}

export interface SnapResult {
  x: number
  y: number
  guides: Guide[]
}

/** Candidate lines a box contributes on each axis: near edge, centre, far edge. */
function verticals(b: Box): number[] {
  return [b.x, b.x + b.w / 2, b.x + b.w]
}
function horizontals(b: Box): number[] {
  return [b.y, b.y + b.h / 2, b.y + b.h]
}

/**
 * Snap `moving` (proposed top-left x/y with fixed w/h) against `others` and the
 * `page` box. `threshold` is in PDF points (scale it by 1/zoom at the call site
 * so the pull feels constant on screen).
 */
export function snapBox(
  moving: Box,
  others: Box[],
  page: Box,
  threshold: number,
): SnapResult {
  const targetsV: number[] = [...verticals(page)]
  const targetsH: number[] = [...horizontals(page)]
  for (const o of others) {
    targetsV.push(...verticals(o))
    targetsH.push(...horizontals(o))
  }

  const movingV = verticals(moving) // [left, cx, right]
  const movingH = horizontals(moving) // [top, cy, bottom]

  let bestVX: { delta: number; pos: number } | null = null
  for (const mv of movingV) {
    for (const tv of targetsV) {
      const d = tv - mv
      if (Math.abs(d) <= threshold && (!bestVX || Math.abs(d) < Math.abs(bestVX.delta))) {
        bestVX = { delta: d, pos: tv }
      }
    }
  }
  let bestHY: { delta: number; pos: number } | null = null
  for (const mh of movingH) {
    for (const th of targetsH) {
      const d = th - mh
      if (Math.abs(d) <= threshold && (!bestHY || Math.abs(d) < Math.abs(bestHY.delta))) {
        bestHY = { delta: d, pos: th }
      }
    }
  }

  const guides: Guide[] = []
  let x = moving.x
  let y = moving.y
  if (bestVX) {
    x += bestVX.delta
    guides.push({ orientation: 'v', pos: bestVX.pos })
  }
  if (bestHY) {
    y += bestHY.delta
    guides.push({ orientation: 'h', pos: bestHY.pos })
  }
  return { x, y, guides }
}
