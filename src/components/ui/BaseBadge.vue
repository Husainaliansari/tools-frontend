<script setup lang="ts">
  /**
   * BaseBadge — small pill label with a semantic tone.
   */
  import { computed } from 'vue'
  import type { BadgeTone } from '@types'

  const props = withDefaults(
    defineProps<{
      tone?: BadgeTone
    }>(),
    { tone: 'neutral' },
  )

  /** Maps each tone to a base CSS color token expression. */
  const color = computed(() => {
    const map: Record<BadgeTone, string> = {
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      danger: 'var(--color-danger)',
      info: 'var(--color-primary)',
      neutral: 'var(--color-text-muted)',
      purple: 'var(--color-purple)',
    }
    return map[props.tone]
  })

  const style = computed(() => ({
    color: `hsl(${color.value})`,
    background: `hsl(${color.value} / 0.13)`,
    border: `1px solid hsl(${color.value} / 0.22)`,
  }))
</script>

<template>
  <span class="pf-badge" :style="style">
    <slot />
  </span>
</template>

<style scoped>
  .pf-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }
</style>
