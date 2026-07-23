import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@constants'
import { useAuthStore } from '@stores/auth.store'

// ─── Route records ────────────────────────────────────────────────────────────
// Pages are lazy-loaded for optimal code splitting.

const routes: RouteRecordRaw[] = [
  // ── Public / marketing routes ────────────────────────────────────────────
  {
    path: '/',
    component: () => import('@layouts/PublicLayout.vue'),
    children: [
      {
        path: '',
        name: ROUTE_NAMES.HOME,
        component: () => import('@pages/HomePage.vue'),
        meta: { title: 'Every tool you need to work with PDFs — PDFly' },
      },
      {
        path: 'tools',
        name: ROUTE_NAMES.TOOLS,
        component: () => import('@pages/ToolsPage.vue'),
        meta: { title: 'All PDF Tools — PDFly' },
      },
      {
        path: 'tools/:slug',
        name: ROUTE_NAMES.TOOL,
        component: () => import('@pages/ToolPage.vue'),
        meta: { title: 'PDF Tool — PDFly' },
      },
      {
        path: 'pricing',
        name: ROUTE_NAMES.PRICING,
        component: () => import('@pages/PricingPage.vue'),
        meta: { title: 'Pricing — PDFly' },
      },
      {
        path: 'about',
        name: ROUTE_NAMES.ABOUT,
        component: () => import('@pages/AboutPage.vue'),
        meta: { title: 'About — PDFly' },
      },
      {
        path: 'contact',
        name: ROUTE_NAMES.CONTACT,
        component: () => import('@pages/ContactPage.vue'),
        meta: { title: 'Contact — PDFly' },
      },
      {
        path: 'help',
        name: ROUTE_NAMES.HELP,
        component: () => import('@pages/HelpPage.vue'),
        meta: { title: 'Help Center — PDFly' },
      },
      {
        path: 'faq',
        name: ROUTE_NAMES.FAQ,
        component: () => import('@pages/FaqPage.vue'),
        meta: { title: 'FAQ — PDFly' },
      },
      {
        path: 'feedback',
        name: ROUTE_NAMES.FEEDBACK,
        component: () => import('@pages/FeedbackPage.vue'),
        meta: { title: 'Feedback & Suggestions — PDFly' },
      },
      {
        path: 'privacy',
        name: ROUTE_NAMES.PRIVACY,
        component: () => import('@pages/PrivacyPage.vue'),
        meta: { title: 'Privacy Policy — PDFly' },
      },
      {
        path: 'terms',
        name: ROUTE_NAMES.TERMS,
        component: () => import('@pages/TermsPage.vue'),
        meta: { title: 'Terms & Conditions — PDFly' },
      },
      {
        path: 'disclaimer',
        name: ROUTE_NAMES.DISCLAIMER,
        component: () => import('@pages/DisclaimerPage.vue'),
        meta: { title: 'Disclaimer — PDFly' },
      },
      {
        path: 'cookies',
        name: ROUTE_NAMES.COOKIES,
        component: () => import('@pages/CookiePolicyPage.vue'),
        meta: { title: 'Cookie Policy — PDFly' },
      },
      {
        path: 'sitemap',
        name: ROUTE_NAMES.SITEMAP,
        component: () => import('@pages/SitemapPage.vue'),
        meta: { title: 'Sitemap — PDFly' },
      },
    ],
  },

  // ── Auth routes ────────────────────────────────────────────────────────────
  {
    path: '/auth',
    component: () => import('@layouts/AuthLayout.vue'),
    meta: { requiresGuest: true },
    children: [
      {
        path: 'login',
        name: ROUTE_NAMES.LOGIN,
        component: () => import('@pages/auth/LoginPage.vue'),
        meta: { title: 'Log in — PDFly' },
      },
      {
        path: 'register',
        name: ROUTE_NAMES.REGISTER,
        component: () => import('@pages/auth/RegisterPage.vue'),
        meta: { title: 'Create your account — PDFly' },
      },
      {
        path: 'forgot-password',
        name: ROUTE_NAMES.FORGOT_PASSWORD,
        component: () => import('@pages/auth/ForgotPasswordPage.vue'),
        meta: { title: 'Reset your password — PDFly' },
      },
      {
        path: 'reset-password',
        name: ROUTE_NAMES.RESET_PASSWORD,
        component: () => import('@pages/auth/ResetPasswordPage.vue'),
        meta: { title: 'Set a new password — PDFly' },
      },
    ],
  },

  // ── Authenticated / app routes ─────────────────────────────────────────────
  {
    path: '/app',
    component: () => import('@layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: ROUTE_NAMES.DASHBOARD } },
      {
        path: 'dashboard',
        name: ROUTE_NAMES.DASHBOARD,
        component: () => import('@pages/app/DashboardPage.vue'),
        meta: { title: 'Dashboard — PDFly' },
      },
      {
        path: 'files',
        name: ROUTE_NAMES.FILES,
        component: () => import('@pages/app/FilesPage.vue'),
        meta: { title: 'My Files — PDFly' },
      },
      {
        path: 'jobs',
        name: ROUTE_NAMES.JOBS,
        component: () => import('@pages/app/JobsPage.vue'),
        meta: { title: 'Processing Jobs — PDFly' },
      },
      {
        path: 'downloads',
        name: ROUTE_NAMES.DOWNLOADS,
        component: () => import('@pages/app/DownloadsPage.vue'),
        meta: { title: 'Downloads — PDFly' },
      },
      {
        path: 'profile',
        name: ROUTE_NAMES.PROFILE,
        component: () => import('@pages/app/ProfilePage.vue'),
        meta: { title: 'Profile — PDFly' },
      },
      {
        path: 'settings',
        name: ROUTE_NAMES.SETTINGS,
        component: () => import('@pages/app/SettingsPage.vue'),
        meta: { title: 'Settings — PDFly' },
      },
    ],
  },

  // ── Admin panel (isolated tree; requires admin) ─────────────────────────────
  {
    path: '/admin',
    component: () => import('@layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: { name: ROUTE_NAMES.ADMIN_DASHBOARD } },
      { path: 'dashboard', name: ROUTE_NAMES.ADMIN_DASHBOARD, component: () => import('@pages/admin/AdminDashboardPage.vue'), meta: { title: 'Dashboard — PDFly Admin' } },
      { path: 'analytics', name: ROUTE_NAMES.ADMIN_ANALYTICS, component: () => import('@pages/admin/AdminAnalyticsPage.vue'), meta: { title: 'Analytics — PDFly Admin' } },
      { path: 'users', name: ROUTE_NAMES.ADMIN_USERS, component: () => import('@pages/admin/AdminUsersPage.vue'), meta: { title: 'Users — PDFly Admin' } },
      { path: 'subscribers', name: ROUTE_NAMES.ADMIN_SUBSCRIBERS, component: () => import('@pages/admin/AdminSubscribersPage.vue'), meta: { title: 'Subscribers — PDFly Admin' } },
      { path: 'tools', name: ROUTE_NAMES.ADMIN_TOOLS, component: () => import('@pages/admin/AdminToolsPage.vue'), meta: { title: 'PDF Tools — PDFly Admin' } },
      { path: 'files', name: ROUTE_NAMES.ADMIN_FILES, component: () => import('@pages/admin/AdminFilesPage.vue'), meta: { title: 'Files & Storage — PDFly Admin' } },
      { path: 'jobs', name: ROUTE_NAMES.ADMIN_JOBS, component: () => import('@pages/admin/AdminJobsPage.vue'), meta: { title: 'Conversion Jobs — PDFly Admin' } },
      { path: 'feedback', name: ROUTE_NAMES.ADMIN_FEEDBACK, component: () => import('@pages/admin/AdminFeedbackPage.vue'), meta: { title: 'Feedback — PDFly Admin' } },
      { path: 'messages', name: ROUTE_NAMES.ADMIN_MESSAGES, component: () => import('@pages/admin/AdminMessagesPage.vue'), meta: { title: 'Messages — PDFly Admin' } },
      { path: 'notifications', name: ROUTE_NAMES.ADMIN_NOTIFICATIONS, component: () => import('@pages/admin/AdminNotificationsPage.vue'), meta: { title: 'Notifications — PDFly Admin' } },
      { path: 'announcements', name: ROUTE_NAMES.ADMIN_ANNOUNCEMENTS, component: () => import('@pages/admin/AdminAnnouncementsPage.vue'), meta: { title: 'Announcements — PDFly Admin' } },
      { path: 'pages', name: ROUTE_NAMES.ADMIN_PAGES, component: () => import('@pages/admin/AdminPagesPage.vue'), meta: { title: 'Pages & Content — PDFly Admin' } },
      { path: 'blog', name: ROUTE_NAMES.ADMIN_BLOG, component: () => import('@pages/admin/AdminBlogPage.vue'), meta: { title: 'Blog — PDFly Admin' } },
      { path: 'seo', name: ROUTE_NAMES.ADMIN_SEO, component: () => import('@pages/admin/AdminSeoPage.vue'), meta: { title: 'SEO — PDFly Admin' } },
      { path: 'faqs', name: ROUTE_NAMES.ADMIN_FAQS, component: () => import('@pages/admin/AdminFaqsPage.vue'), meta: { title: 'FAQs — PDFly Admin' } },
      { path: 'branding', name: ROUTE_NAMES.ADMIN_BRANDING, component: () => import('@pages/admin/AdminBrandingPage.vue'), meta: { title: 'Theme & Branding — PDFly Admin' } },
      { path: 'live', name: ROUTE_NAMES.ADMIN_LIVE, component: () => import('@pages/admin/AdminLivePage.vue'), meta: { title: 'Live Visitors — PDFly Admin' } },
      { path: 'performance', name: ROUTE_NAMES.ADMIN_PERFORMANCE, component: () => import('@pages/admin/AdminPerformancePage.vue'), meta: { title: 'Server Performance — PDFly Admin' } },
      { path: 'errors', name: ROUTE_NAMES.ADMIN_ERRORS, component: () => import('@pages/admin/AdminErrorsPage.vue'), meta: { title: 'Error Logs — PDFly Admin' } },
      { path: 'audit', name: ROUTE_NAMES.ADMIN_AUDIT, component: () => import('@pages/admin/AdminAuditPage.vue'), meta: { title: 'Audit Logs — PDFly Admin' } },
      { path: 'security', name: ROUTE_NAMES.ADMIN_SECURITY, component: () => import('@pages/admin/AdminSecurityPage.vue'), meta: { title: 'Security Events — PDFly Admin' } },
      { path: 'settings/:tab?', name: ROUTE_NAMES.ADMIN_SETTINGS, component: () => import('@pages/admin/AdminSettingsPage.vue'), meta: { title: 'Settings — PDFly Admin' } },
    ],
  },

  // ── Catch-all 404 ──────────────────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.NOT_FOUND,
    component: () => import('@pages/NotFoundPage.vue'),
    meta: { title: 'Page not found — PDFly' },
  },
]

// ─── Router instance ──────────────────────────────────────────────────────────

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0, behavior: 'smooth' }
  },
})

// ─── Navigation guards ────────────────────────────────────────────────────────

router.beforeEach(async (to) => {
  if (to.meta.title) {
    document.title = to.meta.title as string
  }

  const authStore = useAuthStore()

  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  const isAuthenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: ROUTE_NAMES.LOGIN, query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresGuest && isAuthenticated) {
    return { name: ROUTE_NAMES.DASHBOARD }
  }

  // Admin area is gated on the account's admin flag. Non-admins are bounced to
  // the regular app dashboard rather than shown a forbidden shell.
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: ROUTE_NAMES.DASHBOARD }
  }
})

// ─── Route meta type augmentation ────────────────────────────────────────────

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    requiresGuest?: boolean
    requiresAdmin?: boolean
  }
}

export { router }
export { ROUTE_NAMES }
