<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { adminService, type Performance } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import { AdminBadge, AdminCard, AdminIcon, AdminPageHeader } from '@components/admin'
  import { formatBytes, formatNumber } from '@components/admin/format'

  const { showToast } = useFeedback()
  const data = ref<Performance | null>(null)
  const loading = ref(true)
  let hadError = false

  async function load() {
    try {
      data.value = (await adminService.performance()).data
      hadError = false
    } catch {
      // Polls on a timer — only surface the first failure to avoid spam.
      if (!hadError) showToast('Could not load performance metrics.', 'error')
      hadError = true
    } finally {
      loading.value = false
    }
  }

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    load()
    timer = setInterval(load, 5000)
  })
  onBeforeUnmount(() => clearInterval(timer))

  interface Metric {
    label: string
    value: string
    pct: number | null
  }

  const metrics = computed<Metric[]>(() => {
    const d = data.value
    if (!d) return []
    return [
      { label: 'CPU Usage', value: `${d.cpu_percent ?? 0}%`, pct: d.cpu_percent ?? 0 },
      {
        label: 'Memory',
        value: `${formatBytes(d.memory_used ?? 0)} / ${formatBytes(d.memory_total ?? 0)}`,
        pct: d.memory_percent ?? 0,
      },
      {
        label: 'Disk',
        value: `${formatBytes(d.disk_used ?? 0)} / ${formatBytes(d.disk_total ?? 0)}`,
        pct: d.disk_percent ?? 0,
      },
      { label: 'Pending Jobs', value: formatNumber(d.pending_jobs), pct: null },
    ]
  })

  function barColor(pct: number): string {
    if (pct < 50) return 'var(--ad-success)'
    if (pct < 85) return 'var(--ad-warning)'
    return 'var(--ad-danger)'
  }

  function serviceTone(status: string): string {
    const s = status.toLowerCase()
    if (s === 'healthy') return 'success'
    if (s === 'warning') return 'warning'
    return 'danger'
  }

  function serviceColor(status: string): string {
    return `var(--ad-${serviceTone(status)})`
  }
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Server Performance" subtitle="System resource utilization and health." />

    <div v-if="loading && !data" class="loading">
      <span class="ad-spinner" style="margin: 0 auto" />
    </div>

    <template v-else>
      <div v-if="data && !data.available" class="note">
        <AdminIcon name="info" :size="16" />
        <span>Live metrics are unavailable on this server.</span>
      </div>

      <div class="metric-grid">
        <AdminCard v-for="(m, i) in metrics" :key="i" pad>
          <div class="metric__head">
            <span class="metric__label">{{ m.label }}</span>
            <span class="metric__value">{{ m.value }}</span>
          </div>
          <div v-if="m.pct !== null" class="bar">
            <div class="bar__fill" :style="{ width: `${m.pct}%`, background: barColor(m.pct) }" />
          </div>
        </AdminCard>
      </div>

      <AdminCard pad>
        <div class="card-title">Services</div>
        <div v-if="!data?.services?.length" class="ad-muted svc-empty">No services reported.</div>
        <div
          v-for="(svc, i) in data?.services ?? []"
          :key="i"
          class="svc"
          :class="{ 'no-border': i === (data?.services?.length ?? 0) - 1 }"
        >
          <span class="svc__dot" :style="{ background: serviceColor(svc.status) }" />
          <span class="svc__name">{{ svc.name }}</span>
          <AdminBadge :label="svc.status" :tone="serviceTone(svc.status)" />
        </div>
      </AdminCard>
    </template>
  </div>
</template>

<style scoped>
  .loading { display: flex; justify-content: center; padding: 48px 0; }
  .note {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 16px; border-radius: 10px;
    background: var(--ad-primary-bg); color: var(--ad-primary);
    font-size: 13.5px; font-weight: 600;
  }
  .metric-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .metric__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .metric__label { font-size: 13px; font-weight: 500; color: var(--ad-text3); }
  .metric__value { font-size: 14px; font-weight: 700; color: var(--ad-text); }
  .bar { height: 8px; border-radius: 999px; background: var(--ad-chip); overflow: hidden; }
  .bar__fill { height: 100%; border-radius: 999px; transition: width 0.4s; }
  .card-title { font-weight: 700; font-size: 15px; color: var(--ad-text); margin-bottom: 6px; }
  .svc-empty { padding: 12px 0; font-size: 13.5px; }
  .svc { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--ad-border); }
  .svc.no-border { border-bottom: none; }
  .svc__dot { width: 8px; height: 8px; border-radius: 999px; flex: none; }
  .svc__name { flex: 1; font-size: 13px; font-weight: 500; color: var(--ad-text); }
</style>
