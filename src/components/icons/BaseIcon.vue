<script setup lang="ts">
  /**
   * BaseIcon — renders a line icon from the ported PDFly icon set.
   *
   * @example
   * <BaseIcon name="upload" :size="20" />
   */
  import { computed } from 'vue'
  import { ICON_PATHS } from './icon-paths'

  const props = withDefaults(
    defineProps<{
      /** Icon key from the icon set. */
      name: string
      /** Square size in pixels. */
      size?: number
      /** Stroke width override. */
      strokeWidth?: number
    }>(),
    {
      size: 20,
      strokeWidth: 1.9,
    },
  )

  const inner = computed(() => ICON_PATHS[props.name] ?? '')
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- icon markup is a trusted internal constant, never user input -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    class="inline-block flex-none"
    v-html="inner"
  />
</template>
