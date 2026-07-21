import { useUiStore } from '@stores/ui.store'
import { storeToRefs } from 'pinia'

/**
 * Composable for accessing and toggling the application theme.
 *
 * @example
 * const { isDark, toggleTheme, setTheme } = useTheme()
 */
export function useTheme() {
  const uiStore = useUiStore()
  const { isDark, theme } = storeToRefs(uiStore)

  return {
    isDark,
    theme,
    setTheme: uiStore.setTheme,
    toggleTheme: uiStore.toggleTheme,
  }
}
