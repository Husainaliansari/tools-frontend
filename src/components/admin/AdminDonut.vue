<script setup lang="ts">
  import { computed } from 'vue'

  const props = withDefaults(
    defineProps<{ segments: { pct: number; color: string }[]; size?: number }>(),
    { size: 120 },
  )

  const r = computed(() => props.size / 2 - 8)
  const circumference = computed(() => 2 * Math.PI * r.value)

  const arcs = computed(() => {
    let offset = 0
    return props.segments.map((seg) => {
      const len = (seg.pct / 100) * circumference.value
      const arc = { len, gap: circumference.value - len, offset: -offset, color: seg.color }
      offset += len + 2
      return arc
    })
  })
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
    <circle
      v-for="(a, i) in arcs"
      :key="i"
      :cx="size / 2"
      :cy="size / 2"
      :r="r"
      fill="none"
      :stroke="a.color"
      stroke-width="12"
      :stroke-dasharray="`${a.len} ${a.gap}`"
      :stroke-dashoffset="a.offset"
      stroke-linecap="round"
      :transform="`rotate(-90 ${size / 2} ${size / 2})`"
    />
  </svg>
</template>
