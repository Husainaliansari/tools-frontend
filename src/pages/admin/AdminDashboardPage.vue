<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { ROUTE_NAMES } from '@constants'
  import { adminService, type Overview } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import {
    AdminBarChart,
    AdminButton,
    AdminCard,
    AdminDonut,
    AdminIcon,
    AdminPageHeader,
    AdminStatCard,
  } from '@components/admin'
  import { compactNumber, formatBytes, formatMoneyCents, formatNumber, timeAgo } from '@components/admin/format'

  const router = useRouter()
  const { showToast } = useFeedback()

  const data = ref<Overview | null>(null)
  const loading = ref(true)

  const DONUT_COLORS = [
    'var(--ad-primary)', 'var(--ad-purple)', 'var(--ad-success)',
    'var(--ad-warning)', 'var(--ad-cyan)', 'var(--ad-danger)',
  ]

  async function load() {
    loading.value = true
    try {
      data.value = (await adminService.overview()).data
    } catch {
      showToast('Could not load dashboard data.', 'error')
    } finally {
      loading.value = false
    }
  }
  onMounted(load)

  const spark = computed(() => (data.value?.conversion_trend ?? []).map((t) => t.v))

  const kpis = computed(() => {
    const k = data.value?.kpis
    if (!k) return []
    return [
      { label: 'Total Users', value: formatNumber(k.total_users), icon: 'users', color: 'var(--ad-primary)' },
      { label: 'Active Users', value: formatNumber(k.active_users), icon: 'activity', color: 'var(--ad-success)' },
      { label: 'Total Conversions', value: compactNumber(k.total_conversions), icon: 'layers', color: 'var(--ad-purple)' },
      { label: "Today's Conversions", value: formatNumber(k.today_conversions), icon: 'zap', color: 'var(--ad-cyan)' },
      { label: 'Total Subscribers', value: formatNumber(k.total_subscribers), icon: 'credit-card', color: 'var(--ad-purple)' },
      { label: 'Monthly Revenue', value: formatMoneyCents(k.monthly_revenue_cents), icon: 'trending-up', color: 'var(--ad-success)' },
      { label: 'Storage Used', value: formatBytes(k.storage_bytes), icon: 'hard-drive', color: 'var(--ad-warning)' },
      { label: 'Failed Jobs', value: formatNumber(k.failed_jobs), icon: 'cpu', color: k.failed_jobs ? 'var(--ad-danger)' : 'var(--ad-success)', up: k.failed_jobs === 0 },
    ]
  })

  const donutSegments = computed(() =>
    (data.value?.tool_usage ?? []).map((t, i) => ({ pct: t.pct, color: DONUT_COLORS[i % DONUT_COLORS.length] })),
  )

  const quickActions = [
    { label: 'Manage Users', icon: 'users', route: ROUTE_NAMES.ADMIN_USERS },
    { label: 'View Jobs', icon: 'activity', route: ROUTE_NAMES.ADMIN_JOBS },
    { label: 'Settings', icon: 'settings', route: ROUTE_NAMES.ADMIN_SETTINGS },
    { label: 'Error Logs', icon: 'alert-triangle', route: ROUTE_NAMES.ADMIN_ERRORS },
  ]
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Dashboard" subtitle="Welcome back. Here’s your platform overview.">
      <template #actions>
        <AdminButton variant="secondary" icon="download" @click="showToast('Preparing export…')">Export</AdminButton>
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
        :up="k.up ?? true"
        :spark="spark.length ? spark : undefined"
      />
    </div>

    <div class="charts-row">
      <AdminCard>
        <div style="padding: 20px">
          <div class="card-head">
            <div>
              <div class="card-title">Conversion Trends</div>
              <div class="card-desc">Monthly conversion volume</div>
            </div>
          </div>
          <AdminBarChart :data="data?.conversion_trend ?? []" />
        </div>
      </AdminCard>

      <AdminCard>
        <div style="padding: 20px">
          <div class="card-title" style="margin-bottom: 16px">Tool Usage</div>
          <div v-if="donutSegments.length" class="donut-wrap">
            <AdminDonut :segments="donutSegments" :size="110" />
          </div>
          <div v-else class="ad-muted" style="text-align: center; padding: 24px 0">No usage yet.</div>
          <div class="legend">
            <div v-for="(t, i) in data?.tool_usage ?? []" :key="i" class="legend__row">
              <span class="legend__dot" :style="{ background: DONUT_COLORS[i % DONUT_COLORS.length] }" />
              <span class="legend__label">{{ t.tool }}</span>
              <span class="legend__pct">{{ t.pct }}%</span>
            </div>
          </div>
        </div>
      </AdminCard>
    </div>

    <div class="bottom-row">
      <AdminCard>
        <div class="section-head">
          <span class="card-title">Recent Activity</span>
          <button class="link-btn" @click="router.push({ name: ROUTE_NAMES.ADMIN_AUDIT })">View all</button>
        </div>
        <div v-if="!data?.recent_activity?.length" class="ad-muted" style="padding: 20px">No recent activity.</div>
        <div
          v-for="(a, i) in data?.recent_activity ?? []"
          :key="i"
          class="activity"
          :class="{ 'no-border': i === (data?.recent_activity?.length ?? 0) - 1 }"
        >
          <div class="activity__icon" :class="a.category === 'security' ? 'is-danger' : 'is-primary'">
            <AdminIcon :name="a.category === 'security' ? 'shield' : 'activity'" :size="15" />
          </div>
          <div class="activity__body">
            <div class="activity__title">{{ a.action }}</div>
            <div class="activity__desc">{{ a.summary }}</div>
          </div>
          <span class="activity__time">{{ timeAgo(a.created_at) }}</span>
        </div>
      </AdminCard>

      <AdminCard pad>
        <div class="card-title" style="margin-bottom: 14px">Quick Actions</div>
        <div class="quick-grid">
          <button
            v-for="(q, i) in quickActions"
            :key="i"
            class="quick"
            @click="router.push({ name: q.route })"
          >
            <AdminIcon :name="q.icon" :size="15" />
            {{ q.label }}
          </button>
        </div>
      </AdminCard>
    </div>
  </div>
</template>

<style scoped>
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
  .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
  .bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 1000px) { .charts-row, .bottom-row { grid-template-columns: 1fr; } }
  .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .card-title { font-weight: 700; font-size: 15px; color: var(--ad-text); }
  .card-desc { font-size: 12.5px; color: var(--ad-text3); margin-top: 2px; }
  .donut-wrap { display: flex; justify-content: center; margin-bottom: 16px; }
  .legend { display: grid; gap: 6px; }
  .legend__row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
  .legend__dot { width: 8px; height: 8px; border-radius: 2px; }
  .legend__label { color: var(--ad-text2); flex: 1; text-transform: capitalize; }
  .legend__pct { font-weight: 600; color: var(--ad-text); }
  .section-head { padding: 16px 20px; border-bottom: 1px solid var(--ad-border); display: flex; align-items: center; justify-content: space-between; }
  .link-btn { font-size: 12.5px; color: var(--ad-primary); font-weight: 600; background: none; border: none; cursor: pointer; }
  .activity { display: flex; gap: 10px; padding: 12px 20px; border-bottom: 1px solid var(--ad-border); }
  .activity.no-border { border-bottom: none; }
  .activity__icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex: none; }
  .activity__icon.is-primary { background: var(--ad-primary-bg); color: var(--ad-primary); }
  .activity__icon.is-danger { background: color-mix(in srgb, var(--ad-danger) 12%, transparent); color: var(--ad-danger); }
  .activity__body { flex: 1; min-width: 0; }
  .activity__title { font-size: 13px; font-weight: 600; color: var(--ad-text); text-transform: capitalize; }
  .activity__desc { font-size: 12px; color: var(--ad-text3); margin-top: 1px; }
  .activity__time { font-size: 11px; color: var(--ad-text3); white-space: nowrap; }
  .quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .quick {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px; border-radius: 8px;
    border: 1px solid var(--ad-border); background: transparent;
    color: var(--ad-text2); font-size: 12.5px; font-weight: 500; cursor: pointer;
    transition: all 0.12s;
  }
  .quick:hover { background: var(--ad-chip); color: var(--ad-text); border-color: var(--ad-border-strong); }
</style>
