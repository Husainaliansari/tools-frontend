<script setup lang="ts">
  /**
   * SkeletonBlock — shimmering placeholder used for loading states.
   */
  import { computed } from 'vue'

  const props = withDefaults(
    defineProps<{
      width?: string
      height?: number
      radius?: number
    }>(),
    {
      width: '100%',
      height: 14,
      radius: 8,
    },
  )

  const style = computed(() => ({
    width: props.width,
    height: `${props.height}px`,
    borderRadius: `${props.radius}px`,
  }))
</script>

<template>
  <div class="pf-skeleton" :style="style" />
</template>

<style scoped>
  .pf-skeleton {
    background: linear-gradient(
      90deg,
      hsl(var(--color-chip)) 25%,
      hsl(var(--color-surface-muted)) 37%,
      hsl(var(--color-chip)) 63%
    );
    background-size: 800px 100%;
    animation: shimmer 1.4s infinite;
  }
</style>
