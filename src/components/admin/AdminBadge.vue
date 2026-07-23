<script setup lang="ts">
  import { computed } from 'vue'

  const props = defineProps<{ label: string | number; tone?: string }>()

  // Maps a tone/label to a CSS variable name (mirrors the design's badge()).
  const TONE_VAR: Record<string, string> = {
    active: '--ad-success', enabled: '--ad-success', success: '--ad-success',
    completed: '--ad-success', done: '--ad-success', published: '--ad-success',
    healthy: '--ad-success', connected: '--ad-success', praise: '--ad-success',
    processing: '--ad-primary', info: '--ad-primary', suggestion: '--ad-primary',
    unread: '--ad-primary', feature: '--ad-primary',
    queued: '--ad-warning', pending: '--ad-warning', warning: '--ad-warning',
    maintenance: '--ad-warning', draft: '--ad-warning', trialing: '--ad-warning',
    expired: '--ad-danger', failed: '--ad-danger', error: '--ad-danger',
    danger: '--ad-danger', suspended: '--ad-danger', bug: '--ad-danger',
    cancelled: '--ad-danger',
    inactive: '--ad-text3', neutral: '--ad-text3', disabled: '--ad-text3',
    read: '--ad-text3', free: '--ad-text3', archived: '--ad-text3',
    pro: '--ad-purple',
  }

  const cssVar = computed(() => {
    const key = (props.tone ?? String(props.label)).toLowerCase()
    return TONE_VAR[key] ?? '--ad-text3'
  })
</script>

<template>
  <span class="ad-badge" :style="{ color: `var(${cssVar})`, '--tone': `var(${cssVar})` }">
    {{ label }}
  </span>
</template>

<style scoped>
  .ad-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    text-transform: capitalize;
    letter-spacing: 0.01em;
    white-space: nowrap;
    background: color-mix(in srgb, var(--tone) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--tone) 18%, transparent);
  }
</style>
