<script setup lang="ts">
  /**
   * MobileTabBar — bottom navigation shown on narrow viewports in place of the
   * sidebar.
   */
  import { RouterLink } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { MOBILE_NAV_ITEMS } from '@components/layout/app-nav'
</script>

<template>
  <nav class="pf-tabbar">
    <RouterLink
      v-for="item in MOBILE_NAV_ITEMS"
      :key="item.name"
      :to="{ name: item.name }"
      class="pf-tabbar__item"
      active-class="pf-tabbar__item--active"
    >
      <BaseIcon :name="item.icon" :size="20" />
      {{ item.shortLabel ?? item.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
  .pf-tabbar {
    position: sticky;
    bottom: 0;
    z-index: var(--z-sticky);
    background: hsl(var(--color-surface) / 0.92);
    backdrop-filter: blur(12px);
    border-top: 1px solid hsl(var(--color-border));
    display: flex;
    padding: 8px 6px;
  }
  .pf-tabbar__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 6px;
    color: hsl(var(--color-text-faint));
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
  }
  .pf-tabbar__item--active {
    color: hsl(var(--color-primary));
  }
</style>
