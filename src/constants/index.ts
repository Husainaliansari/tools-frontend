/**
 * Application-wide constants.
 * Keep values here – never hard-code them in components or services.
 */

// ─── Storage keys ─────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'pdf_tools_auth_token',
  REFRESH_TOKEN: 'pdf_tools_refresh_token',
  USER: 'pdf_tools_user',
  THEME: 'pdf_tools_theme',
  LOCALE: 'pdf_tools_locale',
} as const

// ─── Pagination ───────────────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const

// ─── File upload ──────────────────────────────────────────────────────────────
export const FILE_UPLOAD = {
  ALLOWED_MIME_TYPES: ['application/pdf'],
  ALLOWED_EXTENSIONS: ['.pdf'],
  MAX_SIZE_MB: 50,
} as const

// ─── HTTP status codes ────────────────────────────────────────────────────────
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const

// ─── Route names ──────────────────────────────────────────────────────────────
export const ROUTE_NAMES = {
  // Public
  HOME: 'home',
  TOOLS: 'tools',
  TOOL: 'tool',
  PRICING: 'pricing',
  ABOUT: 'about',
  CONTACT: 'contact',
  HELP: 'help',
  FAQ: 'faq',
  FEEDBACK: 'feedback',
  PRIVACY: 'privacy',
  TERMS: 'terms',
  DISCLAIMER: 'disclaimer',
  COOKIES: 'cookies',
  SITEMAP: 'sitemap',
  // Auth
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT_PASSWORD: 'forgot-password',
  RESET_PASSWORD: 'reset-password',
  // App
  DASHBOARD: 'dashboard',
  FILES: 'files',
  JOBS: 'jobs',
  DOWNLOADS: 'downloads',
  SETTINGS: 'settings',
  PROFILE: 'profile',
  // Admin panel (isolated /admin tree)
  ADMIN_DASHBOARD: 'admin-dashboard',
  ADMIN_ANALYTICS: 'admin-analytics',
  ADMIN_USERS: 'admin-users',
  ADMIN_SUBSCRIBERS: 'admin-subscribers',
  ADMIN_TOOLS: 'admin-tools',
  ADMIN_FILES: 'admin-files',
  ADMIN_JOBS: 'admin-jobs',
  ADMIN_FEEDBACK: 'admin-feedback',
  ADMIN_MESSAGES: 'admin-messages',
  ADMIN_NOTIFICATIONS: 'admin-notifications',
  ADMIN_ANNOUNCEMENTS: 'admin-announcements',
  ADMIN_PAGES: 'admin-pages',
  ADMIN_BLOG: 'admin-blog',
  ADMIN_SEO: 'admin-seo',
  ADMIN_FAQS: 'admin-faqs',
  ADMIN_BRANDING: 'admin-branding',
  ADMIN_LIVE: 'admin-live',
  ADMIN_PERFORMANCE: 'admin-performance',
  ADMIN_ERRORS: 'admin-errors',
  ADMIN_AUDIT: 'admin-audit',
  ADMIN_SECURITY: 'admin-security',
  ADMIN_SETTINGS: 'admin-settings',
  // Fallback
  NOT_FOUND: 'not-found',
} as const

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]

// ─── Domain data re-exports ─────────────────────────────────────────────────
export * from './tools'
export * from './mock-data'
export * from './content'
export * from './legal'
export * from './planLimits'
export * from './seo'
