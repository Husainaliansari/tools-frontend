<script setup lang="ts">
  /**
   * NumberStepper — a compact, precise numeric input control with +/- stepper buttons.
   * Allows manual typing, arrow key navigation, and stepper click adjustments.
   *
   * @example
   * <NumberStepper v-model="fontSize" :min="4" :max="288" :step="1" unit="pt" label="Font size" />
   */
  import { computed, ref, watch } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'

  const props = withDefaults(
    defineProps<{
      modelValue: number
      min?: number
      max?: number
      step?: number
      unit?: string
      label?: string
      disabled?: boolean
      compact?: boolean
    }>(),
    {
      min: -999,
      max: 999,
      step: 1,
      unit: '',
      label: 'Value',
      disabled: false,
      compact: false,
    },
  )

  const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

  const localString = ref(String(props.modelValue))

  watch(
    () => props.modelValue,
    (val) => {
      // Keep local input string in sync when not focused or changed from outside
      localString.value = String(val)
    },
    { immediate: true },
  )

  function clampValue(val: number): number {
    let result = val
    if (props.min !== undefined && result < props.min) result = props.min
    if (props.max !== undefined && result > props.max) result = props.max
    // Trim decimal precision float anomalies
    const decimals = (String(props.step).split('.')[1] || '').length
    return Number(result.toFixed(decimals))
  }

  function updateValue(raw: number): void {
    const clamped = clampValue(raw)
    localString.value = String(clamped)
    emit('update:modelValue', clamped)
  }

  function decrement(): void {
    if (props.disabled) return
    updateValue(props.modelValue - props.step)
  }

  function increment(): void {
    if (props.disabled) return
    updateValue(props.modelValue + props.step)
  }

  function onInput(event: Event): void {
    const target = event.target as HTMLInputElement
    localString.value = target.value
    const parsed = parseFloat(target.value)
    if (!isNaN(parsed)) {
      emit('update:modelValue', clampValue(parsed))
    }
  }

  function onBlur(): void {
    const parsed = parseFloat(localString.value)
    if (isNaN(parsed)) {
      localString.value = String(props.modelValue)
    } else {
      updateValue(parsed)
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (props.disabled) return
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      increment()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      decrement()
    }
  }

  const canDecrement = computed(() => !props.disabled && props.modelValue > props.min)
  const canIncrement = computed(() => !props.disabled && props.modelValue < props.max)
</script>

<template>
  <div
    class="pf-stepper"
    :class="{
      'pf-stepper--disabled': disabled,
      'pf-stepper--compact': compact,
    }"
  >
    <button
      type="button"
      class="pf-stepper__btn pf-stepper__btn--dec"
      :disabled="!canDecrement"
      :aria-label="`Decrease ${label}`"
      tabindex="-1"
      @click="decrement"
    >
      <BaseIcon name="minus" :size="12" />
    </button>
    <div class="pf-stepper__input-wrap">
      <input
        type="text"
        inputmode="decimal"
        class="pf-stepper__input"
        :value="localString"
        :disabled="disabled"
        :aria-label="label"
        @input="onInput"
        @blur="onBlur"
        @keydown="onKeyDown"
      />
      <span v-if="unit" class="pf-stepper__unit">{{ unit }}</span>
    </div>
    <button
      type="button"
      class="pf-stepper__btn pf-stepper__btn--inc"
      :disabled="!canIncrement"
      :aria-label="`Increase ${label}`"
      tabindex="-1"
      @click="increment"
    >
      <BaseIcon name="plus" :size="12" />
    </button>
  </div>
</template>

<style scoped>
  .pf-stepper {
    display: inline-flex;
    align-items: center;
    height: 30px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
    user-select: none;
    flex: none;
  }
  .pf-stepper:focus-within {
    border-color: hsl(var(--color-primary));
    box-shadow: 0 0 0 2px hsl(var(--color-primary) / 0.2);
  }
  .pf-stepper--disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  .pf-stepper--compact {
    height: 26px;
  }

  .pf-stepper__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 100%;
    border: none;
    background: transparent;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    transition: background-color 0.12s, color 0.12s;
    padding: 0;
    flex: none;
  }
  .pf-stepper__btn:hover:not(:disabled) {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .pf-stepper__btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .pf-stepper__input-wrap {
    display: flex;
    align-items: center;
    padding: 0 2px;
    height: 100%;
    background: transparent;
  }
  .pf-stepper__input {
    width: 34px;
    height: 100%;
    border: none;
    background: transparent;
    color: hsl(var(--color-text));
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    outline: none;
    padding: 0;
    font-variant-numeric: tabular-nums;
  }
  .pf-stepper--compact .pf-stepper__input {
    width: 28px;
    font-size: 11.5px;
  }

  .pf-stepper__unit {
    font-size: 10.5px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    margin-right: 2px;
    pointer-events: none;
  }
</style>
