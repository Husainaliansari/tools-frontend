/**
 * Editor domain types — framework-agnostic.
 *
 * Every annotation's geometry is stored in **PDF points with a top-left
 * origin** at scale 1 (the same space the Redact tool uses). The overlay
 * multiplies by the current zoom to paint; the exporter maps back into each
 * page's native (possibly rotated) coordinate space when baking annotations
 * into the file.
 */

/** Interactive tools surfaced in the ribbon. `select` is the idle pointer. */
export type ToolId =
  | 'select'
  | 'hand'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'squiggly'
  | 'ink'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'whiteout'
  | 'note'
  | 'image'
  | 'stamp'
  | 'link'
  | 'table'
  | 'field-text'
  | 'field-checkbox'
  | 'field-radio'
  | 'field-dropdown'

/** Tools that produce a rectangle by click-dragging a bounding box. */
export const BOX_TOOLS: ToolId[] = [
  'highlight',
  'underline',
  'strikethrough',
  'squiggly',
  'rect',
  'ellipse',
  'arrow',
  'line',
  'text',
  'whiteout',
  'link',
  'field-text',
  'field-checkbox',
  'field-radio',
  'field-dropdown',
]

/** Tools that place an object with a single click (no drag box). */
export const CLICK_TOOLS: ToolId[] = ['note', 'image', 'stamp']

// ─── Annotation model ─────────────────────────────────────────────────────────

export interface BaseAnnotation {
  id: string
  /** 1-based page index. */
  page: number
  type: ToolId
  locked?: boolean
  groupId?: string
}

/** A rectangle in PDF points, top-left origin. */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Highlight / underline / strikethrough / squiggly — a text-markup box. */
export interface MarkupAnnotation extends BaseAnnotation, Box {
  type: 'highlight' | 'underline' | 'strikethrough' | 'squiggly'
  color: string
  opacity: number
}

/** Freehand ink — a polyline in PDF points, top-left origin. */
export interface InkAnnotation extends BaseAnnotation {
  type: 'ink'
  points: { x: number; y: number }[]
  color: string
  size: number
  opacity: number
}

/** Vector shapes drawn from a bounding box. */
export interface ShapeAnnotation extends BaseAnnotation, Box {
  type: 'rect' | 'ellipse' | 'arrow' | 'line'
  stroke: string
  strokeWidth: number
  /** Fill colour for rect/ellipse; `null` = no fill. */
  fill: string | null
  opacity: number
}

/** A free-text box. */
export interface TextAnnotation extends BaseAnnotation, Box {
  type: 'text'
  text: string
  fontSize: number
  fontFamily?: string
  color: string
  align: 'left' | 'center' | 'right' | 'justify'
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  fontWeight?: number
  fontStyle?: 'normal' | 'italic' | 'oblique'
  highlightColor?: string | null
  superscript?: boolean
  subscript?: boolean
  verticalAlign?: 'top' | 'middle' | 'bottom'
  lineHeight?: number
  letterSpacing?: number
  wordSpacing?: number
  paragraphSpacing?: number
  paragraphSpacingBefore?: number
  paragraphSpacingAfter?: number
  bulletStyle?: 'none' | 'disc' | 'decimal'
  indentLevel?: number
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  opacity?: number
}

/** Opaque white rectangle that hides content beneath it (whiteout). */
export interface WhiteoutAnnotation extends BaseAnnotation, Box {
  type: 'whiteout'
}

/** A sticky note anchored at a point, with a popup comment. */
export interface NoteAnnotation extends BaseAnnotation {
  type: 'note'
  x: number
  y: number
  text: string
  color: string
}

/** A placed bitmap — inserted image, pasted signature or initials. */
export interface ImageAnnotation extends BaseAnnotation, Box {
  type: 'image'
  /** PNG/JPEG data URL. */
  src: string
  opacity: number
  /** Rotation in degrees, clockwise on screen. */
  rotation: number
}

/** A rubber stamp — bordered uppercase label (APPROVED, DRAFT…). */
export interface StampAnnotation extends BaseAnnotation, Box {
  type: 'stamp'
  label: string
  color: string
}

/** A clickable hyperlink region, exported as a real /Link annotation. */
export interface LinkAnnotation extends BaseAnnotation, Box {
  type: 'link'
  url: string
}

/** An interactive form field, exported through pdf-lib's AcroForm API. */
export interface FieldAnnotation extends BaseAnnotation, Box {
  type: 'field-text' | 'field-checkbox' | 'field-radio' | 'field-dropdown'
  /** Field name — radio buttons sharing a name form one group. */
  name: string
  /** Dropdown choices / the radio option's export value. */
  options: string[]
  /** Default value (text fields) or selected option. */
  value: string
}

export type Annotation =
  | MarkupAnnotation
  | InkAnnotation
  | ShapeAnnotation
  | TextAnnotation
  | WhiteoutAnnotation
  | NoteAnnotation
  | ImageAnnotation
  | StampAnnotation
  | LinkAnnotation
  | FieldAnnotation

/** Annotations carrying a resizable bounding box (everything but ink & note). */
export type BoxedAnnotation = Exclude<Annotation, InkAnnotation | NoteAnnotation>

export function isBoxed(a: Annotation): a is BoxedAnnotation {
  return a.type !== 'ink' && a.type !== 'note'
}

/** The bounding box of any annotation (ink/note included). */
export function boundsOf(a: Annotation): Box {
  if (a.type === 'ink') {
    const xs = a.points.map((p) => p.x)
    const ys = a.points.map((p) => p.y)
    const x = Math.min(...xs)
    const y = Math.min(...ys)
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
  }
  if (a.type === 'note') return { x: a.x, y: a.y, w: 24, h: 24 }
  return { x: a.x, y: a.y, w: a.w, h: a.h }
}

/** Default style applied to newly created annotations, keyed loosely by tool. */
export interface ToolStyle {
  color: string
  strokeWidth: number
  opacity: number
  fill: string | null
  fontSize: number
  fontFamily?: string
  lineHeight?: number
  letterSpacing?: number
  paragraphSpacing?: number
}

export const DEFAULT_STYLE: ToolStyle = {
  color: '#f59e0b',
  strokeWidth: 2,
  opacity: 1,
  fill: null,
  fontSize: 16,
  fontFamily: 'Calibri',
  lineHeight: 1.25,
  letterSpacing: 0,
  paragraphSpacing: 0,
}

/** Preset rubber stamps (Foxit/Acrobat-style dynamic stamps, minus the date). */
export const STAMP_PRESETS: { label: string; color: string }[] = [
  { label: 'APPROVED', color: '#16a34a' },
  { label: 'REJECTED', color: '#dc2626' },
  { label: 'DRAFT', color: '#2563eb' },
  { label: 'FINAL', color: '#16a34a' },
  { label: 'CONFIDENTIAL', color: '#dc2626' },
  { label: 'REVIEWED', color: '#7c3aed' },
  { label: 'SIGN HERE', color: '#ea580c' },
  { label: 'VOID', color: '#dc2626' },
]

// ─── Content editing (editing the PDF's own objects) ──────────────────────────
/*
 * Editing existing content is done by *covering* the original region and
 * redrawing the new object over it (see lib/pdf/export.ts). Each edit records
 * the original bounding box (`orig`) to cover and a sampled background colour
 * (`bg`) so the cover blends into solid-fill pages.
 */

export interface ContentEditBase extends Box {
  id: string
  page: number
  /** Original region to paint over on export (the object's detected box). */
  orig: Box
  /** Rotation in degrees, clockwise. */
  rotation: number
  /** Sampled page background behind the original object. */
  bg: string
  /** Removed from the document (cover only, no redraw). */
  deleted?: boolean
  locked?: boolean
  groupId?: string
  opacity?: number
}

/** An edit to a run of existing (or replacement) text. */
export interface TextContentEdit extends ContentEditBase {
  kind: 'text'
  text: string
  fontSize: number
  fontFamily: string
  loadedFontFamily?: string
  originalFontName?: string
  embeddedFont?: boolean
  color: string
  align: 'left' | 'center' | 'right' | 'justify'
  bold: boolean
  italic: boolean
  underline?: boolean
  strikethrough?: boolean
  fontWeight?: number
  fontStyle?: 'normal' | 'italic' | 'oblique'
  highlightColor?: string | null
  superscript?: boolean
  subscript?: boolean
  verticalAlign?: 'top' | 'middle' | 'bottom'
  lineHeight?: number
  letterSpacing?: number
  wordSpacing?: number
  paragraphSpacing?: number
  paragraphSpacingBefore?: number
  paragraphSpacingAfter?: number
  bulletStyle?: 'none' | 'disc' | 'decimal'
  indentLevel?: number
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  /** Font ascent/descent as fractions of the em (from detection), for baseline reconstruction on export. */
  fontAscent?: number
  fontDescent?: number
}

/** A lifted bitmap region — a detected image or any marquee'd area. */
export interface RegionContentEdit extends ContentEditBase {
  kind: 'region'
  /** PNG data URL of the lifted pixels, redrawn at the new geometry. */
  image: string
}

export type ContentEdit = TextContentEdit | RegionContentEdit


/** @deprecated The editor now uses a single unified workspace — no modes. */
