/**
 * Page organization — pure byte-in / byte-out operations built on pdf-lib,
 * plus the annotation-model remapping each operation implies.
 *
 * Every operation loads the current working bytes, mutates the page tree and
 * returns freshly-saved bytes; the editor reloads pdf.js from the result. The
 * remap helpers keep annotations/content-edits pointing at the right pages
 * (and, for rotation, re-project their geometry into the new view space).
 */
import { PDFDocument, degrees } from 'pdf-lib'

interface Paged {
  page: number
}

async function load(source: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(source, { ignoreEncryption: true })
}

/** Rotate one page (1-based) by `delta` degrees (multiples of 90). */
export async function rotatePageBytes(source: Uint8Array, pageNum: number, delta: number): Promise<Uint8Array> {
  const pdf = await load(source)
  const page = pdf.getPage(pageNum - 1)
  const next = (((page.getRotation().angle + delta) % 360) + 360) % 360
  page.setRotation(degrees(next))
  return pdf.save()
}

/** Delete one page (1-based). Refuses to delete the last remaining page. */
export async function deletePageBytes(source: Uint8Array, pageNum: number): Promise<Uint8Array> {
  const pdf = await load(source)
  if (pdf.getPageCount() <= 1) throw new Error('Cannot delete the only page')
  pdf.removePage(pageNum - 1)
  return pdf.save()
}

/** Insert a blank page after `afterPage` (0 = insert at the start). */
export async function insertBlankPageBytes(source: Uint8Array, afterPage: number): Promise<Uint8Array> {
  const pdf = await load(source)
  const neighbor = pdf.getPage(Math.max(0, Math.min(pdf.getPageCount() - 1, afterPage - 1)))
  const { width, height } = neighbor.getSize()
  pdf.insertPage(afterPage, [width, height])
  return pdf.save()
}

/** Duplicate one page (1-based); the copy lands right after the original. */
export async function duplicatePageBytes(source: Uint8Array, pageNum: number): Promise<Uint8Array> {
  const pdf = await load(source)
  const [copy] = await pdf.copyPages(pdf, [pageNum - 1])
  pdf.insertPage(pageNum, copy)
  return pdf.save()
}

/** Move page `from` so it sits at position `to` (both 1-based). */
export async function movePageBytes(source: Uint8Array, from: number, to: number): Promise<Uint8Array> {
  const pdf = await load(source)
  const [copy] = await pdf.copyPages(pdf, [from - 1])
  pdf.removePage(from - 1)
  pdf.insertPage(to - 1, copy)
  return pdf.save()
}

/** Extract one page (1-based) into a standalone single-page PDF. */
export async function extractPageBytes(source: Uint8Array, pageNum: number): Promise<Uint8Array> {
  const src = await load(source)
  const out = await PDFDocument.create()
  const [copy] = await out.copyPages(src, [pageNum - 1])
  out.addPage(copy)
  return out.save()
}

// ─── Model remapping ─────────────────────────────────────────────────────────

/** After deleting `page`: drop that page's items, shift later pages down. */
export function remapAfterDelete<T extends Paged>(items: T[], page: number): T[] {
  return items
    .filter((i) => i.page !== page)
    .map((i) => (i.page > page ? { ...i, page: i.page - 1 } : i))
}

/** After inserting a page after `afterPage`: shift later pages up. */
export function remapAfterInsert<T extends Paged>(items: T[], afterPage: number): T[] {
  return items.map((i) => (i.page > afterPage ? { ...i, page: i.page + 1 } : i))
}

/** After moving page `from` to position `to`. */
export function remapAfterMove<T extends Paged>(items: T[], from: number, to: number): T[] {
  return items.map((i) => {
    if (i.page === from) return { ...i, page: to }
    if (from < to && i.page > from && i.page <= to) return { ...i, page: i.page - 1 }
    if (from > to && i.page >= to && i.page < from) return { ...i, page: i.page + 1 }
    return i
  })
}

/**
 * Re-project a top-left-space point on a page rotated by `delta` (±90 / 180).
 * `viewW`/`viewH` are the page's **pre-rotation** view dimensions.
 */
export function rotatePoint(
  x: number,
  y: number,
  delta: number,
  viewW: number,
  viewH: number,
): { x: number; y: number } {
  const d = ((delta % 360) + 360) % 360
  if (d === 90) return { x: viewH - y, y: x }
  if (d === 180) return { x: viewW - x, y: viewH - y }
  if (d === 270) return { x: y, y: viewW - x }
  return { x, y }
}

/** Re-project a top-left-space box the same way. */
export function rotateBox(
  b: { x: number; y: number; w: number; h: number },
  delta: number,
  viewW: number,
  viewH: number,
): { x: number; y: number; w: number; h: number } {
  const d = ((delta % 360) + 360) % 360
  if (d === 90) return { x: viewH - b.y - b.h, y: b.x, w: b.h, h: b.w }
  if (d === 180) return { x: viewW - b.x - b.w, y: viewH - b.y - b.h, w: b.w, h: b.h }
  if (d === 270) return { x: b.y, y: viewW - b.x - b.w, w: b.h, h: b.w }
  return { ...b }
}
