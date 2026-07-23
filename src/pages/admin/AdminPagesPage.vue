<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { adminService, type ContentPage } from '@services/admin'
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

  const { showToast, confirm } = useFeedback()

  const rows = ref<ContentPage[]>([])
  const loading = ref(true)
  const error = ref('')
  const curPage = ref(1)
  const pageCount = ref(1)
  const total = ref(0)

  const modalOpen = ref(false)
  const saving = ref(false)
  const editing = ref<ContentPage | null>(null)
  const form = reactive({
    title: '',
    path: '',
    status: 'published',
    content: '',
    meta_title: '',
    meta_description: '',
  })

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const res = await adminService.listPages({ page: curPage.value, size: 10 })
      rows.value = res.data.items
      pageCount.value = res.data.meta.pages
      total.value = res.data.meta.total
    } catch (e) {
      error.value = errMsg(e, 'Could not load pages.')
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  function changePage(p: number) {
    curPage.value = p
    load()
  }

  function openCreate() {
    editing.value = null
    Object.assign(form, { title: '', path: '', status: 'published', content: '', meta_title: '', meta_description: '' })
    modalOpen.value = true
  }

  function openEdit(page: ContentPage) {
    editing.value = page
    Object.assign(form, {
      title: page.title,
      path: page.path,
      status: page.status,
      content: page.content ?? '',
      meta_title: page.meta_title ?? '',
      meta_description: page.meta_description ?? '',
    })
    modalOpen.value = true
  }

  async function submit() {
    if (!form.title.trim() || !form.path.trim()) {
      showToast('Title and path are required.', 'error')
      return
    }
    saving.value = true
    try {
      const body = {
        title: form.title,
        path: form.path,
        status: form.status,
        content: form.content,
        meta_title: form.meta_title,
        meta_description: form.meta_description,
      }
      if (editing.value) {
        await adminService.updatePage(editing.value.id, body)
        showToast('Page updated')
      } else {
        await adminService.createPage(body)
        showToast('Page created')
        curPage.value = 1
      }
      modalOpen.value = false
      load()
    } catch (e) {
      showToast(errMsg(e, 'Could not save page.'), 'error')
    } finally {
      saving.value = false
    }
  }

  async function remove(page: ContentPage) {
    const ok = await confirm({
      title: 'Delete page',
      body: `Delete “${page.title}”? This cannot be undone.`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await adminService.deletePage(page.id)
      showToast('Page deleted')
      if (rows.value.length === 1 && curPage.value > 1) curPage.value -= 1
      load()
    } catch (e) {
      showToast(errMsg(e, 'Could not delete page.'), 'error')
    }
  }

  function errMsg(e: unknown, fallback: string): string {
    const r = (e as { response?: { data?: { error?: { message?: string } } } })?.response
    return r?.data?.error?.message ?? fallback
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Pages & Content" subtitle="Manage your website content.">
      <template #actions>
        <AdminButton icon="plus" @click="openCreate">Add Page</AdminButton>
      </template>
    </AdminPageHeader>

    <AdminCard>
      <div v-if="loading" class="state"><span class="ad-spinner" /></div>
      <div v-else-if="error" class="state ad-muted">{{ error }}</div>
      <div v-else-if="!rows.length" class="state ad-muted">
        <AdminIcon name="file-text" :size="28" />
        <p>No pages yet. Create your first page.</p>
      </div>
      <div v-else class="list">
        <div v-for="page in rows" :key="page.id" class="row">
          <div class="row__main">
            <div class="row__title">{{ page.title }}</div>
            <div class="row__path ad-mono">{{ page.path }}</div>
          </div>
          <div class="row__actions">
            <AdminBadge :label="page.status" />
            <AdminButton variant="secondary" size="sm" icon="edit" @click="openEdit(page)">Edit</AdminButton>
            <AdminButton variant="ghost" size="sm" icon="trash" @click="remove(page)">Delete</AdminButton>
          </div>
        </div>
      </div>
      <AdminPagination :page="curPage" :pages="pageCount" :total="total" @change="changePage" />
    </AdminCard>

    <AdminModal v-if="modalOpen" :title="editing ? 'Edit Page' : 'Add Page'" @close="modalOpen = false">
      <div class="form">
        <div><label class="ad-label">Title</label><input v-model="form.title" class="ad-input" placeholder="About Us" /></div>
        <div><label class="ad-label">Path</label><input v-model="form.path" class="ad-input ad-mono" placeholder="/about" /></div>
        <div>
          <label class="ad-label">Status</label>
          <select v-model="form.status" class="ad-input">
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div><label class="ad-label">Content</label><textarea v-model="form.content" class="ad-input" rows="5" placeholder="Page content…" /></div>
        <div><label class="ad-label">Meta Title</label><input v-model="form.meta_title" class="ad-input" placeholder="SEO title" /></div>
        <div><label class="ad-label">Meta Description</label><textarea v-model="form.meta_description" class="ad-input" rows="2" placeholder="SEO description" /></div>
      </div>
      <template #footer>
        <AdminButton variant="secondary" @click="modalOpen = false">Cancel</AdminButton>
        <AdminButton :loading="saving" @click="submit">{{ editing ? 'Save Changes' : 'Create Page' }}</AdminButton>
      </template>
    </AdminModal>
  </div>
</template>

<style scoped>
  .state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 20px; color: var(--ad-text3); }
  .list { display: grid; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 18px; border-bottom: 1px solid var(--ad-border); }
  .row:last-child { border-bottom: none; }
  .row__main { min-width: 0; }
  .row__title { font-weight: 600; font-size: 14px; color: var(--ad-text); }
  .row__path { font-size: 12.5px; color: var(--ad-text3); margin-top: 2px; }
  .row__actions { display: flex; align-items: center; gap: 8px; flex: none; }
  .form { display: grid; gap: 14px; }
</style>
