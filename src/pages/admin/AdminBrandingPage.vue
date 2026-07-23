<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { adminService } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import { AdminButton, AdminCard, AdminIcon, AdminPageHeader } from '@components/admin'

  const { showToast } = useFeedback()

  const loading = ref(true)
  const saving = ref(false)
  const uploading = ref<'logo' | 'favicon' | null>(null)
  const logoInput = ref<HTMLInputElement | null>(null)
  const faviconInput = ref<HTMLInputElement | null>(null)

  const form = reactive({
    primary_color: '#2563eb',
    secondary_color: '#7c3aed',
    accent_color: '#0891b2',
    danger_color: '#dc2626',
    logo: '',
    favicon: '',
    social: {
      twitter: '',
      github: '',
      linkedin: '',
    },
  })

  const colorFields = [
    { key: 'primary_color', label: 'Primary' },
    { key: 'secondary_color', label: 'Secondary' },
    { key: 'accent_color', label: 'Accent' },
    { key: 'danger_color', label: 'Danger' },
  ] as const

  function str(v: unknown, fallback = ''): string {
    return typeof v === 'string' ? v : fallback
  }

  async function load() {
    loading.value = true
    try {
      const data = (await adminService.getSetting('branding')).data
      form.primary_color = str(data.primary_color, form.primary_color)
      form.secondary_color = str(data.secondary_color, form.secondary_color)
      form.accent_color = str(data.accent_color, form.accent_color)
      form.danger_color = str(data.danger_color, form.danger_color)
      form.logo = str(data.logo)
      form.favicon = str(data.favicon)
      const social = (data.social ?? {}) as Record<string, unknown>
      form.social.twitter = str(social.twitter)
      form.social.github = str(social.github)
      form.social.linkedin = str(social.linkedin)
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  function isImage(v: string): boolean {
    return v.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(v)
  }

  async function onPickAsset(kind: 'logo' | 'favicon', e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (file.size > 512 * 1024) {
      showToast('Image must be 512 KB or smaller.', 'error')
      input.value = ''
      return
    }
    uploading.value = kind
    try {
      const res = await adminService.uploadBrandingAsset(kind, file)
      form[kind] = str(res.data[kind])
      showToast(`${kind === 'logo' ? 'Logo' : 'Favicon'} uploaded`)
    } catch {
      showToast('Could not upload image.', 'error')
    } finally {
      uploading.value = null
      input.value = ''
    }
  }

  async function save() {
    saving.value = true
    try {
      await adminService.updateSetting('branding', {
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        danger_color: form.danger_color,
        logo: form.logo,
        favicon: form.favicon,
        social: {
          twitter: form.social.twitter,
          github: form.social.github,
          linkedin: form.social.linkedin,
        },
      })
      showToast('Settings saved')
    } catch {
      showToast('Could not save settings.', 'error')
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Theme & Branding" subtitle="Customize your website appearance." />

    <AdminCard v-if="loading" pad>
      <div class="state"><span class="ad-spinner" /></div>
    </AdminCard>

    <template v-else>
      <div class="cols">
        <AdminCard pad>
          <div class="card-title">Logo & Favicon</div>
          <div class="setting-row">
            <div class="asset-preview" :class="{ 'is-empty': !form.logo }">
              <img v-if="form.logo && isImage(form.logo)" :src="form.logo" alt="Logo" />
              <AdminIcon v-else name="image" :size="18" />
            </div>
            <div class="setting-row__main">
              <div class="setting-row__label">Logo</div>
              <div class="setting-row__val ad-mono">{{ form.logo && !form.logo.startsWith('data:') ? form.logo : (form.logo ? 'Uploaded image' : 'None uploaded') }}</div>
            </div>
            <input ref="logoInput" type="file" accept="image/*" hidden @change="onPickAsset('logo', $event)" />
            <AdminButton variant="secondary" size="sm" icon="upload" :loading="uploading === 'logo'" @click="logoInput?.click()">Upload</AdminButton>
          </div>
          <div class="setting-row">
            <div class="asset-preview" :class="{ 'is-empty': !form.favicon }">
              <img v-if="form.favicon && isImage(form.favicon)" :src="form.favicon" alt="Favicon" />
              <AdminIcon v-else name="image" :size="18" />
            </div>
            <div class="setting-row__main">
              <div class="setting-row__label">Favicon</div>
              <div class="setting-row__val ad-mono">{{ form.favicon && !form.favicon.startsWith('data:') ? form.favicon : (form.favicon ? 'Uploaded image' : 'None uploaded') }}</div>
            </div>
            <input ref="faviconInput" type="file" accept="image/*,.ico" hidden @change="onPickAsset('favicon', $event)" />
            <AdminButton variant="secondary" size="sm" icon="upload" :loading="uploading === 'favicon'" @click="faviconInput?.click()">Upload</AdminButton>
          </div>
        </AdminCard>

        <AdminCard pad>
          <div class="card-title">Brand Colors</div>
          <div v-for="f in colorFields" :key="f.key" class="color-row">
            <span class="swatch" :style="{ background: form[f.key] }" />
            <span class="color-row__label">{{ f.label }}</span>
            <input v-model="form[f.key]" type="color" class="color-input" />
            <span class="color-row__hex ad-mono">{{ form[f.key] }}</span>
          </div>
        </AdminCard>
      </div>

      <AdminCard pad>
        <div class="card-title">Social Links</div>
        <div class="social">
          <div><label class="ad-label">Twitter / X</label><input v-model="form.social.twitter" class="ad-input" placeholder="https://x.com/…" /></div>
          <div><label class="ad-label">GitHub</label><input v-model="form.social.github" class="ad-input" placeholder="https://github.com/…" /></div>
          <div><label class="ad-label">LinkedIn</label><input v-model="form.social.linkedin" class="ad-input" placeholder="https://linkedin.com/…" /></div>
        </div>
      </AdminCard>

      <div class="actions">
        <AdminButton icon="save" :loading="saving" @click="save">Save Changes</AdminButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
  .state { display: flex; justify-content: center; padding: 40px 20px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
  .card-title { font-weight: 700; font-size: 15px; color: var(--ad-text); margin-bottom: 16px; }
  .setting-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--ad-border); }
  .setting-row:last-child { border-bottom: none; }
  .setting-row__main { flex: 1; min-width: 0; }
  .setting-row__label { font-size: 13.5px; font-weight: 600; color: var(--ad-text); }
  .asset-preview { width: 40px; height: 40px; border-radius: 8px; border: 1px solid var(--ad-border); background: var(--ad-surface2); display: flex; align-items: center; justify-content: center; flex: none; overflow: hidden; color: var(--ad-text3); }
  .asset-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .setting-row__val { font-size: 12.5px; color: var(--ad-text3); margin-top: 2px; }
  .color-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--ad-border); }
  .color-row:last-child { border-bottom: none; }
  .swatch { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--ad-border); flex: none; }
  .color-row__label { flex: 1; font-size: 13.5px; font-weight: 500; color: var(--ad-text2); }
  .color-input { width: 40px; height: 28px; padding: 0; border: 1px solid var(--ad-border); border-radius: 6px; background: var(--ad-input-bg); cursor: pointer; }
  .color-row__hex { font-size: 12.5px; color: var(--ad-text3); min-width: 68px; text-align: right; text-transform: uppercase; }
  .social { display: grid; gap: 14px; }
  .actions { display: flex; justify-content: flex-start; }
</style>
