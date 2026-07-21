/**
 * useSignFlow — runs the signing pipeline for one or more PDFs against the
 * existing backend sign endpoint (unchanged API).
 *
 * The endpoint stamps one overlay image onto one page per job, so a document
 * signed on several pages runs a *chain* of jobs. Each job's output is a
 * stored file with its own id, which feeds the next job directly as an
 * input file id — no intermediate bytes ever travel back to the browser
 * (which also keeps download managers like IDM from hijacking the chain).
 * Every document chains independently with its own progress and error.
 */
import { computed, ref } from 'vue'
import { clamp } from '@utils'
import { pdfToolsService } from '@services/pdfTools.service'
import type { ApiFileInfo } from '@types'
import type { PageOverlay } from './sign-compose'

export type SignTaskStatus = 'waiting' | 'signing' | 'completed' | 'failed'

export interface SignTask {
  name: string
  file: File
  overlays: PageOverlay[]
  status: SignTaskStatus
  /** 0–100 across the whole chain. */
  progress: number
  /** 1-based page currently being stamped (display only). */
  currentPage: number | null
  error: string | null
  outputs: ApiFileInfo[]
}

/** How many documents sign simultaneously (each is a chain of jobs). */
const SIGN_CONCURRENCY = 2
/** Share of a task's progress bar spent uploading (rest = the job chain). */
const UPLOAD_SHARE = 15

function isCancellation(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'ERR_CANCELED'
  )
}

export function useSignFlow() {
  const tasks = ref<SignTask[]>([])
  const running = ref(false)
  const errorMessage = ref<string | null>(null)

  let abortController: AbortController | null = null

  const progress = computed(() => {
    if (!tasks.value.length) return 0
    const total = tasks.value.reduce((sum, task) => sum + task.progress, 0)
    return clamp(total / tasks.value.length, 0, 100)
  })

  const completedCount = computed(
    () => tasks.value.filter((task) => task.status === 'completed').length,
  )
  const failedCount = computed(() => tasks.value.filter((task) => task.status === 'failed').length)
  const outputs = computed(() => tasks.value.flatMap((task) => task.outputs))

  const downloadAllUrl = computed(() => {
    const ids = outputs.value.map((file) => file.id)
    if (!ids.length) return null
    return ids.length === 1
      ? pdfToolsService.fileDownloadUrl(outputs.value[0])
      : pdfToolsService.archiveDownloadUrl(ids, 'sign')
  })

  /** One document: upload PDF + overlays, then sign page after page,
   *  feeding each job's output file id into the next job. */
  async function runTask(task: SignTask, signal: AbortSignal): Promise<void> {
    const steps = task.overlays.length
    task.status = 'signing'
    task.progress = 0
    try {
      const uploaded = await pdfToolsService.uploadFiles(
        [task.file, ...task.overlays.map((overlay) => overlay.file)],
        signal,
      )
      const [pdfFile, ...overlayFiles] = uploaded
      task.progress = UPLOAD_SHARE
      const chainShare = (100 - UPLOAD_SHARE) / steps

      let currentId = pdfFile.id
      for (let step = 0; step < steps; step += 1) {
        const overlay = task.overlays[step]
        task.currentPage = overlay.page
        const stepBase = UPLOAD_SHARE + step * chainShare

        const created = await pdfToolsService.createJob(
          'sign',
          [currentId, overlayFiles[step].id],
          { ...overlay.options },
          signal,
        )
        const finished = await pdfToolsService.waitForJob(
          created.id,
          ({ progress: percent }) => {
            task.progress = clamp(
              stepBase + (percent / 100) * chainShare,
              task.progress,
              100,
            )
          },
          signal,
        )
        if (finished.status !== 'completed' || !finished.output_files.length) {
          task.status = 'failed'
          task.error = finished.error?.message ?? 'Signing failed. Please try again.'
          return
        }
        currentId = finished.output_files[0].id
        if (step === steps - 1) task.outputs = finished.output_files
      }
      task.status = 'completed'
      task.progress = 100
      task.currentPage = null
    } catch (error) {
      if (isCancellation(error)) return
      task.status = 'failed'
      task.error = pdfToolsService.extractErrorMessage(error)
    }
  }

  /**
   * Sign every document. Returns true when at least one document succeeded.
   */
  async function process(
    items: { name: string; file: File; overlays: PageOverlay[] }[],
  ): Promise<boolean> {
    errorMessage.value = null
    tasks.value = items.map((item) => ({
      ...item,
      status: 'waiting',
      progress: 0,
      currentPage: null,
      error: null,
      outputs: [],
    }))
    running.value = true
    abortController = new AbortController()
    const signal = abortController.signal

    const queue = tasks.value.map((_, index) => index)
    const workers = Array.from(
      { length: Math.min(SIGN_CONCURRENCY, queue.length) },
      async () => {
        while (queue.length && !signal.aborted) {
          const index = queue.shift()
          if (index === undefined) return
          await runTask(tasks.value[index], signal)
        }
      },
    )
    await Promise.all(workers)
    running.value = false
    if (signal.aborted) return false

    if (tasks.value.every((task) => task.status === 'failed')) {
      const messages = new Set(tasks.value.map((task) => task.error))
      errorMessage.value =
        messages.size === 1
          ? (tasks.value[0].error ?? 'Signing failed. Please try again.')
          : 'All documents failed to sign. Check each file for details.'
      return false
    }
    return true
  }

  function cancel(): void {
    abortController?.abort()
    abortController = null
    running.value = false
  }

  function reset(): void {
    cancel()
    tasks.value = []
    errorMessage.value = null
  }

  return {
    tasks,
    running,
    progress,
    errorMessage,
    completedCount,
    failedCount,
    outputs,
    downloadAllUrl,
    process,
    cancel,
    reset,
    fileDownloadUrl: (file: ApiFileInfo) => pdfToolsService.fileDownloadUrl(file),
  }
}
