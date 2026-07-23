/**
 * AdminService — every admin-panel API call, in the project's repository idiom.
 *
 * Extends BaseRepository (shared axios client → auth token, refresh, same-origin
 * proxy) with the admin base path. List endpoints return the FastAPI
 * `Page<T>` shape inside the `{ data }` envelope.
 */
import { BaseRepository } from '@api'
import type { ApiResponse } from '@types'
import type {
  AdminFeedback,
  AdminFile,
  AdminJob,
  AdminListParams,
  AdminUser,
  AdminUserDetail,
  Analytics,
  Announcement,
  AuditLog,
  BlogPost,
  ContactMessage,
  ContentPage,
  ErrorLog,
  Faq,
  FileStats,
  JobStats,
  LiveActivity,
  Overview,
  Page,
  Performance,
  SettingsMap,
  SubscriberStats,
  Subscription,
  ToolConfig,
  UserStats,
} from './admin.types'

function query(params?: AdminListParams): { params?: Record<string, unknown> } {
  if (!params) return {}
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') cleaned[k] = v
  }
  return { params: cleaned }
}

class AdminService extends BaseRepository {
  protected readonly endpoint = '/api/v1/admin'

  // ── Dashboard / analytics ──────────────────────────────────────────
  overview() { return this.get<Overview>('/overview') }
  analytics() { return this.get<Analytics>('/analytics') }

  // ── Users ──────────────────────────────────────────────────────────
  listUsers(params?: AdminListParams) { return this.get<Page<AdminUser>>('/users', query(params)) }
  userStats() { return this.get<UserStats>('/users/stats') }
  getUser(id: string) { return this.get<AdminUserDetail>(`/users/${id}`) }
  createUser(body: unknown) { return this.post<AdminUserDetail>('/users', body) }
  updateUser(id: string, body: unknown) { return this.patch<AdminUserDetail>(`/users/${id}`, body) }
  suspendUser(id: string) { return this.post<AdminUserDetail>(`/users/${id}/suspend`) }
  activateUser(id: string) { return this.post<AdminUserDetail>(`/users/${id}/activate`) }
  deleteUser(id: string) { return this.delete<null>(`/users/${id}`) }
  bulkUsers(action: string, ids: string[]) { return this.post<{ affected: number }>('/users/bulk', { action, ids }) }

  // ── Subscribers ─────────────────────────────────────────────────────
  listSubscribers(params?: AdminListParams) { return this.get<Page<Subscription>>('/subscribers', query(params)) }
  subscriberStats() { return this.get<SubscriberStats>('/subscribers/stats') }
  createSubscription(body: unknown) { return this.post<Subscription>('/subscribers', body) }
  updateSubscription(id: string, body: unknown) { return this.patch<Subscription>(`/subscribers/${id}`, body) }
  deleteSubscription(id: string) { return this.delete<null>(`/subscribers/${id}`) }

  // ── Tools ────────────────────────────────────────────────────────────
  listTools() { return this.get<ToolConfig[]>('/tools') }
  updateTool(slug: string, body: unknown) { return this.patch<ToolConfig>(`/tools/${slug}`, body) }

  // ── Files ────────────────────────────────────────────────────────────
  listFiles(params?: AdminListParams) { return this.get<Page<AdminFile>>('/files', query(params)) }
  fileStats() { return this.get<FileStats>('/files/stats') }
  deleteFile(id: string) { return this.delete<null>(`/files/${id}`) }
  purgeTemp() { return this.post<{ purged: number }>('/files/purge-temp') }

  // ── Jobs ─────────────────────────────────────────────────────────────
  listJobs(params?: AdminListParams) { return this.get<Page<AdminJob>>('/jobs', query(params)) }
  jobStats() { return this.get<JobStats>('/jobs/stats') }
  cancelJob(id: string) { return this.post<AdminJob>(`/jobs/${id}/cancel`) }
  retryJob(id: string) { return this.post<AdminJob>(`/jobs/${id}/retry`) }

  // ── Feedback ───────────────────────────────────────────────────────
  listFeedback(params?: AdminListParams) { return this.get<Page<AdminFeedback>>('/feedback', query(params)) }
  feedbackStats() { return this.get<Record<string, number>>('/feedback/stats') }
  deleteFeedback(id: string) { return this.delete<null>(`/feedback/${id}`) }

  // ── Messages ───────────────────────────────────────────────────────
  listMessages(params?: AdminListParams) { return this.get<Page<ContactMessage>>('/messages', query(params)) }
  unreadCount() { return this.get<{ count: number }>('/messages/unread-count') }
  getMessage(id: string) { return this.get<ContactMessage>(`/messages/${id}`) }
  markMessageRead(id: string, read = true) { return this.post<ContactMessage>(`/messages/${id}/read`, undefined, { params: { read } }) }
  replyMessage(id: string, reply: string) { return this.post<ContactMessage>(`/messages/${id}/reply`, { reply }) }
  deleteMessage(id: string) { return this.delete<null>(`/messages/${id}`) }

  // ── Announcements ───────────────────────────────────────────────────
  listAnnouncements(params?: AdminListParams) { return this.get<Page<Announcement>>('/announcements', query(params)) }
  createAnnouncement(body: unknown) { return this.post<Announcement>('/announcements', body) }
  updateAnnouncement(id: string, body: unknown) { return this.patch<Announcement>(`/announcements/${id}`, body) }
  deleteAnnouncement(id: string) { return this.delete<null>(`/announcements/${id}`) }

  // ── FAQs ──────────────────────────────────────────────────────────
  listFaqs(params?: AdminListParams) { return this.get<Page<Faq>>('/faqs', query(params)) }
  createFaq(body: unknown) { return this.post<Faq>('/faqs', body) }
  updateFaq(id: string, body: unknown) { return this.patch<Faq>(`/faqs/${id}`, body) }
  deleteFaq(id: string) { return this.delete<null>(`/faqs/${id}`) }

  // ── Blog ──────────────────────────────────────────────────────────
  listBlog(params?: AdminListParams) { return this.get<Page<BlogPost>>('/blog', query(params)) }
  createBlog(body: unknown) { return this.post<BlogPost>('/blog', body) }
  updateBlog(id: string, body: unknown) { return this.patch<BlogPost>(`/blog/${id}`, body) }
  deleteBlog(id: string) { return this.delete<null>(`/blog/${id}`) }

  // ── Pages ─────────────────────────────────────────────────────────
  listPages(params?: AdminListParams) { return this.get<Page<ContentPage>>('/pages', query(params)) }
  createPage(body: unknown) { return this.post<ContentPage>('/pages', body) }
  updatePage(id: string, body: unknown) { return this.patch<ContentPage>(`/pages/${id}`, body) }
  deletePage(id: string) { return this.delete<null>(`/pages/${id}`) }

  // ── Monitoring ─────────────────────────────────────────────────────
  performance() { return this.get<Performance>('/monitoring/performance') }
  live() { return this.get<LiveActivity>('/monitoring/live') }
  listAudit(params?: AdminListParams) { return this.get<Page<AuditLog>>('/audit', query(params)) }
  listErrors(params?: AdminListParams) { return this.get<Page<ErrorLog>>('/errors', query(params)) }
  resolveError(id: string) { return this.post<ErrorLog>(`/errors/${id}/resolve`) }
  deleteError(id: string) { return this.delete<null>(`/errors/${id}`) }
  clearResolvedErrors() { return this.post<{ cleared: number }>('/errors/clear-resolved') }

  // ── Settings ───────────────────────────────────────────────────────
  allSettings() { return this.get<SettingsMap>('/settings') }
  getSetting(category: string) { return this.get<Record<string, unknown>>(`/settings/${category}`) }
  updateSetting(category: string, value: Record<string, unknown>) {
    return this.put<Record<string, unknown>>(`/settings/${category}`, { value })
  }

  uploadBrandingAsset(kind: 'logo' | 'favicon', file: File) {
    const fd = new FormData()
    fd.append('kind', kind)
    fd.append('file', file)
    return this.postFormData<Record<string, unknown>>('/settings/branding/asset', fd)
  }
}

export const adminService = new AdminService()
export type { ApiResponse }
