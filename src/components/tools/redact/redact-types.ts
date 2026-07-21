/**
 * Shared types for the interactive Redact editor.
 *
 * Regions are stored in PDF points with a top-left origin — the exact
 * coordinate space the backend's area redaction expects — so a region only
 * needs scaling (never flipping) to map to/from the on-screen canvas.
 */

/** Cover style painted where content is permanently removed. */
export type RedactionMode = 'black' | 'white' | 'color' | 'blur' | 'pixelate'

export interface RedactionRegion {
  id: string
  /** 1-based page number. */
  page: number
  /** Rectangle in PDF points, top-left origin; x1 > x0 and y1 > y0. */
  x0: number
  y0: number
  x1: number
  y1: number
  mode: RedactionMode
  /** #rrggbb fill — used by the 'color' mode. */
  color: string
  /** Fill opacity 0.05–1 — used by the 'color' mode. */
  opacity: number
}

export const REDACTION_MODES: readonly RedactionMode[] = [
  'black',
  'white',
  'color',
  'blur',
  'pixelate',
]

export const MODE_LABELS: Record<RedactionMode, string> = {
  black: 'Black',
  white: 'White',
  color: 'Color',
  blur: 'Blur',
  pixelate: 'Pixelate',
}

/** One-line explanation per mode, shown in the style bar. */
export const MODE_HINTS: Record<RedactionMode, string> = {
  black: 'Content is permanently removed and covered with a solid black box.',
  white: 'Content is permanently removed and the area is left blank (white).',
  color: 'Content is permanently removed and the area is filled with your color.',
  blur: 'Content is permanently removed; only an unreadable blurred image remains.',
  pixelate: 'Content is permanently removed; only a coarse pixel mosaic remains.',
}

/** Map editor regions to the backend's `areas` option payload. */
export function toBackendAreas(regions: RedactionRegion[]): Record<string, unknown>[] {
  return regions.map((region) => ({
    page: region.page,
    x0: round2(region.x0),
    y0: round2(region.y0),
    x1: round2(region.x1),
    y1: round2(region.y1),
    mode: region.mode,
    color: region.color,
    opacity: region.mode === 'color' ? region.opacity : 1,
  }))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

let regionCounter = 0

/** Unique-enough id for a region within one editing session. */
export function nextRegionId(): string {
  regionCounter += 1
  return `region-${Date.now().toString(36)}-${regionCounter}`
}
