<script setup lang="ts">
  /**
   * PreferenceRow — icon + title/subtitle on the left, a control slot on the
   * right. Used across Profile and Settings.
   */
  import BaseIcon from '@components/icons/BaseIcon.vue'

  withDefaults(
    defineProps<{
      icon: string
      title: string
      subtitle?: string
      /** Drop the bottom divider (last row in a group). */
      last?: boolean
    }>(),
    { last: false },
  )
</script>

<template>
  <div class="pf-pref" :class="{ 'pf-pref--last': last }">
    <div class="pf-pref__icon"><BaseIcon :name="icon" :size="19" /></div>
    <div class="pf-pref__text">
      <div class="pf-pref__title">{{ title }}</div>
      <div v-if="subtitle" class="pf-pref__sub">{{ subtitle }}</div>
    </div>
    <div class="pf-pref__control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
  .pf-pref {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid hsl(var(--color-border));
    flex-wrap: wrap;
  }
  .pf-pref--last {
    border-bottom: none;
  }
  .pf-pref__icon {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text-muted));
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .pf-pref__text {
    flex: 1;
    min-width: 140px;
  }
  .pf-pref__title {
    font-weight: 600;
    font-size: 14.5px;
    color: hsl(var(--color-text));
  }
  .pf-pref__sub {
    font-size: 13px;
    color: hsl(var(--color-text-faint));
  }
  .pf-pref__control {
    margin-left: auto;
  }
</style>
