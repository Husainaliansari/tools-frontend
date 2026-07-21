/**
 * Shared shape of the watermark editor state consumed by the live preview.
 * Mirrors the backend WatermarkOptions semantics (pt/mm units, CCW rotation).
 */
export type WatermarkMode = 'text' | 'image'
export type WatermarkAlign = 'left' | 'center' | 'right'
export type WatermarkFontFamily = 'helvetica' | 'times' | 'courier'
export type WatermarkLayer = 'above' | 'below'

export interface WatermarkPreviewState {
  mode: WatermarkMode
  text: string
  fontFamily: WatermarkFontFamily
  bold: boolean
  italic: boolean
  underline: boolean
  /** Font size in PDF points. */
  fontSize: number
  align: WatermarkAlign
  /** Extra glyph spacing in PDF points. */
  letterSpacing: number
  /** Line-height multiplier for multi-line text. */
  lineHeight: number
  color: string
  /** 0–1. */
  opacity: number
  /** Degrees, counter-clockwise (PDF convention). */
  rotation: number
  position: string
  offsetXmm: number
  offsetYmm: number
  marginMm: number
  tile: boolean
  /** Image mode: fraction of the page's short side (aspect kept). */
  scale: number
  keepAspect: boolean
  /** Image mode, aspect unlocked: fractions of page width/height. */
  scaleX: number
  scaleY: number
  layer: WatermarkLayer
}

/** CSS font stacks matching the backend's reportlab base-14 families. */
export const FONT_STACKS: Record<WatermarkFontFamily, string> = {
  helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
}
