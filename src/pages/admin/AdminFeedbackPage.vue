<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { adminService, type AdminFeedback } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import {
    AdminAvatar,
    AdminBadge,
    AdminCard,
    AdminIcon,
    AdminPageHeader,
    AdminPagination,
  } from '@components/admin'
  import { timeAgo } from '@components/admin/format'

  const { showToast, confirm } = useFeedback()

  const FILTERS = [
    { label: 'All', value: '' },
    { label: 'Bug', value: 'bug' },
    { label: 'Feature', value: 'feature' },
    { label: 'General', value: 'general' },
    { label: 'Other', value: 'other' },
  ]

  const rows = ref<AdminFeedback[]>([])
  const total = ref(0)
  const pages = ref(1)
  const page = ref(1)
  const active = ref('')
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      const res = await adminService.listFeedback({
        page: page.value,
        size: 10,
        category: active.value,
      })
      rows.value = res.data.items
      total.value = res.data.meta.total
      pages.value = res.data.meta.pages
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  function selectFilter(value: string) {
    if (active.value === value) return
    active.value = value
    page.value = 1
    load()
  }
  function changePage(p: number) {
    page.value = p
    load()
  }

  function accent(category: string): string {
    const key = category?.toLowerCase()
    if (key === 'bug') return 'var(--ad-danger)'
    if (key === 'feature') return 'var(--ad-primary)'
    if (key === 'general') return 'var(--ad-success)'
    return 'var(--ad-text3)'
  }

  async function remove(item: AdminFeedback) {
    const ok = await confirm({
      title: 'Delete feedback',
      body: `Delete this ${item.category} feedback from ${item.name}? This cannot be undone.`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await adminService.deleteFeedback(item.id)
    showToast('Feedback deleted')
    if (rows.value.length === 1 && page.value > 1) page.value -= 1
    load()
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader
      title="Feedback & Suggestions"
      subtitle="User feedback, bug reports, and feature requests."
    />

    <AdminCard>
      <div class="filters">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          class="pill"
          :class="{ 'pill--active': active === f.value }"
          @click="selectFilter(f.value)"
        >
          {{ f.label }}
        </button>
      </div>

      <div v-if="loading" class="state">
        <span class="ad-spinner" />
      </div>
      <div v-else-if="!rows.length" class="state">
        <AdminIcon name="star" :size="30" />
        <p class="state__title">No feedback yet</p>
        <p class="state__sub">User feedback and suggestions will appear here.</p>
      </div>
      <div v-else class="list">
        <div
          v-for="item in rows"
          :key="item.id"
          class="fb"
          :style="{ borderLeftColor: accent(item.category) }"
        >
          <AdminAvatar :name="item.name" :size="38" />
          <div class="fb__body">
            <div class="fb__head">
              <span class="fb__name">{{ item.name }}</span>
              <AdminBadge :label="item.category" :tone="item.category" />
              <AdminIcon v-if="item.has_attachment" name="file-text" :size="13" class="fb__clip" />
              <span class="fb__time">{{ timeAgo(item.created_at) }}</span>
            </div>
            <div v-if="item.subject" class="fb__subject">{{ item.subject }}</div>
            <p class="fb__msg">{{ item.message }}</p>
          </div>
          <button class="icon-btn" title="Delete" @click="remove(item)">
            <AdminIcon name="trash" :size="16" />
          </button>
        </div>
      </div>

      <AdminPagination :page="page" :pages="pages" :total="total" @change="changePage" />
    </AdminCard>
  </div>
</template>

<style scoped>
  .filters { padding: 14px 18px; display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid var(--ad-border); }
  .pill {
    padding: 7px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer;
    border: 1px solid var(--ad-border); background: transparent; color: var(--ad-text2); transition: all 0.12s;
  }
  .pill:hover { border-color: var(--ad-border-strong); color: var(--ad-text); }
  .pill--active, .pill--active:hover { background: var(--ad-primary-bg); color: var(--ad-primary); border-color: transparent; }

  .state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 20px; color: var(--ad-text3); text-align: center; }
  .state__title { font-size: 15px; font-weight: 700; color: var(--ad-text); margin: 6px 0 0; }
  .state__sub { font-size: 13px; color: var(--ad-text3); margin: 0; }

  .list { display: grid; }
  .fb {
    display: flex; gap: 12px; padding: 16px 18px;
    border-bottom: 1px solid var(--ad-border); border-left: 3px solid transparent;
  }
  .fb:last-child { border-bottom: none; }
  .fb__body { flex: 1; min-width: 0; }
  .fb__head { display: flex; align-items: center; gap: 8px; }
  .fb__name { font-weight: 700; font-size: 13.5px; color: var(--ad-text); }
  .fb__clip { color: var(--ad-text3); }
  .fb__time { margin-left: auto; font-size: 11.5px; color: var(--ad-text3); white-space: nowrap; }
  .fb__subject { font-size: 13px; font-weight: 600; color: var(--ad-text2); margin-top: 6px; }
  .fb__msg { font-size: 13px; color: var(--ad-text2); line-height: 1.55; margin: 4px 0 0; white-space: pre-wrap; }
  .icon-btn { background: none; border: none; color: var(--ad-text3); cursor: pointer; align-self: flex-start; display: inline-flex; padding: 2px; }
  .icon-btn:hover { color: var(--ad-danger); }
</style>
