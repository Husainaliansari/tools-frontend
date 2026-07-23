<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { adminService, type AdminJob, type JobStats } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import {
    AdminBadge,
    AdminButton,
    AdminCard,
    AdminDataTable,
    AdminIcon,
    AdminPageHeader,
    AdminPagination,
    AdminStatCard,
  } from '@components/admin'
  import { formatNumber, timeAgo } from '@components/admin/format'

  const { showToast } = useFeedback()

  const rows = ref<AdminJob[]>([])
  const total = ref(0)
  const pages = ref(1)
  const page = ref(1)
  const loading = ref(true)
  const stats = ref<JobStats | null>(null)
  const filters = reactive({ q: '', status: '' })

  const SORT_FIELDS: Record<string, string> = {
    tool: 'tool',
    status: 'status',
    progress: 'progress',
    created_at: 'created_at',
  }
  const sortCol = ref('created_at')
  const sortDir = ref<'asc' | 'desc'>('desc')

  const columns = [
    { key: 'id', label: 'Job ID' },
    { key: 'tool', label: 'Tool', sortable: true },
    { key: 'file_name', label: 'File' },
    { key: 'user_email', label: 'User' },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'progress', label: 'Progress', width: '140px', sortable: true },
    { key: 'created_at', label: 'Time', nowrap: true, sortable: true },
    { key: 'actions', label: '', align: 'right' as const },
  ]

  async function load() {
    loading.value = true
    try {
      const res = await adminService.listJobs({
        page: page.value,
        size: 10,
        q: filters.q,
        status: filters.status,
        sort: `${sortDir.value === 'desc' ? '-' : ''}${SORT_FIELDS[sortCol.value]}`,
      })
      rows.value = res.data.items
      total.value = res.data.meta.total
      pages.value = res.data.meta.pages
    } finally {
      loading.value = false
    }
  }

  function toggleSort(colKey: string) {
    if (!SORT_FIELDS[colKey]) return
    if (sortCol.value === colKey) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    else {
      sortCol.value = colKey
      sortDir.value = 'desc'
    }
    page.value = 1
    load()
  }
  async function loadStats() {
    try {
      stats.value = (await adminService.jobStats()).data
    } catch {
      /* stats are non-critical */
    }
  }
  onMounted(() => {
    load()
    loadStats()
  })

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
  function refresh() {
    load()
    loadStats()
    showToast('Jobs refreshed', 'info')
  }

  const statCards = computed(() => {
    const s = stats.value
    return [
      { label: 'Processing', value: formatNumber(s?.processing ?? 0), icon: 'activity', color: 'var(--ad-primary)' },
      { label: 'Queued', value: formatNumber(s?.queued ?? 0), icon: 'clock', color: 'var(--ad-warning)' },
      { label: 'Completed', value: formatNumber(s?.completed ?? 0), icon: 'check-circle', color: 'var(--ad-success)' },
      { label: 'Failed', value: formatNumber(s?.failed ?? 0), icon: 'alert-circle', color: 'var(--ad-danger)' },
    ]
  })

  function progressColor(status: string): string {
    if (status === 'failed') return 'var(--ad-danger)'
    if (status === 'completed') return 'var(--ad-success)'
    return 'var(--ad-primary)'
  }

  async function cancel(job: AdminJob) {
    try {
      await adminService.cancelJob(job.id)
      showToast('Job cancelled', 'info')
      load()
      loadStats()
    } catch {
      showToast('Could not cancel job.', 'error')
    }
  }
  async function retry(job: AdminJob) {
    try {
      await adminService.retryJob(job.id)
      showToast('Job re-queued', 'success')
      load()
      loadStats()
    } catch {
      showToast('Could not retry job.', 'error')
    }
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Conversion Jobs Queue" subtitle="Monitor and manage all PDF processing jobs." />

    <div class="stat-grid">
      <AdminStatCard
        v-for="(k, i) in statCards"
        :key="i"
        :label="k.label"
        :value="k.value"
        :icon="k.icon"
        :color="k.color"
      />
    </div>

    <AdminCard>
      <div class="toolbar">
        <div class="toolbar__search">
          <AdminIcon name="search" :size="16" class="toolbar__search-icon" />
          <input v-model="filters.q" class="ad-input ad-input--icon" placeholder="Search jobs…" @input="onSearch" />
        </div>
        <select v-model="filters.status" class="ad-input toolbar__select" @change="applyFilter">
          <option value="">All Status</option>
          <option value="processing">Processing</option>
          <option value="queued">Queued</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <AdminButton variant="secondary" icon="refresh" @click="refresh">Refresh</AdminButton>
      </div>

      <AdminDataTable
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :sort-key="sortCol"
        :sort-dir="sortDir"
        empty-label="No jobs found."
        @sort="toggleSort"
      >
        <template #cell-id="{ row }">
          <span class="ad-mono" style="color: var(--ad-primary); font-weight: 600">{{ String((row as unknown as AdminJob).id).slice(0, 8) }}</span>
        </template>
        <template #cell-tool="{ row }">
          <span style="color: var(--ad-text)">{{ (row as unknown as AdminJob).tool }}</span>
        </template>
        <template #cell-file_name="{ row }">
          <span class="cell-file">{{ (row as unknown as AdminJob).file_name ?? '—' }}</span>
        </template>
        <template #cell-user_email="{ row }">{{ (row as unknown as AdminJob).user_email ?? 'Anonymous' }}</template>
        <template #cell-status="{ row }"><AdminBadge :label="(row as unknown as AdminJob).status" /></template>
        <template #cell-progress="{ row }">
          <div class="prog">
            <div class="prog__track">
              <div
                class="prog__fill"
                :style="{ width: `${(row as unknown as AdminJob).progress}%`, background: progressColor((row as unknown as AdminJob).status) }"
              />
            </div>
            <span class="prog__pct">{{ (row as unknown as AdminJob).progress }}%</span>
          </div>
        </template>
        <template #cell-created_at="{ row }">{{ timeAgo((row as unknown as AdminJob).created_at) }}</template>
        <template #cell-actions="{ row }">
          <AdminButton
            v-if="(row as unknown as AdminJob).status === 'processing'"
            variant="ghost"
            size="sm"
            @click="cancel(row as unknown as AdminJob)"
          >
            Cancel
          </AdminButton>
          <AdminButton
            v-else-if="(row as unknown as AdminJob).status === 'failed'"
            variant="soft"
            size="sm"
            @click="retry(row as unknown as AdminJob)"
          >
            Retry
          </AdminButton>
        </template>
      </AdminDataTable>

      <AdminPagination :page="page" :pages="pages" :total="total" @change="changePage" />
    </AdminCard>
  </div>
</template>

<style scoped>
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .toolbar { padding: 14px 18px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid var(--ad-border); }
  .toolbar__search { position: relative; flex: 1 1 220px; min-width: 180px; }
  .toolbar__search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ad-text3); pointer-events: none; }
  .toolbar__select { width: auto; min-width: 140px; }
  .prog { display: flex; align-items: center; gap: 8px; }
  .prog__track { flex: 1; height: 5px; border-radius: 99px; background: var(--ad-chip); overflow: hidden; }
  .prog__fill { height: 100%; border-radius: 99px; transition: width 0.3s; }
  .prog__pct { font-size: 11px; color: var(--ad-text3); font-weight: 600; white-space: nowrap; }
  .cell-file { display: inline-block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ad-text2); vertical-align: middle; }
</style>
