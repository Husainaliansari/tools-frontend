<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { adminService, type ErrorLog } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import {
    AdminBadge,
    AdminButton,
    AdminCard,
    AdminDataTable,
    AdminIcon,
    AdminPageHeader,
    AdminPagination,
  } from '@components/admin'
  import { formatNumber, timeAgo } from '@components/admin/format'

  const { showToast, confirm } = useFeedback()

  const rows = ref<ErrorLog[]>([])
  const total = ref(0)
  const pages = ref(1)
  const page = ref(1)
  const loading = ref(true)
  const filters = reactive({ q: '', level: '' })

  const columns = [
    { key: 'level', label: 'Level' },
    { key: 'message', label: 'Message' },
    { key: 'service', label: 'Service' },
    { key: 'count', label: 'Count' },
    { key: 'last_seen', label: 'Last Seen', nowrap: true },
    { key: 'actions', label: '', align: 'right' as const },
  ]

  async function load() {
    loading.value = true
    try {
      const res = await adminService.listErrors({
        page: page.value,
        size: 10,
        level: filters.level,
        q: filters.q,
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
  function applyFilter() {
    page.value = 1
    load()
  }
  function changePage(p: number) {
    page.value = p
    load()
  }

  async function resolve(row: ErrorLog) {
    await adminService.resolveError(String(row.id))
    showToast('Error marked resolved')
    load()
  }

  async function remove(row: ErrorLog) {
    const ok = await confirm({
      title: 'Delete error',
      body: 'Permanently delete this error log entry?',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await adminService.deleteError(String(row.id))
    showToast('Error deleted')
    load()
  }

  async function clearResolved() {
    const ok = await confirm({
      title: 'Clear resolved errors',
      body: 'Remove all resolved error log entries? This cannot be undone.',
      confirmLabel: 'Clear',
    })
    if (!ok) return
    await adminService.clearResolvedErrors()
    showToast('Resolved errors cleared')
    page.value = 1
    load()
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader
      title="Error Logs"
      subtitle="System errors, warnings, and informational logs."
    />

    <AdminCard>
      <div class="toolbar">
        <div class="toolbar__search">
          <AdminIcon name="search" :size="16" class="toolbar__search-icon" />
          <input
            v-model="filters.q"
            class="ad-input ad-input--icon"
            placeholder="Search logs…"
            @input="onSearch"
          />
        </div>
        <select v-model="filters.level" class="ad-input toolbar__select" @change="applyFilter">
          <option value="">All Levels</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <AdminButton variant="secondary" icon="trash" @click="clearResolved">Clear Resolved</AdminButton>
      </div>

      <AdminDataTable
        :columns="columns"
        :rows="rows"
        :loading="loading"
        empty-label="No errors logged."
      >
        <template #cell-level="{ row }"><AdminBadge :label="(row as unknown as ErrorLog).level" /></template>
        <template #cell-message="{ row }">
          <span class="ad-mono msg" :title="(row as unknown as ErrorLog).message">{{ (row as unknown as ErrorLog).message }}</span>
        </template>
        <template #cell-service="{ row }">
          <AdminBadge v-if="(row as unknown as ErrorLog).service" :label="(row as unknown as ErrorLog).service!" tone="neutral" />
          <span v-else class="ad-muted">—</span>
        </template>
        <template #cell-count="{ row }">
          <strong style="color: var(--ad-text)">{{ formatNumber((row as unknown as ErrorLog).count) }}</strong>
        </template>
        <template #cell-last_seen="{ row }">
          {{ timeAgo((row as unknown as ErrorLog).last_seen_at || (row as unknown as ErrorLog).created_at) }}
        </template>
        <template #cell-actions="{ row }">
          <div class="actions">
            <AdminButton
              v-if="!(row as unknown as ErrorLog).resolved"
              variant="soft"
              size="sm"
              icon="check"
              @click="resolve(row as unknown as ErrorLog)"
            >
              Resolve
            </AdminButton>
            <button class="icon-btn" title="Delete" @click="remove(row as unknown as ErrorLog)">
              <AdminIcon name="trash" :size="16" />
            </button>
          </div>
        </template>
      </AdminDataTable>

      <AdminPagination :page="page" :pages="pages" :total="total" @change="changePage" />
    </AdminCard>
  </div>
</template>

<style scoped>
  .toolbar {
    padding: 14px 18px; display: flex; gap: 10px; align-items: center;
    flex-wrap: wrap; border-bottom: 1px solid var(--ad-border);
  }
  .toolbar__search { position: relative; flex: 1 1 220px; min-width: 180px; }
  .toolbar__search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ad-text3); pointer-events: none; }
  .toolbar__select { width: auto; min-width: 140px; }
  .msg { display: inline-block; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; color: var(--ad-text); }
  .actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
  .icon-btn { background: none; border: none; color: var(--ad-text3); cursor: pointer; display: inline-flex; }
  .icon-btn:hover { color: var(--ad-danger); }
</style>
