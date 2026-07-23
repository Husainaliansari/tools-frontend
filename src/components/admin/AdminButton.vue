<script setup lang="ts">
  import AdminIcon from './AdminIcon.vue'

  withDefaults(
    defineProps<{
      variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
      size?: 'sm' | 'md' | 'lg'
      icon?: string
      full?: boolean
      loading?: boolean
      disabled?: boolean
      type?: 'button' | 'submit'
    }>(),
    { variant: 'primary', size: 'md', type: 'button' },
  )
</script>

<template>
  <button
    :type="type"
    class="ad-btn"
    :class="[`ad-btn--${variant}`, `ad-btn--${size}`, { 'ad-btn--full': full }]"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="ad-spinner" style="width: 14px; height: 14px" />
    <AdminIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 14 : 16" />
    <slot />
  </button>
</template>

<style scoped>
  .ad-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
    border: 1px solid transparent;
    font-family: inherit;
  }
  .ad-btn:hover:not(:disabled) { opacity: 0.88; filter: brightness(1.08); }
  .ad-btn:disabled { opacity: 0.55; cursor: default; }
  .ad-btn--sm { padding: 6px 12px; font-size: 12.5px; }
  .ad-btn--md { padding: 8px 16px; font-size: 13.5px; }
  .ad-btn--lg { padding: 12px 22px; font-size: 15px; }
  .ad-btn--full { width: 100%; }
  .ad-btn--primary { background: var(--ad-primary); color: #fff; }
  .ad-btn--secondary { background: transparent; color: var(--ad-text2); border-color: var(--ad-border); }
  .ad-btn--secondary:hover:not(:disabled) { border-color: var(--ad-border-strong); opacity: 1; }
  .ad-btn--ghost { background: transparent; color: var(--ad-text2); }
  .ad-btn--ghost:hover:not(:disabled) { background: var(--ad-chip); opacity: 1; filter: none; }
  .ad-btn--danger { background: var(--ad-danger); color: #fff; }
  .ad-btn--soft { background: var(--ad-primary-bg); color: var(--ad-primary); }
</style>
