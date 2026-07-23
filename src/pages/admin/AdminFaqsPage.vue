<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { adminService, type Faq } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import {
    AdminButton,
    AdminCard,
    AdminIcon,
    AdminModal,
    AdminPageHeader,
    AdminPagination,
  } from '@components/admin'

  const { showToast, confirm } = useFeedback()

  const rows = ref<Faq[]>([])
  const loading = ref(true)
  const error = ref('')
  const curPage = ref(1)
  const pageCount = ref(1)
  const total = ref(0)

  const modalOpen = ref(false)
  const saving = ref(false)
  const editing = ref<Faq | null>(null)
  const form = reactive({
    question: '',
    answer: '',
    category: '',
  })

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const res = await adminService.listFaqs({ page: curPage.value, size: 10 })
      rows.value = res.data.items
      pageCount.value = res.data.meta.pages
      total.value = res.data.meta.total
    } catch (e) {
      error.value = errMsg(e, 'Could not load FAQs.')
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
    Object.assign(form, { question: '', answer: '', category: '' })
    modalOpen.value = true
  }

  function openEdit(faq: Faq) {
    editing.value = faq
    Object.assign(form, {
      question: faq.question,
      answer: faq.answer,
      category: faq.category ?? '',
    })
    modalOpen.value = true
  }

  async function submit() {
    if (!form.question.trim() || !form.answer.trim()) {
      showToast('Question and answer are required.', 'error')
      return
    }
    saving.value = true
    try {
      const body = {
        question: form.question,
        answer: form.answer,
        category: form.category,
        sort_order: 0,
        published: true,
      }
      if (editing.value) {
        await adminService.updateFaq(editing.value.id, body)
        showToast('FAQ updated')
      } else {
        await adminService.createFaq(body)
        showToast('FAQ created')
        curPage.value = 1
      }
      modalOpen.value = false
      load()
    } catch (e) {
      showToast(errMsg(e, 'Could not save FAQ.'), 'error')
    } finally {
      saving.value = false
    }
  }

  async function remove(faq: Faq) {
    const ok = await confirm({
      title: 'Delete FAQ',
      body: 'Delete this FAQ? This cannot be undone.',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await adminService.deleteFaq(faq.id)
      showToast('FAQ deleted')
      if (rows.value.length === 1 && curPage.value > 1) curPage.value -= 1
      load()
    } catch (e) {
      showToast(errMsg(e, 'Could not delete FAQ.'), 'error')
    }
  }

  function errMsg(e: unknown, fallback: string): string {
    const r = (e as { response?: { data?: { error?: { message?: string } } } })?.response
    return r?.data?.error?.message ?? fallback
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="FAQs" subtitle="Manage frequently asked questions.">
      <template #actions>
        <AdminButton icon="plus" @click="openCreate">Add FAQ</AdminButton>
      </template>
    </AdminPageHeader>

    <AdminCard>
      <div v-if="loading" class="state"><span class="ad-spinner" /></div>
      <div v-else-if="error" class="state ad-muted">{{ error }}</div>
      <div v-else-if="!rows.length" class="state ad-muted">
        <AdminIcon name="help-circle" :size="28" />
        <p>No FAQs yet. Add your first question.</p>
      </div>
      <div v-else class="list">
        <div v-for="faq in rows" :key="faq.id" class="row">
          <div class="row__main">
            <div class="row__question">{{ faq.question }}</div>
            <div class="row__answer">{{ faq.answer }}</div>
          </div>
          <div class="row__actions">
            <button class="icon-btn" title="Edit" @click="openEdit(faq)">
              <AdminIcon name="edit" :size="16" />
            </button>
            <button class="icon-btn is-danger" title="Delete" @click="remove(faq)">
              <AdminIcon name="trash" :size="16" />
            </button>
          </div>
        </div>
      </div>
      <AdminPagination :page="curPage" :pages="pageCount" :total="total" @change="changePage" />
    </AdminCard>

    <AdminModal v-if="modalOpen" :title="editing ? 'Edit FAQ' : 'Add FAQ'" @close="modalOpen = false">
      <div class="form">
        <div><label class="ad-label">Question</label><input v-model="form.question" class="ad-input" placeholder="How do I…?" /></div>
        <div><label class="ad-label">Answer</label><textarea v-model="form.answer" class="ad-input" rows="5" placeholder="Answer…" /></div>
        <div><label class="ad-label">Category</label><input v-model="form.category" class="ad-input" placeholder="General (optional)" /></div>
      </div>
      <template #footer>
        <AdminButton variant="secondary" @click="modalOpen = false">Cancel</AdminButton>
        <AdminButton :loading="saving" @click="submit">{{ editing ? 'Save Changes' : 'Create FAQ' }}</AdminButton>
      </template>
    </AdminModal>
  </div>
</template>

<style scoped>
  .state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 20px; color: var(--ad-text3); }
  .list { display: grid; }
  .row { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 14px 18px; border-bottom: 1px solid var(--ad-border); }
  .row:last-child { border-bottom: none; }
  .row__main { min-width: 0; }
  .row__question { font-weight: 700; font-size: 14px; color: var(--ad-text); }
  .row__answer { font-size: 12.5px; color: var(--ad-text3); margin-top: 3px; line-height: 1.5; }
  .row__actions { display: flex; align-items: center; gap: 4px; flex: none; }
  .icon-btn { background: none; border: none; color: var(--ad-text3); cursor: pointer; display: inline-flex; padding: 6px; border-radius: 6px; transition: all 0.12s; }
  .icon-btn:hover { color: var(--ad-text); background: var(--ad-chip); }
  .icon-btn.is-danger:hover { color: var(--ad-danger); }
  .form { display: grid; gap: 14px; }
</style>
