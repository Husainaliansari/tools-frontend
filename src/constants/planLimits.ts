import type { SubscriptionPlan } from '@types'

/**
 * Per-plan upload limits — how many files one task may take, how large each
 * file may be, and how large the whole selection may be.
 *
 * Mirrors ``backend/app/config/plans.py`` (the server enforces the same
 * numbers on upload and job creation) — keep the two files in sync.
 */
export interface PlanLimits {
  /** Human-facing tier name for messages ("Free", "Pro", ...). */
  label: string
  maxFiles: number
  maxFileSizeMB: number
  maxTotalSizeMB: number
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: { label: 'Free', maxFiles: 20, maxFileSizeMB: 50, maxTotalSizeMB: 50 },
  basic: { label: 'Basic', maxFiles: 50, maxFileSizeMB: 500, maxTotalSizeMB: 500 },
  pro: { label: 'Pro', maxFiles: 100, maxFileSizeMB: 1024, maxTotalSizeMB: 1024 },
  // No published tier of its own — enterprise accounts get the top tier.
  enterprise: { label: 'Enterprise', maxFiles: 100, maxFileSizeMB: 1024, maxTotalSizeMB: 1024 },
}

/** Limits for a plan; anonymous visitors get the free tier. */
export function limitsForPlan(plan?: SubscriptionPlan | null): PlanLimits {
  return PLAN_LIMITS[plan ?? 'free'] ?? PLAN_LIMITS.free
}

/** Render a megabyte limit the way people say it: "100 MB", "5 GB". */
export function formatLimitMB(mb: number): string {
  return mb >= 1024 && mb % 1024 === 0 ? `${mb / 1024} GB` : `${mb} MB`
}
