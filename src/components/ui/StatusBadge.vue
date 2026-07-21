<script setup lang="ts">
  /**
   * StatusBadge — job status pill with a coloured dot.
   * Processing status animates the dot.
   */
  import { computed } from 'vue'
  import type { JobStatus } from '@types'

  const props = defineProps<{
    status: JobStatus
  }>()

  const config = computed(() => {
    const map: Record<JobStatus, { label: string; color: string }> = {
      processing: { label: 'Processing', color: 'var(--color-primary)' },
      queued: { label: 'Queued', color: 'var(--color-warning)' },
      done: { label: 'Completed', color: 'var(--color-success)' },
      failed: { label: 'Failed', color: 'var(--color-danger)' },
    }
    return map[props.status]
  })

  const style = computed(() => ({
    color: `hsl(${config.value.color})`,
    background: `hsl(${config.value.color} / 0.13)`,
    border: `1px solid hsl(${config.value.color} / 0.22)`,
  }))
</script>

<template>
  <span class="pf-status" :style="style">
    <span
      class="pf-status__dot"
      :class="{ 'animate-pulse-dot': status === 'processing' }"
      :style="{ background: `hsl(${config.color})` }"
    />
    {{ config.label }}
  </span>
</template>

<style scoped>
  .pf-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 4px 11px;
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }
  .pf-status__dot {
    width: 7px;
    height: 7px;
    border-radius: var(--radius-full);
    flex: none;
  }
</style>
