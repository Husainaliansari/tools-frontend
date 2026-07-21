<script setup lang="ts">
  /**
   * OptionGroup — a titled section inside the options panel.
   * Groups related controls under an icon + uppercase heading with an
   * optional tooltip, giving every tool's settings the same rhythm.
   */
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import InfoTip from '@components/ui/InfoTip.vue'

  defineProps<{
    title: string
    /** Leading icon name for the group heading. */
    icon?: string
    /** Optional tooltip explaining the group. */
    tip?: string
  }>()
</script>

<template>
  <section class="pf-ogroup">
    <header class="pf-ogroup__head">
      <BaseIcon v-if="icon" :name="icon" :size="14" class="pf-ogroup__icon" />
      <h3 class="pf-ogroup__title">{{ title }}</h3>
      <InfoTip v-if="tip" :text="tip" />
    </header>
    <div class="pf-ogroup__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
  .pf-ogroup {
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface-muted) / 0.6);
    padding: 14px;
    transition: border-color 0.2s ease;
  }
  .pf-ogroup:hover {
    border-color: hsl(var(--color-border-strong));
  }
  .pf-ogroup__head {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 13px;
  }
  .pf-ogroup__icon {
    color: hsl(var(--color-primary));
    flex: none;
  }
  .pf-ogroup__title {
    margin: 0;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: hsl(var(--color-text-muted));
  }
  .pf-ogroup__body {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
</style>
