<script setup lang="ts">
  /**
   * SectionHeading — title + subtitle. `centered` for hero-style sections, or
   * provide the `action` slot for a trailing "View all →" link.
   */
  withDefaults(
    defineProps<{
      title: string
      subtitle?: string
      centered?: boolean
    }>(),
    { centered: false },
  )
</script>

<template>
  <div class="pf-heading" :class="{ 'pf-heading--centered': centered }">
    <div>
      <h2 class="pf-heading__title" :class="{ 'pf-heading__title--lg': centered }">{{ title }}</h2>
      <p v-if="subtitle" class="pf-heading__sub">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.action" class="pf-heading__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
  .pf-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .pf-heading--centered {
    display: block;
  }
  .pf-heading__title {
    font-size: clamp(24px, 3vw, 32px);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: hsl(var(--color-text));
    margin: 0 0 6px;
  }
  .pf-heading__title--lg {
    font-size: clamp(24px, 3vw, 34px);
    margin-bottom: 8px;
  }
  .pf-heading__sub {
    font-size: 15.5px;
    color: hsl(var(--color-text-muted));
    margin: 0;
  }
  .pf-heading--centered .pf-heading__sub {
    font-size: 16px;
  }
</style>
