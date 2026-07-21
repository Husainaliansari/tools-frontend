<script setup lang="ts">
  /**
   * FileThumb — a file's visual identity in the workflow.
   *
   * Renders the real preview when one can be generated client-side (PDF first
   * page, image bitmap), with a shimmering skeleton while it loads and a
   * colored format-icon fallback otherwise. Always shows the extension badge.
   */
  import { computed, toRef } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { extOf, formatMeta } from '@constants/formats'
  import { useFileThumbnail } from '@composables'
  import { hexAlpha } from '@utils'

  const props = withDefaults(
    defineProps<{
      /** The browser file to thumbnail; falls back to icon when absent. */
      file?: File | null
      /** File name used for the extension badge / icon fallback. */
      name: string
      /** Thumbnail box size in px. */
      size?: number
    }>(),
    { file: null, size: 56 },
  )

  const { thumbnail, loading } = useFileThumbnail(toRef(props, 'file'))

  const meta = computed(() => formatMeta(extOf(props.name) ?? ''))
  const boxStyle = computed(() => ({
    width: `${props.size}px`,
    height: `${Math.round(props.size * 1.25)}px`,
  }))
  const iconStyle = computed(() => ({
    color: meta.value.color,
    background: hexAlpha(meta.value.color, 0.12),
  }))
</script>

<template>
  <div class="pf-thumb" :style="boxStyle">
    <div v-if="loading" class="pf-thumb__skeleton" aria-hidden="true" />
    <img
      v-else-if="thumbnail?.url"
      :src="thumbnail.url"
      :alt="`Preview of ${name}`"
      class="pf-thumb__img"
    />
    <div v-else class="pf-thumb__icon" :style="iconStyle" aria-hidden="true">
      <BaseIcon :name="meta.icon" :size="Math.round(size * 0.42)" />
    </div>
    <span class="pf-thumb__ext" :style="{ background: meta.color }">{{ meta.label }}</span>
  </div>
</template>

<style scoped>
  .pf-thumb {
    position: relative;
    flex: none;
    border-radius: 10px;
    overflow: hidden;
    background: hsl(var(--color-surface-muted));
    border: 1px solid hsl(var(--color-border));
    box-shadow: var(--shadow-sm);
  }
  .pf-thumb__skeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      hsl(var(--color-chip)) 25%,
      hsl(var(--color-surface-muted)) 37%,
      hsl(var(--color-chip)) 63%
    );
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
  }
  .pf-thumb__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    animation: fadeIn 0.25s ease;
  }
  .pf-thumb__icon {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-thumb__ext {
    position: absolute;
    left: 0;
    bottom: 0;
    padding: 1.5px 6px 1px;
    border-top-right-radius: 7px;
    color: #fff;
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.04em;
    line-height: 1.5;
  }
  @media (prefers-reduced-motion: reduce) {
    .pf-thumb__skeleton {
      animation: none;
    }
    .pf-thumb__img {
      animation: none;
    }
  }
</style>
