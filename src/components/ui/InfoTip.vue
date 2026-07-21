<script lang="ts">
  /** Module-scope counter: tooltip ids are document-global, so every
   * instance needs its own. */
  let tipInstanceCount = 0
</script>

<script setup lang="ts">
  /**
   * InfoTip — small "?" affordance that reveals a tooltip on hover/focus.
   * Keyboard accessible: the trigger is focusable and the tip is announced
   * via aria-describedby. Position flips to below when near the viewport top.
   */
  import { ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'

  defineProps<{
    /** Tooltip body text. */
    text: string
  }>()

  tipInstanceCount += 1
  const tipId = `pf-tip-${tipInstanceCount}`
  const open = ref(false)
  const below = ref(false)
  const trigger = ref<HTMLElement | null>(null)

  function show(): void {
    // Flip below the trigger when there is no room above it.
    const rect = trigger.value?.getBoundingClientRect()
    below.value = (rect?.top ?? 100) < 72
    open.value = true
  }
  function hide(): void {
    open.value = false
  }
</script>

<template>
  <span
    ref="trigger"
    class="pf-tip"
    tabindex="0"
    role="button"
    :aria-describedby="open ? tipId : undefined"
    aria-label="More information"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
    @keydown.escape="hide"
  >
    <BaseIcon name="help-circle" :size="14" />
    <Transition name="pf-tip-fade">
      <span v-if="open" :id="tipId" class="pf-tip__bubble" :class="{ 'pf-tip__bubble--below': below }" role="tooltip">
        {{ text }}
      </span>
    </Transition>
  </span>
</template>

<style scoped>
  .pf-tip {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: hsl(var(--color-text-faint));
    cursor: help;
    border-radius: var(--radius-full);
    transition: color 0.15s ease;
  }
  .pf-tip:hover,
  .pf-tip:focus-visible {
    color: hsl(var(--color-primary));
  }
  .pf-tip__bubble {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-tooltip);
    width: max-content;
    max-width: 240px;
    padding: 8px 11px;
    border-radius: var(--radius-md);
    background: hsl(var(--color-text));
    color: hsl(var(--color-bg));
    font-size: 12px;
    font-weight: 500;
    line-height: 1.45;
    text-align: left;
    box-shadow: var(--shadow-lg);
    pointer-events: none;
    white-space: normal;
  }
  .pf-tip__bubble--below {
    bottom: auto;
    top: calc(100% + 8px);
  }
  .pf-tip-fade-enter-active,
  .pf-tip-fade-leave-active {
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
  }
  .pf-tip-fade-enter-from,
  .pf-tip-fade-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(3px);
  }
</style>
