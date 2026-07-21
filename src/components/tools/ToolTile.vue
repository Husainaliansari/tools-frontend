<script setup lang="ts">
  /**
   * ToolTile — redesigned equal-sized premium SaaS square card.
   */
  import { computed } from 'vue'
  import { RouterLink } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { ROUTE_NAMES } from '@constants'
  import { hexAlpha } from '@utils'
  import type { PdfTool } from '@types'

  const props = withDefaults(
    defineProps<{
      tool: PdfTool
      big?: boolean
    }>(),
    { big: false },
  )

  const cardStyle = computed(() => ({
    '--tool-color': props.tool.color,
    '--tool-color-glow': hexAlpha(props.tool.color, 0.15),
    '--tool-color-bg': hexAlpha(props.tool.color, 0.08),
    '--tool-color-bg-hover': hexAlpha(props.tool.color, 0.16),
    '--tool-color-border': hexAlpha(props.tool.color, 0.15),
    '--tool-color-border-hover': hexAlpha(props.tool.color, 0.4),
  }))
</script>

<template>
  <RouterLink
    :to="{ name: ROUTE_NAMES.TOOL, params: { slug: tool.slug } }"
    class="pf-tile"
    :class="{ 'pf-tile--big': big, 'pf-tile--popular': tool.popular }"
    :style="cardStyle"
  >
    <div class="pf-tile__top">
      <span class="pf-tile__icon-wrap">
        <BaseIcon :name="tool.icon" :size="big ? 24 : 19" class="pf-tile__icon" />
      </span>
      <span v-if="tool.popular" class="pf-tile__badge">Popular</span>
    </div>
    <div class="pf-tile__body">
      <h3 class="pf-tile__name">{{ tool.name }}</h3>
      <p class="pf-tile__desc">{{ tool.description }}</p>
    </div>
    <div class="pf-tile__footer">
      <span class="pf-tile__arrow">
        <BaseIcon name="arrow-right" :size="14" />
      </span>
    </div>
  </RouterLink>
</template>

<style scoped>
  .pf-tile {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    aspect-ratio: 1 / 1;
    padding: 18px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: 20px;
    cursor: pointer;
    box-sizing: border-box;
    text-decoration: none;
    transition: 
      transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
      border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
      background-color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 
      0 4px 6px -1px rgb(0 0 0 / 0.02), 
      0 2px 4px -2px rgb(0 0 0 / 0.02);
  }

  .pf-tile--big {
    padding: 24px;
    border-radius: 24px;
  }

  .pf-tile:hover {
    transform: translateY(-5px) scale(1.01);
    border-color: var(--tool-color);
    box-shadow: 
      0 12px 24px -10px var(--tool-color-glow),
      0 4px 12px -5px var(--tool-color-glow),
      0 0 0 4px var(--tool-color-glow);
  }

  .pf-tile:active {
    transform: translateY(-1px) scale(0.98);
    transition: transform 0.1s ease;
  }

  .pf-tile__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: auto;
  }

  .pf-tile__icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--tool-color-bg);
    color: var(--tool-color);
    border: 1px solid var(--tool-color-border);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pf-tile--big .pf-tile__icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 14px;
  }

  .pf-tile:hover .pf-tile__icon-wrap {
    background: var(--tool-color);
    color: #ffffff;
    border-color: var(--tool-color);
    box-shadow: 0 4px 12px -2px var(--tool-color-glow);
  }

  .pf-tile__icon-wrap :deep(svg) {
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pf-tile:hover .pf-tile__icon-wrap :deep(svg) {
    transform: scale(1.1) rotate(4deg);
  }

  .pf-tile__badge {
    font-size: 10px;
    font-weight: 700;
    color: hsl(var(--color-warning));
    background: hsl(var(--color-warning) / 0.1);
    border: 1px solid hsl(var(--color-warning) / 0.18);
    padding: 3px 8px;
    border-radius: var(--radius-full);
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .pf-tile__body {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    margin-top: 10px;
    margin-bottom: 10px;
  }

  .pf-tile__name {
    font-size: 15px;
    font-weight: 800;
    color: hsl(var(--color-text));
    margin: 0;
    line-height: 1.3;
    letter-spacing: -0.02em;
    transition: color 0.3s ease;
  }

  .pf-tile--big .pf-tile__name {
    font-size: 17px;
  }

  .pf-tile:hover .pf-tile__name {
    color: var(--tool-color);
  }

  .pf-tile__desc {
    font-size: 12px;
    color: hsl(var(--color-text-muted));
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .pf-tile__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 100%;
    margin-top: auto;
  }

  .pf-tile__arrow {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: hsl(var(--color-bg-alt));
    color: hsl(var(--color-text-muted));
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pf-tile__arrow :deep(svg) {
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pf-tile:hover .pf-tile__arrow {
    background: var(--tool-color);
    color: #ffffff;
    box-shadow: 0 4px 10px var(--tool-color-glow);
  }

  .pf-tile:hover .pf-tile__arrow :deep(svg) {
    transform: translateX(2px);
  }

  /* Responsive styling */
  @media (max-width: 640px) {
    .pf-tile {
      padding: 16px;
      border-radius: 20px;
    }
    .pf-tile--big {
      padding: 18px;
      border-radius: 22px;
    }
    .pf-tile__icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 12px;
    }
    .pf-tile--big .pf-tile__icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 14px;
    }
    .pf-tile__icon-wrap :deep(svg) {
      width: 18px !important;
      height: 18px !important;
    }
    .pf-tile__badge {
      font-size: 9.5px;
      padding: 2.5px 8px;
    }
    .pf-tile__body {
      gap: 4px;
      margin-top: 8px;
      margin-bottom: 8px;
    }
    .pf-tile__name {
      font-size: 14.5px;
    }
    .pf-tile--big .pf-tile__name {
      font-size: 15.5px;
    }
    .pf-tile__desc {
      font-size: 11.5px;
      line-height: 1.4;
    }
    .pf-tile__arrow {
      width: 28px;
      height: 28px;
    }
    .pf-tile__arrow :deep(svg) {
      width: 13px !important;
      height: 13px !important;
    }
  }
</style>
