/**
 * usePdfDocument — thin pdf.js wrapper for the Redact editor.
 *
 * Owns loading a browser File into a PDFDocumentProxy and rendering single
 * pages into a canvas at a given scale (devicePixelRatio-aware). Rendering
 * is serialized per canvas: a new request cancels the in-flight one.
 */
import { ref, shallowRef } from 'vue'
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type RenderTask,
} from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export interface RenderedPage {
  /** CSS pixel size of the rendered page (canvas backing store is × dpr). */
  cssWidth: number
  cssHeight: number
  /** Page size in PDF points (scale 1). */
  pointWidth: number
  pointHeight: number
}

export function usePdfDocument() {
  const doc = shallowRef<PDFDocumentProxy | null>(null)
  const pageCount = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let renderTask: RenderTask | null = null
  let loadingTask: PDFDocumentLoadingTask | null = null
  let generation = 0

  async function load(file: File): Promise<void> {
    loading.value = true
    error.value = null
    const myGeneration = ++generation
    void loadingTask?.destroy()
    try {
      const data = await file.arrayBuffer()
      const task = getDocument({ data })
      const loaded = await task.promise
      if (myGeneration !== generation) {
        void task.destroy()
        return
      }
      loadingTask = task
      doc.value = loaded
      pageCount.value = loaded.numPages
    } catch (cause) {
      if (myGeneration !== generation) return
      const name = (cause as { name?: string })?.name
      error.value =
        name === 'PasswordException'
          ? 'This PDF is password-protected. Unlock it with the Unlock PDF tool first.'
          : 'Could not display this PDF. It may be corrupted — you can still redact by text.'
      doc.value = null
      pageCount.value = 0
    } finally {
      if (myGeneration === generation) loading.value = false
    }
  }

  /** Size of `pageNumber` in PDF points, without rendering it. */
  async function pageSize(pageNumber: number): Promise<{ width: number; height: number } | null> {
    if (!doc.value) return null
    const page = await doc.value.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1 })
    return { width: viewport.width, height: viewport.height }
  }

  /** Render `pageNumber` into `canvas` at `scale`; resolves with page metrics. */
  async function renderPage(
    canvas: HTMLCanvasElement,
    pageNumber: number,
    scale: number,
  ): Promise<RenderedPage | null> {
    if (!doc.value) return null
    const page = await doc.value.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const dpr = Math.min(3, globalThis.devicePixelRatio || 1)

    renderTask?.cancel()
    canvas.width = Math.floor(viewport.width * dpr)
    canvas.height = Math.floor(viewport.height * dpr)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    renderTask = page.render({
      canvas,
      viewport,
      transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
    })
    try {
      await renderTask.promise
    } catch (cause) {
      // A newer render superseded this one — the caller can ignore it.
      if ((cause as { name?: string })?.name === 'RenderingCancelledException') return null
      throw cause
    }
    return {
      cssWidth: viewport.width,
      cssHeight: viewport.height,
      pointWidth: viewport.width / scale,
      pointHeight: viewport.height / scale,
    }
  }

  function destroy(): void {
    generation += 1
    renderTask?.cancel()
    renderTask = null
    void loadingTask?.destroy()
    loadingTask = null
    doc.value = null
    pageCount.value = 0
  }

  return { doc, pageCount, loading, error, load, pageSize, renderPage, destroy }
}
