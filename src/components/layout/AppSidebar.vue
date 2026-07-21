<script setup lang="ts">
  /**
   * AppSidebar — persistent navigation rail for the authenticated app.
   */
  import { useRouter, RouterLink } from 'vue-router'
  import AppLogo from '@components/ui/AppLogo.vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { APP_NAV_ITEMS } from '@components/layout/app-nav'
  import { ROUTE_NAMES } from '@constants'
  import { useAuthStore } from '@stores/auth.store'
  import { useFeedback } from '@composables'
  import { PLAN_LIMITS, formatLimitMB } from '@constants/planLimits'

  const router = useRouter()
  const authStore = useAuthStore()
  const { showToast } = useFeedback()

  function upgrade() {
    showToast('Redirecting to checkout…', 'info')
  }

  async function logout() {
    await authStore.logout()
    router.push({ name: ROUTE_NAMES.HOME })
  }
</script>

<template>
  <aside class="pf-sidebar">
    <div class="pf-sidebar__logo">
      <AppLogo :size="30" />
    </div>

    <nav class="pf-sidebar__nav">
      <RouterLink
        v-for="item in APP_NAV_ITEMS"
        :key="item.name"
        :to="{ name: item.name }"
        class="pf-sidebar__link"
        active-class="pf-sidebar__link--active"
      >
        <BaseIcon :name="item.icon" :size="19" />
        <span>{{ item.label }}</span>
        <span v-if="item.badge" class="pf-sidebar__badge">{{ item.badge }}</span>
      </RouterLink>
    </nav>

    <div class="pf-sidebar__upgrade">
      <div class="pf-upgrade">
        <div class="pf-upgrade__title">
          <BaseIcon name="sparkles" :size="17" />
          Upgrade to Pro
        </div>
        <p class="pf-upgrade__body"> Unlock {{ formatLimitMB(PLAN_LIMITS.pro.maxFileSizeMB) }} files, batch processing and no daily limits. </p>
        <button type="button" class="pf-upgrade__btn" @click="upgrade">Upgrade now</button>
      </div>
    </div>

    <div class="pf-sidebar__foot">
      <button type="button" class="pf-sidebar__logout" @click="logout">
        <BaseIcon name="log-out" :size="17" />
        Log out
      </button>
    </div>
  </aside>
</template>

<style scoped>
  .pf-sidebar {
    width: 250px;
    flex: none;
    background: hsl(var(--color-surface));
    border-right: 1px solid hsl(var(--color-border));
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
  }
  .pf-sidebar__logo {
    padding: 20px 20px 16px;
  }
  .pf-sidebar__nav {
    padding: 8px 12px;
    flex: 1;
    display: grid;
    gap: 3px;
    align-content: start;
  }
  .pf-sidebar__link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 13px;
    border-radius: var(--radius-lg);
    font-size: 14.5px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    transition: all 0.15s;
  }
  .pf-sidebar__link:hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .pf-sidebar__link--active {
    font-weight: 700;
    color: hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.1);
  }
  .pf-sidebar__badge {
    margin-left: auto;
    font-size: 11px;
    font-weight: 800;
    color: #fff;
    background: hsl(var(--color-warning));
    border-radius: var(--radius-full);
    padding: 2px 7px;
  }
  .pf-sidebar__upgrade {
    padding: 16px;
  }
  .pf-upgrade {
    background: linear-gradient(140deg, hsl(var(--color-navy)), hsl(var(--color-indigo)));
    border-radius: var(--radius-xl);
    padding: 18px;
    color: #fff;
  }
  .pf-upgrade__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 8px;
  }
  .pf-upgrade__body {
    font-size: 12.5px;
    opacity: 0.85;
    line-height: 1.5;
    margin: 0 0 14px;
  }
  .pf-upgrade__btn {
    width: 100%;
    background: #fff;
    color: hsl(var(--color-navy));
    border: none;
    border-radius: var(--radius-md);
    padding: 9px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    transition: transform 0.15s;
  }
  .pf-upgrade__btn:hover {
    transform: translateY(-1px);
  }
  .pf-sidebar__foot {
    padding: 0 16px 16px;
  }
  .pf-sidebar__logout {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    color: hsl(var(--color-text-faint));
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    background: none;
    border: none;
    text-align: left;
  }
  .pf-sidebar__logout:hover {
    color: hsl(var(--color-text));
    background: hsl(var(--color-chip));
  }
</style>
