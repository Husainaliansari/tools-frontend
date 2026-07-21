<script setup lang="ts">
  /**
   * AppBreadcrumbs — trail of navigable crumbs. The last crumb (no `to`) is the
   * current page.
   */
  import { RouterLink } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import type { BreadcrumbItem } from '@types'

  defineProps<{
    items: BreadcrumbItem[]
  }>()
</script>

<template>
  <nav class="pf-crumbs" aria-label="Breadcrumb">
    <template v-for="(item, i) in items" :key="i">
      <BaseIcon v-if="i > 0" name="chevron-right" :size="14" class="pf-crumbs__sep" />
      <RouterLink v-if="item.to" :to="item.to" class="pf-crumbs__link">{{ item.label }}</RouterLink>
      <span v-else class="pf-crumbs__current" aria-current="page">{{ item.label }}</span>
    </template>
  </nav>
</template>

<style scoped>
  .pf-crumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 13.5px;
    color: hsl(var(--color-text-faint));
  }
  .pf-crumbs__sep {
    color: hsl(var(--color-text-faint));
  }
  .pf-crumbs__link {
    color: hsl(var(--color-text-muted));
    font-weight: 600;
    cursor: pointer;
  }
  .pf-crumbs__link:hover {
    color: hsl(var(--color-primary));
  }
  .pf-crumbs__current {
    color: hsl(var(--color-text));
    font-weight: 700;
  }
</style>
