<script setup lang="ts">
  /**
   * JobsPage — processing queue with status filters and per-job actions.
   */
  import { computed, ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import StatusBadge from '@components/ui/StatusBadge.vue'
  import { MOCK_JOBS } from '@constants'
  import { hexAlpha } from '@utils'
  import { useFeedback } from '@composables'
  import type { JobStatus } from '@types'

  const { showToast } = useFeedback()

  const activeFilter = ref('All')
  const filters = [
    { label: 'All', count: MOCK_JOBS.length },
    { label: 'Processing', count: MOCK_JOBS.filter((j) => j.status === 'processing').length },
    { label: 'Queued', count: MOCK_JOBS.filter((j) => j.status === 'queued').length },
    { label: 'Completed', count: MOCK_JOBS.filter((j) => j.status === 'done').length },
    { label: 'Failed', count: MOCK_JOBS.filter((j) => j.status === 'failed').length },
  ]

  const statusForFilter: Record<string, JobStatus> = {
    Processing: 'processing',
    Queued: 'queued',
    Completed: 'done',
    Failed: 'failed',
  }

  const filtered = computed(() => {
    if (activeFilter.value === 'All') return MOCK_JOBS
    return MOCK_JOBS.filter((j) => j.status === statusForFilter[activeFilter.value])
  })

  const statusIcon: Record<JobStatus, string> = {
    processing: 'refresh',
    done: 'check-circle',
    failed: 'x',
    queued: 'clock',
  }
</script>

<template>
  <div class="pf-jobs animate-fade-up">
    <div class="pf-jobs__filters">
      <button
        v-for="filter in filters"
        :key="filter.label"
        type="button"
        class="pf-jobs__chip"
        :class="{ 'pf-jobs__chip--active': activeFilter === filter.label }"
        @click="activeFilter = filter.label"
      >
        {{ filter.label }}
        <span class="pf-jobs__chip-count">{{ filter.count }}</span>
      </button>
    </div>

    <BaseCard v-for="job in filtered" :key="job.id">
      <div class="pf-job">
        <div class="pf-job__row">
          <div
            class="pf-job__icon"
            :style="{ color: job.color, background: hexAlpha(job.color, 0.13) }"
          >
            <BaseIcon
              :name="statusIcon[job.status]"
              :size="23"
              :class="{ 'animate-spin-slow': job.status === 'processing' }"
            />
          </div>
          <div class="pf-job__meta">
            <div class="pf-job__title-row">
              <span class="pf-job__tool">{{ job.tool }}</span>
              <span class="pf-job__id">{{ job.id }}</span>
            </div>
            <div class="pf-job__file">{{ job.file }}</div>
          </div>
          <StatusBadge :status="job.status" />
          <div class="pf-job__actions">
            <BaseButton
              v-if="job.status === 'processing'"
              variant="ghost"
              size="sm"
              @click="showToast('Job cancelled', 'info')"
            >
              Cancel
            </BaseButton>
            <BaseButton
              v-else-if="job.status === 'failed'"
              variant="soft"
              size="sm"
              icon="refresh"
              @click="showToast('Retrying job…', 'info')"
            >
              Retry
            </BaseButton>
            <BaseButton
              v-else-if="job.status === 'done'"
              variant="soft"
              size="sm"
              icon="download"
              @click="showToast('Download started')"
            >
              Download
            </BaseButton>
          </div>
        </div>

        <div v-if="job.status === 'processing' || job.status === 'queued'" class="pf-job__progress">
          <div class="pf-job__progress-row">
            <span>{{ job.eta }}</span>
            <span>{{ job.progress }}%</span>
          </div>
          <div class="pf-job__bar">
            <div
              class="pf-job__fill"
              :style="{
                width: `${job.progress}%`,
                background:
                  job.status === 'queued'
                    ? 'hsl(var(--color-text-faint))'
                    : `linear-gradient(90deg, hsl(var(--color-primary)), ${job.color})`,
              }"
            />
          </div>
        </div>

        <div
          v-else
          class="pf-job__result"
          :class="{ 'pf-job__result--failed': job.status === 'failed' }"
        >
          <BaseIcon :name="job.status === 'failed' ? 'x' : 'check'" :size="15" />
          {{ job.eta }}
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
  .pf-jobs {
    display: grid;
    gap: 16px;
  }
  .pf-jobs__filters {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .pf-jobs__chip {
    padding: 8px 15px;
    border-radius: var(--radius-full);
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .pf-jobs__chip--active {
    border-color: transparent;
    background: hsl(var(--color-primary));
    color: #fff;
  }
  .pf-jobs__chip-count {
    font-size: 11px;
    opacity: 0.8;
  }

  .pf-job {
    padding: 20px;
  }
  .pf-job__row {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }
  .pf-job__icon {
    width: 48px;
    height: 48px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .pf-job__meta {
    flex: 1 1 200px;
    min-width: 0;
  }
  .pf-job__title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 3px;
    flex-wrap: wrap;
  }
  .pf-job__tool {
    font-weight: 700;
    font-size: 15.5px;
    color: hsl(var(--color-text));
  }
  .pf-job__id {
    font-size: 11.5px;
    color: hsl(var(--color-text-faint));
    font-weight: 600;
  }
  .pf-job__file {
    font-size: 13.5px;
    color: hsl(var(--color-text-muted));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pf-job__actions {
    display: flex;
    gap: 8px;
  }
  .pf-job__progress {
    margin-top: 16px;
  }
  .pf-job__progress-row {
    display: flex;
    justify-content: space-between;
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
    margin-bottom: 6px;
    font-weight: 600;
  }
  .pf-job__bar {
    height: 8px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-chip));
    overflow: hidden;
  }
  .pf-job__fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.3s;
  }
  .pf-job__result {
    margin-top: 12px;
    font-size: 13px;
    color: hsl(var(--color-text-faint));
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .pf-job__result--failed {
    color: hsl(var(--color-danger));
  }
</style>
