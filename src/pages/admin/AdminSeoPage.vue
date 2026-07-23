<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { adminService } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import { AdminButton, AdminCard, AdminPageHeader } from '@components/admin'

  const { showToast } = useFeedback()

  const loading = ref(true)
  const saving = ref(false)
  const form = reactive({
    meta_title: '',
    meta_description: '',
    robots: '',
    google_analytics_id: '',
  })

  function str(v: unknown): string {
    return typeof v === 'string' ? v : ''
  }

  async function load() {
    loading.value = true
    try {
      const data = (await adminService.getSetting('seo')).data
      form.meta_title = str(data.meta_title)
      form.meta_description = str(data.meta_description)
      form.robots = str(data.robots)
      form.google_analytics_id = str(data.google_analytics_id)
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  async function save() {
    saving.value = true
    try {
      await adminService.updateSetting('seo', {
        meta_title: form.meta_title,
        meta_description: form.meta_description,
        robots: form.robots,
        google_analytics_id: form.google_analytics_id,
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
    <AdminPageHeader title="SEO Management" subtitle="Search engine optimization settings." />

    <AdminCard v-if="loading" pad>
      <div class="state"><span class="ad-spinner" /></div>
    </AdminCard>

    <AdminCard v-else pad>
      <div class="form">
        <div><label class="ad-label">Meta Title</label><input v-model="form.meta_title" class="ad-input" placeholder="Default page title" /></div>
        <div><label class="ad-label">Meta Description</label><textarea v-model="form.meta_description" class="ad-input" rows="3" placeholder="Default page description" /></div>
        <div><label class="ad-label">Robots.txt</label><input v-model="form.robots" class="ad-input ad-mono" placeholder="index, follow" /></div>
        <div><label class="ad-label">Google Analytics ID</label><input v-model="form.google_analytics_id" class="ad-input ad-mono" placeholder="G-XXXXXXXXXX" /></div>
        <div class="actions">
          <AdminButton icon="save" :loading="saving" @click="save">Save Changes</AdminButton>
        </div>
      </div>
    </AdminCard>
  </div>
</template>

<style scoped>
  .state { display: flex; justify-content: center; padding: 40px 20px; }
  .form { display: grid; gap: 16px; max-width: 640px; }
  .actions { display: flex; justify-content: flex-start; margin-top: 4px; }
</style>
