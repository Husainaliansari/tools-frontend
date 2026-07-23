/**
 * Admin API response/row types — mirror the FastAPI admin schemas.
 * List endpoints return `Page<T>` inside the standard `{ data }` envelope.
 */

export interface PageMeta {
  page: number
  size: number
  total: number
  pages: number
}

export interface Page<T> {
  items: T[]
  meta: PageMeta
}

export interface AdminListParams {
  page?: number
  size?: number
  q?: string
  [key: string]: unknown
}

// ── Dashboard / analytics ──────────────────────────────────────────────
export interface OverviewKpis {
  total_users: number
  active_users: number
  total_conversions: number
  today_conversions: number
  total_subscribers: number
  monthly_revenue_cents: number
  storage_bytes: number
  failed_jobs: number
  server_status: string
}
export interface TrendPoint { m: string; v: number }
export interface ToolUsageSlice { tool: string; count: number; pct: number }
export interface ActivityItem {
  action: string
  summary: string
  actor: string | null
  category: string
  created_at: string
}
export interface Overview {
  kpis: OverviewKpis
  conversion_trend: TrendPoint[]
  tool_usage: ToolUsageSlice[]
  recent_activity: ActivityItem[]
}
export interface Analytics {
  kpis: { total_conversions: number; unique_users: number; completed: number; success_rate: number }
  conversion_trend: TrendPoint[]
  top_tools: { tool: string; count: number }[]
}

// ── Users ──────────────────────────────────────────────────────────────
export interface AdminUser {
  id: string
  name: string
  email: string
  plan: string
  status: string
  is_admin: boolean
  avatar: string | null
  conversions: number
  created_at: string
  updated_at: string
}
export interface AdminUserDetail extends AdminUser {
  email_verified_at: string | null
  files_count: number
  subscription: Subscription | null
}
export interface UserStats { total: number; active: number; suspended: number; pro: number }

// ── Subscribers ─────────────────────────────────────────────────────────
export interface Subscription {
  id: string
  user_id: string
  user_name: string | null
  user_email: string | null
  plan: string
  price_cents: number
  currency: string
  interval: string
  status: string
  provider: string
  started_at: string | null
  renews_at: string | null
  payments_count: number
  created_at: string
}
export interface SubscriberStats { active: number; expired: number; mrr_cents: number; churn: number }

// ── Tools ────────────────────────────────────────────────────────────────
export interface ToolConfig {
  id: string
  slug: string
  name: string
  category: string
  enabled: boolean
  visible: boolean
  maintenance: boolean
  file_limit_mb: number
  usage: number
}

// ── Files / Jobs ──────────────────────────────────────────────────────────
export interface AdminFile {
  id: string
  original_name: string
  category: string
  media_type: string
  size_bytes: number
  status: string
  owner_email: string | null
  tool: string | null
  created_at: string
  expires_at: string | null
}
export interface FileStats {
  total_bytes: number
  total_count: number
  by_category: Record<string, { count: number; bytes: number }>
}
export interface AdminJob {
  id: string
  tool: string
  status: string
  progress: number
  file_name: string | null
  user_email: string | null
  created_at: string
  error_code: string | null
}
export interface JobStats { processing: number; queued: number; completed: number; failed: number }

// ── Feedback / Messages ─────────────────────────────────────────────────
export interface AdminFeedback {
  id: string
  name: string
  email: string
  subject: string | null
  category: string
  message: string
  has_attachment: boolean
  created_at: string
}
export interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  is_read: boolean
  reply: string | null
  replied_at: string | null
  created_at: string
}

// ── Website content ───────────────────────────────────────────────────────
export interface Announcement {
  id: string
  title: string
  body: string
  status: string
  audience: string
  published_at: string | null
  created_at: string
  updated_at: string
}
export interface Faq {
  id: string
  question: string
  answer: string
  category: string | null
  sort_order: number
  published: boolean
  created_at: string
}
export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  status: string
  cover_image: string | null
  views: number
  published_at: string | null
  created_at: string
  updated_at: string
}
export interface ContentPage {
  id: string
  title: string
  slug: string
  path: string
  content: string | null
  status: string
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

// ── Monitoring ────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string
  actor_email: string | null
  action: string
  category: string
  entity_type: string | null
  entity_id: string | null
  summary: string
  ip: string | null
  created_at: string
}
export interface ErrorLog {
  id: string
  level: string
  message: string
  service: string | null
  path: string | null
  count: number
  resolved: boolean
  last_seen_at: string | null
  created_at: string
}
export interface Performance {
  available: boolean
  cpu_percent?: number
  memory_percent?: number
  memory_used?: number
  memory_total?: number
  disk_percent?: number
  disk_used?: number
  disk_total?: number
  services: { name: string; status: string }[]
  pending_jobs: number
  recent_failures: number
  server_status?: string
}
export interface LiveActivity {
  active_jobs: number
  today_jobs: number
  recent: { tool: string; status: string; user: string | null; created_at: string }[]
}

export type SettingsMap = Record<string, Record<string, unknown>>
