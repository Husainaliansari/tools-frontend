<script setup lang="ts">
  import AdminIcon from './AdminIcon.vue'

  defineProps<{ title: string; width?: number }>()
  const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="ad-modal pf-admin" @click.self="emit('close')">
      <div class="ad-modal__panel" :style="{ width: `${width ?? 480}px` }">
        <header class="ad-modal__head">
          <span class="ad-modal__title">{{ title }}</span>
          <button class="ad-modal__close" @click="emit('close')">
            <AdminIcon name="x" :size="18" />
          </button>
        </header>
        <div class="ad-modal__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="ad-modal__footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .ad-modal {
    position: fixed;
    inset: 0;
    background: var(--ad-overlay);
    z-index: 1300;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
    animation: adFadeIn 0.1s;
  }
  .ad-modal__panel {
    max-width: 92vw;
    background: var(--ad-surface);
    border: 1px solid var(--ad-border);
    border-radius: 14px;
    box-shadow: var(--ad-shadow);
    animation: adFadeUp 0.15s;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 82vh;
  }
  .ad-modal__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--ad-border);
  }
  .ad-modal__title { font-weight: 700; font-size: 16px; color: var(--ad-text); }
  .ad-modal__close { background: none; border: none; color: var(--ad-text3); cursor: pointer; padding: 4px; display: flex; }
  .ad-modal__body { padding: 20px; overflow-y: auto; }
  .ad-modal__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 20px;
    border-top: 1px solid var(--ad-border);
  }
</style>
