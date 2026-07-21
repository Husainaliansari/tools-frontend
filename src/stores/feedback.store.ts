import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ConfirmOptions, Toast, ToastTone } from '@types'

/**
 * Feedback store — transient global UI: toast notifications and the confirm
 * dialog. Kept separate from the UI store so each has a single responsibility.
 */
export const useFeedbackStore = defineStore('feedback', () => {
  // ─── Toast ──────────────────────────────────────────────────────────────
  const toast = ref<Toast | null>(null)
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  let toastSeq = 0

  function showToast(message: string, tone: ToastTone = 'success'): void {
    toastSeq += 1
    toast.value = { id: toastSeq, message, tone }
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.value = null
    }, 2800)
  }

  function dismissToast(): void {
    clearTimeout(toastTimer)
    toast.value = null
  }

  // ─── Confirm dialog ─────────────────────────────────────────────────────
  const confirmState = ref<ConfirmOptions | null>(null)

  function confirm(options: ConfirmOptions): void {
    confirmState.value = options
  }

  /** Accepts the dialog; surfaces the follow-up toast if one was configured. */
  function acceptConfirm(): void {
    const toastMessage = confirmState.value?.toast
    confirmState.value = null
    if (toastMessage) showToast(toastMessage)
  }

  function cancelConfirm(): void {
    confirmState.value = null
  }

  return {
    toast,
    showToast,
    dismissToast,
    confirmState,
    confirm,
    acceptConfirm,
    cancelConfirm,
  }
})
