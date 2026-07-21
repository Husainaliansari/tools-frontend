<script setup lang="ts">
  /**
   * ThemeToggle — flips between light and dark mode.
   */
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { useTheme } from '@composables/useTheme'

  const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="pf-theme-toggle"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <BaseIcon :name="isDark ? 'sun' : 'moon'" :size="18" />
  </button>
</template>

<style scoped>
  .pf-theme-toggle {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }
  .pf-theme-toggle:hover {
    color: hsl(var(--color-text));
    border-color: hsl(var(--color-border-strong));
  }
</style>
