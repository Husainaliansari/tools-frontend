/**
 * usePdfMetadata — read a PDF's document info (Title/Author/Subject/Keywords…)
 * from a browser File, entirely client-side via pdf.js.
 *
 * The Metadata Editor needs to *show* a file's current metadata before the
 * user edits it, but tool inputs aren't uploaded until the run starts — so a
 * server round-trip would mean uploading just to peek. pdf.js is already a
 * dependency (see usePdfDocument), so we read the Info dictionary in the
 * browser instead. Loads are generation-guarded: a newer file cancels the
 * in-flight read so a slow parse can't overwrite a fresher result.
 */
import { ref, shallowRef } from 'vue'
import { GlobalWorkerOptions, getDocument, type PDFDocumentLoadingTask } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/** The four editable fields plus the read-only context fields we surface. */
export interface PdfMetadata {
  title: string
  author: string
  subject: string
  keywords: string
  creator: string
  producer: string
}

const EMPTY: PdfMetadata = {
  title: '',
  author: '',
  subject: '',
  keywords: '',
  creator: '',
  producer: '',
}

/** pdf.js types `info` loosely; pull the string fields we care about. */
function readInfo(info: Record<string, unknown>): PdfMetadata {
  const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
  return {
    title: str(info.Title),
    author: str(info.Author),
    subject: str(info.Subject),
    keywords: str(info.Keywords),
    creator: str(info.Creator),
    producer: str(info.Producer),
  }
}

export function usePdfMetadata() {
  const metadata = shallowRef<PdfMetadata | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let generation = 0
  let loadingTask: PDFDocumentLoadingTask | null = null

  /** Read metadata from `file`. Resolves with the parsed values (or EMPTY). */
  async function read(file: File): Promise<PdfMetadata> {
    loading.value = true
    error.value = null
    metadata.value = null
    const myGeneration = ++generation
    void loadingTask?.destroy()
    try {
      const data = await file.arrayBuffer()
      const task = getDocument({ data })
      loadingTask = task
      const doc = await task.promise
      const { info } = await doc.getMetadata()
      if (myGeneration !== generation) {
        void task.destroy()
        return EMPTY
      }
      const parsed = readInfo((info ?? {}) as Record<string, unknown>)
      metadata.value = parsed
      return parsed
    } catch (cause) {
      if (myGeneration !== generation) return EMPTY
      const name = (cause as { name?: string })?.name
      error.value =
        name === 'PasswordException'
          ? 'This PDF is password-protected — unlock it first to view its metadata.'
          : 'Could not read this PDF’s metadata. It may be corrupted.'
      metadata.value = null
      return EMPTY
    } finally {
      if (myGeneration === generation) loading.value = false
    }
  }

  function reset(): void {
    generation += 1
    void loadingTask?.destroy()
    loadingTask = null
    metadata.value = null
    loading.value = false
    error.value = null
  }

  return { metadata, loading, error, read, reset }
}
