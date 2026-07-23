<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { adminService, type Analytics } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import {
    AdminBarChart,
    AdminButton,
    AdminCard,
    AdminPageHeader,
    AdminStatCard,
  } from '@components/admin'
  import { compactNumber, formatNumber } from '@components/admin/format'

  const { showToast } = useFeedback()

  const data = ref<Analytics | null>(null)
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      data.value = (await adminService.analytics()).data
    } catch {
      showToast('Could not load analytics.', 'error')
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  const kpis = computed(() => {
    const k = data.value?.kpis
    if (!k) return []
    return [
      { label: 'Total Conversions', value: compactNumber(k.total_conversions), icon: 'layers', color: 'var(--ad-purple)' },
      { label: 'Unique Users', value: formatNumber(k.unique_users), icon: 'users', color: 'var(--ad-primary)' },
      { label: 'Completed', value: formatNumber(k.completed), icon: 'check-circle', color: 'var(--ad-success)' },
      { label: 'Success Rate', value: `${k.success_rate}%`, icon: 'activity', color: 'var(--ad-cyan)' },
    ]
  })

  const topTools = computed(() => data.value?.top_tools ?? [])
  const maxCount = computed(() => Math.max(1, ...topTools.value.map((t) => t.count)))
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Analytics" subtitle="Detailed platform analytics and insights.">
      <template #actions>
        <AdminButton variant="secondary" icon="refresh" @click="load(); showToast('Data refreshed', 'info')">Refresh</AdminButton>
      </template>
    </AdminPageHeader>

    <div class="kpi-grid">
      <AdminStatCard
        v-for="(k, i) in kpis"
        :key="i"
        :label="k.label"
        :value="k.value"
        :icon="k.icon"
        :color="k.color"
      />
    </div>

    <div class="charts-row">
      <AdminCard>
        <div style="padding: 20px">
          <div class="card-title" style="margin-bottom: 16px">Conversions Over Time</div>
          <AdminBarChart :data="data?.conversion_trend ?? []" />
        </div>
      </AdminCard>

      <AdminCard>
        <div style="padding: 20px">
          <div class="card-title" style="margin-bottom: 16px">Top Tools by Usage</div>
          <div v-if="loading" class="ad-spinner" style="margin: 24px auto" />
          <div v-else-if="!topTools.length" class="ad-muted" style="text-align: center; padding: 24px 0">No usage yet.</div>
          <div v-else class="tools-list">
            <div v-for="(tl, i) in topTools" :key="i" class="tool-row">
              <span class="tool-row__name">{{ tl.tool }}</span>
              <div class="tool-row__track">
                <div class="tool-row__fill" :style="{ width: `${(tl.count / maxCount) * 100}%` }" />
              </div>
              <span class="tool-row__count">{{ formatNumber(tl.count) }}</span>
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  </div>
</template>

<style scoped>
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 1000px) { .charts-row { grid-template-columns: 1fr; } }
  .card-title { font-weight: 700; font-size: 15px; color: var(--ad-text); }
  .tools-list { display: grid; gap: 10px; }
  .tool-row { display: flex; align-items: center; gap: 10px; }
  .tool-row__name { font-size: 13px; font-weight: 500; color: var(--ad-text); width: 120px; text-transform: capitalize; }
  .tool-row__track { flex: 1; height: 6px; border-radius: 99px; background: var(--ad-chip); overflow: hidden; }
  .tool-row__fill { height: 100%; border-radius: 99px; background: var(--ad-primary); transition: width 0.3s; }
  .tool-row__count { font-size: 12px; color: var(--ad-text3); width: 56px; text-align: right; font-weight: 600; }
</style>
