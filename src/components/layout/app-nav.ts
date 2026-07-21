/**
 * Navigation model for the authenticated app shell.
 * Shared by the sidebar, topbar (titles) and mobile tab bar so they never drift.
 */
import { ROUTE_NAMES } from '@constants'
import type { RouteName } from '@constants'

export interface AppNavItem {
  label: string
  name: RouteName
  icon: string
  /** Optional count badge (e.g. active jobs). */
  badge?: string
  /** Whether the item appears in the compact mobile tab bar. */
  mobile?: boolean
  /** Short label used in the mobile tab bar. */
  shortLabel?: string
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    label: 'Dashboard',
    name: ROUTE_NAMES.DASHBOARD,
    icon: 'home',
    mobile: true,
    shortLabel: 'Home',
  },
  { label: 'My Files', name: ROUTE_NAMES.FILES, icon: 'folder', mobile: true, shortLabel: 'Files' },
  {
    label: 'Processing Jobs',
    name: ROUTE_NAMES.JOBS,
    icon: 'activity',
    badge: '2',
    mobile: true,
    shortLabel: 'Jobs',
  },
  { label: 'Downloads', name: ROUTE_NAMES.DOWNLOADS, icon: 'download' },
  {
    label: 'Profile',
    name: ROUTE_NAMES.PROFILE,
    icon: 'user',
    mobile: true,
    shortLabel: 'Profile',
  },
  { label: 'Settings', name: ROUTE_NAMES.SETTINGS, icon: 'settings' },
]

/** Page titles keyed by route name — used by the topbar heading. */
export const APP_PAGE_TITLES: Partial<Record<RouteName, string>> = {
  [ROUTE_NAMES.DASHBOARD]: 'Dashboard',
  [ROUTE_NAMES.FILES]: 'My Files',
  [ROUTE_NAMES.JOBS]: 'Processing Jobs',
  [ROUTE_NAMES.DOWNLOADS]: 'Downloads',
  [ROUTE_NAMES.PROFILE]: 'Profile',
  [ROUTE_NAMES.SETTINGS]: 'Settings',
}

/** Items surfaced in the mobile tab bar. */
export const MOBILE_NAV_ITEMS = APP_NAV_ITEMS.filter((item) => item.mobile)
