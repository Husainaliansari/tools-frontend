<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { adminService, type AuditLog } from '@services/admin'
  import { AdminCard, AdminIcon, AdminPageHeader, AdminPagination } from '@components/admin'
  import { timeAgo } from '@components/admin/format'

  const rows = ref<AuditLog[]>([])
  const total = ref(0)
  const pages = ref(1)
  const page = ref(1)
  const loading = ref(true)
  const q = ref('')

  async function load() {
    loading.value = true
    try {
      const res = await adminService.listAudit({
        category: 'security',
        page: page.value,
        size: 15,
        q: q.value,
      })
      rows.value = res.data.items
      total.value = res.data.meta.total
      pages.value = res.data.meta.pages
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  let searchTimer: ReturnType<typeof setTimeout>
  function onSearch() {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      page.value = 1
      load()
    }, 300)
  }
  function changePage(p: number) {
    page.value = p
    load()
  }

  function iconFor(action: string): string {
    const a = action.toLowerCase()
    if (a.includes('lock') || a.includes('password') || a.includes('login')) return 'lock'
    if (a.includes('alert') || a.includes('suspicious') || a.includes('rate')) return 'alert-triangle'
    return 'shield'
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Security Events" subtitle="Security-related events and alerts." />

    <AdminCard>
      <div class="head">
        <div class="head__search">
          <AdminIcon name="search" :size="16" class="head__search-icon" />
          <input
            v-model="q"
            class="ad-input ad-input--icon"
            placeholder="Search security events…"
            @input="onSearch"
          />
        </div>
      </div>

      <div v-if="loading" class="state">
        <span class="ad-spinner" style="margin: 0 auto" />
      </div>
      <div v-else-if="!rows.length" class="state ad-muted">No security events.</div>
      <template v-else>
        <div
          v-for="(log, i) in rows"
          :key="log.id"
          class="feed"
          :class="{ 'no-border': i === rows.length - 1 }"
        >
          <div class="feed__icon">
            <AdminIcon :name="iconFor(log.action)" :size="15" />
          </div>
          <div class="feed__body">
            <div class="feed__action">{{ log.action }}</div>
            <div class="feed__summary">{{ log.summary }}</div>
            <div class="feed__meta">
              <span v-if="log.actor_email">{{ log.actor_email }}</span>
              <span v-if="log.ip" class="ad-mono">{{ log.ip }}</span>
            </div>
          </div>
          <span class="feed__time">{{ timeAgo(log.created_at) }}</span>
        </div>
      </template>

      <AdminPagination :page="page" :pages="pages" :total="total" @change="changePage" />
    </AdminCard>
  </div>
</template>

<style scoped>
  .head { padding: 14px 18px; border-bottom: 1px solid var(--ad-border); }
  .head__search { position: relative; }
  .head__search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ad-text3); pointer-events: none; }
  .state { text-align: center; padding: 40px 16px; font-size: 13.5px; display: flex; justify-content: center; }
  .feed { display: flex; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--ad-border); }
  .feed.no-border { border-bottom: none; }
  .feed__icon {
    width: 32px; height: 32px; border-radius: 8px; flex: none;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--ad-danger) 12%, transparent);
    color: var(--ad-danger);
  }
  .feed__body { flex: 1; min-width: 0; }
  .feed__action { font-weight: 600; font-size: 13.5px; color: var(--ad-text); text-transform: capitalize; }
  .feed__summary { font-size: 12.5px; color: var(--ad-text3); margin-top: 2px; }
  .feed__meta { display: flex; gap: 10px; font-size: 12px; color: var(--ad-text2); margin-top: 3px; }
  .feed__time { font-size: 12px; color: var(--ad-text3); white-space: nowrap; }
</style>
