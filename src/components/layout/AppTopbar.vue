<script setup lang="ts">
  /**
   * AppTopbar — sticky header for the authenticated app: page title,
   * breadcrumbs, search, theme toggle, notifications and account menu.
   */
  import { computed, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import AppLogo from '@components/ui/AppLogo.vue'
  import AppBreadcrumbs from '@components/ui/AppBreadcrumbs.vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import ThemeToggle from '@components/ui/ThemeToggle.vue'
  import NotifBell from '@components/layout/NotifBell.vue'
  import UserMenu from '@components/layout/UserMenu.vue'
  import { APP_PAGE_TITLES } from '@components/layout/app-nav'
  import { ROUTE_NAMES } from '@constants'
  import { useBreakpoint } from '@composables'
  import type { RouteName } from '@constants'
  import type { BreadcrumbItem } from '@types'

  const route = useRoute()
  const { isNarrow } = useBreakpoint()
  const search = ref('')

  const title = computed(() => APP_PAGE_TITLES[route.name as RouteName] ?? 'Dashboard')
  const crumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'Home', to: { name: ROUTE_NAMES.DASHBOARD } },
    { label: title.value },
  ])
</script>

<template>
  <header class="pf-topbar">
    <AppLogo v-if="isNarrow" :size="28" />

    <div v-else class="pf-topbar__heading">
      <div class="pf-topbar__title">{{ title }}</div>
      <AppBreadcrumbs :items="crumbs" />
    </div>

    <div class="pf-topbar__actions">
      <div v-if="!isNarrow" class="pf-topbar__search">
        <BaseInput v-model="search" icon="search" placeholder="Search files…" />
      </div>
      <ThemeToggle />
      <NotifBell />
      <UserMenu />
    </div>
  </header>
</template>

<style scoped>
  .pf-topbar {
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
    background: hsl(var(--color-surface) / 0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid hsl(var(--color-border));
    padding: 0 clamp(16px, 3vw, 28px);
    height: 66px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .pf-topbar__title {
    font-weight: 800;
    font-size: 19px;
    color: hsl(var(--color-text));
    letter-spacing: -0.01em;
  }
  .pf-topbar__heading :deep(.pf-crumbs) {
    margin-top: 2px;
  }
  .pf-topbar__actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pf-topbar__search {
    width: 230px;
  }
</style>
