<script setup lang="ts">
  import { RouterLink } from 'vue-router'
  import AdminIcon from './AdminIcon.vue'
  import { ADMIN_NAV } from './admin-nav'

  defineProps<{ collapsed: boolean; mobileOpen: boolean }>()
  const emit = defineEmits<{ toggle: []; close: [] }>()
</script>

<template>
  <div v-if="mobileOpen" class="ad-sidebar__backdrop" @click="emit('close')" />
  <aside class="ad-sidebar" :class="{ 'is-collapsed': collapsed, 'is-mobile-open': mobileOpen }">
    <div class="ad-sidebar__brand">
      <div class="ad-sidebar__logo">P</div>
      <span v-if="!collapsed" class="ad-sidebar__name">PDFly Admin</span>
    </div>

    <nav class="ad-sidebar__nav">
      <div v-for="group in ADMIN_NAV" :key="group.group" class="ad-sidebar__group">
        <div v-if="!collapsed" class="ad-sidebar__group-label">{{ group.group }}</div>
        <RouterLink
          v-for="item in group.items"
          :key="item.id"
          :to="{ name: item.route }"
          class="ad-sidebar__item"
          :class="{ 'is-collapsed': collapsed }"
          active-class="is-active"
          :title="collapsed ? item.label : undefined"
        >
          <AdminIcon :name="item.icon" :size="17" />
          <span v-if="!collapsed">{{ item.label }}</span>
        </RouterLink>
      </div>
    </nav>

    <div class="ad-sidebar__footer">
      <button class="ad-sidebar__collapse" @click="emit('toggle')">
        <AdminIcon name="panel-left" :size="16" />
        <span v-if="!collapsed">Collapse</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
  .ad-sidebar {
    width: 240px;
    min-width: 240px;
    height: 100vh;
    background: var(--ad-sidebar);
    border-right: 1px solid var(--ad-border);
    display: flex;
    flex-direction: column;
    transition: width 0.2s, min-width 0.2s;
    overflow: hidden;
    z-index: 50;
  }
  .ad-sidebar.is-collapsed { width: 64px; min-width: 64px; }
  .ad-sidebar__brand {
    height: 56px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    border-bottom: 1px solid var(--ad-border);
    flex: none;
  }
  .is-collapsed .ad-sidebar__brand { padding: 0 18px; }
  .ad-sidebar__logo {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--ad-primary), var(--ad-purple));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 800;
    font-size: 13px;
    flex: none;
  }
  .ad-sidebar__name { font-weight: 700; font-size: 15px; color: var(--ad-text); white-space: nowrap; }
  .ad-sidebar__nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 8px; }
  .ad-sidebar__group { margin-bottom: 16px; }
  .ad-sidebar__group-label {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--ad-text3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 4px 10px;
    margin-bottom: 2px;
  }
  .ad-sidebar__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    color: var(--ad-text2);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s;
    white-space: nowrap;
    overflow: hidden;
    text-decoration: none;
  }
  .ad-sidebar__item.is-collapsed { justify-content: center; padding: 9px 0; }
  .ad-sidebar__item:hover { background: var(--ad-chip); color: var(--ad-text); }
  .ad-sidebar__item.is-active {
    background: var(--ad-primary-bg);
    color: var(--ad-primary);
    font-weight: 600;
  }
  html.dark .ad-sidebar__item.is-active { background: var(--ad-surface2); color: var(--ad-text); }
  .ad-sidebar__footer { border-top: 1px solid var(--ad-border); padding: 10px 16px; flex: none; }
  .is-collapsed .ad-sidebar__footer { padding: 10px 18px; }
  .ad-sidebar__collapse {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--ad-text3);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s;
  }
  .is-collapsed .ad-sidebar__collapse { justify-content: center; }
  .ad-sidebar__collapse:hover { background: var(--ad-chip); color: var(--ad-text); }
</style>
