/**
 * Utility helper functions used throughout the application.
 */

/**
 * Converts a hex color (`#rrggbb`) to an `rgba()` string with the given alpha.
 * Used for the per-tool accent tints throughout the UI.
 */
export function hexAlpha(hex: string, alpha: number): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Formats a byte count into a human-readable string (KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Generates a random UUID v4.
 */
export function uuid(): string {
  if (crypto?.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Delays execution for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a debounced function that delays invocation until after `wait` ms.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

/**
 * Clamps a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Picks specified keys from an object.
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce(
    (acc, key) => {
      if (key in obj) acc[key] = obj[key]
      return acc
    },
    {} as Pick<T, K>,
  )
}

/**
 * Omits specified keys from an object.
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  keys.forEach((key) => delete result[key])
  return result as Omit<T, K>
}

/**
 * Returns true if a value is not null or undefined.
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Formats an ISO date string to a locale-aware date/time string.
 */
export function formatDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
): string {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(dateString))
}

/**
 * Validate a free-text page selection (e.g. "1-4, 5-8, 9") as used by Split,
 * Delete/Extract Pages and the Watermark page range.
 * Mirrors the backend rule — a page number or `a-b` range per comma entry —
 * and adds friendly semantic checks (pages start at 1, start ≤ end).
 * Returns an error message for malformed input, or null when empty or valid.
 */
export function pageRangesError(raw: string): string | null {
  const tokens = raw
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
  if (!tokens.length) return null // emptiness is handled as a separate "required" case
  for (const token of tokens) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token)
    if (!match) return `"${token}" isn't a valid page or range. Try e.g. 3 or 5-8.`
    const start = Number(match[1])
    const end = match[2] === undefined ? start : Number(match[2])
    if (start < 1 || end < 1) return 'Page numbers start at 1.'
    if (end < start) return `Range "${token}" is backwards — the start must be less than the end.`
  }
  return null
}

/**
 * Extracts a user-friendly error message from an Axios error or unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message ===
      'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message
  }
  return 'An unexpected error occurred'
}
