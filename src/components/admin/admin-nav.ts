/**
 * Admin sidebar navigation structure (mirrors the PDFly Admin design groups).
 * Each item's `route` is a named route from ROUTE_NAMES.
 */
import { ROUTE_NAMES } from '@constants'

export interface AdminNavItem {
  id: string
  label: string
  icon: string
  route: string
}
export interface AdminNavGroup {
  group: string
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'gauge', route: ROUTE_NAMES.ADMIN_DASHBOARD },
      { id: 'analytics', label: 'Analytics', icon: 'bar-chart', route: ROUTE_NAMES.ADMIN_ANALYTICS },
    ],
  },
  {
    group: 'Management',
    items: [
      { id: 'users', label: 'Users', icon: 'users', route: ROUTE_NAMES.ADMIN_USERS },
      { id: 'subscribers', label: 'Subscribers', icon: 'credit-card', route: ROUTE_NAMES.ADMIN_SUBSCRIBERS },
      { id: 'tools', label: 'PDF Tools', icon: 'grid', route: ROUTE_NAMES.ADMIN_TOOLS },
      { id: 'files', label: 'Files & Storage', icon: 'folder', route: ROUTE_NAMES.ADMIN_FILES },
      { id: 'jobs', label: 'Conversion Jobs', icon: 'activity', route: ROUTE_NAMES.ADMIN_JOBS },
    ],
  },
  {
    group: 'Communication',
    items: [
      { id: 'feedback', label: 'Feedback', icon: 'star', route: ROUTE_NAMES.ADMIN_FEEDBACK },
      { id: 'messages', label: 'Messages', icon: 'mail', route: ROUTE_NAMES.ADMIN_MESSAGES },
      { id: 'notifications', label: 'Notifications', icon: 'bell', route: ROUTE_NAMES.ADMIN_NOTIFICATIONS },
      { id: 'announcements', label: 'Announcements', icon: 'megaphone', route: ROUTE_NAMES.ADMIN_ANNOUNCEMENTS },
    ],
  },
  {
    group: 'Website',
    items: [
      { id: 'pages', label: 'Pages & Content', icon: 'file-text', route: ROUTE_NAMES.ADMIN_PAGES },
      { id: 'blog', label: 'Blog', icon: 'newspaper', route: ROUTE_NAMES.ADMIN_BLOG },
      { id: 'seo', label: 'SEO', icon: 'search', route: ROUTE_NAMES.ADMIN_SEO },
      { id: 'faqs', label: 'FAQs', icon: 'help-circle', route: ROUTE_NAMES.ADMIN_FAQS },
      { id: 'branding', label: 'Theme & Branding', icon: 'palette', route: ROUTE_NAMES.ADMIN_BRANDING },
    ],
  },
  {
    group: 'Monitoring',
    items: [
      { id: 'live', label: 'Live Visitors', icon: 'monitor', route: ROUTE_NAMES.ADMIN_LIVE },
      { id: 'performance', label: 'Server Performance', icon: 'cpu', route: ROUTE_NAMES.ADMIN_PERFORMANCE },
      { id: 'errors', label: 'Error Logs', icon: 'alert-triangle', route: ROUTE_NAMES.ADMIN_ERRORS },
      { id: 'audit', label: 'Audit Logs', icon: 'history', route: ROUTE_NAMES.ADMIN_AUDIT },
      { id: 'security', label: 'Security Events', icon: 'shield', route: ROUTE_NAMES.ADMIN_SECURITY },
    ],
  },
  {
    group: 'Settings',
    items: [
      { id: 'settings', label: 'Settings', icon: 'settings', route: ROUTE_NAMES.ADMIN_SETTINGS },
    ],
  },
]
