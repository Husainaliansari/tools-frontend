/**
 * Shared types for the interactive Sign editor.
 *
 * Elements live in PDF points with a top-left origin (the same space the
 * Redact editor uses), so mapping to/from the on-screen pdf.js canvas is a
 * plain scale. At apply time every page's elements are flattened into one
 * transparent PNG overlay that the existing backend sign endpoint stamps
 * onto the page — see sign-compose.ts.
 */

export type SignElementType = 'signature' | 'initials' | 'image' | 'text' | 'date' | 'stamp'

export interface SignElement {
  id: string
  type: SignElementType
  /** 1-based page number. */
  page: number
  /** Top-left corner in PDF points. */
  x: number
  y: number
  /** Box size in PDF points. */
  width: number
  height: number
  /** Rotation in degrees, clockwise about the box center. */
  rotation: number
  /** 0.2–1. */
  opacity: number
  /** Data-URL bitmap — signature / initials / image elements. */
  src?: string
  /** Natural bitmap size, keeps resizes proportional. */
  naturalWidth?: number
  naturalHeight?: number
  /** Text content — text / date / stamp elements. */
  text?: string
  /** CSS font-family stack — text / date elements. */
  font?: string
  /** Font size in PDF points — text / date / stamp elements. */
  fontSize?: number
  /** #rrggbb — text / date / stamp elements. */
  color?: string
  bold?: boolean
  italic?: boolean
  /** Key into DATE_FORMATS — date elements. */
  dateFormat?: string
}

/** True for elements backed by a bitmap (vs. text drawn at compose time). */
export function isImageElement(element: SignElement): boolean {
  return element.type === 'signature' || element.type === 'initials' || element.type === 'image'
}

// ─── Fonts ────────────────────────────────────────────────────────────────────

export interface SignFontOption {
  label: string
  /** CSS font-family stack (also valid for canvas 2D `font`). */
  family: string
}

/** Handwriting-style stacks for typed signatures (system fonts only). */
export const SIGNATURE_FONTS: SignFontOption[] = [
  { label: 'Elegant', family: "'Segoe Script', 'Savoye LET', cursive" },
  { label: 'Classic', family: "'Edwardian Script ITC', 'Snell Roundhand', cursive" },
  { label: 'Casual', family: "'Bradley Hand ITC', 'Bradley Hand', 'Comic Sans MS', cursive" },
  { label: 'Bold ink', family: "'Brush Script MT', 'Brush Script Std', cursive" },
]

/** Standard stacks for text and date annotations. */
export const TEXT_FONTS: SignFontOption[] = [
  { label: 'Sans', family: 'Helvetica, Arial, sans-serif' },
  { label: 'Serif', family: "Georgia, 'Times New Roman', serif" },
  { label: 'Mono', family: "'Courier New', monospace" },
  { label: 'Script', family: "'Segoe Script', cursive" },
]

// ─── Ink colors (draw pad + text) ────────────────────────────────────────────

export const INK_COLORS = [
  { label: 'Black', value: '#1f2430' },
  { label: 'Blue', value: '#1d4ed8' },
  { label: 'Red', value: '#b91c1c' },
  { label: 'Green', value: '#15803d' },
] as const

// ─── Date formats ─────────────────────────────────────────────────────────────

export const DATE_FORMATS: { key: string; label: string }[] = [
  { key: 'long', label: 'Jul 18, 2026' },
  { key: 'us', label: '07/18/2026' },
  { key: 'eu', label: '18/07/2026' },
  { key: 'iso', label: '2026-07-18' },
]

export function formatSignDate(key: string, date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  switch (key) {
    case 'us':
      return `${month}/${day}/${year}`
    case 'eu':
      return `${day}/${month}/${year}`
    case 'iso':
      return `${year}-${month}-${day}`
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}

// ─── Stamp presets ────────────────────────────────────────────────────────────

export interface StampPreset {
  text: string
  color: string
}

export const STAMP_PRESETS: StampPreset[] = [
  { text: 'APPROVED', color: '#15803d' },
  { text: 'REVIEWED', color: '#1d4ed8' },
  { text: 'CONFIDENTIAL', color: '#b91c1c' },
  { text: 'DRAFT', color: '#64748b' },
  { text: 'FINAL', color: '#7c3aed' },
  { text: 'PAID', color: '#0e7490' },
]

// ─── Text metrics ─────────────────────────────────────────────────────────────

let measureContext: CanvasRenderingContext2D | null = null

/** Canvas 2D `font` string for a text-like element. */
export function elementFontString(element: SignElement, fontSize = element.fontSize ?? 16): string {
  const family = element.type === 'stamp' ? 'Arial, sans-serif' : (element.font ?? TEXT_FONTS[0].family)
  const weight = element.type === 'stamp' || element.bold ? '700' : '400'
  const style = element.italic ? 'italic' : 'normal'
  return `${style} ${weight} ${fontSize}px ${family}`
}

/** Padding (in points) around a stamp's text inside its border box. */
export const STAMP_PAD_X = 0.9
export const STAMP_PAD_Y = 0.42

/** Natural box (in points) of a text-like element at its current font size. */
export function measureTextElement(element: SignElement): { width: number; height: number } {
  const fontSize = element.fontSize ?? 16
  if (!measureContext) {
    measureContext = document.createElement('canvas').getContext('2d')
  }
  let textWidth = fontSize * 0.6 * (element.text?.length ?? 1)
  if (measureContext) {
    measureContext.font = elementFontString(element)
    textWidth = measureContext.measureText(element.text || ' ').width
  }
  if (element.type === 'stamp') {
    return {
      width: textWidth + fontSize * STAMP_PAD_X * 2,
      height: fontSize + fontSize * STAMP_PAD_Y * 2,
    }
  }
  return { width: Math.max(textWidth, fontSize * 0.5), height: fontSize * 1.35 }
}

// ─── Ids ──────────────────────────────────────────────────────────────────────

let elementCounter = 0

/** Unique-enough id for an element within one editing session. */
export function nextElementId(): string {
  elementCounter += 1
  return `el-${Date.now().toString(36)}-${elementCounter}`
}
