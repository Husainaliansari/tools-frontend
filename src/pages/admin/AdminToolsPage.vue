<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { adminService, type ToolConfig } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import {
    AdminBadge,
    AdminButton,
    AdminCard,
    AdminDataTable,
    AdminIcon,
    AdminModal,
    AdminPageHeader,
    AdminToggle,
  } from '@components/admin'
  import { formatNumber } from '@components/admin/format'

  const { showToast } = useFeedback()

  const tools = ref<ToolConfig[]>([])
  const loading = ref(true)
  const filters = reactive({ q: '', category: '' })

  const columns = [
    { key: 'name', label: 'Tool' },
    { key: 'category', label: 'Category' },
    { key: 'usage', label: 'Usage' },
    { key: 'file_limit_mb', label: 'File Limit' },
    { key: 'status', label: 'Status' },
    { key: 'visible', label: 'Visible' },
    { key: 'actions', label: '', align: 'right' as const },
  ]

  async function load() {
    loading.value = true
    try {
      tools.value = (await adminService.listTools()).data
    } catch {
      showToast('Could not load tools.', 'error')
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  const filtered = computed(() => {
    const q = filters.q.trim().toLowerCase()
    return tools.value.filter((t) => {
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
      const matchCat = !filters.category || t.category.toLowerCase() === filters.category.toLowerCase()
      return matchQ && matchCat
    })
  })

  function statusOf(t: ToolConfig): string {
    return t.maintenance ? 'maintenance' : t.enabled ? 'enabled' : 'disabled'
  }

  function replaceRow(updated: ToolConfig) {
    const i = tools.value.findIndex((t) => t.id === updated.id)
    if (i !== -1) tools.value[i] = updated
  }

  async function onToggleEnabled(tool: ToolConfig, enabled: boolean) {
    try {
      const res = await adminService.updateTool(tool.slug, { enabled })
      replaceRow(res.data)
      showToast(`${tool.name} ${enabled ? 'enabled' : 'disabled'}`, enabled ? 'success' : 'info')
    } catch {
      showToast(`Could not update ${tool.name}.`, 'error')
    }
  }

  // ── Configure modal ─────────────────────────────────────────────────
  const modalOpen = ref(false)
  const saving = ref(false)
  const editing = ref<ToolConfig | null>(null)
  const form = reactive({ file_limit_mb: 0, maintenance: false })

  function openConfigure(tool: ToolConfig) {
    editing.value = tool
    form.file_limit_mb = tool.file_limit_mb
    form.maintenance = tool.maintenance
    modalOpen.value = true
  }

  async function submitConfigure() {
    if (!editing.value) return
    saving.value = true
    try {
      const res = await adminService.updateTool(editing.value.slug, {
        file_limit_mb: Number(form.file_limit_mb),
        maintenance: form.maintenance,
      })
      replaceRow(res.data)
      showToast(`${editing.value.name} updated`, 'success')
      modalOpen.value = false
    } catch {
      showToast('Could not update tool.', 'error')
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="PDF Tools Management" subtitle="Enable, disable, and configure all PDF tools." />

    <AdminCard>
      <div class="toolbar">
        <div class="toolbar__search">
          <AdminIcon name="search" :size="16" class="toolbar__search-icon" />
          <input v-model="filters.q" class="ad-input ad-input--icon" placeholder="Search tools…" />
        </div>
        <select v-model="filters.category" class="ad-input toolbar__select">
          <option value="">All Categories</option>
          <option value="organize">Organize</option>
          <option value="optimize">Optimize</option>
          <option value="convert">Convert</option>
          <option value="edit">Edit</option>
          <option value="security">Security</option>
        </select>
      </div>

      <AdminDataTable :columns="columns" :rows="filtered" :loading="loading" empty-label="No tools match your filters.">
        <template #cell-name="{ row }">
          <strong style="color: var(--ad-text)">{{ (row as unknown as ToolConfig).name }}</strong>
        </template>
        <template #cell-category="{ row }"><AdminBadge :label="(row as unknown as ToolConfig).category" tone="neutral" /></template>
        <template #cell-usage="{ row }">{{ formatNumber((row as unknown as ToolConfig).usage) }}</template>
        <template #cell-file_limit_mb="{ row }">{{ (row as unknown as ToolConfig).file_limit_mb }} MB</template>
        <template #cell-status="{ row }"><AdminBadge :label="statusOf(row as unknown as ToolConfig)" /></template>
        <template #cell-visible="{ row }">
          <AdminToggle
            :model-value="(row as unknown as ToolConfig).enabled"
            @update:model-value="onToggleEnabled(row as unknown as ToolConfig, $event)"
          />
        </template>
        <template #cell-actions="{ row }">
          <button class="link-btn" @click="openConfigure(row as unknown as ToolConfig)">Configure</button>
        </template>
      </AdminDataTable>
    </AdminCard>

    <AdminModal v-if="modalOpen && editing" :title="`Configure ${editing.name}`" @close="modalOpen = false">
      <div class="form">
        <div>
          <label class="ad-label">File limit (MB)</label>
          <input v-model.number="form.file_limit_mb" class="ad-input" type="number" min="0" step="1" />
        </div>
        <div class="row">
          <div>
            <div class="row__title">Maintenance mode</div>
            <div class="row__desc">Temporarily take this tool offline for users.</div>
          </div>
          <AdminToggle v-model="form.maintenance" />
        </div>
      </div>
      <template #footer>
        <AdminButton variant="secondary" @click="modalOpen = false">Cancel</AdminButton>
        <AdminButton :loading="saving" @click="submitConfigure">Save Changes</AdminButton>
      </template>
    </AdminModal>
  </div>
</template>

<style scoped>
  .toolbar { padding: 14px 18px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid var(--ad-border); }
  .toolbar__search { position: relative; flex: 1 1 220px; min-width: 180px; }
  .toolbar__search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ad-text3); pointer-events: none; }
  .toolbar__select { width: auto; min-width: 150px; }
  .link-btn { background: none; border: none; color: var(--ad-primary); cursor: pointer; font-size: 12.5px; font-weight: 600; }
  .form { display: grid; gap: 16px; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .row__title { font-size: 13.5px; font-weight: 600; color: var(--ad-text); }
  .row__desc { font-size: 12px; color: var(--ad-text3); margin-top: 2px; }
</style>
