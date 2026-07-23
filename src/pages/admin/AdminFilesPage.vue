<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { adminService, type AdminFile, type FileStats } from '@services/admin'
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
  import { formatBytes, formatDate, formatNumber } from '@components/admin/format'
  import { TOOLS } from '@constants/tools'

  const { showToast, confirm } = useFeedback()

  const rows = ref<AdminFile[]>([])
  const total = ref(0)
  const pages = ref(1)
  const page = ref(1)
  const loading = ref(true)
  const purging = ref(false)
  const stats = ref<FileStats | null>(null)
  const filters = reactive({ q: '' })

  const SORT_FIELDS: Record<string, string> = {
    original_name: 'name',
    size_bytes: 'size',
    created_at: 'created_at',
  }
  const sortCol = ref('created_at')
  const sortDir = ref<'asc' | 'desc'>('desc')

  const columns = [
    { key: 'original_name', label: 'Name', sortable: true },
    { key: 'owner_email', label: 'Owner' },
    { key: 'tool', label: 'Tool' },
    { key: 'size_bytes', label: 'Size', nowrap: true, sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created', nowrap: true, sortable: true },
    { key: 'actions', label: '', align: 'right' as const },
  ]

  async function load() {
    loading.value = true
    try {
      const res = await adminService.listFiles({
        page: page.value,
        size: 10,
        q: filters.q,
        category: 'upload',
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
      sortDir.value = colKey === 'original_name' ? 'asc' : 'desc'
    }
    page.value = 1
    load()
  }
  async function loadStats() {
    try {
      stats.value = (await adminService.fileStats()).data
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
  function changePage(p: number) {
    page.value = p
    load()
  }

  const SUPPORTED_ICONS = new Set([
    'edit',
    'compress',
    'layers',
    'trash',
    'image',
    'lock',
    'scan-text',
    'wrench',
    'info',
  ])

  function getToolName(slug: string | null | undefined): string {
    if (!slug) return 'Direct Upload'
    const tool = TOOLS.find((t) => t.slug === slug)
    return tool ? tool.name : slug
  }

  function getToolIcon(slug: string | null | undefined): string {
    if (!slug) return 'upload'
    const tool = TOOLS.find((t) => t.slug === slug)
    if (tool && SUPPORTED_ICONS.has(tool.icon)) {
      return tool.icon
    }
    return 'file-text'
  }

  function getToolColor(slug: string | null | undefined): string {
    if (!slug) return 'var(--ad-text3)'
    const tool = TOOLS.find((t) => t.slug === slug)
    return tool?.color || 'var(--ad-primary)'
  }

  const statCards = computed(() => {
    const s = stats.value
    const totalBytes = Math.max(1, s?.total_bytes ?? 0)
    const upload = s?.by_category?.upload ?? { count: 0, bytes: 0 }
    const processed = s?.by_category?.processed ?? { count: 0, bytes: 0 }
    return [
      {
        label: 'Total Storage',
        value: formatBytes(s?.total_bytes ?? 0),
        sub: `${formatNumber(s?.total_count ?? 0)} files`,
        pct: 100,
        color: 'var(--ad-primary)',
      },
      {
        label: 'Uploads',
        value: formatBytes(upload.bytes),
        sub: `${formatNumber(upload.count)} files`,
        pct: (upload.bytes / totalBytes) * 100,
        color: 'var(--ad-warning)',
      },
      {
        label: 'Processed',
        value: formatBytes(processed.bytes),
        sub: `${formatNumber(processed.count)} files`,
        pct: (processed.bytes / totalBytes) * 100,
        color: 'var(--ad-success)',
      },
    ]
  })

  async function purge() {
    const ok = await confirm({
      title: 'Purge temp files',
      body: 'Permanently remove all expired temporary files? This cannot be undone.',
      confirmLabel: 'Purge',
    })
    if (!ok) return
    purging.value = true
    try {
      const res = await adminService.purgeTemp()
      showToast(`Purged ${res.data.purged} temp file(s)`, 'success')
      load()
      loadStats()
    } catch {
      showToast('Could not purge temp files.', 'error')
    } finally {
      purging.value = false
    }
  }

  async function removeFile(file: AdminFile) {
    const ok = await confirm({
      title: 'Delete file',
      body: `Permanently delete “${file.original_name}”?`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await adminService.deleteFile(file.id)
      showToast('File deleted')
      load()
      loadStats()
    } catch {
      showToast('Could not delete file.', 'error')
    }
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Files & Storage" subtitle="Manage platform storage and file assets." />

    <div class="stat-grid">
      <AdminCard v-for="(k, i) in statCards" :key="i">
        <div class="pstat">
          <div class="pstat__label">{{ k.label }}</div>
          <div class="pstat__value">{{ k.value }}</div>
          <div class="pstat__sub">{{ k.sub }}</div>
          <div class="pstat__track">
            <div class="pstat__fill" :style="{ width: `${Math.min(100, k.pct)}%`, background: k.color }" />
          </div>
        </div>
      </AdminCard>
    </div>

    <AdminCard>
      <div class="toolbar">
        <div class="toolbar__search">
          <AdminIcon name="search" :size="16" class="toolbar__search-icon" />
          <input v-model="filters.q" class="ad-input ad-input--icon" placeholder="Search files…" @input="onSearch" />
        </div>
        <AdminButton variant="danger" size="sm" icon="trash" :loading="purging" @click="purge">Purge Temp</AdminButton>
      </div>

      <AdminDataTable
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :sort-key="sortCol"
        :sort-dir="sortDir"
        empty-label="No files found."
        @sort="toggleSort"
      >
        <template #cell-original_name="{ row }">
          <span class="cell-name" :title="(row as unknown as AdminFile).original_name">{{ (row as unknown as AdminFile).original_name }}</span>
        </template>
        <template #cell-owner_email="{ row }">{{ (row as unknown as AdminFile).owner_email ?? 'Anonymous' }}</template>
        <template #cell-tool="{ row }">
          <div v-if="(row as unknown as AdminFile).tool" class="cell-tool">
            <AdminIcon
              :name="getToolIcon((row as unknown as AdminFile).tool)"
              :size="15"
              class="tool-icon"
              :style="{ color: getToolColor((row as unknown as AdminFile).tool) }"
            />
            <span class="tool-name">{{ getToolName((row as unknown as AdminFile).tool) }}</span>
          </div>
          <div v-else class="cell-tool cell-tool--direct">
            <AdminIcon name="upload" :size="15" class="tool-icon" style="color: var(--ad-text3)" />
            <span class="tool-name text-muted">Direct Upload</span>
          </div>
        </template>
        <template #cell-size_bytes="{ row }">{{ formatBytes((row as unknown as AdminFile).size_bytes) }}</template>
        <template #cell-status="{ row }"><AdminBadge :label="(row as unknown as AdminFile).status" /></template>
        <template #cell-created_at="{ row }">{{ formatDate((row as unknown as AdminFile).created_at) }}</template>
        <template #cell-actions="{ row }">
          <button class="icon-btn" title="Delete" @click="removeFile(row as unknown as AdminFile)">
            <AdminIcon name="trash" :size="16" />
          </button>
        </template>
      </AdminDataTable>

      <AdminPagination :page="page" :pages="pages" :total="total" @change="changePage" />
    </AdminCard>
  </div>
</template>

<style scoped>
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .pstat { padding: 16px 18px; }
  .pstat__label { font-size: 12px; font-weight: 500; color: var(--ad-text3); margin-bottom: 4px; }
  .pstat__value { font-size: 18px; font-weight: 800; color: var(--ad-text); }
  .pstat__sub { font-size: 12px; color: var(--ad-text3); margin-top: 2px; }
  .pstat__track { height: 6px; border-radius: 99px; background: var(--ad-chip); overflow: hidden; margin-top: 10px; }
  .pstat__fill { height: 100%; border-radius: 99px; transition: width 0.4s; }
  .toolbar { padding: 14px 18px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid var(--ad-border); }
  .toolbar__search { position: relative; flex: 1 1 220px; min-width: 180px; }
  .toolbar__search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ad-text3); pointer-events: none; }
  .cell-name { display: inline-block; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ad-text); font-weight: 500; vertical-align: middle; }
  .icon-btn { background: none; border: none; color: var(--ad-text3); cursor: pointer; display: inline-flex; }
  .icon-btn:hover { color: var(--ad-danger); }
  .cell-tool {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--ad-text);
    font-weight: 500;
  }
  .cell-tool--direct {
    color: var(--ad-text3);
  }
  .tool-icon {
    flex-shrink: 0;
    opacity: 0.85;
  }
  .text-muted {
    color: var(--ad-text3);
    font-weight: 400;
  }
</style>
