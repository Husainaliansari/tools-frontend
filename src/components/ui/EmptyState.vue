<script setup lang="ts">
  /**
   * EmptyState — centered icon + copy for empty lists and no-results views.
   * Pass an `action` slot for a call-to-action button.
   */
  import BaseIcon from '@components/icons/BaseIcon.vue'

  withDefaults(
    defineProps<{
      icon?: string
      title: string
      body?: string
    }>(),
    { icon: 'search' },
  )
</script>

<template>
  <div class="pf-empty">
    <div class="pf-empty__icon">
      <BaseIcon :name="icon" :size="32" />
    </div>
    <div class="pf-empty__title">{{ title }}</div>
    <p v-if="body" class="pf-empty__body">{{ body }}</p>
    <div v-if="$slots.action" class="pf-empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
  .pf-empty {
    text-align: center;
    padding: 56px 20px;
  }
  .pf-empty__icon {
    width: 72px;
    height: 72px;
    border-radius: var(--radius-2xl);
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text-faint));
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 18px;
  }
  .pf-empty__title {
    font-weight: 700;
    font-size: 18px;
    color: hsl(var(--color-text));
    margin-bottom: 8px;
  }
  .pf-empty__body {
    font-size: 14.5px;
    color: hsl(var(--color-text-muted));
    max-width: 360px;
    margin: 0 auto;
    line-height: 1.5;
  }
  .pf-empty__action {
    margin-top: 20px;
  }
</style>
