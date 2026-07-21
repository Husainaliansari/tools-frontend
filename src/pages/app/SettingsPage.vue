<script setup lang="ts">
  /**
   * SettingsPage — tabbed account settings: general, notifications,
   * appearance, security and sessions.
   */
  import { reactive, ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import BaseBadge from '@components/ui/BaseBadge.vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import BaseToggle from '@components/ui/BaseToggle.vue'
  import BaseSelect from '@components/ui/BaseSelect.vue'
  import SettingsCard from '@components/app/SettingsCard.vue'
  import PreferenceRow from '@components/app/PreferenceRow.vue'
  import { DEMO_USER } from '@constants'
  import { useTheme, useFeedback } from '@composables'

  const { isDark, setTheme } = useTheme()
  const { showToast, confirm } = useFeedback()

  const tabs = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'appearance', label: 'Appearance', icon: 'sun' },
    { id: 'security', label: 'Security', icon: 'shield' },
    { id: 'sessions', label: 'Sessions', icon: 'monitor' },
  ] as const

  const activeTab = ref<(typeof tabs)[number]['id']>('general')

  const notifications = reactive({
    jobCompleted: true,
    signatureRequests: true,
    storageAlerts: true,
    productUpdates: false,
    billing: true,
  })
  const security = reactive({ authenticator: true, sms: false })

  const accentColors = ['#1e40af', '#4f46e5', '#0891b2', '#7c3aed', '#16a34a', '#dc2626']
  const themeOptions = [
    { label: 'Light', icon: 'sun', value: 'light' },
    { label: 'Dark', icon: 'moon', value: 'dark' },
    { label: 'System', icon: 'monitor', value: 'system' },
  ]

  const sessions = [
    {
      icon: 'monitor',
      device: 'MacBook Pro · Chrome',
      meta: 'San Francisco, CA · Active now',
      current: true,
    },
    {
      icon: 'phone',
      device: 'iPhone 15 · Safari',
      meta: 'San Francisco, CA · 2 hours ago',
      current: false,
    },
    {
      icon: 'monitor',
      device: 'Windows PC · Edge',
      meta: 'New York, NY · 3 days ago',
      current: false,
    },
  ]

  function isThemeSelected(value: string) {
    return (value === 'dark' && isDark.value) || (value === 'light' && !isDark.value)
  }

  function deleteAccount() {
    confirm({
      title: 'Delete your account?',
      body: 'This permanently deletes your account, files and history. This cannot be undone.',
      confirmLabel: 'Delete account',
      toast: 'Account scheduled for deletion',
    })
  }
</script>

<template>
  <div class="pf-settings animate-fade-up">
    <!-- Tab nav -->
    <nav class="pf-settings__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="pf-settings__tab"
        :class="{ 'pf-settings__tab--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <BaseIcon :name="tab.icon" :size="18" />
        {{ tab.label }}
      </button>
    </nav>

    <!-- Panels -->
    <div class="pf-settings__panels">
      <!-- General -->
      <template v-if="activeTab === 'general'">
        <SettingsCard title="Account" subtitle="Manage your basic account details.">
          <PreferenceRow icon="user" title="Display name" subtitle="Shown across your account">
            <BaseSelect size="mini" :options="[DEMO_USER.name]" />
          </PreferenceRow>
          <PreferenceRow icon="mail" title="Email" :subtitle="DEMO_USER.email">
            <BaseBadge tone="success">Verified</BaseBadge>
          </PreferenceRow>
          <PreferenceRow icon="credit-card" title="Plan" subtitle="You’re on the Pro plan" last>
            <BaseButton variant="soft" size="sm" @click="showToast('Billing portal')"
              >Manage</BaseButton
            >
          </PreferenceRow>
        </SettingsCard>

        <SettingsCard title="Storage" subtitle="7.8 GB of 10 GB used.">
          <div class="pf-settings__bar"
            ><div class="pf-settings__bar-fill" style="width: 78%"
          /></div>
          <div class="pf-settings__bar-row">
            <span>7.8 GB used</span>
            <span class="pf-settings__bar-total">2.2 GB free</span>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Danger zone"
          subtitle="Irreversible actions."
          accent="var(--color-danger)"
        >
          <PreferenceRow
            icon="trash"
            title="Delete account"
            subtitle="Permanently remove your account and all data"
            last
          >
            <BaseButton variant="danger" size="sm" @click="deleteAccount">Delete</BaseButton>
          </PreferenceRow>
        </SettingsCard>
      </template>

      <!-- Notifications -->
      <template v-else-if="activeTab === 'notifications'">
        <SettingsCard title="Email notifications" subtitle="Choose what we email you about.">
          <PreferenceRow
            icon="check-circle"
            title="Job completed"
            subtitle="When a processing job finishes"
          >
            <BaseToggle v-model="notifications.jobCompleted" label="Job completed" />
          </PreferenceRow>
          <PreferenceRow
            icon="key"
            title="Signature requests"
            subtitle="When someone signs your document"
          >
            <BaseToggle v-model="notifications.signatureRequests" label="Signature requests" />
          </PreferenceRow>
          <PreferenceRow
            icon="database"
            title="Storage alerts"
            subtitle="When you’re running low on space"
          >
            <BaseToggle v-model="notifications.storageAlerts" label="Storage alerts" />
          </PreferenceRow>
          <PreferenceRow icon="sparkles" title="Product updates" subtitle="New features and tips">
            <BaseToggle v-model="notifications.productUpdates" label="Product updates" />
          </PreferenceRow>
          <PreferenceRow
            icon="credit-card"
            title="Billing"
            subtitle="Receipts and payment issues"
            last
          >
            <BaseToggle v-model="notifications.billing" label="Billing" />
          </PreferenceRow>
        </SettingsCard>
      </template>

      <!-- Appearance -->
      <template v-else-if="activeTab === 'appearance'">
        <SettingsCard title="Theme" subtitle="Personalize how PDFly looks.">
          <div class="pf-theme-grid">
            <button
              v-for="opt in themeOptions"
              :key="opt.value"
              type="button"
              class="pf-theme-opt"
              :class="{ 'pf-theme-opt--active': isThemeSelected(opt.value) }"
              @click="setTheme(opt.value === 'dark' ? 'dark' : 'light')"
            >
              <BaseIcon :name="opt.icon" :size="24" />
              {{ opt.label }}
            </button>
          </div>
        </SettingsCard>

        <SettingsCard title="Accent color" subtitle="Pick your highlight color.">
          <div class="pf-accents">
            <button
              v-for="(color, i) in accentColors"
              :key="color"
              type="button"
              class="pf-accent"
              :class="{ 'pf-accent--active': i === 0 }"
              :style="{ background: color }"
              :aria-label="`Accent ${color}`"
            />
          </div>
        </SettingsCard>
      </template>

      <!-- Security -->
      <template v-else-if="activeTab === 'security'">
        <SettingsCard title="Password" subtitle="Keep your account secure.">
          <div class="pf-security-form">
            <div>
              <label class="pf-settings__label">Current password</label>
              <BaseInput type="password" icon="lock" placeholder="••••••••" />
            </div>
            <div>
              <label class="pf-settings__label">New password</label>
              <BaseInput type="password" icon="lock" placeholder="••••••••" />
            </div>
            <BaseButton @click="showToast('Password updated')">Update password</BaseButton>
          </div>
        </SettingsCard>

        <SettingsCard title="Two-factor authentication" subtitle="Add an extra layer of security.">
          <PreferenceRow
            icon="shield"
            title="Authenticator app"
            subtitle="Use a TOTP app for 2FA codes"
          >
            <BaseToggle v-model="security.authenticator" label="Authenticator app" />
          </PreferenceRow>
          <PreferenceRow
            icon="phone"
            title="SMS backup"
            subtitle="Receive codes by text message"
            last
          >
            <BaseToggle v-model="security.sms" label="SMS backup" />
          </PreferenceRow>
        </SettingsCard>
      </template>

      <!-- Sessions -->
      <template v-else>
        <SettingsCard
          title="Active sessions"
          subtitle="Devices currently signed in to your account."
        >
          <div
            v-for="(session, i) in sessions"
            :key="session.device"
            class="pf-session"
            :class="{ 'pf-session--last': i === sessions.length - 1 }"
          >
            <div class="pf-session__icon"><BaseIcon :name="session.icon" :size="20" /></div>
            <div class="pf-session__meta">
              <div class="pf-session__device">
                {{ session.device }}
                <BaseBadge v-if="session.current" tone="success">This device</BaseBadge>
              </div>
              <div class="pf-session__loc">{{ session.meta }}</div>
            </div>
            <button
              v-if="!session.current"
              type="button"
              class="pf-session__revoke"
              @click="showToast('Session revoked', 'info')"
            >
              Revoke
            </button>
          </div>
        </SettingsCard>
      </template>
    </div>
  </div>
</template>

<style scoped>
  .pf-settings {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 24px;
  }
  .pf-settings__tabs {
    display: grid;
    gap: 4px;
    align-content: start;
    position: sticky;
    top: 82px;
  }
  .pf-settings__tab {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 14px;
    border-radius: var(--radius-lg);
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    color: hsl(var(--color-text-muted));
    background: transparent;
    text-align: left;
    transition: all 0.15s;
  }
  .pf-settings__tab--active {
    font-weight: 700;
    color: hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.1);
  }
  .pf-settings__panels {
    display: grid;
    gap: 18px;
  }
  .pf-settings__label {
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    display: block;
    margin-bottom: 7px;
  }
  .pf-settings__bar {
    height: 10px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-chip));
    overflow: hidden;
    margin-bottom: 12px;
  }
  .pf-settings__bar-fill {
    height: 100%;
    border-radius: var(--radius-full);
    background: linear-gradient(90deg, hsl(var(--color-primary)), hsl(var(--color-indigo)));
  }
  .pf-settings__bar-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: hsl(var(--color-text-muted));
    font-weight: 600;
  }
  .pf-settings__bar-total {
    color: hsl(var(--color-text-faint));
  }

  .pf-theme-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .pf-theme-opt {
    padding: 18px 12px;
    border-radius: var(--radius-xl);
    border: 2px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    color: hsl(var(--color-text-muted));
    font-weight: 700;
    font-size: 13.5px;
  }
  .pf-theme-opt--active {
    border-color: hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.06);
    color: hsl(var(--color-primary));
  }
  .pf-accents {
    display: flex;
    gap: 12px;
  }
  .pf-accent {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    border: 3px solid transparent;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
  }
  .pf-accent--active {
    border-color: hsl(var(--color-text));
  }

  .pf-security-form {
    display: grid;
    gap: 14px;
    max-width: 420px;
  }

  .pf-session {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid hsl(var(--color-border));
  }
  .pf-session--last {
    border-bottom: none;
  }
  .pf-session__icon {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text-muted));
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .pf-session__meta {
    flex: 1;
  }
  .pf-session__device {
    font-weight: 600;
    font-size: 14.5px;
    color: hsl(var(--color-text));
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .pf-session__loc {
    font-size: 13px;
    color: hsl(var(--color-text-faint));
  }
  .pf-session__revoke {
    background: none;
    border: 1px solid hsl(var(--color-border));
    color: hsl(var(--color-danger));
    padding: 7px 14px;
    border-radius: 9px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
  }

  @media (max-width: 899px) {
    .pf-settings {
      grid-template-columns: 1fr;
    }
    .pf-settings__tabs {
      display: flex;
      overflow-x: auto;
      position: static;
    }
  }
</style>
