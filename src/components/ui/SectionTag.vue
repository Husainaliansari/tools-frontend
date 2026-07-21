<script setup lang="ts">
  /**
   * SectionTag — small pill used above section headings (e.g. "Why PDFly").
   */
  import BaseIcon from '@components/icons/BaseIcon.vue'

  withDefaults(
    defineProps<{
      icon?: string
    }>(),
    { icon: 'sparkles' },
  )
</script>

<template>
  <div class="pf-section-tag">
    <BaseIcon :name="icon" :size="15" />
    <slot />
  </div>
</template>

<style scoped>
  .pf-section-tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 13px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-primary) / 0.1);
    color: hsl(var(--color-primary));
    font-weight: 700;
    font-size: 12.5px;
    letter-spacing: 0.02em;
  }
</style>
