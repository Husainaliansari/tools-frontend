/**
 * The heart of the editor: bake overlay annotations into real PDF content.
 *
 * Annotations are authored in **view space** — PDF points with a top-left
 * origin, exactly what pdf.js renders (including the page's `/Rotate`). Every
 * draw call goes through a per-page {@link PageMapper} that re-projects view
 * coordinates into the page's native, unrotated bottom-left space, so edits
 * land correctly on rotated pages too.
 *
 * Interactive objects (hyperlinks, form fields) are written as real PDF
 * annotations/AcroForm fields; everything else is flattened into page content.
 */
import {
  PDFDocument,
  PDFName,
  PDFArray,
  PDFString,
  StandardFonts,
  LineCapStyle,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'
import type { Annotation, Box, ContentEdit, FieldAnnotation, TextContentEdit } from './types'
import { hexToRgb } from './color'

export interface DocumentMetadata {
  title?: string
  author?: string
  subject?: string
  keywords?: string[]
}

export interface ExportOptions {
  metadata?: DocumentMetadata
}

// ─── View-space → page-space mapping ──────────────────────────────────────────

interface Point {
  x: number
  y: number
}

/** Maps top-left view coordinates into a page's unrotated bottom-left space. */
export interface PageMapper {
  /** Page rotation in degrees (0/90/180/270). */
  rotation: number
  point(vx: number, vy: number): Point
  /** Axis-aligned view box → axis-aligned pdf box (lower-left + size). */
  box(b: Box): { x: number; y: number; width: number; height: number }
}

export function mapperFor(page: PDFPage): PageMapper {
  const rotation = ((page.getRotation().angle % 360) + 360) % 360
  const { width: W, height: H } = page.getSize()
  const point = (vx: number, vy: number): Point => {
    switch (rotation) {
      case 90:
        return { x: vy, y: vx }
      case 180:
        return { x: W - vx, y: vy }
      case 270:
        return { x: W - vy, y: H - vx }
      default:
        return { x: vx, y: H - vy }
    }
  }
  const box = (b: Box) => {
    const p1 = point(b.x, b.y)
    const p2 = point(b.x + b.w, b.y + b.h)
    return {
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      width: Math.abs(p2.x - p1.x),
      height: Math.abs(p2.y - p1.y),
    }
  }
  return { rotation, point, box }
}

import { normalizeText } from './content'

// ─── Text helpers ─────────────────────────────────────────────────────────────

function sanitizeCharForFont(font: PDFFont, char: string): string {
  try {
    font.widthOfTextAtSize(char, 10)
    return char
  } catch {
    if (char === '\u2018' || char === '\u2019' || char === '\u201B') return "'"
    if (char === '\u201C' || char === '\u201D' || char === '\u201F') return '"'
    if (char === '\u2013' || char === '\u2014' || char === '\u2212') return '-'
    if (char === '\u2026') return '...'
    if (char === '\u2022' || char === '\u25CF' || char === '\u25A0') return '•'

    const decomposed = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    try {
      font.widthOfTextAtSize(decomposed, 10)
      return decomposed
    } catch {
      if (/\s/.test(char)) return ' '
      return '?'
    }
  }
}

/** Best-effort guard for glyphs the standard WinAnsi fonts can't encode. */
function encodable(font: PDFFont, text: string): string {
  const normalized = normalizeText(text)
  try {
    font.widthOfTextAtSize(normalized, 10)
    return normalized
  } catch {
    let result = ''
    for (const char of normalized) {
      result += sanitizeCharForFont(font, char)
    }
    return result
  }
}

/** Wrap `text` to `maxWidth` points, honouring explicit newlines. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = []
  for (const paragraph of encodable(font, text).split('\n')) {
    const words = paragraph.split(/(\s+)/)
    let line = ''
    for (const word of words) {
      const candidate = line + word
      if (font.widthOfTextAtSize(candidate.trimEnd(), size) > maxWidth && line.trim()) {
        out.push(line.trimEnd())
        line = word.trimStart()
      } else {
        line = candidate
      }
    }
    out.push(line.trimEnd())
  }
  return out
}

function drawArrowHead(
  page: PDFPage,
  from: Point,
  to: Point,
  color: ReturnType<typeof rgb>,
  thickness: number,
  opacity: number,
): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const len = Math.max(8, thickness * 4)
  const spread = Math.PI / 7
  for (const sign of [1, -1]) {
    const a = angle + Math.PI - sign * spread
    page.drawLine({
      start: to,
      end: { x: to.x + Math.cos(a) * len, y: to.y + Math.sin(a) * len },
      thickness,
      color,
      opacity,
      lineCap: LineCapStyle.Round,
    })
  }
}

function dataUrlToBytes(url: string): Uint8Array {
  const base64 = url.slice(url.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function embedDataUrl(pdf: PDFDocument, url: string) {
  const bytes = dataUrlToBytes(url)
  return url.startsWith('data:image/png') ? pdf.embedPng(bytes) : pdf.embedJpg(bytes)
}

/**
 * Draw a bitmap whose *view-space* box is `b`, rotated `screenDeg` clockwise on
 * screen, onto a page whose own rotation the mapper describes.
 */
function drawImageBox(
  page: PDFPage,
  img: Awaited<ReturnType<PDFDocument['embedPng']>>,
  m: PageMapper,
  b: Box,
  screenDeg: number,
  opacity: number,
): void {
  const total = m.rotation - screenDeg // CCW in pdf space
  const rad = (total * Math.PI) / 180
  const center = m.point(b.x + b.w / 2, b.y + b.h / 2)
  const hw = b.w / 2
  const hh = b.h / 2
  page.drawImage(img, {
    x: center.x - (Math.cos(rad) * hw - Math.sin(rad) * hh),
    y: center.y - (Math.sin(rad) * hw + Math.cos(rad) * hh),
    width: b.w,
    height: b.h,
    rotate: degrees(total),
    opacity,
  })
}

/**
 * Draw wrapped text whose view-space box is `b`. The baseline advances down
 * the view; on rotated pages each baseline origin is re-projected and the
 * glyphs rotated to stay upright in the view.
 */
function drawTextBox(
  page: PDFPage,
  font: PDFFont,
  m: PageMapper,
  b: Box,
  text: string,
  fontSize: number,
  color: ReturnType<typeof rgb>,
  align: 'left' | 'center' | 'right' | 'justify',
  lineFactor: number,
  opacity: number = 1,
): void {
  const lineHeight = fontSize * lineFactor
  const lines = wrapText(text, font, fontSize, Math.max(b.w, fontSize))
  lines.forEach((line, i) => {
    const width = font.widthOfTextAtSize(line, fontSize)
    let vx = b.x
    if (align === 'center') vx += (b.w - width) / 2
    else if (align === 'right') vx += b.w - width
    const origin = m.point(vx, b.y + fontSize * 0.82 + i * lineHeight)
    page.drawText(line, {
      x: origin.x,
      y: origin.y,
      size: fontSize,
      font,
      color,
      opacity,
      rotate: m.rotation ? degrees(m.rotation) : undefined,
    })
  })
}

// ─── Annotation drawing ───────────────────────────────────────────────────────

async function drawAnnotation(
  pdf: PDFDocument,
  page: PDFPage,
  fontFor: (name: StandardFonts) => Promise<PDFFont>,
  annotation: Annotation,
): Promise<void> {
  const m = mapperFor(page)

  switch (annotation.type) {
    case 'highlight': {
      page.drawRectangle({
        ...m.box(annotation),
        color: hexToRgb(annotation.color),
        opacity: annotation.opacity,
      })
      break
    }
    case 'underline':
    case 'strikethrough': {
      const yOffset = annotation.type === 'underline' ? annotation.h - 1 : annotation.h / 2
      page.drawLine({
        start: m.point(annotation.x, annotation.y + yOffset),
        end: m.point(annotation.x + annotation.w, annotation.y + yOffset),
        thickness: 1.6,
        color: hexToRgb(annotation.color),
        opacity: annotation.opacity,
      })
      break
    }
    case 'squiggly': {
      const color = hexToRgb(annotation.color)
      const baseY = annotation.y + annotation.h - 1.5
      const amp = 1.6
      const step = 3
      let prev = m.point(annotation.x, baseY)
      for (let x = step; x <= annotation.w; x += step) {
        const next = m.point(
          annotation.x + x,
          baseY + Math.sin((x / step) * Math.PI) * amp,
        )
        page.drawLine({
          start: prev,
          end: next,
          thickness: 1.2,
          color,
          opacity: annotation.opacity,
          lineCap: LineCapStyle.Round,
        })
        prev = next
      }
      break
    }
    case 'ink': {
      const color = hexToRgb(annotation.color)
      for (let i = 1; i < annotation.points.length; i++) {
        const a = annotation.points[i - 1]
        const b = annotation.points[i]
        page.drawLine({
          start: m.point(a.x, a.y),
          end: m.point(b.x, b.y),
          thickness: annotation.size,
          color,
          opacity: annotation.opacity,
          lineCap: LineCapStyle.Round,
        })
      }
      break
    }
    case 'rect': {
      page.drawRectangle({
        ...m.box(annotation),
        borderColor: hexToRgb(annotation.stroke),
        borderWidth: annotation.strokeWidth,
        color: annotation.fill ? hexToRgb(annotation.fill) : undefined,
        opacity: annotation.fill ? annotation.opacity : undefined,
        borderOpacity: annotation.opacity,
      })
      break
    }
    case 'ellipse': {
      const b = m.box(annotation)
      page.drawEllipse({
        x: b.x + b.width / 2,
        y: b.y + b.height / 2,
        xScale: b.width / 2,
        yScale: b.height / 2,
        borderColor: hexToRgb(annotation.stroke),
        borderWidth: annotation.strokeWidth,
        color: annotation.fill ? hexToRgb(annotation.fill) : undefined,
        opacity: annotation.fill ? annotation.opacity : undefined,
        borderOpacity: annotation.opacity,
      })
      break
    }
    case 'line':
    case 'arrow': {
      const color = hexToRgb(annotation.stroke)
      const start = m.point(annotation.x, annotation.y)
      const end = m.point(annotation.x + annotation.w, annotation.y + annotation.h)
      page.drawLine({
        start,
        end,
        thickness: annotation.strokeWidth,
        color,
        opacity: annotation.opacity,
        lineCap: LineCapStyle.Round,
      })
      if (annotation.type === 'arrow') {
        drawArrowHead(page, start, end, color, annotation.strokeWidth, annotation.opacity)
      }
      break
    }
    case 'whiteout': {
      page.drawRectangle({ ...m.box(annotation), color: rgb(1, 1, 1) })
      break
    }
    case 'text': {
      const font = await fontFor(StandardFonts.Helvetica)
      drawTextBox(
        page,
        font,
        m,
        annotation,
        annotation.text,
        annotation.fontSize,
        hexToRgb(annotation.color),
        annotation.align,
        annotation.lineHeight || 1.25,
        annotation.opacity ?? 1,
      )
      break
    }
    case 'note': {
      const size = 18
      const color = hexToRgb(annotation.color)
      const b = m.box({ x: annotation.x, y: annotation.y, w: size, h: size })
      page.drawRectangle({
        ...b,
        color,
        borderColor: rgb(0.15, 0.15, 0.15),
        borderWidth: 0.75,
      })
      break
    }
    case 'image': {
      const img = await embedDataUrl(pdf, annotation.src)
      drawImageBox(page, img, m, annotation, annotation.rotation, annotation.opacity)
      break
    }
    case 'stamp': {
      const color = hexToRgb(annotation.color)
      const font = await fontFor(StandardFonts.HelveticaBold)
      page.drawRectangle({
        ...m.box(annotation),
        borderColor: color,
        borderWidth: 2,
        opacity: 0,
        borderOpacity: 0.9,
      })
      const label = encodable(font, annotation.label.toUpperCase())
      // Fit the label inside the box with padding.
      let size = annotation.h * 0.52
      while (size > 5 && font.widthOfTextAtSize(label, size) > annotation.w - 14) size -= 1
      const width = font.widthOfTextAtSize(label, size)
      const origin = m.point(
        annotation.x + (annotation.w - width) / 2,
        annotation.y + annotation.h / 2 + size * 0.36,
      )
      page.drawText(label, {
        x: origin.x,
        y: origin.y,
        size,
        font,
        color,
        opacity: 0.9,
        rotate: m.rotation ? degrees(m.rotation) : undefined,
      })
      break
    }
    case 'link': {
      addUriLink(pdf, page, m.box(annotation), annotation.url)
      break
    }
    case 'field-text':
    case 'field-checkbox':
    case 'field-radio':
    case 'field-dropdown':
      // Handled in a dedicated AcroForm pass (see exportPdf).
      break
  }
}

/** Attach a /Link annotation with a URI action covering `rect` (pdf space). */
function addUriLink(
  pdf: PDFDocument,
  page: PDFPage,
  rect: { x: number; y: number; width: number; height: number },
  url: string,
): void {
  if (!/^https?:|^mailto:/i.test(url)) url = `https://${url}`
  const link = pdf.context.register(
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    }),
  )
  const existing = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray)
  if (existing) {
    existing.push(link)
  } else {
    page.node.set(PDFName.of('Annots'), pdf.context.obj([link]))
  }
}

/** Create real AcroForm fields for every field annotation. */
function applyFormFields(pdf: PDFDocument, pages: PDFPage[], fields: FieldAnnotation[]): void {
  if (!fields.length) return
  const form = pdf.getForm()
  const taken = new Set<string>()
  const uniqueName = (base: string): string => {
    let name = base || 'field'
    let i = 2
    while (taken.has(name)) name = `${base}-${i++}`
    taken.add(name)
    return name
  }

  // Radio buttons sharing a name become one group with multiple widgets.
  const radios = new Map<string, FieldAnnotation[]>()
  for (const f of fields) {
    if (f.type === 'field-radio') {
      const list = radios.get(f.name) ?? []
      list.push(f)
      radios.set(f.name, list)
    }
  }

  for (const f of fields) {
    const page = pages[f.page - 1]
    if (!page || f.type === 'field-radio') continue
    const rect = mapperFor(page).box(f)
    const place = { ...rect, borderWidth: 1 }
    try {
      if (f.type === 'field-text') {
        const tf = form.createTextField(uniqueName(f.name))
        if (f.value) tf.setText(f.value)
        tf.addToPage(page, place)
      } else if (f.type === 'field-checkbox') {
        const cb = form.createCheckBox(uniqueName(f.name))
        cb.addToPage(page, place)
        if (f.value === 'checked') cb.check()
      } else if (f.type === 'field-dropdown') {
        const dd = form.createDropdown(uniqueName(f.name))
        dd.addOptions(f.options.filter(Boolean))
        if (f.value && f.options.includes(f.value)) dd.select(f.value)
        dd.addToPage(page, place)
      }
    } catch {
      // Skip fields pdf-lib rejects (duplicate names, bad geometry) rather
      // than failing the whole export.
    }
  }

  for (const [name, group] of radios) {
    try {
      const rg = form.createRadioGroup(uniqueName(name))
      group.forEach((f, i) => {
        const page = pages[f.page - 1]
        if (!page) return
        const rect = mapperFor(page).box(f)
        rg.addOptionToPage(f.options[0] || `option-${i + 1}`, page, rect)
      })
    } catch {
      /* same rationale as above */
    }
  }
}

// ─── Content edits (editing existing PDF objects) ─────────────────────────────

/** Map a detected/edited family + weight to the closest standard font. */
function pickStandardFont(edit: TextContentEdit): StandardFonts {
  const f = `${edit.fontFamily || ''} ${edit.originalFontName || ''}`.toLowerCase()
  const mono = /mono|courier|consol|menlo|code|fixed/.test(f)
  const serif = /times|serif|georgia|roman|garamond|minion|book|cambria|palatino|baskerville|century/.test(f)
  const bold = edit.bold || /bold|black|heavy|semibold|-bd|_bd|\bbd\b|w[6-9]|700|800|900/i.test(f)
  const italic = edit.italic || /italic|oblique|-it|_it|\bit\b|italicmt|bi\b|bdit/i.test(f)
  if (mono) {
    if (bold && italic) return StandardFonts.CourierBoldOblique
    if (bold) return StandardFonts.CourierBold
    if (italic) return StandardFonts.CourierOblique
    return StandardFonts.Courier
  }
  if (serif) {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic
    if (bold) return StandardFonts.TimesRomanBold
    if (italic) return StandardFonts.TimesRomanItalic
    return StandardFonts.TimesRoman
  }
  if (bold && italic) return StandardFonts.HelveticaBoldOblique
  if (bold) return StandardFonts.HelveticaBold
  if (italic) return StandardFonts.HelveticaOblique
  return StandardFonts.Helvetica
}

/**
 * Apply one content edit: cover the original region, then (unless deleted)
 * redraw the new text or lifted image at its current geometry.
 */
async function applyContentEdit(
  pdf: PDFDocument,
  page: PDFPage,
  fontFor: (font: StandardFonts) => Promise<PDFFont>,
  edit: ContentEdit,
): Promise<void> {
  const m = mapperFor(page)
  page.drawRectangle({ ...m.box(edit.orig), color: hexToRgb(edit.bg) })
  if (edit.deleted) return

  if (edit.kind === 'region') {
    const img = await embedDataUrl(pdf, edit.image)
    drawImageBox(page, img, m, edit, edit.rotation, edit.opacity ?? 1)
    return
  }

  const font = await fontFor(pickStandardFont(edit))
  drawTextBox(
    page,
    font,
    m,
    edit,
    edit.text,
    edit.fontSize,
    hexToRgb(edit.color),
    edit.align,
    edit.lineHeight || 1.25,
    edit.opacity ?? 1,
  )
}

/** Apply document-info metadata to a loaded pdf-lib document. */
export function applyMetadata(pdf: PDFDocument, meta: DocumentMetadata): void {
  if (meta.title !== undefined) pdf.setTitle(meta.title)
  if (meta.author !== undefined) pdf.setAuthor(meta.author)
  if (meta.subject !== undefined) pdf.setSubject(meta.subject)
  if (meta.keywords !== undefined) pdf.setKeywords(meta.keywords)
}

/**
 * Bake `annotations` and `contentEdits` into `source` bytes and return the
 * edited PDF. `source` is the current working bytes; it is not mutated.
 */
export async function exportPdf(
  source: ArrayBuffer | Uint8Array,
  annotations: Annotation[],
  contentEdits: ContentEdit[] = [],
  options: ExportOptions = {},
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source, { ignoreEncryption: true })
  const pages = pdf.getPages()

  const fontCache = new Map<StandardFonts, PDFFont>()
  const fontFor = async (name: StandardFonts): Promise<PDFFont> => {
    const cached = fontCache.get(name)
    if (cached) return cached
    const embedded = await pdf.embedFont(name)
    fontCache.set(name, embedded)
    return embedded
  }

  if (options.metadata) applyMetadata(pdf, options.metadata)

  // Content edits first — they modify base content and must sit under comments.
  for (const edit of contentEdits) {
    const page = pages[edit.page - 1]
    if (!page) continue
    await applyContentEdit(pdf, page, fontFor, edit)
  }

  for (const annotation of annotations) {
    const page = pages[annotation.page - 1]
    if (!page) continue
    await drawAnnotation(pdf, page, fontFor, annotation)
  }

  applyFormFields(
    pdf,
    pages,
    annotations.filter((a): a is FieldAnnotation => a.type.startsWith('field-')),
  )

  return pdf.save()
}

/** Rotate every listed page (1-based) by `delta` degrees, clamped to 0/90/180/270. */
export async function rotatePages(
  source: ArrayBuffer | Uint8Array,
  pageNumbers: number[],
  delta: number,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source, { ignoreEncryption: true })
  const pages = pdf.getPages()
  for (const n of pageNumbers) {
    const page = pages[n - 1]
    if (!page) continue
    const next = (((page.getRotation().angle + delta) % 360) + 360) % 360
    page.setRotation(degrees(next))
  }
  return pdf.save()
}
