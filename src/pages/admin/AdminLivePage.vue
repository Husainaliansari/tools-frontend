<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { adminService, type LiveActivity } from '@services/admin'
  import { useFeedback } from '@composables/useFeedback'
  import { AdminBadge, AdminCard, AdminPageHeader, AdminStatCard } from '@components/admin'
  import { timeAgo } from '@components/admin/format'

  const { showToast } = useFeedback()
  const data = ref<LiveActivity | null>(null)
  const loading = ref(true)
  let hadError = false

  async function load() {
    try {
      data.value = (await adminService.live()).data
      hadError = false
    } catch {
      // Polls on a timer — only surface the first failure to avoid spam.
      if (!hadError) showToast('Could not load live activity.', 'error')
      hadError = true
    } finally {
      loading.value = false
    }
  }

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    load()
    timer = setInterval(load, 8000)
  })
  onBeforeUnmount(() => clearInterval(timer))

  const recent = computed(() => data.value?.recent ?? [])
</script>

<template>
  <div class="ad-grid ad-fade-up">
    <AdminPageHeader title="Live Visitors" subtitle="Real-time activity monitoring.">
      <template #actions>
        <div class="live">
          <span class="live__dot" />
          <span class="live__label">Live</span>
        </div>
      </template>
    </AdminPageHeader>

    <div class="stat-grid">
      <AdminStatCard label="Active Jobs" :value="data?.active_jobs ?? 0" icon="activity" color="var(--ad-success)" />
      <AdminStatCard label="Today's Conversions" :value="data?.today_jobs ?? 0" icon="zap" color="var(--ad-primary)" />
      <AdminStatCard label="Recent Events" :value="recent.length" icon="history" color="var(--ad-purple)" />
    </div>

    <AdminCard>
      <div class="section-head">
        <span class="card-title">Recent Activity</span>
      </div>
      <div v-if="loading && !recent.length" class="state">
        <span class="ad-spinner" style="margin: 0 auto" />
      </div>
      <div v-else-if="!recent.length" class="state ad-muted">No recent activity.</div>
      <template v-else>
        <div
          v-for="(r, i) in recent"
          :key="i"
          class="row"
          :class="{ 'no-border': i === recent.length - 1 }"
        >
          <span class="row__dot" />
          <span class="ad-mono row__tool">{{ r.tool }}</span>
          <AdminBadge :label="r.status" />
          <span class="row__user">{{ r.user || 'Anonymous' }}</span>
          <span class="row__time">{{ timeAgo(r.created_at) }}</span>
        </div>
      </template>
    </AdminCard>
  </div>
</template>

<style scoped>
  .live { display: flex; align-items: center; gap: 8px; }
  .live__dot {
    width: 8px; height: 8px; border-radius: 999px;
    background: var(--ad-success);
    animation: adPulseDot 1.2s infinite;
  }
  .live__label { font-size: 13.5px; font-weight: 700; color: var(--ad-success); }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .section-head { padding: 14px 18px; border-bottom: 1px solid var(--ad-border); }
  .card-title { font-weight: 700; font-size: 15px; color: var(--ad-text); }
  .state { text-align: center; padding: 32px 16px; font-size: 13.5px; display: flex; justify-content: center; }
  .row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 18px; border-bottom: 1px solid var(--ad-border);
  }
  .row.no-border { border-bottom: none; }
  .row__dot {
    width: 8px; height: 8px; border-radius: 999px; flex: none;
    background: var(--ad-success);
    animation: adPulseDot 1.2s infinite;
  }
  .row__tool { flex: 1; min-width: 0; font-size: 13px; font-weight: 500; color: var(--ad-text); }
  .row__user { font-size: 12.5px; color: var(--ad-text2); }
  .row__time { font-size: 11.5px; color: var(--ad-text3); white-space: nowrap; }
</style>
