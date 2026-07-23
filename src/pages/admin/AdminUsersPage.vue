<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { adminService, type AdminUser, type AdminUserDetail } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import {
    AdminAvatar,
    AdminBadge,
    AdminButton,
    AdminCard,
    AdminDataTable,
    AdminIcon,
    AdminModal,
    AdminPageHeader,
    AdminPagination,
    AdminSlideOver,
  } from '@components/admin'
  import { formatDate, formatNumber } from '@components/admin/format'

  const { showToast, confirm } = useFeedback()

  const rows = ref<AdminUser[]>([])
  const total = ref(0)
  const pages = ref(1)
  const page = ref(1)
  const loading = ref(true)
  const filters = reactive({ q: '', plan: '', status: '' })

  // Column key → backend sort field. Only mapped columns are sortable.
  const SORT_FIELDS: Record<string, string> = {
    user: 'name',
    conversions: 'conversions',
    created_at: 'created_at',
  }
  const sortCol = ref('created_at')
  const sortDir = ref<'asc' | 'desc'>('desc')

  const columns = [
    { key: 'select', label: '', width: '40px' },
    { key: 'user', label: 'User', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'plan', label: 'Plan' },
    { key: 'status', label: 'Status' },
    { key: 'conversions', label: 'Conversions', sortable: true },
    { key: 'created_at', label: 'Joined', nowrap: true, sortable: true },
    { key: 'actions', label: '', align: 'right' as const },
  ]

  async function load() {
    loading.value = true
    try {
      const res = await adminService.listUsers({
        page: page.value,
        size: 10,
        q: filters.q,
        plan: filters.plan,
        status: filters.status,
        sort: `${sortDir.value === 'desc' ? '-' : ''}${SORT_FIELDS[sortCol.value]}`,
      })
      rows.value = res.data.items
      total.value = res.data.meta.total
      pages.value = res.data.meta.pages
      // Drop selections no longer on the visible page.
      const ids = new Set(rows.value.map((r) => String(r.id)))
      selected.value = selected.value.filter((id) => ids.has(id))
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  function toggleSort(colKey: string) {
    if (!SORT_FIELDS[colKey]) return
    if (sortCol.value === colKey) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortCol.value = colKey
      sortDir.value = colKey === 'user' ? 'asc' : 'desc'
    }
    page.value = 1
    load()
  }

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

  // ── Bulk selection ──────────────────────────────────────────────────
  const selected = ref<string[]>([])
  const allSelected = computed(
    () => rows.value.length > 0 && selected.value.length === rows.value.length,
  )
  function toggleOne(id: string) {
    selected.value = selected.value.includes(id)
      ? selected.value.filter((x) => x !== id)
      : [...selected.value, id]
  }
  function toggleAll() {
    selected.value = allSelected.value ? [] : rows.value.map((r) => String(r.id))
  }
  async function bulkAction(action: 'activate' | 'suspend' | 'delete') {
    if (!selected.value.length) return
    if (action === 'delete') {
      const ok = await confirm({
        title: 'Delete users',
        body: `Permanently delete ${selected.value.length} user(s)? This cannot be undone.`,
        confirmLabel: 'Delete',
      })
      if (!ok) return
    }
    try {
      const res = await adminService.bulkUsers(action, selected.value)
      showToast(`Applied ${action} to ${res.data.affected} user(s)`, action === 'suspend' || action === 'delete' ? 'error' : 'success')
      selected.value = []
      load()
    } catch (e) {
      showToast(errMsg(e, `Could not ${action} the selected users.`), 'error')
    }
  }

  // ── Detail slide-over ──────────────────────────────────────────────
  const detail = ref<AdminUserDetail | null>(null)
  const detailOpen = ref(false)
  async function openDetail(user: AdminUser) {
    detailOpen.value = true
    detail.value = null
    detail.value = (await adminService.getUser(String(user.id))).data
  }

  async function toggleSuspend() {
    if (!detail.value) return
    const suspend = detail.value.status !== 'suspended'
    const id = String(detail.value.id)
    detail.value = (suspend ? await adminService.suspendUser(id) : await adminService.activateUser(id)).data
    showToast(suspend ? 'User suspended' : 'User activated', suspend ? 'error' : 'success')
    load()
  }

  async function removeUser() {
    if (!detail.value) return
    const ok = await confirm({
      title: 'Delete user',
      body: `Permanently delete ${detail.value.email}? This cannot be undone.`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await adminService.deleteUser(String(detail.value.id))
    showToast('User deleted')
    detailOpen.value = false
    load()
  }

  // ── Create / edit modal ────────────────────────────────────────────
  const createOpen = ref(false)
  const saving = ref(false)
  const editingId = ref<string | null>(null)
  const form = reactive({ name: '', email: '', password: '', plan: 'free', status: 'active', is_admin: false })

  function openCreate() {
    editingId.value = null
    Object.assign(form, { name: '', email: '', password: '', plan: 'free', status: 'active', is_admin: false })
    createOpen.value = true
  }
  function openEdit() {
    if (!detail.value) return
    editingId.value = String(detail.value.id)
    Object.assign(form, {
      name: detail.value.name,
      email: detail.value.email,
      password: '',
      plan: detail.value.plan,
      status: detail.value.status,
      is_admin: detail.value.is_admin,
    })
    createOpen.value = true
  }
  async function submitCreate() {
    if (!form.name || !form.email) {
      showToast('Name and email are required.', 'error')
      return
    }
    if (!editingId.value && form.password.length < 8) {
      showToast('A password of at least 8 characters is required.', 'error')
      return
    }
    saving.value = true
    try {
      if (editingId.value) {
        const body: Record<string, unknown> = {
          name: form.name,
          plan: form.plan,
          status: form.status,
          is_admin: form.is_admin,
        }
        if (form.password) body.password = form.password
        const res = await adminService.updateUser(editingId.value, body)
        showToast('User updated')
        if (detail.value && String(detail.value.id) === editingId.value) detail.value = res.data
      } else {
        await adminService.createUser({ name: form.name, email: form.email, password: form.password, plan: form.plan, is_admin: form.is_admin })
        showToast('User created')
        page.value = 1
      }
      createOpen.value = false
      load()
    } catch (e) {
      showToast(errMsg(e, 'Could not save user.'), 'error')
    } finally {
      saving.value = false
    }
  }

  function errMsg(e: unknown, fallback: string): string {
    const r = (e as { response?: { data?: { error?: { message?: string } } } })?.response
    return r?.data?.error?.message ?? fallback
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Users Management" subtitle="Manage all registered users on the platform.">
      <template #actions>
        <AdminButton icon="plus" @click="openCreate">Add User</AdminButton>
      </template>
    </AdminPageHeader>

    <AdminCard>
      <div class="toolbar">
        <div class="toolbar__search">
          <AdminIcon name="search" :size="16" class="toolbar__search-icon" />
          <input v-model="filters.q" class="ad-input ad-input--icon" placeholder="Search users…" @input="onSearch" />
        </div>
        <select v-model="filters.plan" class="ad-input toolbar__select" @change="applyFilter">
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
        <select v-model="filters.status" class="ad-input toolbar__select" @change="applyFilter">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div v-if="selected.length" class="bulkbar">
        <span class="bulkbar__count">{{ selected.length }} selected</span>
        <div class="bulkbar__actions">
          <AdminButton size="sm" variant="soft" icon="check" @click="bulkAction('activate')">Activate</AdminButton>
          <AdminButton size="sm" variant="secondary" icon="ban" @click="bulkAction('suspend')">Suspend</AdminButton>
          <AdminButton size="sm" variant="danger" icon="trash" @click="bulkAction('delete')">Delete</AdminButton>
          <AdminButton size="sm" variant="ghost" @click="selected = []">Clear</AdminButton>
        </div>
      </div>

      <AdminDataTable
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :sort-key="sortCol"
        :sort-dir="sortDir"
        clickable
        @row-click="openDetail($event as unknown as AdminUser)"
        @sort="toggleSort"
      >
        <template #header-select>
          <input type="checkbox" :checked="allSelected" title="Select all" @click.stop="toggleAll" />
        </template>
        <template #cell-select="{ row }">
          <input
            type="checkbox"
            :checked="selected.includes(String((row as unknown as AdminUser).id))"
            @click.stop="toggleOne(String((row as unknown as AdminUser).id))"
          />
        </template>
        <template #cell-user="{ row }">
          <div class="cell-user">
            <AdminAvatar :name="(row as unknown as AdminUser).name" :size="30" />
            <span class="cell-user__name">{{ (row as unknown as AdminUser).name }}</span>
          </div>
        </template>
        <template #cell-email="{ row }">{{ (row as unknown as AdminUser).email }}</template>
        <template #cell-plan="{ row }"><AdminBadge :label="(row as unknown as AdminUser).plan" /></template>
        <template #cell-status="{ row }"><AdminBadge :label="(row as unknown as AdminUser).status" /></template>
        <template #cell-conversions="{ row }">
          <strong style="color: var(--ad-text)">{{ formatNumber((row as unknown as AdminUser).conversions) }}</strong>
        </template>
        <template #cell-created_at="{ row }">{{ formatDate((row as unknown as AdminUser).created_at) }}</template>
        <template #cell-actions="{ row }">
          <button class="icon-btn" @click.stop="openDetail(row as unknown as AdminUser)">
            <AdminIcon name="more-horizontal" :size="16" />
          </button>
        </template>
      </AdminDataTable>

      <AdminPagination :page="page" :pages="pages" :total="total" @change="changePage" />
    </AdminCard>

    <!-- Detail slide-over -->
    <AdminSlideOver v-if="detailOpen" title="User Details" @close="detailOpen = false">
      <div v-if="!detail" class="ad-spinner" style="margin: 40px auto" />
      <div v-else class="detail">
        <div class="detail__head">
          <AdminAvatar :name="detail.name" :size="48" />
          <div>
            <div class="detail__name">{{ detail.name }}</div>
            <div class="detail__email">{{ detail.email }}</div>
          </div>
        </div>
        <div class="detail__rows">
          <div class="drow"><span>Plan</span><AdminBadge :label="detail.plan" /></div>
          <div class="drow"><span>Status</span><AdminBadge :label="detail.status" /></div>
          <div class="drow"><span>Admin</span><AdminBadge :label="detail.is_admin ? 'Yes' : 'No'" :tone="detail.is_admin ? 'success' : 'neutral'" /></div>
          <div class="drow"><span>Conversions</span><strong>{{ formatNumber(detail.conversions) }}</strong></div>
          <div class="drow"><span>Files</span><strong>{{ formatNumber(detail.files_count) }}</strong></div>
          <div class="drow"><span>Joined</span><strong>{{ formatDate(detail.created_at) }}</strong></div>
        </div>
        <div class="detail__actions">
          <AdminButton icon="edit" @click="openEdit">Edit</AdminButton>
          <AdminButton
            :variant="detail.status === 'suspended' ? 'soft' : 'secondary'"
            :icon="detail.status === 'suspended' ? 'check' : 'ban'"
            @click="toggleSuspend"
          >
            {{ detail.status === 'suspended' ? 'Activate' : 'Suspend' }}
          </AdminButton>
          <AdminButton variant="danger" icon="trash" @click="removeUser">Delete</AdminButton>
        </div>
      </div>
    </AdminSlideOver>

    <!-- Create / edit modal -->
    <AdminModal v-if="createOpen" :title="editingId ? 'Edit User' : 'Add User'" @close="createOpen = false">
      <div class="form">
        <div><label class="ad-label">Name</label><input v-model="form.name" class="ad-input" placeholder="Full name" /></div>
        <div>
          <label class="ad-label">Email</label>
          <input v-model="form.email" class="ad-input" type="email" placeholder="name@example.com" :disabled="!!editingId" />
        </div>
        <div>
          <label class="ad-label">{{ editingId ? 'New Password' : 'Password' }}</label>
          <input v-model="form.password" class="ad-input" type="password" :placeholder="editingId ? 'Leave blank to keep current' : 'Min 8 characters'" />
        </div>
        <div>
          <label class="ad-label">Plan</label>
          <select v-model="form.plan" class="ad-input"><option value="free">Free</option><option value="pro">Pro</option></select>
        </div>
        <div v-if="editingId">
          <label class="ad-label">Status</label>
          <select v-model="form.status" class="ad-input">
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <label class="check"><input v-model="form.is_admin" type="checkbox" /> Grant admin access</label>
      </div>
      <template #footer>
        <AdminButton variant="secondary" @click="createOpen = false">Cancel</AdminButton>
        <AdminButton :loading="saving" @click="submitCreate">{{ editingId ? 'Save Changes' : 'Create User' }}</AdminButton>
      </template>
    </AdminModal>
  </div>
</template>

<style scoped>
  .bulkbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 18px; background: var(--ad-primary-bg, rgba(59,130,246,.08)); border-bottom: 1px solid var(--ad-border); }
  .bulkbar__count { font-size: 13px; font-weight: 600; color: var(--ad-text); }
  .bulkbar__actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .toolbar { padding: 14px 18px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid var(--ad-border); }
  .toolbar__search { position: relative; flex: 1 1 220px; min-width: 180px; }
  .toolbar__search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ad-text3); pointer-events: none; }
  .toolbar__select { width: auto; min-width: 130px; }
  .cell-user { display: flex; align-items: center; gap: 10px; }
  .cell-user__name { font-weight: 600; font-size: 13.5px; color: var(--ad-text); }
  .icon-btn { background: none; border: none; color: var(--ad-text3); cursor: pointer; display: inline-flex; }
  .icon-btn:hover { color: var(--ad-text); }
  .detail { display: grid; gap: 18px; }
  .detail__head { display: flex; align-items: center; gap: 14px; }
  .detail__name { font-weight: 700; font-size: 16px; color: var(--ad-text); }
  .detail__email { font-size: 13px; color: var(--ad-text3); }
  .detail__rows { display: grid; }
  .drow { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--ad-border); font-size: 13.5px; }
  .drow span { color: var(--ad-text3); font-weight: 500; }
  .drow strong { color: var(--ad-text); font-weight: 600; }
  .detail__actions { display: flex; gap: 8px; margin-top: 8px; }
  .form { display: grid; gap: 14px; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ad-text2); }
</style>
