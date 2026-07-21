<script setup lang="ts">
  /**
   * BaseCard — the elevated surface container used across the app.
   * Pass `padded` for the default inner padding, or lay out the slot yourself.
   */
  withDefaults(
    defineProps<{
      /** Apply default inner padding. */
      padded?: boolean
    }>(),
    { padded: false },
  )
</script>

<template>
  <div class="pf-card" :class="{ 'pf-card--padded': padded }">
    <slot />
  </div>
</template>

<style scoped>
  .pf-card {
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
  }
  .pf-card--padded {
    padding: 22px;
  }
</style>
