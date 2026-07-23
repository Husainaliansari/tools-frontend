<script setup lang="ts">
  import AdminIcon from './AdminIcon.vue'

  const props = defineProps<{ page: number; pages: number; total?: number }>()
  const emit = defineEmits<{ change: [number] }>()

  function go(p: number) {
    if (p >= 1 && p <= props.pages && p !== props.page) emit('change', p)
  }
</script>

<template>
  <div class="ad-pagination">
    <span class="ad-pagination__info">
      Page {{ page }} of {{ Math.max(1, pages) }}
      <template v-if="total !== undefined">· {{ total }} total</template>
    </span>
    <div class="ad-pagination__controls">
      <button :disabled="page <= 1" @click="go(page - 1)">
        <AdminIcon name="chevron-left" :size="14" />
      </button>
      <button :disabled="page >= pages" @click="go(page + 1)">
        <AdminIcon name="chevron-right" :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
  .ad-pagination {
    padding: 12px 18px;
    border-top: 1px solid var(--ad-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .ad-pagination__info { font-size: 13px; color: var(--ad-text3); }
  .ad-pagination__controls { display: flex; gap: 4px; }
  .ad-pagination__controls button {
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--ad-border);
    background: transparent;
    color: var(--ad-text);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
  }
  .ad-pagination__controls button:disabled { color: var(--ad-text3); opacity: 0.5; cursor: default; }
  .ad-pagination__controls button:not(:disabled):hover { background: var(--ad-chip); }
</style>
