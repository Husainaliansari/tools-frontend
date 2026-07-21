<script setup lang="ts">
  /**
   * PositionGrid — 3×3 page-position selector (top-left … bottom-right).
   * Bound with v-model; behaves as a radio group with arrow-key navigation.
   */
  import { ref } from 'vue'

  const props = defineProps<{
    modelValue: string
    disabled?: boolean
  }>()

  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  const POSITIONS = [
    ['top-left', 'top-center', 'top-right'],
    ['center-left', 'center', 'center-right'],
    ['bottom-left', 'bottom-center', 'bottom-right'],
  ] as const

  const LABELS: Record<string, string> = {
    'top-left': 'Top left',
    'top-center': 'Top center',
    'top-right': 'Top right',
    'center-left': 'Center left',
    center: 'Center',
    'center-right': 'Center right',
    'bottom-left': 'Bottom left',
    'bottom-center': 'Bottom center',
    'bottom-right': 'Bottom right',
  }

  const root = ref<HTMLDivElement | null>(null)

  function select(position: string) {
    if (!props.disabled) emit('update:modelValue', position)
  }

  /** Arrow keys move the selection around the grid (radio-group semantics). */
  function onKeydown(event: KeyboardEvent) {
    const flat = POSITIONS.flat() as readonly string[]
    const index = flat.indexOf(props.modelValue)
    if (index === -1) return
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 3,
      ArrowUp: -3,
    }
    const step = steps[event.key]
    if (step === undefined) return
    const next = Math.min(Math.max(index + step, 0), flat.length - 1)
    event.preventDefault()
    select(flat[next])
    const buttons = root.value?.querySelectorAll<HTMLButtonElement>('.pf-posgrid__cell')
    buttons?.[next]?.focus()
  }
</script>

<template>
  <div
    ref="root"
    class="pf-posgrid"
    :class="{ 'pf-posgrid--disabled': disabled }"
    role="radiogroup"
    aria-label="Watermark position"
    @keydown="onKeydown"
  >
    <template v-for="row in POSITIONS" :key="row[0]">
      <button
        v-for="position in row"
        :key="position"
        type="button"
        class="pf-posgrid__cell"
        :class="{ 'pf-posgrid__cell--active': modelValue === position }"
        role="radio"
        :aria-checked="modelValue === position"
        :aria-label="LABELS[position]"
        :title="LABELS[position]"
        :disabled="disabled"
        :tabindex="modelValue === position ? 0 : -1"
        @click="select(position)"
      >
        <span class="pf-posgrid__dot" />
      </button>
    </template>
  </div>
</template>

<style scoped>
  .pf-posgrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    width: 108px;
    padding: 6px;
    border-radius: var(--radius-lg);
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface-muted));
    /* Suggest a portrait page. */
    aspect-ratio: 3 / 3.6;
  }
  .pf-posgrid--disabled {
    opacity: 0.5;
  }
  .pf-posgrid__cell {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition: background 0.15s;
  }
  .pf-posgrid__cell:disabled {
    cursor: not-allowed;
  }
  .pf-posgrid__cell:not(:disabled):hover {
    background: hsl(var(--color-chip));
  }
  .pf-posgrid__cell:focus-visible {
    outline: 2px solid hsl(var(--color-primary) / 0.6);
    outline-offset: 1px;
  }
  .pf-posgrid__dot {
    width: 7px;
    height: 7px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-text-faint));
    transition: all 0.15s;
  }
  .pf-posgrid__cell--active {
    background: hsl(var(--color-primary) / 0.12);
  }
  .pf-posgrid__cell--active .pf-posgrid__dot {
    background: hsl(var(--color-primary));
    transform: scale(1.5);
    box-shadow: 0 0 0 3px hsl(var(--color-primary) / 0.2);
  }
</style>
