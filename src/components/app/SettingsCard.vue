<script setup lang="ts">
  /**
   * SettingsCard — titled card section used inside the settings panels.
   * Pass `accent` (a CSS color expression) to tint the title and border, e.g.
   * for the danger zone.
   */
  import { computed } from 'vue'
  import BaseCard from '@components/ui/BaseCard.vue'

  const props = defineProps<{
    title: string
    subtitle?: string
    /** CSS color expression, e.g. "var(--color-danger)". */
    accent?: string
  }>()

  const cardStyle = computed(() =>
    props.accent ? { borderColor: `hsl(${props.accent} / 0.3)` } : {},
  )
  const titleStyle = computed(() => (props.accent ? { color: `hsl(${props.accent})` } : {}))
</script>

<template>
  <BaseCard :style="cardStyle">
    <div class="pf-scard">
      <div class="pf-scard__head">
        <div class="pf-scard__title" :style="titleStyle">{{ title }}</div>
        <div v-if="subtitle" class="pf-scard__sub">{{ subtitle }}</div>
      </div>
      <slot />
    </div>
  </BaseCard>
</template>

<style scoped>
  .pf-scard {
    padding: 24px;
  }
  .pf-scard__head {
    margin-bottom: 16px;
  }
  .pf-scard__title {
    font-weight: 700;
    font-size: 16.5px;
    color: hsl(var(--color-text));
    letter-spacing: -0.01em;
  }
  .pf-scard__sub {
    font-size: 13.5px;
    color: hsl(var(--color-text-muted));
    margin-top: 3px;
  }
</style>
