/**
 * Pure pdf.js helpers — load a document and paint pages onto canvases.
 *
 * Keeps the pdf.js surface area in one place so the Vue layer only deals with
 * document proxies and render tasks, never the worker wiring.
 */
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type RenderTask,
} from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/** Cap the backing-store multiplier so huge zooms don't exhaust GPU memory. */
export function pixelRatio(): number {
  return Math.min(3, globalThis.devicePixelRatio || 1)
}

/** Load PDF bytes into a document proxy. Throws `PasswordException` if locked. */
export async function loadPdf(data: ArrayBuffer | Uint8Array): Promise<PDFDocumentProxy> {
  const task = getDocument({ data })
  return task.promise
}

export interface PageMetrics {
  /** CSS pixel size at the given scale. */
  cssWidth: number
  cssHeight: number
  /** Intrinsic page size in PDF points (scale 1). */
  pointWidth: number
  pointHeight: number
  /** Page rotation in degrees, as declared by the file. */
  rotation: number
}

/** Size of a page in PDF points without painting it. */
export async function pageMetrics(page: PDFPageProxy): Promise<PageMetrics> {
  const viewport = page.getViewport({ scale: 1 })
  return {
    cssWidth: viewport.width,
    cssHeight: viewport.height,
    pointWidth: viewport.width,
    pointHeight: viewport.height,
    rotation: page.rotate,
  }
}

/**
 * Paint `page` into `canvas` at `scale`. Returns the metrics of what was drawn,
 * or `null` when the render was cancelled by a newer request. Callers should
 * cancel the previous `RenderTask` before starting the next one.
 */
export async function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<{ metrics: PageMetrics; task: RenderTask } | null> {
  const viewport = page.getViewport({ scale })
  const dpr = pixelRatio()

  canvas.width = Math.floor(viewport.width * dpr)
  canvas.height = Math.floor(viewport.height * dpr)
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`

  const task = page.render({
    canvas,
    viewport,
    transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
  })

  return {
    task,
    metrics: {
      cssWidth: viewport.width,
      cssHeight: viewport.height,
      pointWidth: viewport.width / scale,
      pointHeight: viewport.height / scale,
      rotation: page.rotate,
    },
  }
}

/** Render `page` to a PNG blob at `scale` (offscreen, dpr-independent). */
export async function renderPageToPng(page: PDFPageProxy, scale = 2): Promise<Blob> {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  await page.render({ canvas, viewport }).promise
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed'))), 'image/png')
  })
}
