<script setup lang="ts">
  /**
   * SegmentedControl — pill group of mutually exclusive options.
   * Bound with v-model. Options may include an optional leading icon.
   */
  import BaseIcon from '@components/icons/BaseIcon.vue'

  export interface SegmentOption {
    value: string
    icon?: string
  }

  defineProps<{
    modelValue: string
    /** Either plain string options or {value, icon} objects. */
    options: readonly (string | SegmentOption)[]
  }>()

  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  function normalize(opt: string | SegmentOption): SegmentOption {
    return typeof opt === 'string' ? { value: opt } : opt
  }
</script>

<template>
  <div class="pf-seg">
    <button
      v-for="opt in options"
      :key="normalize(opt).value"
      type="button"
      class="pf-seg__item"
      :class="{ 'pf-seg__item--active': modelValue === normalize(opt).value }"
      @click="emit('update:modelValue', normalize(opt).value)"
    >
      <BaseIcon v-if="normalize(opt).icon" :name="normalize(opt).icon!" :size="15" />
      {{ normalize(opt).value }}
    </button>
  </div>
</template>

<style scoped>
  .pf-seg {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px;
    background: hsl(var(--color-surface-muted));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
  }
  .pf-seg__item {
    flex: 1;
    min-width: fit-content;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px 8px;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: hsl(var(--color-text-faint));
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .pf-seg__item--active {
    background: hsl(var(--color-surface));
    color: hsl(var(--color-primary));
    box-shadow: var(--shadow-sm);
  }
</style>
