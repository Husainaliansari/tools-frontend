/**
 * Global TypeScript type definitions shared across the application.
 * Domain-specific types live in their own modules (e.g., auth.types.ts).
 */

// ─── Utility types ────────────────────────────────────────────────────────────

/** Makes specific keys of T required and non-nullable */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>

/** Makes all properties deeply readonly */
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}

/** Nullable wrapper */
export type Nullable<T> = T | null

/** Optional wrapper */
export type Maybe<T> = T | null | undefined

/** Generic ID type */
export type ID = string | number

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  status: number
}

export interface ApiErrorResponse {
  message: string
  errors?: Record<string, string[]>
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
  links: PaginationLinks
}

export interface PaginationMeta {
  current_page: number
  from: number
  last_page: number
  per_page: number
  to: number
  total: number
}

export interface PaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

export interface PaginationParams {
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system'

// ─── Async state ──────────────────────────────────────────────────────────────

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T = unknown> {
  status: AsyncStatus
  data: T | null
  error: string | null
}

// ─── File ─────────────────────────────────────────────────────────────────────

export interface UploadedFile {
  id: ID
  name: string
  size: number
  mime_type: string
  url: string
  created_at: string
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: ID
  name: string
  email: string
  email_verified_at: string | null
  avatar: string | null
  plan: SubscriptionPlan
  /** Whether the account has admin-panel access (backend `is_admin`). */
  is_admin?: boolean
  /** Account moderation status (backend `status`). */
  status?: string
  created_at: string
  updated_at: string
}

export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

// ─── Route ────────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string
  to?: string | { name: string }
}

// ─── Component ────────────────────────────────────────────────────────────────

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ComponentVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'ghost'
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'

// ─── PDF Tools ──────────────────────────────────────────────────────────────

export type ToolCategory =
  'Organize' | 'Optimize' | 'Convert to PDF' | 'Convert from PDF' | 'Edit' | 'Security'

/** A single PDF tool in the registry. */
export interface PdfTool {
  slug: string
  name: string
  category: ToolCategory
  icon: string
  description: string
  /** Accepted input formats. */
  formats: string[]
  /** Output format (for converters), if different from input. */
  output?: string
  /** Accent color (hex) used for tints and gradients. */
  color: string
  /** Flagged as a popular / featured tool. */
  popular?: boolean
}

/** Lifecycle stages of the tool upload → process → done flow. */
export type ToolStage = 'idle' | 'ready' | 'processing' | 'done' | 'error'

/** Per-file lifecycle within a processing run. */
export type ToolFileStatus = 'waiting' | 'uploading' | 'converting' | 'completed' | 'failed'

/** A file selected within a tool flow. */
export interface ToolFile {
  name: string
  size: string
  /** Page count when known; 0 = unknown (real uploads are not pre-parsed). */
  pages: number
  /** The underlying browser File for real uploads. */
  raw?: File
  /** Live pipeline state while a run is in flight (set by useToolFlow). */
  status?: ToolFileStatus
  /** 0-100 across upload + conversion for this file. */
  progress?: number
  /** Failure message for this file only; other files keep processing. */
  error?: string | null
  /** This file's converted outputs, available as soon as its job finishes. */
  outputs?: ApiFileInfo[]
  /** Estimated seconds remaining, when the progress rate allows an estimate. */
  etaSeconds?: number | null
}

// ─── PDF Tools backend API ───────────────────────────────────────────────────

/** Standard success envelope returned by the FastAPI backend. */
export interface ApiEnvelope<T> {
  success: boolean
  data: T
  message?: string | null
  request_id?: string | null
}

export interface ApiFileInfo {
  id: string
  original_name: string
  category: 'upload' | 'processed' | 'thumbnail'
  media_type: string
  extension: string
  size_bytes: number
  status: string
  created_at: string
  expires_at: string | null
  size_human: string
  download_url: string
}

export interface ApiUploadResult {
  files: ApiFileInfo[]
  count: number
}

export type ApiJobStatus =
  'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired'

export interface ApiJobError {
  code: string
  message: string
}

export interface ApiJobInfo {
  id: string
  tool: string
  status: ApiJobStatus
  progress: number
  created_at: string
  started_at: string | null
  finished_at: string | null
  expires_at: string | null
  error: ApiJobError | null
  input_files: ApiFileInfo[]
  output_files: ApiFileInfo[]
}

// ─── Mock domain models (dashboard) ───────────────────────────────────────────

export interface MockFile {
  name: string
  size: string
  pages: number
  type: string
  modified: string
  tool: string
  color: string
}

export type JobStatus = 'processing' | 'queued' | 'done' | 'failed'

export interface Job {
  id: string
  tool: string
  file: string
  status: JobStatus
  progress: number
  eta: string
  color: string
}

export interface DownloadItem {
  name: string
  size: string
  type: string
  date: string
  color: string
}

export interface AppNotification {
  icon: string
  color: string
  title: string
  description: string
  time: string
}

export interface FaqEntry {
  question: string
  answer: string
}

// ─── Feedback (toast + confirm) ────────────────────────────────────────────────

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  tone: ToastTone
}

export interface ConfirmOptions {
  title: string
  body: string
  confirmLabel?: string
  /** Toast message shown after the user confirms. */
  toast?: string
}
