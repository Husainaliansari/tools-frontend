<script setup lang="ts">
  import AdminIcon from './AdminIcon.vue'

  defineProps<{ title: string }>()
  const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="ad-slideover pf-admin" @click.self="emit('close')">
      <div class="ad-slideover__panel">
        <header class="ad-slideover__head">
          <span class="ad-slideover__title">{{ title }}</span>
          <button class="ad-slideover__close" @click="emit('close')">
            <AdminIcon name="x" :size="18" />
          </button>
        </header>
        <div class="ad-slideover__body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .ad-slideover {
    position: fixed;
    inset: 0;
    background: var(--ad-overlay);
    z-index: 1200;
    display: flex;
    justify-content: flex-end;
    animation: adFadeIn 0.1s;
  }
  .ad-slideover__panel {
    width: 440px;
    max-width: 95vw;
    height: 100vh;
    background: var(--ad-surface);
    border-left: 1px solid var(--ad-border);
    animation: adSlideIn 0.2s;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
  .ad-slideover__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--ad-border);
    flex: none;
  }
  .ad-slideover__title { font-weight: 700; font-size: 16px; color: var(--ad-text); }
  .ad-slideover__close { background: none; border: none; color: var(--ad-text3); cursor: pointer; padding: 4px; display: flex; }
  .ad-slideover__close:hover { color: var(--ad-text); }
  .ad-slideover__body { padding: 20px; flex: 1; }
</style>
