/**
 * sign-compose — flattens the editor's placed elements into the payload the
 * existing backend sign endpoint understands, with no backend changes.
 *
 * The endpoint stamps ONE image onto ONE page, anchored to a corner/center
 * with `scale` = image width as a fraction of the page width and a margin.
 * To reproduce arbitrary layouts exactly, all of a page's elements are
 * rasterized into a single transparent PNG whose canvas spans from the
 * page's bottom edge up to the topmost element, and horizontally from/to
 * whichever page edge lets the canvas start exactly at the chosen anchor
 * with margin 0. Placement then falls out of the anchor math verbatim.
 */
import { elementFontString, isImageElement, type SignElement } from './sign-types'

export interface SignJobOptions {
  page: number
  position: 'bottom-left' | 'bottom-center' | 'bottom-right'
  scale: number
  margin_mm: number
}

export interface PageOverlay {
  page: number
  /** Transparent PNG holding every element on this page. */
  file: File
  /** Options for the backend sign job that places this overlay. */
  options: SignJobOptions
  /** Where the overlay lands, in page points (top-left origin) — for previews. */
  region: { x: number; y: number; width: number; height: number }
  dataUrl: string
}

interface PageSize {
  width: number
  height: number
}

/** Backend SignOptions bounds (services/tools/document.py). */
const MIN_SCALE = 0.05
const MAX_SCALE = 0.8
/** Longest canvas edge, in device pixels. */
const MAX_CANVAS_PX = 4000

const bitmapCache = new Map<string, Promise<HTMLImageElement>>()

function loadBitmap(src: string): Promise<HTMLImageElement> {
  let cached = bitmapCache.get(src)
  if (!cached) {
    cached = new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Could not load a signature bitmap.'))
      image.src = src
    })
    bitmapCache.set(src, cached)
  }
  return cached
}

/** Axis-aligned bounds of an element including its rotation. */
function elementBounds(element: SignElement): { left: number; top: number; right: number; bottom: number } {
  const cx = element.x + element.width / 2
  const cy = element.y + element.height / 2
  const angle = ((element.rotation ?? 0) * Math.PI) / 180
  const cos = Math.abs(Math.cos(angle))
  const sin = Math.abs(Math.sin(angle))
  const halfW = (element.width * cos + element.height * sin) / 2
  const halfH = (element.width * sin + element.height * cos) / 2
  return { left: cx - halfW, top: cy - halfH, right: cx + halfW, bottom: cy + halfH }
}

/**
 * Choose the horizontal anchor + canvas span for a page's element bounds.
 * Prefers the narrowest region that still starts exactly at its anchor.
 */
function horizontalRegion(
  left: number,
  right: number,
  pageWidth: number,
): { position: SignJobOptions['position']; x: number; width: number } {
  const minWidth = pageWidth * MIN_SCALE
  const maxWidth = pageWidth * MAX_SCALE

  const candidates: { position: SignJobOptions['position']; x: number; width: number }[] = []
  // Anchored to the left edge: canvas covers [0, right].
  if (right <= maxWidth) {
    const width = Math.max(right, minWidth)
    candidates.push({ position: 'bottom-left', x: 0, width })
  }
  // Anchored to the right edge: canvas covers [left, pageWidth].
  if (pageWidth - left <= maxWidth) {
    const width = Math.max(pageWidth - left, minWidth)
    candidates.push({ position: 'bottom-right', x: pageWidth - width, width })
  }
  // Centered: canvas symmetric about the page center, covering the bounds.
  const half = Math.max(pageWidth / 2 - left, right - pageWidth / 2, minWidth / 2)
  if (half * 2 <= maxWidth) {
    candidates.push({ position: 'bottom-center', x: pageWidth / 2 - half, width: half * 2 })
  }

  if (candidates.length) {
    candidates.sort((a, b) => a.width - b.width)
    return candidates[0]
  }
  // Elements span more than 80% of the page width across both outer zones —
  // the backend caps scale at 0.8, so the overlay shrinks slightly toward
  // the bottom-center anchor. Content stays complete and visible.
  return { position: 'bottom-center', x: pageWidth / 2 - half, width: half * 2 }
}

/** Draw one element onto the overlay canvas (canvas space = points × pixelsPerPoint). */
async function drawElement(
  context: CanvasRenderingContext2D,
  element: SignElement,
  originX: number,
  originY: number,
  pixelsPerPoint: number,
): Promise<void> {
  const centerX = (element.x + element.width / 2 - originX) * pixelsPerPoint
  const centerY = (element.y + element.height / 2 - originY) * pixelsPerPoint
  const width = element.width * pixelsPerPoint
  const height = element.height * pixelsPerPoint

  context.save()
  context.translate(centerX, centerY)
  if (element.rotation) context.rotate((element.rotation * Math.PI) / 180)
  context.globalAlpha = element.opacity ?? 1

  if (isImageElement(element) && element.src) {
    const bitmap = await loadBitmap(element.src)
    context.drawImage(bitmap, -width / 2, -height / 2, width, height)
  } else if (element.type === 'stamp') {
    const fontSize = (element.fontSize ?? 16) * pixelsPerPoint
    const color = element.color ?? '#b91c1c'
    const lineWidth = Math.max(1.2 * pixelsPerPoint, fontSize * 0.14)
    const radius = fontSize * 0.35
    context.strokeStyle = color
    context.lineWidth = lineWidth
    roundedRect(
      context,
      -width / 2 + lineWidth / 2,
      -height / 2 + lineWidth / 2,
      width - lineWidth,
      height - lineWidth,
      radius,
    )
    context.stroke()
    context.font = elementFontString(element, fontSize)
    context.fillStyle = color
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    try {
      // Matches the editor's 0.08em letter-spacing where supported.
      ;(context as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        `${fontSize * 0.08}px`
    } catch {
      /* older engines: spacing is cosmetic */
    }
    context.fillText(element.text ?? '', fontSize * 0.04, fontSize * 0.05)
  } else {
    const fontSize = (element.fontSize ?? 16) * pixelsPerPoint
    context.font = elementFontString(element, fontSize)
    context.fillStyle = element.color ?? '#1f2430'
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    context.fillText(element.text ?? '', -width / 2, 0)
  }
  context.restore()
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

function canvasToPngFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], name, { type: 'image/png' }))
      else reject(new Error('Could not export the signature overlay.'))
    }, 'image/png')
  })
}

/** Flatten one page's elements into an overlay PNG + sign-job options. */
export async function composePageOverlay(
  elements: SignElement[],
  page: number,
  pageSize: PageSize,
): Promise<PageOverlay | null> {
  const pageElements = elements.filter((element) => element.page === page)
  if (!pageElements.length) return null

  let left = Infinity
  let top = Infinity
  let right = -Infinity
  for (const element of pageElements) {
    const bounds = elementBounds(element)
    left = Math.min(left, bounds.left)
    top = Math.min(top, bounds.top)
    right = Math.max(right, bounds.right)
  }
  left = Math.max(0, left)
  top = Math.max(0, top)
  right = Math.min(pageSize.width, right)

  const horizontal = horizontalRegion(left, right, pageSize.width)
  // Vertical span: from the topmost element straight down to the page's
  // bottom edge, so the bottom anchor with margin 0 lands it exactly.
  const regionHeight = pageSize.height - top

  const pixelsPerPoint = Math.max(
    1,
    Math.min(3, MAX_CANVAS_PX / horizontal.width, MAX_CANVAS_PX / regionHeight),
  )
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(horizontal.width * pixelsPerPoint))
  canvas.height = Math.max(1, Math.round(regionHeight * pixelsPerPoint))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available in this browser.')

  for (const element of pageElements) {
    await drawElement(context, element, horizontal.x, top, pixelsPerPoint)
  }

  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, horizontal.width / pageSize.width))
  const file = await canvasToPngFile(canvas, `signature-page-${page}.png`)
  return {
    page,
    file,
    options: { page, position: horizontal.position, scale: Math.round(scale * 1e4) / 1e4, margin_mm: 0 },
    region: { x: horizontal.x, y: top, width: horizontal.width, height: regionHeight },
    dataUrl: canvas.toDataURL('image/png'),
  }
}

/** Flatten every signed page of a document, ascending page order. */
export async function composeOverlays(
  elements: SignElement[],
  pageSizes: Record<number, PageSize>,
): Promise<PageOverlay[]> {
  const pages = [...new Set(elements.map((element) => element.page))].sort((a, b) => a - b)
  const overlays: PageOverlay[] = []
  for (const page of pages) {
    const size = pageSizes[page]
    if (!size) continue
    const overlay = await composePageOverlay(elements, page, size)
    if (overlay) overlays.push(overlay)
  }
  return overlays
}

/**
 * Paint an overlay onto a rendered page preview using the same placement
 * math as the backend (`make_signature_draw`), so the review step shows the
 * true final result.
 */
export async function paintOverlayPreview(
  context: CanvasRenderingContext2D,
  overlay: PageOverlay,
  pageSize: PageSize,
  pixelsPerPoint: number,
): Promise<void> {
  const bitmap = await loadBitmap(overlay.dataUrl)
  const drawWidth = pageSize.width * overlay.options.scale
  const drawHeight = (drawWidth * bitmap.naturalHeight) / bitmap.naturalWidth
  let x: number
  if (overlay.options.position === 'bottom-left') x = 0
  else if (overlay.options.position === 'bottom-right') x = pageSize.width - drawWidth
  else x = (pageSize.width - drawWidth) / 2
  const y = pageSize.height - drawHeight // bottom anchor, margin 0 (top-left origin)
  context.drawImage(
    bitmap,
    x * pixelsPerPoint,
    y * pixelsPerPoint,
    drawWidth * pixelsPerPoint,
    drawHeight * pixelsPerPoint,
  )
}
