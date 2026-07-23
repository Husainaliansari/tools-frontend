<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { adminService, type SubscriberStats, type Subscription } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import {
    AdminBadge,
    AdminButton,
    AdminCard,
    AdminDataTable,
    AdminModal,
    AdminPageHeader,
    AdminPagination,
  } from '@components/admin'
  import { formatDate, formatMoneyCents } from '@components/admin/format'

  const { showToast, confirm } = useFeedback()

  const rows = ref<Subscription[]>([])
  const total = ref(0)
  const pages = ref(1)
  const page = ref(1)
  const loading = ref(true)
  const stats = ref<SubscriberStats | null>(null)
  const filters = reactive({ status: '' })

  const SORT_FIELDS: Record<string, string> = {
    user: 'user',
    price: 'price',
    renews_at: 'renews_at',
  }
  const sortCol = ref('renews_at')
  const sortDir = ref<'asc' | 'desc'>('desc')

  const columns = [
    { key: 'user', label: 'User', sortable: true },
    { key: 'plan', label: 'Plan' },
    { key: 'price', label: 'Price', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'renews_at', label: 'Renewal', nowrap: true, sortable: true },
    { key: 'payments_count', label: 'Payments' },
    { key: 'actions', label: '', align: 'right' as const },
  ]

  async function load() {
    loading.value = true
    try {
      const res = await adminService.listSubscribers({
        page: page.value,
        size: 10,
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
      sortDir.value = colKey === 'user' ? 'asc' : 'desc'
    }
    page.value = 1
    load()
  }
  async function loadStats() {
    try {
      stats.value = (await adminService.subscriberStats()).data
    } catch {
      /* stats are non-critical */
    }
  }
  onMounted(() => {
    load()
    loadStats()
  })

  function applyFilter() {
    page.value = 1
    load()
  }
  function changePage(p: number) {
    page.value = p
    load()
  }

  const statCards = computed(() => {
    const s = stats.value
    const totalActiveSet = Math.max(1, (s?.active ?? 0) + (s?.expired ?? 0))
    const activePct = ((s?.active ?? 0) / totalActiveSet) * 100
    return [
      { label: 'Active', value: String(s?.active ?? 0), color: 'var(--ad-success)', pct: activePct },
      { label: 'Expired', value: String(s?.expired ?? 0), color: 'var(--ad-danger)', pct: 100 - activePct },
      { label: 'MRR', value: formatMoneyCents(s?.mrr_cents ?? 0), color: 'var(--ad-primary)', pct: activePct },
      { label: 'Churn Rate', value: `${s?.churn ?? 0}%`, color: 'var(--ad-warning)', pct: Math.min(100, s?.churn ?? 0) },
    ]
  })

  // ── Create / edit modal ─────────────────────────────────────────────
  const modalOpen = ref(false)
  const saving = ref(false)
  const editId = ref<string | null>(null)
  const form = reactive({ user_id: '', plan: 'pro', price_dollars: 0, interval: 'monthly', status: 'active', renews_at: '' })

  function openCreate() {
    editId.value = null
    Object.assign(form, { user_id: '', plan: 'pro', price_dollars: 0, interval: 'monthly', status: 'active', renews_at: '' })
    modalOpen.value = true
  }
  function openEdit(sub: Subscription) {
    editId.value = sub.id
    Object.assign(form, {
      user_id: sub.user_id,
      plan: sub.plan,
      price_dollars: (sub.price_cents ?? 0) / 100,
      interval: sub.interval || 'monthly',
      status: sub.status,
      renews_at: sub.renews_at ? sub.renews_at.slice(0, 10) : '',
    })
    modalOpen.value = true
  }

  async function submit() {
    const priceCents = Math.round(Number(form.price_dollars) * 100)
    saving.value = true
    try {
      if (editId.value) {
        await adminService.updateSubscription(editId.value, {
          plan: form.plan,
          price_cents: priceCents,
          status: form.status,
          renews_at: form.renews_at || null,
        })
        showToast('Subscription updated', 'success')
      } else {
        if (!form.user_id.trim()) {
          showToast('A user ID is required.', 'error')
          saving.value = false
          return
        }
        await adminService.createSubscription({
          user_id: form.user_id.trim(),
          plan: form.plan,
          price_cents: priceCents,
          interval: form.interval,
          status: form.status,
          renews_at: form.renews_at || undefined,
        })
        showToast('Subscription created', 'success')
      }
      modalOpen.value = false
      page.value = 1
      load()
      loadStats()
    } catch (e) {
      showToast(errMsg(e, 'Could not save subscription.'), 'error')
    } finally {
      saving.value = false
    }
  }

  async function removeSub(sub: Subscription) {
    const ok = await confirm({
      title: 'Delete subscription',
      body: `Delete the ${sub.plan} subscription for ${sub.user_email ?? sub.user_id}?`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await adminService.deleteSubscription(sub.id)
      showToast('Subscription deleted')
      load()
      loadStats()
    } catch (e) {
      showToast(errMsg(e, 'Could not delete subscription.'), 'error')
    }
  }

  function errMsg(e: unknown, fallback: string): string {
    const r = (e as { response?: { data?: { error?: { message?: string } } } })?.response
    return r?.data?.error?.message ?? fallback
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Subscribers" subtitle="Manage subscriptions, plans, pricing, and payment history.">
      <template #actions>
        <AdminButton icon="plus" @click="openCreate">New Subscription</AdminButton>
      </template>
    </AdminPageHeader>

    <div class="stat-grid">
      <AdminCard v-for="(k, i) in statCards" :key="i">
        <div class="pstat">
          <div class="pstat__label">{{ k.label }}</div>
          <div class="pstat__value">{{ k.value }}</div>
          <div class="pstat__track">
            <div class="pstat__fill" :style="{ width: `${k.pct}%`, background: k.color }" />
          </div>
        </div>
      </AdminCard>
    </div>

    <AdminCard>
      <div class="toolbar">
        <span class="toolbar__title">All Subscribers</span>
        <select v-model="filters.status" class="ad-input toolbar__select" @change="applyFilter">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <AdminDataTable
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :sort-key="sortCol"
        :sort-dir="sortDir"
        empty-label="No subscribers yet."
        @sort="toggleSort"
      >
        <template #cell-user="{ row }">
          <div class="cell-user">
            <span class="cell-user__name">{{ (row as unknown as Subscription).user_name ?? '—' }}</span>
            <span class="cell-user__email">{{ (row as unknown as Subscription).user_email ?? (row as unknown as Subscription).user_id }}</span>
          </div>
        </template>
        <template #cell-plan="{ row }">
          <span style="color: var(--ad-text); text-transform: capitalize">{{ (row as unknown as Subscription).plan }}</span>
        </template>
        <template #cell-price="{ row }">
          <strong style="color: var(--ad-text)">{{ formatMoneyCents((row as unknown as Subscription).price_cents, (row as unknown as Subscription).currency) }}</strong>
        </template>
        <template #cell-status="{ row }"><AdminBadge :label="(row as unknown as Subscription).status" /></template>
        <template #cell-renews_at="{ row }">{{ formatDate((row as unknown as Subscription).renews_at) }}</template>
        <template #cell-payments_count="{ row }">
          <strong style="color: var(--ad-text)">{{ (row as unknown as Subscription).payments_count }}</strong>
        </template>
        <template #cell-actions="{ row }">
          <button class="link-btn" @click="openEdit(row as unknown as Subscription)">Edit</button>
          <button class="link-btn link-btn--danger" @click="removeSub(row as unknown as Subscription)">Delete</button>
        </template>
      </AdminDataTable>

      <AdminPagination :page="page" :pages="pages" :total="total" @change="changePage" />
    </AdminCard>

    <AdminModal v-if="modalOpen" :title="editId ? 'Edit Subscription' : 'New Subscription'" @close="modalOpen = false">
      <div class="form">
        <div v-if="!editId">
          <label class="ad-label">User ID</label>
          <input v-model="form.user_id" class="ad-input" placeholder="user uuid" />
        </div>
        <div>
          <label class="ad-label">Plan</label>
          <input v-model="form.plan" class="ad-input" placeholder="pro" />
        </div>
        <div>
          <label class="ad-label">Price (USD)</label>
          <input v-model.number="form.price_dollars" class="ad-input" type="number" min="0" step="0.01" />
        </div>
        <div v-if="!editId">
          <label class="ad-label">Interval</label>
          <select v-model="form.interval" class="ad-input">
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label class="ad-label">Status</label>
          <select v-model="form.status" class="ad-input">
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="trialing">Trialing</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div v-if="editId">
          <label class="ad-label">Renewal date</label>
          <input v-model="form.renews_at" class="ad-input" type="date" />
        </div>
      </div>
      <template #footer>
        <AdminButton variant="secondary" @click="modalOpen = false">Cancel</AdminButton>
        <AdminButton :loading="saving" @click="submit">{{ editId ? 'Save Changes' : 'Create' }}</AdminButton>
      </template>
    </AdminModal>
  </div>
</template>

<style scoped>
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .pstat { padding: 16px 18px; }
  .pstat__label { font-size: 12px; font-weight: 500; color: var(--ad-text3); margin-bottom: 6px; }
  .pstat__value { font-size: 22px; font-weight: 800; color: var(--ad-text); }
  .pstat__track { width: 100%; height: 4px; border-radius: 99px; background: var(--ad-chip); margin-top: 10px; overflow: hidden; }
  .pstat__fill { height: 100%; border-radius: 99px; }
  .toolbar { padding: 14px 18px; display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; border-bottom: 1px solid var(--ad-border); }
  .toolbar__title { font-weight: 700; font-size: 15px; color: var(--ad-text); }
  .toolbar__select { width: auto; min-width: 130px; }
  .cell-user { display: flex; flex-direction: column; }
  .cell-user__name { font-weight: 600; font-size: 13.5px; color: var(--ad-text); }
  .cell-user__email { font-size: 12px; color: var(--ad-text3); }
  .link-btn { background: none; border: none; color: var(--ad-primary); cursor: pointer; font-size: 12.5px; font-weight: 600; padding: 0 6px; }
  .link-btn--danger { color: var(--ad-danger); }
  .form { display: grid; gap: 14px; }
</style>
