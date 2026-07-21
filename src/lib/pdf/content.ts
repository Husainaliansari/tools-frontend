/**
 * Content extraction — read the *existing* objects out of a PDF page so they
 * can be selected and edited, not just annotated over.
 *
 * pdf.js exposes text as positioned glyph runs (`getTextContent`) and images
 * as draw operators (`getOperatorList`). We reconstruct:
 *   • text lines  — grouped runs with a bounding box, size, family (best-effort)
 *   • image boxes — placement rectangles for raster XObjects
 *
 * All geometry is normalised to the editor's space: **PDF points, top-left
 * origin, scale 1** — the same space annotations use.
 */
import { OPS, Util, type PDFPageProxy } from 'pdfjs-dist'
import { uuid } from '@utils'
import type { Box } from './types'

export interface DetectedText extends Box {
  id: string
  page: number
  kind: 'text'
  text: string
  fontSize: number
  fontFamily: string
  loadedFontFamily?: string
  originalFontName?: string
  embeddedFont?: boolean
  align?: 'left' | 'center' | 'right' | 'justify'
  bold: boolean
  italic: boolean
  underline?: boolean
  strikethrough?: boolean
  lineHeight?: number
  letterSpacing?: number
  paragraphSpacing?: number
  color?: string
  locked?: boolean
}

export interface DetectedImage extends Box {
  id: string
  page: number
  kind: 'image'
  locked?: boolean
}

/** A reconstructed vector object — shape, line, fill, or path cluster. */
export interface DetectedGraphic extends Box {
  id: string
  page: number
  kind: 'graphic'
  subtype: 'fill' | 'stroke' | 'mixed'
  locked?: boolean
}

export type DetectedObject = DetectedText | DetectedImage | DetectedGraphic

interface RawItem {
  str: string
  transform: number[]
  width: number
  height: number
  fontName: string
  hasEOL: boolean
}

export interface ParsedFontInfo {
  fontFamily: string
  loadedFontFamily?: string
  originalFontName?: string
  embeddedFont: boolean
  bold: boolean
  italic: boolean
}

export function normalizeText(text: string): string {
  if (!text) return ''
  return text
    // Replace non-standard whitespace / zero-width characters with regular space or empty string
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // Replace ligatures
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\uFB05/g, 'ft')
    .replace(/\uFB06/g, 'st')
    .normalize('NFC')
}

function resolveFontDetails(fontName: string, style: { fontFamily?: string } | undefined, page: PDFPageProxy): ParsedFontInfo {
  let loadedFontFamily = style?.fontFamily
  let rawName = fontName || ''
  let fontObj: { loadedName?: string; name?: string; fallbackName?: string; bold?: boolean; italic?: boolean; isSerifFont?: boolean; isMonospaceFont?: boolean } | null = null

  try {
    const commonObjs = (page as any).commonObjs
    if (commonObjs && typeof commonObjs.has === 'function' && commonObjs.has(fontName)) {
      fontObj = commonObjs.get(fontName)
    }
  } catch {
    // commonObjs not accessible or not resolved yet
  }

  if (fontObj) {
    if (fontObj.loadedName) loadedFontFamily = fontObj.loadedName
    if (fontObj.name) rawName = fontObj.name
  }

  const fallbackName = fontObj?.fallbackName || ''
  const styleFamily = style?.fontFamily || ''

  // Collect all possible descriptor strings to find weight/style/family clues
  const descriptors = [
    rawName,
    fontObj?.name,
    fallbackName,
    loadedFontFamily,
    styleFamily,
    fontName,
  ]
    .filter(Boolean)
    .join(' ')

  const cleanName = (fontObj?.name || rawName).replace(/^[A-Z]{6}\+/, '')

  const isBold =
    fontObj?.bold ??
    /bold|black|heavy|semibold|demi|-bd|_bd|\bbd\b|w[6-9]|700|800|900/i.test(descriptors)
  const isItalic =
    fontObj?.italic ?? /italic|oblique|-it|_it|\bit\b|italicmt|bi\b|bdit/i.test(descriptors)
  const isSerif =
    fontObj?.isSerifFont ??
    /serif|times|georgia|roman|garamond|minion|book|cambria|palatino|baskerville|century/i.test(descriptors)
  const isMono =
    fontObj?.isMonospaceFont ?? /mono|courier|consol|menlo|code|fixed/i.test(descriptors)

  let family = ''
  if (fallbackName && !['sans-serif', 'serif', 'monospace'].includes(fallbackName.toLowerCase())) {
    family = fallbackName
  }
  if (!family && cleanName && !cleanName.startsWith('g_d')) {
    family = cleanName
  }
  if (!family && styleFamily && !styleFamily.startsWith('g_d')) {
    family = styleFamily.split(',')[0].trim().replace(/['"]/g, '')
  }

  // Clean font weight/style modifiers from PostScript font family name
  family = family
    .replace(/^[A-Z]{6}\+/, '')
    .replace(
      /[-_]?(BoldItalic|BoldOblique|Bold|Italic|Oblique|Regular|Medium|Light|Black|Heavy|Semibold|ExtraBold|Thin|MT|PS|PSMT|It)+/gi,
      '',
    )
    .trim()

  if (/times|roman/i.test(family) || (isSerif && (!family || family === 'serif'))) family = 'Times New Roman'
  else if (/courier|mono|code/i.test(family) || (isMono && (!family || family === 'monospace'))) family = 'Courier New'
  else if (/arial/i.test(family)) family = 'Arial'
  else if (/helvetica/i.test(family)) family = 'Helvetica'
  else if (/calibri/i.test(family)) family = 'Calibri'
  else if (/cambria/i.test(family)) family = 'Cambria'
  else if (/georgia/i.test(family)) family = 'Georgia'
  else if (/garamond/i.test(family)) family = 'Garamond'
  else if (/verdana/i.test(family)) family = 'Verdana'
  else if (/trebuchet/i.test(family)) family = 'Trebuchet MS'
  else if (/tahoma/i.test(family)) family = 'Tahoma'
  else if (!family || family === 'sans-serif' || family === 'serif' || family === 'monospace') {
    family = isSerif ? 'Times New Roman' : isMono ? 'Courier New' : 'Helvetica'
  }

  const isEmbedded = !!(fontObj?.loadedName || (styleFamily && styleFamily.startsWith('g_d')))

  return {
    fontFamily: family,
    loadedFontFamily: loadedFontFamily || fontObj?.loadedName,
    originalFontName: cleanName || fallbackName || rawName,
    embeddedFont: isEmbedded,
    bold: isBold,
    italic: isItalic,
  }
}

/** Group extracted lines into semantic logical content blocks (paragraphs, bullet lists, headings, table cells). */
function groupLinesIntoBlocks(lines: DetectedText[], pageNumber: number): DetectedText[] {
  if (!lines.length) return []

  // Sort lines top-to-bottom, then left-to-right
  const sorted = [...lines].sort((a, b) => {
    if (Math.abs(a.y - b.y) > Math.min(a.fontSize, b.fontSize) * 0.4) {
      return a.y - b.y
    }
    return a.x - b.x
  })

  const blocks: DetectedText[][] = []
  let currentBlock: DetectedText[] = []

  const isBulletOrListMarker = (str: string) =>
    /^\s*([•\-*▪▸–—]|(\d+|[a-zA-Z])[\.\)])\s+/.test(str)

  for (const line of sorted) {
    if (!currentBlock.length) {
      currentBlock.push(line)
      continue
    }

    const prev = currentBlock[currentBlock.length - 1]
    const yDiff = line.y - prev.y
    const lineSpacingRatio = yDiff / prev.fontSize
    const sameFont =
      prev.fontFamily === line.fontFamily &&
      prev.bold === line.bold &&
      prev.italic === line.italic &&
      Math.abs(prev.fontSize - line.fontSize) < 1.5
    const isNewBullet = isBulletOrListMarker(line.text)
    const isHeading = line.fontSize > prev.fontSize * 1.25 || prev.fontSize > line.fontSize * 1.25

    // Check horizontal alignment & column overlap
    const prevRight = prev.x + prev.w
    const lineRight = line.x + line.w
    const horizOverlap = !(line.x > prevRight + 25 || lineRight < prev.x - 25)
    const leftAlignedOrIndented = Math.abs(line.x - prev.x) < prev.fontSize * 5

    const shouldMerge =
      !isNewBullet &&
      !isHeading &&
      sameFont &&
      lineSpacingRatio >= 0.65 &&
      lineSpacingRatio <= 1.85 &&
      horizOverlap &&
      leftAlignedOrIndented

    if (shouldMerge) {
      currentBlock.push(line)
    } else {
      blocks.push(currentBlock)
      currentBlock = [line]
    }
  }
  if (currentBlock.length) {
    blocks.push(currentBlock)
  }

  return blocks.map((group, index) => {
    const first = group[0]
    const minX = Math.min(...group.map((l) => l.x))
    const minY = Math.min(...group.map((l) => l.y))
    const maxRight = Math.max(...group.map((l) => l.x + l.w))
    const maxBottom = Math.max(...group.map((l) => l.y + l.h))
    const w = Math.max(8, maxRight - minX)
    const h = Math.max(first.fontSize, maxBottom - minY)

    const joinedText = group.map((l) => l.text).join('\n')

    // Compute line height ratio if multi-line
    let calculatedLineHeight = first.lineHeight || 1.25
    if (group.length > 1) {
      let totalSpacing = 0
      for (let i = 1; i < group.length; i++) {
        totalSpacing += group[i].y - group[i - 1].y
      }
      const avgSpacing = totalSpacing / (group.length - 1)
      if (first.fontSize > 0) {
        calculatedLineHeight = Math.round((avgSpacing / first.fontSize) * 100) / 100
        if (calculatedLineHeight < 0.8 || calculatedLineHeight > 2.5) calculatedLineHeight = 1.25
      }
    }

    return {
      id: `t-${pageNumber}-${index}`,
      page: pageNumber,
      kind: 'text' as const,
      x: minX,
      y: minY,
      w,
      h,
      text: joinedText,
      fontSize: first.fontSize,
      fontFamily: first.fontFamily,
      loadedFontFamily: first.loadedFontFamily,
      originalFontName: first.originalFontName,
      embeddedFont: first.embeddedFont,
      align: first.align || 'left',
      bold: first.bold,
      italic: first.italic,
      lineHeight: calculatedLineHeight,
      letterSpacing: first.letterSpacing || 0,
    }
  })
}

/** Group glyph runs into visually-continuous lines and semantic text blocks. */
async function extractText(page: PDFPageProxy, pageHeight: number): Promise<DetectedText[]> {
  const content = await page.getTextContent()
  const styles = content.styles as Record<string, { ascent: number; descent: number; fontFamily: string }>
  const pageViewport = page.getViewport({ scale: 1 })
  const rawLines: DetectedText[] = []

  let line: {
    parts: string[]
    left: number
    right: number
    baseline: number
    fontSize: number
    fontName: string
    ascent: number
    descent: number
  } | null = null

  const flush = () => {
    if (!line) return
    const text = normalizeText(line.parts.join('').replace(/\s+$/, ''))
    if (text.trim()) {
      const style = styles[line.fontName]
      const fontInfo = resolveFontDetails(line.fontName, style, page)
      const top = line.baseline + line.ascent * line.fontSize
      const bottom = line.baseline + line.descent * line.fontSize

      // Alignment from the margins, not the midpoint: a line is only centred
      // when both side margins are substantial AND roughly equal, and only
      // right-aligned when it hugs the right edge with a large left margin.
      // This keeps ordinary left-aligned / justified body text left-aligned.
      const pageW = pageViewport.width
      const lineW = line.right - line.left
      const leftGap = line.left
      const rightGap = pageW - line.right
      let align: 'left' | 'center' | 'right' = 'left'
      if (lineW < pageW * 0.9) {
        const symmetric = Math.abs(leftGap - rightGap) < pageW * 0.05
        if (symmetric && leftGap > pageW * 0.15) align = 'center'
        else if (rightGap < pageW * 0.05 && leftGap > pageW * 0.3) align = 'right'
      }

      rawLines.push({
        id: `line-${page.pageNumber}-${rawLines.length}`,
        page: page.pageNumber,
        kind: 'text',
        x: line.left,
        y: pageHeight - top,
        w: Math.max(4, line.right - line.left),
        h: Math.max(line.fontSize, top - bottom),
        text,
        fontSize: Math.round(line.fontSize * 10) / 10,
        fontFamily: fontInfo.fontFamily,
        loadedFontFamily: fontInfo.loadedFontFamily,
        originalFontName: fontInfo.originalFontName,
        embeddedFont: fontInfo.embeddedFont,
        align,
        bold: fontInfo.bold,
        italic: fontInfo.italic,
      })
    }
    line = null
  }

  for (const raw of content.items as RawItem[]) {
    if (!('transform' in raw)) continue // marked-content markers
    const item = raw
    const [a, b, , , e, f] = item.transform
    const fontSize = Math.hypot(item.transform[2], item.transform[3]) || item.height || 12
    const rotation = Math.atan2(b, a)
    const style = styles[item.fontName]
    const ascent = style?.ascent ?? 0.8
    const descent = style?.descent ?? -0.2

    // Rotated text isn't line-grouped — emit standalone (rare).
    const sameLine =
      line &&
      Math.abs(rotation) < 0.01 &&
      line.fontName === item.fontName &&
      Math.abs(line.baseline - f) < fontSize * 0.4 &&
      e - line.right < fontSize * 2 &&
      e >= line.left - 1

    if (sameLine && line) {
      // Insert a space when there is a visible gap and none is present already.
      const gap = e - line.right
      const needsSpace = gap > fontSize * 0.2
      if (needsSpace && !/\s$/.test(line.parts.at(-1) ?? '') && !/^\s/.test(item.str)) {
        line.parts.push(' ')
      }
      line.parts.push(item.str)
      line.right = e + item.width
      line.fontSize = Math.max(line.fontSize, fontSize)
    } else {
      flush()
      line = {
        parts: [item.str],
        left: e,
        right: e + item.width,
        baseline: f,
        fontSize,
        fontName: item.fontName,
        ascent,
        descent,
      }
    }
    if (item.hasEOL) flush()
  }
  flush()
  return groupLinesIntoBlocks(rawLines, page.pageNumber)
}

function applyMatrix(x: number, y: number, m: number[]): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

function boxesTouch(a: Box, b: Box, pad: number): boolean {
  return !(
    a.x > b.x + b.w + pad ||
    b.x > a.x + a.w + pad ||
    a.y > b.y + b.h + pad ||
    b.y > a.y + a.h + pad
  )
}
function unionBox<T extends Box>(a: T, b: Box): T {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    ...a,
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  }
}

/**
 * Reconstruct images and vector shapes in a single operator-list walk.
 *
 * Images map the unit square through the current transform; each `constructPath`
 * carries a local-space bounding box (`minMax`) we project the same way. Touching
 * path fragments are merged into coherent shape objects.
 */
async function extractDrawn(
  page: PDFPageProxy,
  pageHeight: number,
): Promise<{ images: DetectedImage[]; graphics: DetectedGraphic[] }> {
  const viewport = page.getViewport({ scale: 1 })
  const pageWidth = viewport.width
  const pageArea = pageWidth * pageHeight
  const ops = await page.getOperatorList()
  const stack: number[][] = []
  let ctm = [1, 0, 0, 1, 0, 0]
  const images: DetectedImage[] = []
  const raw: (Box & { subtype: DetectedGraphic['subtype'] })[] = []

  const bboxOf = (corners: [number, number][]) => {
    const xs = corners.map((c) => c[0])
    const ys = corners.map((c) => c[1])
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    return { x: minX, y: pageHeight - Math.max(...ys), w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }
  }

  for (let i = 0; i < ops.fnArray.length && raw.length < 2500; i++) {
    const fn = ops.fnArray[i]
    const args = ops.argsArray[i]
    if (fn === OPS.save) stack.push(ctm.slice())
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm
    else if (fn === OPS.transform) ctm = Util.transform(ctm, args as number[])
    else if (
      fn === OPS.paintImageXObject ||
      fn === OPS.paintInlineImageXObject ||
      fn === OPS.paintImageMaskXObject
    ) {
      const b = bboxOf([
        applyMatrix(0, 0, ctm),
        applyMatrix(1, 0, ctm),
        applyMatrix(1, 1, ctm),
        applyMatrix(0, 1, ctm),
      ])
      const isPageBg = (b.w >= pageWidth * 0.8 && b.h >= pageHeight * 0.8) || (b.w * b.h >= pageArea * 0.7)
      if (b.w > 8 && b.h > 8 && !isPageBg) {
        images.push({ id: `i-${page.pageNumber}-${images.length}`, page: page.pageNumber, kind: 'image', ...b })
      }
    } else if (fn === OPS.constructPath) {
      const paintOp = args[0] as number
      const minMax = args[2] as number[] | undefined
      if (!minMax || minMax.length < 4) continue
      const b = bboxOf([
        applyMatrix(minMax[0], minMax[1], ctm),
        applyMatrix(minMax[2], minMax[1], ctm),
        applyMatrix(minMax[2], minMax[3], ctm),
        applyMatrix(minMax[0], minMax[3], ctm),
      ])
      const isPageBg = (b.w >= pageWidth * 0.75 && b.h >= pageHeight * 0.75) || (b.w * b.h >= pageArea * 0.65)
      if (b.w < 2 || b.h < 2 || isPageBg) continue
      const stroking = paintOp === OPS.stroke || paintOp === OPS.closeStroke
      raw.push({ ...b, subtype: stroking ? 'stroke' : 'fill' })
    }
  }

  // Merge tightly adjacent fragments into coherent local shapes without merging whole-page vectors.
  let items = raw
  for (let pass = 0; pass < 3; pass++) {
    const next: typeof items = []
    const used = new Array(items.length).fill(false)
    let changed = false
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue
      let box = items[i]
      used[i] = true
      for (let j = i + 1; j < items.length; j++) {
        if (used[j]) continue
        if (boxesTouch(box, items[j], 1.0)) {
          const union = unionBox(box, items[j])
          // Restrict merging to local clusters, avoid merging distant lines across the page
          const isTooLarge = union.w > pageWidth * 0.75 && union.h > pageHeight * 0.75
          if (!isTooLarge && (union.w <= Math.max(box.w, items[j].w) + 30 || union.h <= Math.max(box.h, items[j].h) + 30)) {
            box = { ...union, subtype: box.subtype === items[j].subtype ? box.subtype : 'mixed' }
            used[j] = true
            changed = true
          }
        }
      }
      next.push(box)
    }
    items = next
    if (!changed) break
  }

  const graphics: DetectedGraphic[] = items
    .filter((b) => !(b.w >= pageWidth * 0.75 && b.h >= pageHeight * 0.75) && b.w * b.h < pageArea * 0.65)
    .slice(0, 500)
    .map((b, i) => ({
      id: `g-${page.pageNumber}-${i}`,
      page: page.pageNumber,
      kind: 'graphic' as const,
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      subtype: b.subtype,
    }))
  return { images, graphics }
}

/** Which object families to reconstruct on a page. */
export interface DetectKinds {
  /** Parse text runs/blocks (Edit Text mode). */
  text?: boolean
  /** Parse images + vector graphics (Edit Object mode). */
  objects?: boolean
}

/**
 * Reconstruct editable objects on a page — **lazily and selectively**.
 *
 * Only the requested families are parsed: Edit Text asks for `text` alone
 * (skips the whole operator-list walk), Edit Object asks for `objects` alone
 * (skips text extraction). Each extractor degrades to `[]` on failure so a
 * malformed page never blocks editing.
 */
export async function detectContent(
  page: PDFPageProxy,
  kinds: DetectKinds = { text: true, objects: true },
): Promise<DetectedObject[]> {
  const pageHeight = page.getViewport({ scale: 1 }).height
  let text: DetectedText[] = []
  let drawn: { images: DetectedImage[]; graphics: DetectedGraphic[] } = { images: [], graphics: [] }
  if (kinds.text) {
    try {
      text = await extractText(page, pageHeight)
    } catch {
      text = []
    }
  }
  if (kinds.objects) {
    try {
      drawn = await extractDrawn(page, pageHeight)
    } catch {
      drawn = { images: [], graphics: [] }
    }
  }
  // Graphics (usually the backdrop) first, then images, then text on top so the
  // topmost object wins overlapping click hits.
  return [...drawn.graphics, ...drawn.images, ...text]
}

/** A fresh id for a lifted region object. */
export function newRegionId(page: number): string {
  return `r-${page}-${uuid().slice(0, 8)}`
}
