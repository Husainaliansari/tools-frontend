<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ROUTE_NAMES } from '@constants'
  import { adminService } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import { AdminButton, AdminCard, AdminIcon, AdminPageHeader, AdminToggle } from '@components/admin'

  const route = useRoute()
  const router = useRouter()
  const { showToast } = useFeedback()

  const TABS = [
    { id: 'general', label: 'General' },
    { id: 'auth', label: 'Auth' },
    { id: 'email', label: 'Email' },
    { id: 'uploads', label: 'Uploads' },
    { id: 'razorpay', label: 'Razorpay' },
    { id: 'security', label: 'Security' },
    { id: 'backup', label: 'Backup' },
    { id: 'localization', label: 'i18n' },
    { id: 'integrations', label: 'Integrations' },
  ]

  // Per-category defaults — guarantees every bound key exists so the form
  // never crashes on a fresh/partial settings payload.
  const DEFAULTS: Record<string, Record<string, unknown>> = {
    general: { site_name: '', site_url: '', maintenance_mode: false, registration_open: false },
    auth: {
      password_min_length: 8,
      session_timeout_minutes: 30,
      two_factor: 'disabled',
      oauth_google: false,
      oauth_github: false,
    },
    email: { smtp_host: '', smtp_port: 587, sender_email: '', use_tls: false },
    uploads: {
      max_file_size_free_mb: 0,
      max_file_size_pro_mb: 0,
      daily_limit_free: 0,
      auto_delete_hours: 0,
    },
    razorpay: { api_key: '', secret_key: '', webhook_url: '', test_mode: false },
    security: { rate_limit_per_min: 0, cors_origins: '', csp_strict: false, force_https: false },
    backup: { auto_backup: false, retention_days: 0, schedule: '', storage: '' },
    localization: { default_language: '', timezone: '', date_format: '', currency: '' },
    integrations: {
      google_analytics: false,
      sendgrid: false,
      cloudflare: false,
      sentry: false,
      slack: false,
    },
  }

  const INTEGRATIONS = [
    { key: 'google_analytics', name: 'Google Analytics' },
    { key: 'sendgrid', name: 'SendGrid' },
    { key: 'cloudflare', name: 'Cloudflare' },
    { key: 'sentry', name: 'Sentry' },
    { key: 'slack', name: 'Slack' },
  ]

  const settings = reactive<Record<string, Record<string, any>>>({})
  const loading = ref(true)
  const saving = ref(false)

  const activeCategory = computed(() => {
    const raw = route.params.tab
    const id = Array.isArray(raw) ? raw[0] : raw
    return id && DEFAULTS[id] ? id : 'general'
  })

  const form = computed(() => settings[activeCategory.value] ?? {})

  function selectTab(tab: string) {
    if (tab === activeCategory.value) return
    router.replace({ name: ROUTE_NAMES.ADMIN_SETTINGS, params: { tab } })
  }

  async function loadAll() {
    loading.value = true
    try {
      const data = (await adminService.allSettings()).data
      for (const cat of Object.keys(DEFAULTS)) {
        settings[cat] = { ...DEFAULTS[cat], ...(data[cat] ?? {}) }
      }
    } finally {
      loading.value = false
    }
  }
  onMounted(loadAll)

  async function save() {
    const cat = activeCategory.value
    saving.value = true
    try {
      await adminService.updateSetting(cat, settings[cat] ?? {})
      showToast('Settings saved')
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Settings" subtitle="Platform configuration and preferences." />

    <div class="tabs">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="tab"
        :class="{ 'is-active': tab.id === activeCategory }"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="loading">
      <span class="ad-spinner" style="margin: 0 auto" />
    </div>

    <AdminCard v-else pad>
      <!-- General -->
      <div v-if="activeCategory === 'general'" class="fields">
        <div class="field">
          <label class="ad-label">Site Name</label>
          <input v-model="form.site_name" class="ad-input" placeholder="PDFly" />
        </div>
        <div class="field">
          <label class="ad-label">Site URL</label>
          <input v-model="form.site_url" class="ad-input" placeholder="https://pdfly.com" />
        </div>
        <div class="toggle-row">
          <span class="ad-label toggle-row__label">Maintenance Mode</span>
          <AdminToggle v-model="form.maintenance_mode" />
        </div>
        <div class="toggle-row">
          <span class="ad-label toggle-row__label">Open Registration</span>
          <AdminToggle v-model="form.registration_open" />
        </div>
      </div>

      <!-- Auth -->
      <div v-else-if="activeCategory === 'auth'" class="fields">
        <div class="field">
          <label class="ad-label">Minimum Password Length</label>
          <input v-model.number="form.password_min_length" class="ad-input" type="number" />
        </div>
        <div class="field">
          <label class="ad-label">Session Timeout (minutes)</label>
          <input v-model.number="form.session_timeout_minutes" class="ad-input" type="number" />
        </div>
        <div class="field">
          <label class="ad-label">Two-Factor Authentication</label>
          <select v-model="form.two_factor" class="ad-input">
            <option value="disabled">Disabled</option>
            <option value="optional">Optional</option>
            <option value="required">Required</option>
          </select>
        </div>
        <div class="toggle-row">
          <span class="ad-label toggle-row__label">Google OAuth</span>
          <AdminToggle v-model="form.oauth_google" />
        </div>
        <div class="toggle-row">
          <span class="ad-label toggle-row__label">GitHub OAuth</span>
          <AdminToggle v-model="form.oauth_github" />
        </div>
      </div>

      <!-- Email -->
      <div v-else-if="activeCategory === 'email'" class="fields">
        <div class="field">
          <label class="ad-label">SMTP Host</label>
          <input v-model="form.smtp_host" class="ad-input" placeholder="smtp.sendgrid.net" />
        </div>
        <div class="field">
          <label class="ad-label">SMTP Port</label>
          <input v-model.number="form.smtp_port" class="ad-input" type="number" />
        </div>
        <div class="field">
          <label class="ad-label">Sender Email</label>
          <input v-model="form.sender_email" class="ad-input" placeholder="noreply@pdfly.com" />
        </div>
        <div class="toggle-row">
          <span class="ad-label toggle-row__label">Use TLS</span>
          <AdminToggle v-model="form.use_tls" />
        </div>
        <div>
          <AdminButton variant="secondary" icon="send" @click="showToast('Test email sent', 'info')">
            Send Test Email
          </AdminButton>
        </div>
      </div>

      <!-- Uploads -->
      <div v-else-if="activeCategory === 'uploads'" class="fields">
        <div class="field">
          <label class="ad-label">Max File Size — Free (MB)</label>
          <input v-model.number="form.max_file_size_free_mb" class="ad-input" type="number" />
        </div>
        <div class="field">
          <label class="ad-label">Max File Size — Pro (MB)</label>
          <input v-model.number="form.max_file_size_pro_mb" class="ad-input" type="number" />
        </div>
        <div class="field">
          <label class="ad-label">Daily Limit — Free</label>
          <input v-model.number="form.daily_limit_free" class="ad-input" type="number" />
        </div>
        <div class="field">
          <label class="ad-label">Auto-Delete After (hours)</label>
          <input v-model.number="form.auto_delete_hours" class="ad-input" type="number" />
        </div>
      </div>

      <!-- Razorpay -->
      <div v-else-if="activeCategory === 'razorpay'" class="fields">
        <div class="field">
          <label class="ad-label">API Key</label>
          <input v-model="form.api_key" class="ad-input" type="password" />
        </div>
        <div class="field">
          <label class="ad-label">Secret Key</label>
          <input v-model="form.secret_key" class="ad-input" type="password" />
        </div>
        <div class="field">
          <label class="ad-label">Webhook URL</label>
          <input v-model="form.webhook_url" class="ad-input" readonly />
        </div>
        <div class="toggle-row">
          <span class="ad-label toggle-row__label">Test Mode</span>
          <AdminToggle v-model="form.test_mode" />
        </div>
      </div>

      <!-- Security -->
      <div v-else-if="activeCategory === 'security'" class="fields">
        <div class="field">
          <label class="ad-label">Rate Limit (per minute)</label>
          <input v-model.number="form.rate_limit_per_min" class="ad-input" type="number" />
        </div>
        <div class="field">
          <label class="ad-label">CORS Origins</label>
          <input v-model="form.cors_origins" class="ad-input" placeholder="*.pdfly.com" />
        </div>
        <div class="toggle-row">
          <span class="ad-label toggle-row__label">Strict Content Security Policy</span>
          <AdminToggle v-model="form.csp_strict" />
        </div>
        <div class="toggle-row">
          <span class="ad-label toggle-row__label">Force HTTPS</span>
          <AdminToggle v-model="form.force_https" />
        </div>
      </div>

      <!-- Backup -->
      <div v-else-if="activeCategory === 'backup'" class="fields">
        <div class="toggle-row">
          <span class="ad-label toggle-row__label">Automatic Backups</span>
          <AdminToggle v-model="form.auto_backup" />
        </div>
        <div class="field">
          <label class="ad-label">Retention (days)</label>
          <input v-model.number="form.retention_days" class="ad-input" type="number" />
        </div>
        <div class="field">
          <label class="ad-label">Schedule</label>
          <input v-model="form.schedule" class="ad-input" placeholder="Daily at 03:00 UTC" />
        </div>
        <div class="field">
          <label class="ad-label">Storage</label>
          <input v-model="form.storage" class="ad-input" placeholder="AWS S3 — pdfly-backups" />
        </div>
        <div>
          <AdminButton variant="secondary" icon="download" @click="showToast('Backup started')">
            Backup Now
          </AdminButton>
        </div>
      </div>

      <!-- Localization -->
      <div v-else-if="activeCategory === 'localization'" class="fields">
        <div class="field">
          <label class="ad-label">Default Language</label>
          <input v-model="form.default_language" class="ad-input" placeholder="English" />
        </div>
        <div class="field">
          <label class="ad-label">Timezone</label>
          <input v-model="form.timezone" class="ad-input" placeholder="UTC" />
        </div>
        <div class="field">
          <label class="ad-label">Date Format</label>
          <input v-model="form.date_format" class="ad-input" placeholder="MMM DD, YYYY" />
        </div>
        <div class="field">
          <label class="ad-label">Currency</label>
          <input v-model="form.currency" class="ad-input" placeholder="USD" />
        </div>
      </div>

      <!-- Integrations -->
      <div v-else-if="activeCategory === 'integrations'" class="integrations">
        <div v-for="int in INTEGRATIONS" :key="int.key" class="integration">
          <div class="integration__icon"><AdminIcon name="plug" :size="17" /></div>
          <span class="integration__name">{{ int.name }}</span>
          <AdminToggle v-model="form[int.key]" />
        </div>
      </div>

      <div class="save-bar">
        <AdminButton icon="save" :loading="saving" @click="save">Save Changes</AdminButton>
      </div>
    </AdminCard>
  </div>
</template>

<style scoped>
  .tabs {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid var(--ad-border);
    overflow-x: auto;
  }
  .tab {
    padding: 10px 16px;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--ad-text3);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.12s;
    font-family: inherit;
  }
  .tab:hover { color: var(--ad-text); }
  .tab.is-active {
    color: var(--ad-text);
    font-weight: 600;
    border-bottom-color: var(--ad-primary);
  }
  .loading { display: flex; justify-content: center; padding: 48px 0; }
  .fields { display: grid; gap: 18px; max-width: 520px; }
  .field { display: grid; gap: 6px; }
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 4px 0;
  }
  .toggle-row__label { margin-bottom: 0; }
  .integrations { display: grid; }
  .integration {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid var(--ad-border);
  }
  .integration:last-child { border-bottom: none; }
  .integration__icon {
    width: 36px; height: 36px; border-radius: 8px; flex: none;
    display: flex; align-items: center; justify-content: center;
    background: var(--ad-chip); color: var(--ad-text2);
  }
  .integration__name { flex: 1; font-size: 14px; font-weight: 600; color: var(--ad-text); }
  .save-bar {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid var(--ad-border);
  }
</style>
