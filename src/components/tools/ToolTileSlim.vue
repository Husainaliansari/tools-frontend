<script setup lang="ts">
  /**
   * ToolTileSlim — horizontal row tile used in "related tools" and dashboard
   * quick actions. Shows the target format (converters) or category as subtitle.
   */
  import { computed } from 'vue'
  import { RouterLink } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { ROUTE_NAMES } from '@constants'
  import { hexAlpha } from '@utils'
  import type { PdfTool } from '@types'

  const props = defineProps<{ tool: PdfTool }>()

  const iconStyle = computed(() => ({
    color: props.tool.color,
    background: hexAlpha(props.tool.color, 0.13),
  }))
  const subtitle = computed(() =>
    props.tool.output ? `to ${props.tool.output}` : props.tool.category,
  )
</script>

<template>
  <RouterLink :to="{ name: ROUTE_NAMES.TOOL, params: { slug: tool.slug } }" class="pf-tile-slim">
    <span class="pf-tile-slim__icon" :style="iconStyle">
      <BaseIcon :name="tool.icon" :size="20" />
    </span>
    <span class="pf-tile-slim__text">
      <span class="pf-tile-slim__name">{{ tool.name }}</span>
      <span class="pf-tile-slim__sub">{{ subtitle }}</span>
    </span>
  </RouterLink>
</template>

<style scoped>
  .pf-tile-slim {
    display: flex;
    align-items: center;
    gap: 13px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: 13px;
    padding: 13px 15px;
    cursor: pointer;
    transition: all 0.18s;
    box-shadow: var(--shadow-sm);
  }
  .pf-tile-slim:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  .pf-tile-slim__icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .pf-tile-slim__text {
    min-width: 0;
  }
  .pf-tile-slim__name {
    display: block;
    font-weight: 700;
    font-size: 14.5px;
    color: hsl(var(--color-text));
  }
  .pf-tile-slim__sub {
    display: block;
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
