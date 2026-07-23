<script setup lang="ts">
  import { computed } from 'vue'

  const props = withDefaults(
    defineProps<{ data: number[]; color?: string; width?: number; height?: number }>(),
    { color: 'var(--ad-primary)', width: 80, height: 28 },
  )

  const points = computed(() => {
    const d = props.data.length ? props.data : [0, 0]
    const max = Math.max(...d)
    const min = Math.min(...d)
    const range = max - min || 1
    return d
      .map((v, i) => {
        const x = (i / (d.length - 1 || 1)) * props.width
        const y = props.height - ((v - min) / range) * props.height
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  })
</script>

<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" style="display: block">
    <polyline
      :points="points"
      fill="none"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
