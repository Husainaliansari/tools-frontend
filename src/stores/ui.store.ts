import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import type { Theme } from '@types'
import { STORAGE_KEYS } from '@constants'

/**
 * Theme / UI store.
 * Manages dark mode, sidebar state, and global UI preferences.
 */
export const useUiStore = defineStore('ui', () => {
  // ─── State ────────────────────────────────────────────────────────────────
  const systemPrefersDark = usePreferredDark()

  const theme = ref<Theme>((localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null) ?? 'system')

  const isSidebarOpen = ref(true)
  const isMobileSidebarOpen = ref(false)
  const globalLoading = ref(false)

  // ─── Getters ──────────────────────────────────────────────────────────────
  const isDark = computed(() => {
    if (theme.value === 'dark') return true
    if (theme.value === 'light') return false
    return systemPrefersDark.value
  })

  // ─── Actions ──────────────────────────────────────────────────────────────

  function setTheme(newTheme: Theme): void {
    theme.value = newTheme
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme)
  }

  function toggleTheme(): void {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  function toggleSidebar(): void {
    isSidebarOpen.value = !isSidebarOpen.value
  }

  function toggleMobileSidebar(): void {
    isMobileSidebarOpen.value = !isMobileSidebarOpen.value
  }

  function closeMobileSidebar(): void {
    isMobileSidebarOpen.value = false
  }

  // ─── Watchers ─────────────────────────────────────────────────────────────

  // Apply dark class to <html> element whenever isDark changes
  watch(
    isDark,
    (dark) => {
      document.documentElement.classList.toggle('dark', dark)
    },
    { immediate: true },
  )

  return {
    // State
    theme,
    isSidebarOpen,
    isMobileSidebarOpen,
    globalLoading,
    // Getters
    isDark,
    systemPrefersDark,
    // Actions
    setTheme,
    toggleTheme,
    toggleSidebar,
    toggleMobileSidebar,
    closeMobileSidebar,
  }
})
