<script setup lang="ts">
  /**
   * BaseSlider — range slider with a filled track and a live value readout.
   * Bound with v-model (number). Keyboard accessible via the native input.
   *
   * @example
   * <BaseSlider v-model="opacity" :min="5" :max="100" unit="%" label="Opacity" />
   */
  import { computed } from 'vue'

  const props = withDefaults(
    defineProps<{
      modelValue: number
      min?: number
      max?: number
      step?: number
      /** Readout suffix, e.g. "%", "pt", "mm", "°". */
      unit?: string
      /** Accessible name for the native input. */
      label?: string
      disabled?: boolean
    }>(),
    { min: 0, max: 100, step: 1, unit: '', disabled: false },
  )

  const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

  const percent = computed(() => {
    const span = props.max - props.min
    if (span <= 0) return 0
    return ((props.modelValue - props.min) / span) * 100
  })

  /** Trim float noise (e.g. 1.2000000000000002) from the readout. */
  const readout = computed(() => {
    const value = props.modelValue
    return `${Number.isInteger(value) ? value : Number(value.toFixed(2))}${props.unit}`
  })

  function onInput(event: Event) {
    emit('update:modelValue', Number((event.target as HTMLInputElement).value))
  }
</script>

<template>
  <div class="pf-slider" :class="{ 'pf-slider--disabled': disabled }">
    <input
      type="range"
      class="pf-slider__input"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :disabled="disabled"
      :aria-label="label"
      :style="{ '--pf-slider-fill': `${percent}%` }"
      @input="onInput"
    />
    <span class="pf-slider__value">{{ readout }}</span>
  </div>
</template>

<style scoped>
  .pf-slider {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  .pf-slider--disabled {
    opacity: 0.5;
  }
  .pf-slider__input {
    flex: 1;
    min-width: 0;
    height: 20px;
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    cursor: pointer;
    margin: 0;
  }
  .pf-slider__input:disabled {
    cursor: not-allowed;
  }
  .pf-slider__input:focus-visible {
    outline: 2px solid hsl(var(--color-primary) / 0.6);
    outline-offset: 4px;
    border-radius: var(--radius-full);
  }

  /* Track: filled portion painted with a gradient stop at --pf-slider-fill. */
  .pf-slider__input::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: var(--radius-full);
    background: linear-gradient(
      90deg,
      hsl(var(--color-primary)) var(--pf-slider-fill),
      hsl(var(--color-chip)) var(--pf-slider-fill)
    );
  }
  .pf-slider__input::-moz-range-track {
    height: 6px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-chip));
  }
  .pf-slider__input::-moz-range-progress {
    height: 6px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-primary));
  }

  /* Thumb */
  .pf-slider__input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    margin-top: -6px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-surface));
    border: 2px solid hsl(var(--color-primary));
    box-shadow: var(--shadow-sm);
    transition: transform 0.15s;
  }
  .pf-slider__input::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-surface));
    border: 2px solid hsl(var(--color-primary));
    box-shadow: var(--shadow-sm);
    transition: transform 0.15s;
  }
  .pf-slider__input:not(:disabled)::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }
  .pf-slider__input:not(:disabled)::-moz-range-thumb:hover {
    transform: scale(1.15);
  }

  .pf-slider__value {
    flex: none;
    min-width: 44px;
    text-align: right;
    font-size: 12.5px;
    font-weight: 700;
    color: hsl(var(--color-text-muted));
    font-variant-numeric: tabular-nums;
  }
</style>
