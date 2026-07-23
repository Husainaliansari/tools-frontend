<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { adminService, type ContactMessage } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import {
    AdminAvatar,
    AdminButton,
    AdminCard,
    AdminIcon,
    AdminPageHeader,
    AdminPagination,
    AdminSlideOver,
  } from '@components/admin'
  import { formatDate } from '@components/admin/format'

  const { showToast, confirm } = useFeedback()

  const rows = ref<ContactMessage[]>([])
  const total = ref(0)
  const pages = ref(1)
  const page = ref(1)
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      const res = await adminService.listMessages({ page: page.value, size: 10 })
      rows.value = res.data.items
      total.value = res.data.meta.total
      pages.value = res.data.meta.pages
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  function changePage(p: number) {
    page.value = p
    load()
  }

  // ── Detail slide-over ──────────────────────────────────────────────
  const detail = ref<ContactMessage | null>(null)
  const detailOpen = ref(false)
  const reply = ref('')
  const sending = ref(false)

  async function openMessage(msg: ContactMessage) {
    detailOpen.value = true
    detail.value = null
    reply.value = ''
    detail.value = (await adminService.getMessage(msg.id)).data
    reply.value = detail.value.reply ?? ''
    // Reading is now an explicit action (the GET is side-effect free).
    if (!msg.is_read) {
      try {
        await adminService.markMessageRead(msg.id)
        msg.is_read = true
        if (detail.value) detail.value.is_read = true
      } catch {
        /* non-critical: leave the unread indicator as-is */
      }
    }
  }

  async function sendReply() {
    if (!detail.value || !reply.value.trim()) {
      showToast('Write a reply first.', 'error')
      return
    }
    sending.value = true
    try {
      await adminService.replyMessage(detail.value.id, reply.value.trim())
      showToast('Reply sent', 'success')
      detailOpen.value = false
      load()
    } catch {
      showToast('Could not send reply.', 'error')
    } finally {
      sending.value = false
    }
  }

  async function removeMessage() {
    if (!detail.value) return
    const ok = await confirm({
      title: 'Delete message',
      body: `Delete the message from ${detail.value.name}? This cannot be undone.`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await adminService.deleteMessage(detail.value.id)
    showToast('Message deleted')
    detailOpen.value = false
    if (rows.value.length === 1 && page.value > 1) page.value -= 1
    load()
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader
      title="Contact Messages"
      subtitle="View and respond to messages from users."
    />

    <AdminCard>
      <div v-if="loading" class="state">
        <span class="ad-spinner" />
      </div>
      <div v-else-if="!rows.length" class="state">
        <AdminIcon name="mail" :size="30" />
        <p class="state__title">No messages yet</p>
        <p class="state__sub">Messages sent through the contact form will appear here.</p>
      </div>
      <div v-else class="list">
        <button
          v-for="msg in rows"
          :key="msg.id"
          class="msg"
          @click="openMessage(msg)"
        >
          <AdminAvatar :name="msg.name" :size="38" />
          <div class="msg__body">
            <div class="msg__head">
              <span class="msg__name" :class="{ 'is-unread': !msg.is_read }">{{ msg.name }}</span>
              <span class="msg__date">{{ formatDate(msg.created_at) }}</span>
            </div>
            <div class="msg__subject">{{ msg.subject || '(No subject)' }}</div>
            <div class="msg__preview">{{ msg.message }}</div>
          </div>
          <span v-if="!msg.is_read" class="msg__dot" />
        </button>
      </div>

      <AdminPagination :page="page" :pages="pages" :total="total" @change="changePage" />
    </AdminCard>

    <!-- Message details slide-over -->
    <AdminSlideOver v-if="detailOpen" title="Message Details" @close="detailOpen = false">
      <div v-if="!detail" class="ad-spinner" style="margin: 40px auto" />
      <div v-else class="detail">
        <div class="detail__subject">{{ detail.subject || '(No subject)' }}</div>
        <div class="detail__from">
          From: <strong>{{ detail.name }}</strong> ({{ detail.email }}) · {{ formatDate(detail.created_at) }}
        </div>
        <div class="detail__msg">{{ detail.message }}</div>

        <div>
          <label class="ad-label">Reply</label>
          <textarea
            v-model="reply"
            class="ad-input"
            rows="5"
            placeholder="Write your reply…"
          />
        </div>

        <div class="detail__actions">
          <AdminButton icon="send" :loading="sending" @click="sendReply">Send Reply</AdminButton>
          <AdminButton variant="secondary" icon="trash" @click="removeMessage">Delete</AdminButton>
        </div>
      </div>
    </AdminSlideOver>
  </div>
</template>

<style scoped>
  .state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 20px; color: var(--ad-text3); text-align: center; }
  .state__title { font-size: 15px; font-weight: 700; color: var(--ad-text); margin: 6px 0 0; }
  .state__sub { font-size: 13px; color: var(--ad-text3); margin: 0; }

  .list { display: grid; }
  .msg {
    display: flex; align-items: flex-start; gap: 12px; width: 100%; text-align: left;
    padding: 14px 18px; background: transparent; border: none;
    border-bottom: 1px solid var(--ad-border); cursor: pointer; transition: background 0.12s;
  }
  .msg:last-child { border-bottom: none; }
  .msg:hover { background: var(--ad-chip); }
  .msg__body { flex: 1; min-width: 0; }
  .msg__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .msg__name { font-size: 13.5px; font-weight: 500; color: var(--ad-text); }
  .msg__name.is-unread { font-weight: 800; }
  .msg__date { font-size: 11.5px; color: var(--ad-text3); white-space: nowrap; }
  .msg__subject { font-size: 13px; font-weight: 600; color: var(--ad-text2); margin-top: 3px; }
  .msg__preview {
    font-size: 12.5px; color: var(--ad-text3); margin-top: 2px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .msg__dot { width: 9px; height: 9px; border-radius: 999px; background: var(--ad-primary); flex: none; margin-top: 6px; }

  .detail { display: grid; gap: 16px; }
  .detail__subject { font-size: 17px; font-weight: 700; color: var(--ad-text); }
  .detail__from { font-size: 12.5px; color: var(--ad-text3); }
  .detail__from strong { color: var(--ad-text2); font-weight: 600; }
  .detail__msg {
    font-size: 13.5px; color: var(--ad-text2); line-height: 1.6; white-space: pre-wrap;
    background: var(--ad-surface2); border: 1px solid var(--ad-border); border-radius: 10px; padding: 14px 16px;
  }
  .detail__actions { display: flex; gap: 8px; margin-top: 4px; }
</style>
