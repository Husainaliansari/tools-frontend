<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useUiStore } from '@stores/ui.store'
  import { useAuthStore } from '@stores/auth.store'
  import { ROUTE_NAMES } from '@constants'
  import AdminIcon from './AdminIcon.vue'
  import AdminAvatar from './AdminAvatar.vue'
  import { ADMIN_NAV } from './admin-nav'

  const emit = defineEmits<{ openSearch: []; toggleSidebar: [] }>()

  const route = useRoute()
  const router = useRouter()
  const ui = useUiStore()
  const auth = useAuthStore()

  const profileOpen = ref(false)

  const crumbs = computed<string[]>(() => {
    for (const group of ADMIN_NAV) {
      const item = group.items.find((i) => i.route === route.name)
      if (item) return [group.group, item.label]
    }
    return ['Overview', 'Dashboard']
  })

  const adminName = computed(() => auth.currentUser?.name ?? 'Admin')
  const adminEmail = computed(() => auth.currentUser?.email ?? 'admin@pdfly.com')

  async function signOut() {
    profileOpen.value = false
    await auth.logout()
    router.push({ name: ROUTE_NAMES.LOGIN })
  }

  function goSettings() {
    profileOpen.value = false
    router.push({ name: ROUTE_NAMES.ADMIN_SETTINGS })
  }
</script>

<template>
  <header class="ad-topbar">
    <button class="ad-topbar__menu-toggle" @click="emit('toggleSidebar')" aria-label="Toggle Menu">
      <AdminIcon name="menu" :size="20" />
    </button>

    <div class="ad-topbar__crumbs">
      <template v-for="(c, i) in crumbs" :key="i">
        <AdminIcon v-if="i > 0" name="chevron-right" :size="14" class="ad-muted" />
        <span class="ad-topbar__crumb" :class="{ 'is-last': i === crumbs.length - 1 }">{{ c }}</span>
      </template>
    </div>

    <div class="ad-topbar__actions">
      <button class="ad-topbar__search" @click="emit('openSearch')">
        <AdminIcon name="search" :size="15" />
        <span>Search...</span>
        <span class="ad-topbar__kbd">⌘K</span>
      </button>

      <button
        class="ad-topbar__icon-btn"
        title="Notifications"
        @click="router.push({ name: ROUTE_NAMES.ADMIN_NOTIFICATIONS })"
      >
        <AdminIcon name="bell" :size="18" />
        <span class="ad-topbar__dot" />
      </button>

      <button class="ad-topbar__icon-btn" title="Toggle theme" @click="ui.toggleTheme()">
        <AdminIcon :name="ui.isDark ? 'sun' : 'moon'" :size="18" />
      </button>

      <div class="ad-topbar__profile">
        <button class="ad-topbar__profile-btn" @click="profileOpen = !profileOpen">
          <AdminAvatar :initials="'AD'" :size="28" />
          <span class="ad-topbar__profile-name">{{ adminName }}</span>
        </button>
        <div v-if="profileOpen" class="ad-topbar__menu" @click.self="profileOpen = false">
          <div class="ad-topbar__menu-head">
            <div class="ad-topbar__menu-name">{{ adminName }}</div>
            <div class="ad-topbar__menu-email">{{ adminEmail }}</div>
          </div>
          <button class="ad-topbar__menu-item" @click="goSettings">
            <AdminIcon name="settings" :size="15" /> Settings
          </button>
          <a class="ad-topbar__menu-item" href="/" target="_blank" rel="noopener">
            <AdminIcon name="external-link" :size="15" /> Visit Site
          </a>
          <button class="ad-topbar__menu-item is-danger" @click="signOut">
            <AdminIcon name="log-out" :size="15" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
  .ad-topbar {
    height: 56px;
    border-bottom: 1px solid var(--ad-border);
    background: var(--ad-sidebar);
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 12px;
    flex: none;
    z-index: 40;
  }
  .ad-topbar__crumbs { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
  .ad-topbar__crumb { font-size: 13.5px; font-weight: 500; color: var(--ad-text3); }
  .ad-topbar__crumb.is-last { font-weight: 600; color: var(--ad-text); }
  .ad-topbar__actions { display: flex; align-items: center; gap: 6px; }
  .ad-topbar__search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 8px;
    border: 1px solid var(--ad-border);
    background: var(--ad-surface2);
    color: var(--ad-text3);
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    min-width: 200px;
  }
  html.dark .ad-topbar__search { background: var(--ad-surface); }
  .ad-topbar__search:hover { border-color: var(--ad-border-strong); }
  .ad-topbar__kbd {
    margin-left: auto;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--ad-chip);
    border: 1px solid var(--ad-border);
    font-family: ui-monospace, monospace;
  }
  .ad-topbar__icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--ad-text2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: background 0.12s;
  }
  .ad-topbar__icon-btn:hover { background: var(--ad-chip); }
  .ad-topbar__dot {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--ad-danger);
    border: 2px solid var(--ad-sidebar);
  }
  .ad-topbar__profile { position: relative; }
  .ad-topbar__profile-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px 4px 4px;
    border-radius: 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background 0.12s;
  }
  .ad-topbar__profile-btn:hover { background: var(--ad-chip); }
  .ad-topbar__profile-name { font-size: 13px; font-weight: 600; color: var(--ad-text); }
  .ad-topbar__menu {
    position: absolute;
    right: 0;
    top: 44px;
    width: 200px;
    background: var(--ad-surface);
    border: 1px solid var(--ad-border);
    border-radius: 10px;
    box-shadow: var(--ad-shadow);
    z-index: 100;
    padding: 6px;
    animation: adFadeUp 0.15s;
  }
  .ad-topbar__menu-head { padding: 10px 12px; border-bottom: 1px solid var(--ad-border); margin-bottom: 4px; }
  .ad-topbar__menu-name { font-weight: 600; font-size: 13.5px; color: var(--ad-text); }
  .ad-topbar__menu-email { font-size: 12px; color: var(--ad-text3); }
  .ad-topbar__menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--ad-text2);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    text-decoration: none;
  }
  .ad-topbar__menu-item:hover { background: var(--ad-chip); }
  .ad-topbar__menu-item.is-danger { color: var(--ad-danger); }
</style>
