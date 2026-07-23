<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { ROUTE_NAMES } from '@constants'
  import { adminService } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import { AdminButton, AdminCard, AdminIcon, AdminPageHeader, AdminToggle } from '@components/admin'
  import { formatNumber } from '@components/admin/format'

  const router = useRouter()
  const { showToast } = useFeedback()

  const loading = ref(true)
  const saving = ref(false)
  const unread = ref(0)

  const form = reactive({
    channel_email: true,
    channel_push: false,
    channel_in_app: true,
    event_new_user: true,
    event_failed_job: true,
    event_error_spike: true,
    event_new_message: true,
    event_new_subscription: true,
    alert_email: '',
  })

  const channels = [
    { key: 'channel_email', label: 'Email', desc: 'Send operational alerts by email.', icon: 'mail' },
    { key: 'channel_push', label: 'Push', desc: 'Browser push notifications for admins.', icon: 'bell' },
    { key: 'channel_in_app', label: 'In-app', desc: 'Show alerts inside the admin panel.', icon: 'monitor' },
  ] as const

  const events = [
    { key: 'event_new_user', label: 'New user registered' },
    { key: 'event_new_subscription', label: 'New subscription' },
    { key: 'event_failed_job', label: 'Conversion job failed' },
    { key: 'event_error_spike', label: 'Error spike detected' },
    { key: 'event_new_message', label: 'New contact message' },
  ] as const

  function bool(v: unknown, fallback: boolean): boolean {
    return typeof v === 'boolean' ? v : fallback
  }

  async function load() {
    loading.value = true
    try {
      const [settings, count] = await Promise.all([
        adminService.getSetting('notifications'),
        adminService.unreadCount().catch(() => ({ data: { count: 0 } })),
      ])
      const d = settings.data
      form.channel_email = bool(d.channel_email, form.channel_email)
      form.channel_push = bool(d.channel_push, form.channel_push)
      form.channel_in_app = bool(d.channel_in_app, form.channel_in_app)
      form.event_new_user = bool(d.event_new_user, form.event_new_user)
      form.event_failed_job = bool(d.event_failed_job, form.event_failed_job)
      form.event_error_spike = bool(d.event_error_spike, form.event_error_spike)
      form.event_new_message = bool(d.event_new_message, form.event_new_message)
      form.event_new_subscription = bool(d.event_new_subscription, form.event_new_subscription)
      form.alert_email = typeof d.alert_email === 'string' ? d.alert_email : ''
      unread.value = count.data.count
    } catch {
      showToast('Could not load notification settings.', 'error')
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  async function save() {
    saving.value = true
    try {
      await adminService.updateSetting('notifications', { ...form })
      showToast('Notification settings saved')
    } catch {
      showToast('Could not save settings.', 'error')
    } finally {
      saving.value = false
    }
  }

  function goMessages() {
    router.push({ name: ROUTE_NAMES.ADMIN_MESSAGES })
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Notifications" subtitle="Configure how and when the platform notifies admins.">
      <template #actions>
        <AdminButton icon="save" :loading="saving" :disabled="loading" @click="save">Save Changes</AdminButton>
      </template>
    </AdminPageHeader>

    <AdminCard v-if="loading" pad>
      <div class="state"><span class="ad-spinner" /></div>
    </AdminCard>

    <template v-else>
      <!-- Unread messages quick stat -->
      <AdminCard pad>
        <div class="stat">
          <div class="stat__icon"><AdminIcon name="mail" :size="18" /></div>
          <div class="stat__body">
            <div class="stat__value">{{ formatNumber(unread) }} unread contact {{ unread === 1 ? 'message' : 'messages' }}</div>
            <div class="stat__sub">Respond to users from the Messages inbox.</div>
          </div>
          <AdminButton size="sm" variant="soft" icon="external-link" @click="goMessages">View Messages</AdminButton>
        </div>
      </AdminCard>

      <!-- Delivery channels -->
      <AdminCard pad>
        <div class="card-title">Delivery Channels</div>
        <div class="row" v-for="c in channels" :key="c.key">
          <div class="row__icon"><AdminIcon :name="c.icon" :size="16" /></div>
          <div class="row__main">
            <div class="row__label">{{ c.label }}</div>
            <div class="row__desc">{{ c.desc }}</div>
          </div>
          <AdminToggle v-model="form[c.key]" />
        </div>
      </AdminCard>

      <!-- Event subscriptions -->
      <AdminCard pad>
        <div class="card-title">Notify me about</div>
        <div class="row" v-for="e in events" :key="e.key">
          <div class="row__main">
            <div class="row__label">{{ e.label }}</div>
          </div>
          <AdminToggle v-model="form[e.key]" />
        </div>
      </AdminCard>

      <!-- Alert destination -->
      <AdminCard pad>
        <div class="card-title">Alert Destination</div>
        <div>
          <label class="ad-label">Operational alert email</label>
          <input v-model="form.alert_email" class="ad-input" type="email" placeholder="alerts@yourdomain.com" />
        </div>
      </AdminCard>
    </template>
  </div>
</template>

<style scoped>
  .state { display: flex; justify-content: center; padding: 40px 20px; }
  .card-title { font-weight: 700; font-size: 15px; color: var(--ad-text); margin-bottom: 14px; }
  .stat { display: flex; align-items: center; gap: 14px; }
  .stat__icon { width: 40px; height: 40px; border-radius: 10px; background: var(--ad-primary-bg); color: var(--ad-primary); display: flex; align-items: center; justify-content: center; flex: none; }
  .stat__body { flex: 1; min-width: 0; }
  .stat__value { font-size: 14px; font-weight: 700; color: var(--ad-text); }
  .stat__sub { font-size: 12.5px; color: var(--ad-text3); margin-top: 2px; }
  .row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--ad-border); }
  .row:last-child { border-bottom: none; }
  .row__icon { width: 32px; height: 32px; border-radius: 8px; background: var(--ad-chip); color: var(--ad-text2); display: flex; align-items: center; justify-content: center; flex: none; }
  .row__main { flex: 1; min-width: 0; }
  .row__label { font-size: 13.5px; font-weight: 600; color: var(--ad-text); }
  .row__desc { font-size: 12.5px; color: var(--ad-text3); margin-top: 2px; }
</style>
