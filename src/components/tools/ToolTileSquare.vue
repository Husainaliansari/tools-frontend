<script setup lang="ts">
  /**
   * ToolTileSquare — compact square tile used in the category grids.
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
</script>

<template>
  <RouterLink :to="{ name: ROUTE_NAMES.TOOL, params: { slug: tool.slug } }" class="pf-tile-sq">
    <span class="pf-tile-sq__icon" :style="iconStyle">
      <BaseIcon :name="tool.icon" :size="26" />
    </span>
    <span class="pf-tile-sq__name">{{ tool.name }}</span>
    <span class="pf-tile-sq__desc">{{ tool.description }}</span>
  </RouterLink>
</template>

<style scoped>
  .pf-tile-sq {
    min-height: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 10px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    padding: 18px 14px;
    cursor: pointer;
    transition: all 0.18s;
    box-shadow: var(--shadow-sm);
  }
  .pf-tile-sq:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg);
  }
  .pf-tile-sq__icon {
    width: 52px;
    height: 52px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .pf-tile-sq__name {
    font-weight: 700;
    font-size: 14.5px;
    color: hsl(var(--color-text));
    letter-spacing: -0.01em;
    line-height: 1.25;
  }
  .pf-tile-sq__desc {
    font-size: 12.5px;
    line-height: 1.4;
    color: hsl(var(--color-text-muted));
    margin-top: -4px;
  }
</style>
