<script setup lang="ts">
  /**
   * AppToast — global toast, driven by the feedback store. Mounted once at the
   * app root.
   */
  import { computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { useFeedbackStore } from '@stores/feedback.store'

  const store = useFeedbackStore()
  const { toast } = storeToRefs(store)

  const accent = computed(() => {
    const map = {
      success: 'var(--color-success)',
      error: 'var(--color-danger)',
      info: 'var(--color-primary)',
    }
    return map[toast.value?.tone ?? 'success']
  })
</script>

<template>
  <Transition name="toast">
    <div v-if="toast" :key="toast.id" class="pf-toast-wrap" role="status" aria-live="polite">
      <div class="pf-toast" :style="{ borderLeftColor: `hsl(${accent})` }">
        <span class="pf-toast__icon" :style="{ color: `hsl(${accent})` }">
          <BaseIcon :name="toast.tone === 'error' ? 'x' : 'check-circle'" :size="20" />
        </span>
        <span class="pf-toast__msg">{{ toast.message }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
  .pf-toast-wrap {
    position: fixed;
    bottom: 26px;
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-toast);
  }
  .pf-toast {
    display: flex;
    align-items: center;
    gap: 12px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-left: 4px solid;
    border-radius: var(--radius-lg);
    padding: 13px 18px;
    box-shadow: var(--shadow-xl);
    min-width: 280px;
    color: hsl(var(--color-text));
  }
  .pf-toast__icon {
    display: flex;
  }
  .pf-toast__msg {
    font-weight: 600;
    font-size: 14px;
  }
  .toast-enter-active {
    animation: toastIn 0.3s ease;
  }
  .toast-leave-active {
    transition: opacity 0.2s ease;
  }
  .toast-leave-to {
    opacity: 0;
  }
</style>
