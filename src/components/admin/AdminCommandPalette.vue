<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import AdminIcon from './AdminIcon.vue'
  import { ADMIN_NAV, type AdminNavItem } from './admin-nav'

  const emit = defineEmits<{ close: [] }>()
  const router = useRouter()
  const search = ref('')

  const allItems = computed<AdminNavItem[]>(() => ADMIN_NAV.flatMap((g) => g.items))
  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return allItems.value.slice(0, 8)
    return allItems.value.filter((i) => i.label.toLowerCase().includes(q))
  })

  function go(item: AdminNavItem) {
    router.push({ name: item.route })
    emit('close')
  }
</script>

<template>
  <Teleport to="body">
    <div class="ad-cmd pf-admin" @click.self="emit('close')">
      <div class="ad-cmd__panel">
        <div class="ad-cmd__input-wrap">
          <AdminIcon name="search" :size="18" class="ad-muted" />
          <input
            v-model="search"
            autofocus
            class="ad-cmd__input"
            placeholder="Search pages, tools, settings..."
            @keydown.enter="filtered[0] && go(filtered[0])"
          />
          <span class="ad-cmd__esc">ESC</span>
        </div>
        <div class="ad-cmd__list">
          <button
            v-for="item in filtered"
            :key="item.id"
            class="ad-cmd__item"
            @click="go(item)"
          >
            <AdminIcon :name="item.icon" :size="16" />
            {{ item.label }}
          </button>
          <div v-if="!filtered.length" class="ad-cmd__empty">No matches.</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .ad-cmd {
    position: fixed;
    inset: 0;
    background: var(--ad-overlay);
    z-index: 1400;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 20vh;
    animation: adFadeIn 0.1s;
  }
  .ad-cmd__panel {
    width: 480px;
    max-width: 90vw;
    background: var(--ad-surface);
    border: 1px solid var(--ad-border);
    border-radius: 14px;
    box-shadow: var(--ad-shadow);
    animation: adFadeUp 0.15s;
    overflow: hidden;
  }
  .ad-cmd__input-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--ad-border);
  }
  .ad-cmd__input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--ad-text);
    font-size: 15px;
    outline: none;
    font-family: inherit;
  }
  .ad-cmd__esc {
    font-size: 11px;
    color: var(--ad-text3);
    padding: 3px 8px;
    border-radius: 5px;
    background: var(--ad-chip);
    border: 1px solid var(--ad-border);
  }
  .ad-cmd__list { max-height: 300px; overflow-y: auto; padding: 6px; }
  .ad-cmd__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--ad-text2);
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
  }
  .ad-cmd__item:hover { background: var(--ad-chip); color: var(--ad-text); }
  .ad-cmd__empty { padding: 20px; text-align: center; color: var(--ad-text3); font-size: 13px; }
</style>
