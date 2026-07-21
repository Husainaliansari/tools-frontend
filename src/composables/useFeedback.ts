import { useFeedbackStore } from '@stores/feedback.store'

/**
 * Convenience composable for showing toasts and confirm dialogs from any
 * component without touching the store directly.
 *
 * @example
 * const { showToast, confirm } = useFeedback()
 * showToast('Saved to My Files')
 */
export function useFeedback() {
  const store = useFeedbackStore()
  return {
    showToast: store.showToast,
    confirm: store.confirm,
  }
}
