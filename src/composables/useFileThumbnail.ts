/**
 * useFileThumbnail — client-side preview thumbnails for selected files.
 *
 * PDFs render their first page through pdf.js; images draw into a small
 * canvas. Results are cached module-wide (keyed by name/size/mtime) so a
 * file thumbnailed in the "ready" stage is instantly available in the
 * processing and preview views. Pure presentation — no backend involved.
 */
import { ref, watchEffect, type Ref } from 'vue'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export interface FileThumbnail {
  /** Data URL of the rendered preview, or null when not previewable. */
  url: string | null
  /** Page count for PDFs; null for images / unreadable files. */
  pages: number | null
}

/** Longest edge of a generated thumbnail, in CSS pixels. */
const THUMB_SIZE = 192

const cache = new Map<string, Promise<FileThumbnail>>()

function cacheKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

function isImage(file: File): boolean {
  return /^image\//.test(file.type) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)
}

async function renderPdfThumb(file: File): Promise<FileThumbnail> {
  const data = await file.arrayBuffer()
  const task = getDocument({ data })
  try {
    const doc = await task.promise
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const scale = THUMB_SIZE / Math.max(base.width, base.height)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width * 2) // 2× for crisp HiDPI display
    canvas.height = Math.ceil(viewport.height * 2)
    await page.render({ canvas, viewport, transform: [2, 0, 0, 2, 0, 0] }).promise
    const pages = doc.numPages
    return { url: canvas.toDataURL('image/png'), pages }
  } finally {
    void task.destroy()
  }
}

async function renderImageThumb(file: File): Promise<FileThumbnail> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = objectUrl
    })
    const scale = Math.min(1, THUMB_SIZE / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale * 2))
    canvas.height = Math.max(1, Math.round(image.height * scale * 2))
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
    return { url: canvas.toDataURL('image/jpeg', 0.85), pages: null }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Thumbnail + page count for `file`, generated once and cached. */
export function thumbnailFor(file: File): Promise<FileThumbnail> {
  const key = cacheKey(file)
  const hit = cache.get(key)
  if (hit) return hit

  const pending = (async (): Promise<FileThumbnail> => {
    try {
      if (isPdf(file)) return await renderPdfThumb(file)
      if (isImage(file)) return await renderImageThumb(file)
    } catch {
      // Encrypted/corrupted files simply fall back to the format icon.
    }
    return { url: null, pages: null }
  })()

  cache.set(key, pending)
  return pending
}

/** Reactive thumbnail for a (possibly changing) file ref. */
export function useFileThumbnail(file: Ref<File | null | undefined>): {
  thumbnail: Ref<FileThumbnail | null>
  loading: Ref<boolean>
} {
  const thumbnail = ref<FileThumbnail | null>(null)
  const loading = ref(false)

  watchEffect(() => {
    const target = file.value
    thumbnail.value = null
    if (!target) {
      loading.value = false
      return
    }
    loading.value = true
    void thumbnailFor(target).then((result) => {
      // Ignore stale results after the file changed.
      if (file.value === target) {
        thumbnail.value = result
        loading.value = false
      }
    })
  })

  return { thumbnail, loading }
}
