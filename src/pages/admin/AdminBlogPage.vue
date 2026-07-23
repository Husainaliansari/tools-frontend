<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { adminService, type BlogPost } from '@services/admin'
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
  import { formatDate, formatNumber } from '@components/admin/format'

  const { showToast, confirm } = useFeedback()

  const rows = ref<BlogPost[]>([])
  const loading = ref(true)
  const error = ref('')
  const page = ref(1)
  const pages = ref(1)
  const total = ref(0)

  const modalOpen = ref(false)
  const saving = ref(false)
  const editing = ref<BlogPost | null>(null)
  const form = reactive({
    title: '',
    excerpt: '',
    content: '',
    status: 'draft',
  })

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const res = await adminService.listBlog({ page: page.value, size: 10 })
      rows.value = res.data.items
      pages.value = res.data.meta.pages
      total.value = res.data.meta.total
    } catch (e) {
      error.value = errMsg(e, 'Could not load blog posts.')
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  function changePage(p: number) {
    page.value = p
    load()
  }

  function openCreate() {
    editing.value = null
    Object.assign(form, { title: '', excerpt: '', content: '', status: 'draft' })
    modalOpen.value = true
  }

  function openEdit(post: BlogPost) {
    editing.value = post
    Object.assign(form, {
      title: post.title,
      excerpt: post.excerpt ?? '',
      content: post.content,
      status: post.status,
    })
    modalOpen.value = true
  }

  async function submit() {
    if (!form.title.trim() || !form.content.trim()) {
      showToast('Title and content are required.', 'error')
      return
    }
    saving.value = true
    try {
      const body = {
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        status: form.status,
      }
      if (editing.value) {
        await adminService.updateBlog(editing.value.id, body)
        showToast('Post updated')
      } else {
        await adminService.createBlog(body)
        showToast('Post created')
        page.value = 1
      }
      modalOpen.value = false
      load()
    } catch (e) {
      showToast(errMsg(e, 'Could not save post.'), 'error')
    } finally {
      saving.value = false
    }
  }

  async function remove(post: BlogPost) {
    const ok = await confirm({
      title: 'Delete post',
      body: `Delete “${post.title}”? This cannot be undone.`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await adminService.deleteBlog(post.id)
      showToast('Post deleted')
      if (rows.value.length === 1 && page.value > 1) page.value -= 1
      load()
    } catch (e) {
      showToast(errMsg(e, 'Could not delete post.'), 'error')
    }
  }

  function errMsg(e: unknown, fallback: string): string {
    const r = (e as { response?: { data?: { error?: { message?: string } } } })?.response
    return r?.data?.error?.message ?? fallback
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Blog" subtitle="Manage your blog posts.">
      <template #actions>
        <AdminButton icon="plus" @click="openCreate">New Post</AdminButton>
      </template>
    </AdminPageHeader>

    <AdminCard>
      <div v-if="loading" class="state"><span class="ad-spinner" /></div>
      <div v-else-if="error" class="state ad-muted">{{ error }}</div>
      <div v-else-if="!rows.length" class="state ad-muted">
        <AdminIcon name="newspaper" :size="28" />
        <p>No posts yet. Write your first post.</p>
      </div>
      <div v-else class="list">
        <div v-for="post in rows" :key="post.id" class="row">
          <div class="row__main">
            <div class="row__title">{{ post.title }}</div>
            <div class="row__sub">{{ formatDate(post.created_at) }} · {{ formatNumber(post.views) }} views</div>
          </div>
          <div class="row__actions">
            <AdminBadge :label="post.status" />
            <AdminButton variant="secondary" size="sm" icon="edit" @click="openEdit(post)">Edit</AdminButton>
            <AdminButton variant="ghost" size="sm" icon="trash" @click="remove(post)">Delete</AdminButton>
          </div>
        </div>
      </div>
      <AdminPagination :page="page" :pages="pages" :total="total" @change="changePage" />
    </AdminCard>

    <AdminModal v-if="modalOpen" :title="editing ? 'Edit Post' : 'New Post'" width="560" @close="modalOpen = false">
      <div class="form">
        <div><label class="ad-label">Title</label><input v-model="form.title" class="ad-input" placeholder="Post title" /></div>
        <div><label class="ad-label">Excerpt</label><textarea v-model="form.excerpt" class="ad-input" rows="2" placeholder="Short summary…" /></div>
        <div><label class="ad-label">Content</label><textarea v-model="form.content" class="ad-input" rows="7" placeholder="Post content…" /></div>
        <div>
          <label class="ad-label">Status</label>
          <select v-model="form.status" class="ad-input">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>
      <template #footer>
        <AdminButton variant="secondary" @click="modalOpen = false">Cancel</AdminButton>
        <AdminButton :loading="saving" @click="submit">{{ editing ? 'Save Changes' : 'Create Post' }}</AdminButton>
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
  .row__sub { font-size: 12.5px; color: var(--ad-text3); margin-top: 2px; }
  .row__actions { display: flex; align-items: center; gap: 8px; flex: none; }
  .form { display: grid; gap: 14px; }
</style>
