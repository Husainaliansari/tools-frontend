<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { adminService, type Announcement } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import {
    AdminBadge,
    AdminButton,
    AdminCard,
    AdminIcon,
    AdminModal,
    AdminPageHeader,
    AdminPagination,
  } from '@components/admin'
  import { formatDate } from '@components/admin/format'

  const { showToast, confirm } = useFeedback()

  const items = ref<Announcement[]>([])
  const loading = ref(true)
  const curPage = ref(1)
  const pageCount = ref(1)
  const total = ref(0)

  async function load() {
    loading.value = true
    try {
      const res = await adminService.listAnnouncements({ page: curPage.value, size: 10 })
      items.value = res.data.items
      pageCount.value = res.data.meta.pages
      total.value = res.data.meta.total
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  function changePage(p: number) {
    curPage.value = p
    load()
  }

  // ── Create / edit modal ────────────────────────────────────────────
  const modalOpen = ref(false)
  const saving = ref(false)
  const editingId = ref<string | null>(null)
  const form = reactive({ title: '', body: '', status: 'draft', audience: 'all' })

  function openCreate() {
    editingId.value = null
    Object.assign(form, { title: '', body: '', status: 'draft', audience: 'all' })
    modalOpen.value = true
  }
  function openEdit(a: Announcement) {
    editingId.value = a.id
    Object.assign(form, { title: a.title, body: a.body, status: a.status, audience: a.audience })
    modalOpen.value = true
  }

  async function submit() {
    if (!form.title.trim() || !form.body.trim()) {
      showToast('Title and body are required.', 'error')
      return
    }
    saving.value = true
    try {
      if (editingId.value) {
        await adminService.updateAnnouncement(editingId.value, { ...form })
        showToast('Announcement updated')
      } else {
        await adminService.createAnnouncement({ ...form })
        showToast('Announcement created')
        curPage.value = 1
      }
      modalOpen.value = false
      load()
    } catch {
      showToast('Could not save announcement.', 'error')
    } finally {
      saving.value = false
    }
  }

  async function remove(a: Announcement) {
    const ok = await confirm({
      title: 'Delete announcement',
      body: `Delete “${a.title}”? This cannot be undone.`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await adminService.deleteAnnouncement(a.id)
    showToast('Announcement deleted')
    if (items.value.length === 1 && curPage.value > 1) curPage.value -= 1
    load()
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Announcements" subtitle="Send announcements to all users.">
      <template #actions>
        <AdminButton icon="plus" @click="openCreate">New Announcement</AdminButton>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="ad-spinner" style="margin: 40px auto" />

    <AdminCard v-else-if="!items.length" pad>
      <div class="state">
        <AdminIcon name="megaphone" :size="30" />
        <p class="state__title">No announcements yet</p>
        <p class="state__sub">Create one to broadcast news and updates to your users.</p>
        <AdminButton icon="plus" @click="openCreate">New Announcement</AdminButton>
      </div>
    </AdminCard>

    <div v-else class="list">
      <div v-for="a in items" :key="a.id" class="ann">
        <div class="ann__head">
          <h3 class="ann__title">{{ a.title }}</h3>
          <AdminBadge :label="a.status" :tone="a.status" />
        </div>
        <p class="ann__body">{{ a.body }}</p>
        <div class="ann__foot">
          <span class="ann__date">
            <AdminIcon name="clock" :size="13" />
            {{ formatDate(a.published_at || a.created_at) }}
          </span>
          <div class="ann__actions">
            <AdminButton size="sm" variant="ghost" icon="edit" @click="openEdit(a)">Edit</AdminButton>
            <AdminButton size="sm" variant="ghost" icon="trash" @click="remove(a)">Delete</AdminButton>
          </div>
        </div>
      </div>
    </div>

    <AdminPagination
      v-if="!loading && items.length"
      :page="curPage"
      :pages="pageCount"
      :total="total"
      @change="changePage"
    />

    <!-- Create / edit modal -->
    <AdminModal
      v-if="modalOpen"
      :title="editingId ? 'Edit Announcement' : 'New Announcement'"
      @close="modalOpen = false"
    >
      <div class="form">
        <div>
          <label class="ad-label">Title</label>
          <input v-model="form.title" class="ad-input" placeholder="Announcement title" />
        </div>
        <div>
          <label class="ad-label">Body</label>
          <textarea v-model="form.body" class="ad-input" rows="5" placeholder="What do you want to announce?" />
        </div>
        <div class="form__row">
          <div>
            <label class="ad-label">Status</label>
            <select v-model="form.status" class="ad-input">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div>
            <label class="ad-label">Audience</label>
            <select v-model="form.audience" class="ad-input">
              <option value="all">All users</option>
            </select>
          </div>
        </div>
      </div>
      <template #footer>
        <AdminButton variant="secondary" @click="modalOpen = false">Cancel</AdminButton>
        <AdminButton :loading="saving" @click="submit">
          {{ editingId ? 'Save Changes' : 'Create' }}
        </AdminButton>
      </template>
    </AdminModal>
  </div>
</template>

<style scoped>
  .state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 20px; color: var(--ad-text3); text-align: center; }
  .state__title { font-size: 15px; font-weight: 700; color: var(--ad-text); margin: 6px 0 0; }
  .state__sub { font-size: 13px; color: var(--ad-text3); margin: 0 0 8px; }

  .list { display: grid; gap: 12px; }
  .ann {
    background: var(--ad-surface); border: 1px solid var(--ad-border);
    border-radius: 12px; padding: 18px 20px;
  }
  .ann__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .ann__title { font-size: 15.5px; font-weight: 700; color: var(--ad-text); margin: 0; }
  .ann__body { font-size: 13.5px; color: var(--ad-text2); line-height: 1.6; margin: 10px 0 0; white-space: pre-wrap; }
  .ann__foot { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--ad-border); }
  .ann__date { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ad-text3); }
  .ann__actions { display: flex; gap: 4px; }

  .form { display: grid; gap: 14px; }
  .form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
</style>
