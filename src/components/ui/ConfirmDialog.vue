<script setup lang="ts">
  /**
   * ConfirmDialog — global destructive-action confirmation, driven by the
   * feedback store. Mounted once at the app root.
   */
  import { storeToRefs } from 'pinia'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import { useFeedbackStore } from '@stores/feedback.store'

  const store = useFeedbackStore()
  const { confirmState } = storeToRefs(store)
</script>

<template>
  <Transition name="overlay">
    <div v-if="confirmState" class="pf-confirm" @click.self="store.cancelConfirm()">
      <div class="pf-confirm__panel" role="dialog" aria-modal="true">
        <div class="pf-confirm__icon">
          <BaseIcon name="trash" :size="22" />
        </div>
        <h2 class="pf-confirm__title">{{ confirmState.title }}</h2>
        <p class="pf-confirm__body">{{ confirmState.body }}</p>
        <div class="pf-confirm__actions">
          <BaseButton variant="secondary" @click="store.cancelConfirm()">Cancel</BaseButton>
          <BaseButton variant="danger" @click="store.acceptConfirm()">
            {{ confirmState.confirmLabel ?? 'Delete' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
  .pf-confirm {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    background: rgb(8 12 24 / 0.55);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .pf-confirm__panel {
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: 18px;
    padding: 26px;
    max-width: 400px;
    width: 100%;
    box-shadow: var(--shadow-xl);
    animation: fadeUp 0.25s ease;
  }
  .pf-confirm__icon {
    width: 46px;
    height: 46px;
    border-radius: var(--radius-lg);
    background: hsl(var(--color-danger) / 0.13);
    color: hsl(var(--color-danger));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }
  .pf-confirm__title {
    font-weight: 700;
    font-size: 18px;
    margin: 0 0 8px;
    color: hsl(var(--color-text));
  }
  .pf-confirm__body {
    font-size: 14px;
    color: hsl(var(--color-text-muted));
    line-height: 1.5;
    margin: 0 0 22px;
  }
  .pf-confirm__actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .overlay-enter-active {
    animation: fadeIn 0.2s ease;
  }
  .overlay-leave-active {
    transition: opacity 0.15s ease;
  }
  .overlay-leave-to {
    opacity: 0;
  }
</style>
