import { computed, ref } from 'vue'
import { clamp } from '@utils'
import { formatLimitMB } from '@constants/planLimits'
import {
  BATCH_CONCURRENCY,
  COMBINE_TOOL_SLUGS,
  IMPLEMENTED_TOOL_SLUGS,
  pdfToolsService,
  uploadSpecFor,
  type UploadSpec,
} from '@services/pdfTools.service'
import { useAuthStore } from '@stores/auth.store'
import type { ApiFileInfo, ApiJobInfo, PdfTool, ToolFile, ToolStage } from '@types'

/** Share of a file's progress bar spent on the upload leg (rest = conversion). */
const UPLOAD_SHARE = 15

/** True for a user-initiated abort: DOM AbortError or axios CanceledError. */
function isCancellation(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'ERR_CANCELED'
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * useToolFlow — the real upload → ready → processing → done lifecycle for a
 * tool page.
 *
 * Tools that treat each input independently (conversions, compress, ...) run
 * a *batch* pipeline: every file uploads and converts as its own job, with
 * per-file status, progress, ETA and an early download the moment that file
 * finishes — a failure only affects its own file. Tools whose inputs form one
 * logical operation (merge, compare, ...) run a single combined job whose
 * progress is mirrored onto every row.
 *
 * Tools the backend does not implement yet run a short simulated pass so
 * their pages remain demonstrable.
 */
export function useToolFlow() {
  const auth = useAuthStore()
  const stage = ref<ToolStage>('idle')
  const files = ref<ToolFile[]>([])
  const progress = ref(0)
  const errorMessage = ref<string | null>(null)
  const validationError = ref<string | null>(null)
  const job = ref<ApiJobInfo | null>(null)

  let abortController: AbortController | null = null
  let ticking = false

  /** All outputs across the run: the combined job's, or every file-job's. */
  const outputs = computed<ApiFileInfo[]>(() => {
    if (job.value) return job.value.output_files
    return files.value.flatMap((file) => file.outputs ?? [])
  })

  /** The tool this flow is running — names the "Download all" ZIP. */
  const activeTool = ref<PdfTool | null>(null)

  const downloadAllUrl = computed(() => {
    if (job.value) return pdfToolsService.jobDownloadUrl(job.value.id)
    const ids = outputs.value.map((file) => file.id)
    if (!ids.length) return null
    return ids.length === 1
      ? pdfToolsService.fileDownloadUrl(outputs.value[0])
      : pdfToolsService.archiveDownloadUrl(ids, activeTool.value?.slug)
  })

  const completedCount = computed(
    () => files.value.filter((file) => file.status === 'completed').length,
  )
  const failedCount = computed(() => files.value.filter((file) => file.status === 'failed').length)

  /** Combined size of the current selection, in bytes. */
  const totalBytes = computed(() =>
    files.value.reduce((sum, file) => sum + (file.raw?.size ?? 0), 0),
  )
  /** Combined size of the current selection, human-formatted. */
  const totalSizeLabel = computed(() => formatBytes(totalBytes.value))

  /** The message when `count` files break the file-count limit, or null. */
  function fileCountProblem(spec: UploadSpec, count: number): string | null {
    if (count <= spec.maxFiles) return null
    return spec.maxFilesLimitedBy === 'plan'
      ? `Your ${spec.plan.label} plan allows up to ${spec.maxFiles} files per task.`
      : `${activeTool.value?.name ?? 'This tool'} accepts at most ${spec.maxFiles} file${spec.maxFiles > 1 ? 's' : ''}.`
  }

  /** The message for a selection that breaks a count/size limit, or null. */
  function selectionProblem(spec: UploadSpec, count: number, bytes: number): string | null {
    const countProblem = fileCountProblem(spec, count)
    if (countProblem) return countProblem
    if (bytes > spec.maxTotalSizeMB * 1024 * 1024) {
      return `Combined size ${formatBytes(bytes)} exceeds the ${formatLimitMB(spec.maxTotalSizeMB)} total limit of your ${spec.plan.label} plan.`
    }
    return null
  }

  /** Add real files (from the file input or a drop event). */
  function addFiles(tool: PdfTool, selected: File[] | FileList): void {
    validationError.value = null
    activeTool.value = tool
    const spec = uploadSpecFor(tool, auth.userPlan)
    let bytes = totalBytes.value

    for (const file of Array.from(selected)) {
      const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
      if (!spec.extensions.includes(ext)) {
        const allowed = spec.extensions.map((e) => e.slice(1).toUpperCase()).join(', ')
        validationError.value = `Only ${allowed} files are accepted for ${tool.name}.`
        break
      }
      if (file.size > spec.maxSizeMB * 1024 * 1024) {
        validationError.value = `“${file.name}” is ${formatBytes(file.size)} — over the ${formatLimitMB(spec.maxSizeMB)} per-file limit of your ${spec.plan.label} plan.`
        break
      }
      const countProblem = fileCountProblem(spec, files.value.length + 1)
      if (countProblem) {
        validationError.value = countProblem
        break
      }
      if (bytes + file.size > spec.maxTotalSizeMB * 1024 * 1024) {
        validationError.value = `“${file.name}” (${formatBytes(file.size)}) was not added — it would bring the total to ${formatBytes(bytes + file.size)}, over the ${formatLimitMB(spec.maxTotalSizeMB)} limit of your ${spec.plan.label} plan.`
        break
      }
      bytes += file.size
      files.value.push({
        name: file.name,
        size: formatBytes(file.size),
        pages: 0,
        raw: file,
      })
    }
    if (files.value.length) {
      stage.value = 'ready'
      progress.value = 0
    }
  }

  function removeFile(index: number): void {
    files.value.splice(index, 1)
    validationError.value = null
    if (!files.value.length) stage.value = 'idle'
  }

  /** Swap the file at `index` for a new one, re-validating the selection. */
  function replaceFile(tool: PdfTool, index: number, file: File): void {
    const current = files.value[index]
    if (!current) return
    validationError.value = null
    const spec = uploadSpecFor(tool, auth.userPlan)

    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
    if (!spec.extensions.includes(ext)) {
      const allowed = spec.extensions.map((e) => e.slice(1).toUpperCase()).join(', ')
      validationError.value = `Only ${allowed} files are accepted for ${tool.name}.`
      return
    }
    if (file.size > spec.maxSizeMB * 1024 * 1024) {
      validationError.value = `“${file.name}” is ${formatBytes(file.size)} — over the ${formatLimitMB(spec.maxSizeMB)} per-file limit of your ${spec.plan.label} plan.`
      return
    }
    const bytesAfterSwap = totalBytes.value - (current.raw?.size ?? 0) + file.size
    if (bytesAfterSwap > spec.maxTotalSizeMB * 1024 * 1024) {
      validationError.value = `“${file.name}” (${formatBytes(file.size)}) would bring the total to ${formatBytes(bytesAfterSwap)}, over the ${formatLimitMB(spec.maxTotalSizeMB)} limit of your ${spec.plan.label} plan.`
      return
    }
    files.value.splice(index, 1, {
      name: file.name,
      size: formatBytes(file.size),
      pages: 0,
      raw: file,
    })
  }

  /** Clear per-file pipeline state (before a fresh run / after a cancel). */
  function clearPipelineState(): void {
    for (const file of files.value) {
      file.status = undefined
      file.progress = undefined
      file.error = null
      file.outputs = undefined
      file.etaSeconds = null
    }
  }

  function reset(): void {
    abortController?.abort()
    abortController = null
    stage.value = 'idle'
    files.value = []
    progress.value = 0
    errorMessage.value = null
    validationError.value = null
    job.value = null
    activeTool.value = null
    ticking = false
  }

  function cancel(): void {
    abortController?.abort()
    abortController = null
    ticking = false
    clearPipelineState()
    stage.value = files.value.length ? 'ready' : 'idle'
    progress.value = 0
  }

  /** Refresh the whole-run progress bar from the per-file bars. */
  function syncOverallProgress(): void {
    const items = files.value
    if (!items.length) return
    const total = items.reduce((sum, file) => sum + (file.progress ?? 0), 0)
    progress.value = clamp(total / items.length, 0, 100)
  }

  /** Estimate seconds remaining from the observed progress rate. */
  function updateEta(file: ToolFile, startedAt: number): void {
    const percent = file.progress ?? 0
    const elapsedSeconds = (performance.now() - startedAt) / 1000
    // Too early to extrapolate — a rate measured on the first few percent
    // (or first couple of seconds) swings wildly.
    if (percent < 10 || elapsedSeconds < 2) {
      file.etaSeconds = null
      return
    }
    file.etaSeconds = Math.max(1, Math.ceil((elapsedSeconds * (100 - percent)) / percent))
  }

  /** Upload the selected files, run the tool and wait for the result.
   *
   * ``extraFiles`` upload with the job without appearing in the selection
   * list (e.g. the watermark stamp image picked in the options panel); they
   * only apply to combined-job tools.
   *
   * ``perFileOptions`` lets batch tools send file-specific options (e.g.
   * redaction areas drawn per file) merged over the shared ``options`` for
   * that file's job. Ignored for combined-job tools. */
  async function process(
    tool: PdfTool,
    options: Record<string, unknown> = {},
    extraFiles: File[] = [],
    perFileOptions?: (fileIndex: number) => Record<string, unknown>,
  ): Promise<void> {
    activeTool.value = tool
    // Re-check the whole selection against the plan/tool limits before any
    // byte leaves the browser (the plan may have changed since selection).
    const problem = selectionProblem(
      uploadSpecFor(tool, auth.userPlan),
      files.value.length,
      totalBytes.value,
    )
    if (problem) {
      validationError.value = problem
      return
    }
    if (!IMPLEMENTED_TOOL_SLUGS.has(tool.slug)) {
      simulate()
      return
    }

    // `combine` is a frontend-only switch (JPG/PNG→PDF: merge into one
    // document vs. convert each image separately) — not a backend option.
    const { combine, ...jobOptions } = options
    const combined = COMBINE_TOOL_SLUGS.has(tool.slug) || combine === true

    stage.value = 'processing'
    progress.value = 0
    errorMessage.value = null
    job.value = null
    clearPipelineState()
    abortController = new AbortController()
    const signal = abortController.signal

    try {
      if (combined) {
        await processCombined(tool, jobOptions, signal, extraFiles)
      } else {
        await processBatch(tool, jobOptions, signal, perFileOptions)
      }
    } catch (error) {
      if (isCancellation(error)) return
      errorMessage.value = pdfToolsService.extractErrorMessage(error)
      stage.value = 'error'
    } finally {
      if (!signal.aborted) abortController = null
    }
  }

  /** One job per file, a few in flight at a time — results land as they finish. */
  async function processBatch(
    tool: PdfTool,
    options: Record<string, unknown>,
    signal: AbortSignal,
    perFileOptions?: (fileIndex: number) => Record<string, unknown>,
  ): Promise<void> {
    const items = files.value
    for (const file of items) {
      file.status = 'waiting'
      file.progress = 0
    }

    const queue = items.map((_, index) => index)
    const workers = Array.from({ length: Math.min(BATCH_CONCURRENCY, queue.length) }, async () => {
      while (queue.length && !signal.aborted) {
        const index = queue.shift()
        if (index === undefined) return
        const fileOptions = perFileOptions ? { ...options, ...perFileOptions(index) } : options
        await processOne(tool, fileOptions, items[index], signal)
      }
    })
    await Promise.all(workers)
    if (signal.aborted) return

    if (items.every((file) => file.status === 'failed')) {
      const messages = new Set(items.map((file) => file.error))
      errorMessage.value =
        messages.size === 1
          ? (items[0].error ?? 'Processing failed. Please try again.')
          : 'All files failed to process. Check each file for details.'
      stage.value = 'error'
    } else {
      progress.value = 100
      stage.value = 'done'
    }
  }

  /** The full pipeline for one file: upload → job → progress → outcome. */
  async function processOne(
    tool: PdfTool,
    options: Record<string, unknown>,
    file: ToolFile,
    signal: AbortSignal,
  ): Promise<void> {
    const startedAt = performance.now()
    try {
      file.status = 'uploading'
      const uploaded = await pdfToolsService.uploadFile(
        file.raw as File,
        (percent) => {
          file.progress = (percent / 100) * UPLOAD_SHARE
          syncOverallProgress()
        },
        signal,
      )

      file.status = 'converting'
      file.progress = UPLOAD_SHARE
      const created = await pdfToolsService.createJob(tool.slug, [uploaded.id], options, signal)
      const finished = await pdfToolsService.waitForJob(
        created.id,
        ({ progress: percent }) => {
          file.progress = clamp(
            UPLOAD_SHARE + (percent / 100) * (100 - UPLOAD_SHARE),
            file.progress ?? 0,
            100,
          )
          updateEta(file, startedAt)
          syncOverallProgress()
        },
        signal,
      )

      file.etaSeconds = null
      if (finished.status === 'completed') {
        file.status = 'completed'
        file.progress = 100
        file.outputs = finished.output_files
      } else {
        file.status = 'failed'
        file.error = finished.error?.message ?? 'Processing failed. Please try again.'
      }
    } catch (error) {
      if (isCancellation(error)) return
      file.status = 'failed'
      file.error = pdfToolsService.extractErrorMessage(error)
      file.etaSeconds = null
    } finally {
      syncOverallProgress()
    }
  }

  /** Single-job run for tools whose inputs belong together (merge, compare, ...). */
  async function processCombined(
    tool: PdfTool,
    options: Record<string, unknown>,
    signal: AbortSignal,
    extraFiles: File[] = [],
  ): Promise<void> {
    const items = files.value
    const startedAt = performance.now()
    const setAll = (updater: (file: ToolFile) => void) => {
      for (const file of items) updater(file)
    }

    setAll((file) => {
      file.status = 'uploading'
      file.progress = 0
    })
    const raw = items.map((f) => f.raw).filter((f): f is File => Boolean(f))
    const uploaded = await pdfToolsService.uploadFiles([...raw, ...extraFiles], signal)
    setAll((file) => {
      file.status = 'converting'
      file.progress = UPLOAD_SHARE
    })
    syncOverallProgress()

    const created = await pdfToolsService.createJob(
      tool.slug,
      uploaded.map((f) => f.id),
      options,
      signal,
    )
    const finished = await pdfToolsService.waitForJob(
      created.id,
      ({ progress: percent }) => {
        const overall = clamp(
          UPLOAD_SHARE + (percent / 100) * (100 - UPLOAD_SHARE),
          UPLOAD_SHARE,
          100,
        )
        setAll((file) => {
          file.progress = overall
          updateEta(file, startedAt)
        })
        syncOverallProgress()
      },
      signal,
    )

    job.value = finished
    if (finished.status === 'completed') {
      setAll((file) => {
        file.status = 'completed'
        file.progress = 100
        file.etaSeconds = null
      })
      progress.value = 100
      stage.value = 'done'
    } else {
      const message = finished.error?.message ?? 'Processing failed. Please try again.'
      setAll((file) => {
        file.status = 'failed'
        file.error = message
        file.etaSeconds = null
      })
      errorMessage.value = message
      stage.value = 'error'
    }
  }

  /** Demo pass for tools without a backend implementation yet. */
  function simulate(): void {
    stage.value = 'processing'
    progress.value = 0
    ticking = true
    for (const file of files.value) {
      file.status = 'converting'
      file.progress = 0
    }

    const tick = () => {
      if (!ticking || stage.value !== 'processing') return
      progress.value = clamp(progress.value + (8 + Math.random() * 14), 0, 100)
      for (const file of files.value) file.progress = progress.value
      if (progress.value >= 100) {
        progress.value = 100
        setTimeout(() => {
          if (stage.value === 'processing') {
            for (const file of files.value) {
              file.status = 'completed'
              file.progress = 100
            }
            stage.value = 'done'
          }
        }, 350)
        return
      }
      setTimeout(tick, 180)
    }

    setTimeout(tick, 200)
  }

  function fileDownloadUrl(file: ApiFileInfo): string {
    return pdfToolsService.fileDownloadUrl(file)
  }

  return {
    stage,
    files,
    progress,
    errorMessage,
    validationError,
    job,
    outputs,
    downloadAllUrl,
    completedCount,
    failedCount,
    totalBytes,
    totalSizeLabel,
    addFiles,
    removeFile,
    replaceFile,
    reset,
    cancel,
    process,
    fileDownloadUrl,
  }
}
