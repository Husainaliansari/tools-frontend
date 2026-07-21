<script setup lang="ts">
  /**
   * BaseButton — the primary action element.
   * Variants: primary | secondary | ghost | danger | soft. Sizes: sm | md | lg.
   *
   * @example
   * <BaseButton variant="primary" icon="download" @click="save">Download</BaseButton>
   */
  import { computed } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import type { ButtonSize, ButtonVariant } from '@types'

  const props = withDefaults(
    defineProps<{
      variant?: ButtonVariant
      size?: ButtonSize
      /** Leading icon name. */
      icon?: string
      /** Trailing icon name. */
      iconRight?: string
      /** Stretch to full width. */
      full?: boolean
      /** Show a spinner and block interaction. */
      loading?: boolean
      disabled?: boolean
      type?: 'button' | 'submit' | 'reset'
    }>(),
    {
      variant: 'primary',
      size: 'md',
      type: 'button',
    },
  )

  const iconSize = computed(() => (props.size === 'sm' ? 15 : 17))
  const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button
    :type="type"
    :disabled="isDisabled"
    class="pf-btn"
    :class="[
      `pf-btn--${variant}`,
      `pf-btn--${size}`,
      { 'pf-btn--full': full, 'pf-btn--loading': loading },
    ]"
  >
    <BaseIcon v-if="loading" name="refresh" :size="iconSize" class="pf-btn__spinner" />
    <BaseIcon v-else-if="icon" :name="icon" :size="iconSize" />
    <span v-if="$slots.default"><slot /></span>
    <BaseIcon v-if="iconRight && !loading" :name="iconRight" :size="16" />
  </button>
</template>

<style scoped>
  .pf-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    border: 1px solid transparent;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .pf-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .pf-btn--full {
    width: 100%;
  }

  /* Sizes */
  .pf-btn--sm {
    padding: 8px 14px;
    font-size: 13px;
  }
  .pf-btn--md {
    padding: 11px 20px;
    font-size: 14.5px;
  }
  .pf-btn--lg {
    padding: 14px 26px;
    font-size: 16px;
  }

  /* Primary */
  .pf-btn--primary {
    background: linear-gradient(180deg, hsl(var(--color-primary)), hsl(var(--color-navy)));
    color: #fff;
    box-shadow: 0 6px 18px -6px hsl(var(--color-navy) / 0.55);
  }
  .pf-btn--primary:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 26px -8px hsl(var(--color-navy) / 0.6);
  }

  /* Secondary */
  .pf-btn--secondary {
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    border-color: hsl(var(--color-border-strong));
  }
  .pf-btn--secondary:not(:disabled):hover {
    background: hsl(var(--color-surface-muted));
    transform: translateY(-1px);
  }

  /* Ghost */
  .pf-btn--ghost {
    background: transparent;
    color: hsl(var(--color-text-muted));
  }
  .pf-btn--ghost:not(:disabled):hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }

  /* Danger */
  .pf-btn--danger {
    background: hsl(var(--color-danger));
    color: #fff;
  }
  .pf-btn--danger:not(:disabled):hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }

  /* Soft */
  .pf-btn--soft {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-primary));
  }
  .pf-btn--soft:not(:disabled):hover {
    background: hsl(var(--color-border-strong));
  }

  .pf-btn__spinner {
    animation: spin 0.8s linear infinite;
  }
</style>
