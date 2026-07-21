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
})

// ─── Route meta type augmentation ────────────────────────────────────────────

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    requiresGuest?: boolean
  }
}

export { router }
export { ROUTE_NAMES }
