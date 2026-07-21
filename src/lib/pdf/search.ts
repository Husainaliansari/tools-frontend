/**
 * Document-wide text search built on pdf.js `getTextContent`.
 *
 * Each page's glyph runs are concatenated into one searchable string while
 * tracking which run covers which character range; a hit's bounding box is
 * interpolated proportionally inside the first/last covering runs. Geometry is
 * in the editor's space: PDF points, top-left origin, scale 1.
 */
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import type { Box } from './types'

export interface SearchMatch {
  id: string
  page: number
  /** Bounding box of the hit in top-left point space. */
  box: Box
  /** Context around the hit, for the results list. */
  before: string
  text: string
  after: string
}

interface Run {
  str: string
  /** Character offset of this run inside the page string. */
  start: number
  x: number
  y: number
  w: number
  h: number
}

interface PageIndex {
  text: string
  runs: Run[]
}

const CONTEXT = 28

async function indexPage(page: PDFPageProxy): Promise<PageIndex> {
  const viewH = page.getViewport({ scale: 1 }).height
  const content = await page.getTextContent()
  const runs: Run[] = []
  let text = ''
  let lastEnd: { x: number; y: number } | null = null

  for (const raw of content.items as {
    str: string
    transform?: number[]
    width: number
    hasEOL: boolean
  }[]) {
    if (!raw.transform) continue
    const [, , c, d, e, f] = raw.transform
    const fontSize = Math.hypot(c, d) || 10
    // Separate visually-disjoint runs so words don't fuse across columns/lines.
    if (lastEnd && (Math.abs(f - lastEnd.y) > fontSize * 0.5 || e - lastEnd.x > fontSize * 0.3)) {
      text += ' '
    }
    runs.push({
      str: raw.str,
      start: text.length,
      x: e,
      y: viewH - f - fontSize,
      w: raw.width,
      h: fontSize * 1.25,
    })
    text += raw.str
    lastEnd = { x: e + raw.width, y: f }
    if (raw.hasEOL) {
      text += ' '
      lastEnd = null
    }
  }
  return { text, runs }
}

/** Interpolate the box spanned by chars [from, to) across the covering runs. */
function boxForRange(index: PageIndex, from: number, to: number): Box | null {
  const covering = index.runs.filter((r) => r.start < to && r.start + r.str.length > from)
  if (!covering.length) return null
  const first = covering[0]
  const last = covering[covering.length - 1]
  const fracStart = first.str.length ? Math.max(0, from - first.start) / first.str.length : 0
  const fracEnd = last.str.length ? Math.min(last.str.length, to - last.start) / last.str.length : 1
  const x0 = first.x + first.w * fracStart
  const x1 = last.x + last.w * fracEnd
  const y = Math.min(...covering.map((r) => r.y))
  const bottom = Math.max(...covering.map((r) => r.y + r.h))
  return { x: Math.min(x0, x1), y, w: Math.max(2, Math.abs(x1 - x0)), h: bottom - y }
}

export function findInIndex(
  index: PageIndex,
  pageNum: number,
  query: string,
  caseSensitive: boolean,
): SearchMatch[] {
  const haystack = caseSensitive ? index.text : index.text.toLowerCase()
  const needle = caseSensitive ? query : query.toLowerCase()
  if (!needle.trim()) return []
  const out: SearchMatch[] = []
  let at = haystack.indexOf(needle)
  while (at !== -1 && out.length < 500) {
    const box = boxForRange(index, at, at + needle.length)
    if (box) {
      out.push({
        id: `s-${pageNum}-${at}`,
        page: pageNum,
        box,
        before: index.text.slice(Math.max(0, at - CONTEXT), at).trimStart(),
        text: index.text.slice(at, at + needle.length),
        after: index.text.slice(at + needle.length, at + needle.length + CONTEXT).trimEnd(),
      })
    }
    at = haystack.indexOf(needle, at + Math.max(1, needle.length))
  }
  return out
}

/**
 * Search the whole document. `onProgress` fires after each page so the UI can
 * stream results in; the returned array is the complete set.
 */
export async function searchDocument(
  doc: PDFDocumentProxy,
  query: string,
  options: { caseSensitive?: boolean; onProgress?: (done: number, total: number) => void } = {},
): Promise<SearchMatch[]> {
  const all: SearchMatch[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    try {
      const page = await doc.getPage(n)
      const index = await indexPage(page)
      all.push(...findInIndex(index, n, query, options.caseSensitive ?? false))
    } catch {
      // Unreadable page (e.g. no text layer) — skip.
    }
    options.onProgress?.(n, doc.numPages)
  }
  return all
}
