/**
 * PDF Tools backend service — uploads, tool jobs, progress and downloads.
 *
 * Mirrors the FastAPI contract:
 *   POST /api/v1/files                    multipart upload (field: files)
 *   POST /api/v1/tools/{slug}             { file_ids, options } -> 202 job
 *   GET  /api/v1/jobs/{id}                job status + results
 *   GET  /api/v1/jobs/{id}/events         SSE progress stream
 *   GET  /api/v1/jobs/{id}/download       single file or ZIP of all outputs
 */
import { apiClient } from '@api/client'
import { appConfig } from '@config'
import { limitsForPlan, type PlanLimits } from '@constants/planLimits'
import type {
  ApiEnvelope,
  ApiFileInfo,
  ApiJobInfo,
  ApiUploadResult,
  PdfTool,
  SubscriptionPlan,
} from '@types'

const API = '/api/v1'

// ─── Upload rules per tool ────────────────────────────────────────────────────

export interface UploadSpec {
  /** Accepted extensions including the dot, e.g. ['.pdf']. */
  extensions: string[]
  /** Accept attribute for <input type="file">. */
  accept: string
  /** Effective cap: the stricter of the tool's and the plan's file count. */
  maxFiles: number
  /** Which rule set the maxFiles cap — drives the validation message. */
  maxFilesLimitedBy: 'tool' | 'plan'
  maxSizeMB: number
  maxTotalSizeMB: number
  /** The subscription limits the caps were derived from. */
  plan: PlanLimits
}

/**
 * Tools whose whole selection feeds ONE backend job, so the file count is a
 * hard cap from the tool's backend service (everything not listed in either
 * structure below takes a single file).
 */
const HARD_MULTI_FILE_LIMITS: Record<string, number> = {
  merge: 20,
  'jpg-to-pdf': 20,
  'png-to-pdf': 20,
  watermark: 11, // up to 10 PDFs + 1 watermark image
  sign: 11, // up to 10 PDFs + 1 signature image
  compare: 2,
}

/**
 * Tools that process each file as its own independent job — the count is
 * capped only by the user's plan.
 */
const BATCH_TOOL_SLUGS = new Set([
  'rotate',
  'compress',
  'compress-scanned',
  'pdf-to-word',
  'word-to-pdf',
  'excel-to-pdf',
  'ppt-to-pdf',
  'pdf-to-jpg',
  'pdf-to-png',
  'remove-watermark',
  'header-footer',
  'page-numbers',
  'protect',
  'unlock',
  'ocr',
  'repair',
  'metadata',
  'redact',
])

/** Derive the upload rules for a tool from its formats and the user's plan. */
export function uploadSpecFor(tool: PdfTool, plan?: SubscriptionPlan | null): UploadSpec {
  const extensions = tool.formats.map((format) => `.${format.toLowerCase()}`)
  // Watermark/Sign also take an image (the stamp / the signature).
  if (tool.slug === 'watermark' || tool.slug === 'sign') {
    extensions.push('.jpg', '.jpeg', '.png')
  }
  const limits = limitsForPlan(plan)
  const toolMaxFiles =
    HARD_MULTI_FILE_LIMITS[tool.slug] ?? (BATCH_TOOL_SLUGS.has(tool.slug) ? Infinity : 1)
  return {
    extensions,
    accept: extensions.join(','),
    maxFiles: Math.min(toolMaxFiles, limits.maxFiles),
    maxFilesLimitedBy: toolMaxFiles <= limits.maxFiles ? 'tool' : 'plan',
    maxSizeMB: limits.maxFileSizeMB,
    maxTotalSizeMB: limits.maxTotalSizeMB,
    plan: limits,
  }
}

/**
 * Tools whose inputs form one logical operation (N files → interdependent
 * result), so a run is always a single job. Every other multi-file tool
 * treats inputs independently and runs one job per file, giving each file
 * its own progress, result and error.
 */
export const COMBINE_TOOL_SLUGS = new Set(['merge', 'compare', 'watermark', 'sign'])

/** How many files upload/convert simultaneously during a batch run. */
export const BATCH_CONCURRENCY = 3

/** Tool slugs the backend implements; everything else falls back to demo mode. */
export const IMPLEMENTED_TOOL_SLUGS = new Set([
  'compress',
  'merge',
  'split',
  'rotate',
  'delete-pages',
  'extract-pages',
  'reorder',
  'pdf-to-word',
  'word-to-pdf',
  'excel-to-pdf',
  'ppt-to-pdf',
  'pdf-to-jpg',
  'pdf-to-png',
  'jpg-to-pdf',
  'png-to-pdf',
  'watermark',
  'remove-watermark',
  'header-footer',
  'page-numbers',
  'protect',
  'unlock',
  'ocr',
  'repair',
  'compress-scanned',
  'metadata',
  'compare',
  'redact',
  'fill-forms',
  'sign',
])

export interface JobProgress {
  status: ApiJobInfo['status'] | 'pending'
  progress: number
}

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'expired'])

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const err = error as {
      response?: { data?: { error?: { message?: string } }; status?: number }
      code?: string
      message?: string
    }
    // A structured backend error is always the most useful thing to show.
    const backendMessage = err.response?.data?.error?.message
    if (backendMessage) return backendMessage
    // No HTTP response reached us — tell the user what to do about it rather
    // than a dead-end "something went wrong".
    if (err.response === undefined) {
      if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message ?? '')) {
        return 'The server took too long to respond. Please try again in a moment.'
      }
      if (err.code === 'ERR_NETWORK' || /network/i.test(err.message ?? '')) {
        return 'Couldn’t reach the server. Check your connection and try again.'
      }
    }
  }
  return 'Something went wrong. Please try again.'
}

export const pdfToolsService = {
  /** Upload files; returns the stored file records. */
  async uploadFiles(files: File[], signal?: AbortSignal): Promise<ApiFileInfo[]> {
    const form = new FormData()
    for (const file of files) form.append('files', file)
    // No timeout: large uploads legitimately outlive the global 30s cap.
    const { data } = await apiClient.post<ApiEnvelope<ApiUploadResult>>(`${API}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0,
      signal,
    })
    return data.data.files
  },

  /** Upload one file, reporting upload progress as 0-100. */
  async uploadFile(
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<ApiFileInfo> {
    const form = new FormData()
    form.append('files', file)
    const { data } = await apiClient.post<ApiEnvelope<ApiUploadResult>>(`${API}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0,
      signal,
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
        }
      },
    })
    return data.data.files[0]
  },

  /** Create a processing job for a tool. */
  async createJob(
    slug: string,
    fileIds: string[],
    options: Record<string, unknown> = {},
    signal?: AbortSignal,
  ): Promise<ApiJobInfo> {
    // No timeout: when the backend runs jobs inline (dev/eager mode, no
    // worker), this request blocks for the whole conversion — pdf2docx runs
    // of a minute+ are normal and must not be cut off at the global 30s cap.
    const { data } = await apiClient.post<ApiEnvelope<ApiJobInfo>>(
      `${API}/tools/${slug}`,
      { file_ids: fileIds, options },
      { timeout: 0, signal },
    )
    return data.data
  },

  async getJob(jobId: string): Promise<ApiJobInfo> {
    const { data } = await apiClient.get<ApiEnvelope<ApiJobInfo>>(`${API}/jobs/${jobId}`)
    return data.data
  },

  /**
   * Wait for a job to finish, reporting progress along the way.
   * Transport ladder: WebSocket push → SSE stream → 1s polling.
   */
  waitForJob(
    jobId: string,
    onProgress: (update: JobProgress) => void,
    signal?: AbortSignal,
  ): Promise<ApiJobInfo> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      let settled = false
      let pollTimer: ReturnType<typeof setTimeout> | null = null
      let source: EventSource | null = null
      let socket: WebSocket | null = null
      let watchdog: ReturnType<typeof setTimeout> | null = null

      // The server pushes an immediate snapshot on connect, so a healthy
      // WebSocket/SSE stream delivers within ~1s. If a stream connects but
      // stays silent — a proxy/CDN that tunnels the upgrade yet drops frames —
      // this watchdog drops to the next transport instead of hanging forever.
      const STREAM_SILENCE_MS = 5000
      const clearWatchdog = () => {
        if (watchdog) {
          clearTimeout(watchdog)
          watchdog = null
        }
      }
      const armWatchdog = (onSilence: () => void) => {
        clearWatchdog()
        watchdog = setTimeout(() => {
          if (!settled) onSilence()
        }, STREAM_SILENCE_MS)
      }

      const cleanup = () => {
        clearWatchdog()
        socket?.close()
        socket = null
        source?.close()
        source = null
        if (pollTimer) clearTimeout(pollTimer)
      }

      // Fetch the full job (with output files) once a terminal state is seen.
      const finish = async () => {
        if (settled) return
        settled = true
        cleanup()
        try {
          resolve(await this.getJob(jobId))
        } catch (error) {
          reject(error)
        }
      }

      const handleEvent = (payload: { status: ApiJobInfo['status']; progress: number }) => {
        onProgress({ status: payload.status, progress: payload.progress })
        if (TERMINAL_STATUSES.has(payload.status)) void finish()
      }

      const poll = async () => {
        if (settled || signal?.aborted) return
        try {
          const job = await this.getJob(jobId)
          handleEvent(job)
          if (settled) return
        } catch {
          /* transient — keep polling */
        }
        pollTimer = setTimeout(poll, 1000)
      }

      const fallbackToPoll = () => {
        source?.close()
        source = null
        void poll()
      }

      const startSse = () => {
        if (settled || typeof EventSource === 'undefined') return void poll()
        source = new EventSource(`${appConfig.apiBaseUrl}${API}/jobs/${jobId}/events`)
        // Re-arm on every message so a stream that dies mid-way also degrades.
        armWatchdog(fallbackToPoll)
        source.onmessage = (event) => {
          armWatchdog(fallbackToPoll)
          handleEvent(JSON.parse(event.data))
        }
        source.onerror = () => {
          clearWatchdog()
          fallbackToPoll()
        }
      }

      const startWebSocket = () => {
        if (typeof WebSocket === 'undefined' || !appConfig.wsBaseUrl) return void startSse()
        try {
          socket = new WebSocket(`${appConfig.wsBaseUrl}${API}/jobs/${jobId}/ws`)
        } catch {
          return void startSse()
        }
        let received = false
        const fallbackToSse = () => {
          socket?.close()
          socket = null
          if (!settled) startSse()
        }
        armWatchdog(fallbackToSse)
        socket.onmessage = (event) => {
          received = true
          armWatchdog(fallbackToSse)
          const payload = JSON.parse(event.data)
          if (payload.error) return void finish()
          handleEvent(payload)
        }
        socket.onerror = () => {
          clearWatchdog()
          fallbackToSse()
        }
        socket.onclose = () => {
          // Server closes after the terminal event; anything else = fallback.
          clearWatchdog()
          if (!settled && !received) startSse()
        }
      }

      signal?.addEventListener('abort', () => {
        settled = true
        cleanup()
        reject(new DOMException('Aborted', 'AbortError'))
      })

      startWebSocket()
    })
  },

  /** Absolute download URL for a processed/uploaded file. */
  fileDownloadUrl(file: ApiFileInfo): string {
    return `${appConfig.apiBaseUrl}${file.download_url}`
  },

  /** Absolute URL downloading all job outputs (ZIP when several). */
  jobDownloadUrl(jobId: string): string {
    return `${appConfig.apiBaseUrl}${API}/jobs/${jobId}/download`
  },

  /** Absolute URL bundling several files into one ZIP download.
   * `tool` names the ZIP: `<tool>-<count>-files-<date>.zip`. */
  archiveDownloadUrl(fileIds: string[], tool?: string): string {
    const toolParam = tool ? `&tool=${encodeURIComponent(tool)}` : ''
    return `${appConfig.apiBaseUrl}${API}/files/archive?ids=${fileIds.join(',')}${toolParam}`
  },

  extractErrorMessage,
}
