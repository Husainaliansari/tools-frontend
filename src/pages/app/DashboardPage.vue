<script setup lang="ts">
  /**
   * DashboardPage — authenticated home: welcome banner, stat tiles, quick
   * actions, recent files, storage and active jobs.
   */
  import { computed } from 'vue'
  import { useRouter, RouterLink } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import BaseBadge from '@components/ui/BaseBadge.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import ToolTileSlim from '@components/tools/ToolTileSlim.vue'
  import { DEMO_USER, MOCK_FILES, MOCK_JOBS, ROUTE_NAMES, getPopularTools } from '@constants'
  import { hexAlpha } from '@utils'

  const router = useRouter()

  const firstName = DEMO_USER.name.split(' ')[0]
  const quickActions = computed(() =>
    getPopularTools()
      .filter((t) => t.popular)
      .slice(0, 4),
  )
  const recentFiles = computed(() => MOCK_FILES.slice(0, 5))
  const activeJobs = computed(() => MOCK_JOBS.filter((j) => j.status === 'processing'))

  const stats = [
    {
      icon: 'file-text',
      label: 'Files processed',
      value: '1,284',
      note: '+12% this month',
      color: 'var(--color-primary)',
    },
    {
      icon: 'database',
      label: 'Storage used',
      value: '7.8 GB',
      note: 'of 10 GB',
      color: 'var(--color-indigo)',
    },
    {
      icon: 'download',
      label: 'Downloads',
      value: '426',
      note: 'this month',
      color: 'var(--color-success)',
    },
    {
      icon: 'activity',
      label: 'Active jobs',
      value: '2',
      note: 'running now',
      color: 'var(--color-warning)',
    },
  ]
</script>

<template>
  <div class="pf-dash animate-fade-up">
    <!-- Welcome -->
    <div class="pf-welcome">
      <div class="pf-welcome__orb" />
      <div class="pf-welcome__row">
        <div>
          <div class="pf-welcome__hi">Welcome back 👋</div>
          <h1 class="pf-welcome__title">{{ firstName }}, ready to work?</h1>
          <p class="pf-welcome__sub">
            You have 2 jobs running and 3 files ready to download. Jump back in below.
          </p>
        </div>
        <button
          type="button"
          class="pf-welcome__cta"
          @click="router.push({ name: ROUTE_NAMES.TOOLS })"
        >
          <BaseIcon name="plus" :size="18" /> New task
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="pf-stat-row">
      <BaseCard v-for="stat in stats" :key="stat.label">
        <div class="pf-stat-card">
          <div class="pf-stat-card__top">
            <div
              class="pf-stat-card__icon"
              :style="{ color: `hsl(${stat.color})`, background: `hsl(${stat.color} / 0.13)` }"
            >
              <BaseIcon :name="stat.icon" :size="21" />
            </div>
            <span class="pf-stat-card__trend"><BaseIcon name="trending-up" :size="18" /></span>
          </div>
          <div class="pf-stat-card__value">{{ stat.value }}</div>
          <div class="pf-stat-card__label">{{ stat.label }}</div>
          <div class="pf-stat-card__note">{{ stat.note }}</div>
        </div>
      </BaseCard>
    </div>

    <!-- Quick actions -->
    <div>
      <div class="pf-dash__section-title">Quick actions</div>
      <div class="pf-quick">
        <ToolTileSlim v-for="tool in quickActions" :key="tool.slug" :tool="tool" />
      </div>
    </div>

    <!-- Two column -->
    <div class="pf-dash__cols">
      <BaseCard>
        <div class="pf-panel">
          <div class="pf-panel__head">
            <div class="pf-panel__title">Recent files</div>
            <RouterLink :to="{ name: ROUTE_NAMES.FILES }" class="pf-panel__link"
              >View all</RouterLink
            >
          </div>
          <div class="pf-recent">
            <div v-for="file in recentFiles" :key="file.name" class="pf-recent__item">
              <div
                class="pf-recent__thumb"
                :style="{ color: file.color, background: hexAlpha(file.color, 0.14) }"
              >
                {{ file.type }}
              </div>
              <div class="pf-recent__meta">
                <div class="pf-recent__name">{{ file.name }}</div>
                <div class="pf-recent__sub">{{ file.size }} · {{ file.modified }}</div>
              </div>
              <BaseBadge tone="neutral">{{ file.tool }}</BaseBadge>
            </div>
          </div>
        </div>
      </BaseCard>

      <div class="pf-dash__side">
        <BaseCard>
          <div class="pf-panel">
            <div class="pf-panel__title pf-panel__title--mb">Storage</div>
            <div class="pf-progress">
              <div class="pf-progress__fill" style="width: 78%" />
            </div>
            <div class="pf-storage__row">
              <span>7.8 GB used</span>
              <span class="pf-storage__total">10 GB total</span>
            </div>
            <div class="pf-storage__btn">
              <BaseButton
                variant="secondary"
                size="sm"
                full
                @click="router.push({ name: ROUTE_NAMES.SETTINGS })"
              >
                Manage storage
              </BaseButton>
            </div>
          </div>
        </BaseCard>

        <BaseCard>
          <div class="pf-panel">
            <div class="pf-panel__head">
              <div class="pf-panel__title">Active jobs</div>
              <RouterLink :to="{ name: ROUTE_NAMES.JOBS }" class="pf-panel__link"
                >View all</RouterLink
              >
            </div>
            <div class="pf-jobs-mini">
              <div v-for="job in activeJobs" :key="job.id">
                <div class="pf-jobs-mini__row">
                  <span class="pf-jobs-mini__tool">{{ job.tool }}</span>
                  <span class="pf-jobs-mini__pct">{{ job.progress }}%</span>
                </div>
                <div class="pf-progress pf-progress--sm">
                  <div
                    class="pf-progress__fill"
                    :style="{ width: `${job.progress}%`, background: job.color }"
                  />
                </div>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .pf-dash {
    display: grid;
    gap: 22px;
  }

  .pf-welcome {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, hsl(var(--color-navy)), hsl(var(--color-indigo)));
    border-radius: 20px;
    padding: clamp(24px, 3vw, 34px);
    color: #fff;
  }
  .pf-welcome__orb {
    position: absolute;
    width: 260px;
    height: 260px;
    border-radius: var(--radius-full);
    background: rgb(255 255 255 / 0.08);
    top: -100px;
    right: -40px;
  }
  .pf-welcome__row {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: center;
    justify-content: space-between;
  }
  .pf-welcome__hi {
    font-size: 14px;
    opacity: 0.85;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .pf-welcome__title {
    font-size: clamp(24px, 3vw, 32px);
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
  }
  .pf-welcome__sub {
    font-size: 15px;
    opacity: 0.9;
    max-width: 440px;
    margin: 0;
  }
  .pf-welcome__cta {
    background: #fff;
    color: hsl(var(--color-navy));
    border: none;
    border-radius: var(--radius-lg);
    padding: 13px 22px;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 9px;
    transition: transform 0.15s;
  }
  .pf-welcome__cta:hover {
    transform: translateY(-2px);
  }

  .pf-stat-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 16px;
  }
  .pf-stat-card {
    padding: 20px;
  }
  .pf-stat-card__top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
  }
  .pf-stat-card__icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-stat-card__trend {
    color: hsl(var(--color-text-faint));
  }
  .pf-stat-card__value {
    font-size: 28px;
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .pf-stat-card__label {
    font-size: 13px;
    color: hsl(var(--color-text-muted));
    font-weight: 600;
    margin-top: 6px;
  }
  .pf-stat-card__note {
    font-size: 12px;
    color: hsl(var(--color-text-faint));
    margin-top: 2px;
  }

  .pf-dash__section-title {
    font-weight: 700;
    font-size: 16px;
    color: hsl(var(--color-text));
    margin-bottom: 14px;
  }
  .pf-quick {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 14px;
  }

  .pf-dash__cols {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 20px;
    align-items: start;
  }
  .pf-dash__side {
    display: grid;
    gap: 20px;
  }
  .pf-panel {
    padding: 22px;
  }
  .pf-panel__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .pf-panel__title {
    font-weight: 700;
    font-size: 16px;
    color: hsl(var(--color-text));
  }
  .pf-panel__title--mb {
    margin-bottom: 16px;
  }
  .pf-panel__link {
    color: hsl(var(--color-primary));
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
  }

  .pf-recent {
    display: grid;
    gap: 4px;
  }
  .pf-recent__item {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 10px;
    border-radius: var(--radius-lg);
    cursor: pointer;
  }
  .pf-recent__item:hover {
    background: hsl(var(--color-chip));
  }
  .pf-recent__thumb {
    width: 38px;
    height: 46px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    font-size: 9px;
    font-weight: 800;
  }
  .pf-recent__meta {
    flex: 1;
    min-width: 0;
  }
  .pf-recent__name {
    font-weight: 600;
    font-size: 14px;
    color: hsl(var(--color-text));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pf-recent__sub {
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
  }

  .pf-progress {
    position: relative;
    height: 10px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-chip));
    overflow: hidden;
    margin-bottom: 12px;
  }
  .pf-progress--sm {
    height: 7px;
    margin-bottom: 0;
  }
  .pf-progress__fill {
    height: 100%;
    border-radius: var(--radius-full);
    background: linear-gradient(90deg, hsl(var(--color-primary)), hsl(var(--color-indigo)));
    transition: width 0.3s;
  }
  .pf-storage__row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: hsl(var(--color-text-muted));
    font-weight: 600;
  }
  .pf-storage__total {
    color: hsl(var(--color-text-faint));
  }
  .pf-storage__btn {
    margin-top: 14px;
  }
  .pf-jobs-mini {
    display: grid;
    gap: 12px;
  }
  .pf-jobs-mini__row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin-bottom: 6px;
  }
  .pf-jobs-mini__tool {
    font-weight: 600;
    color: hsl(var(--color-text));
  }
  .pf-jobs-mini__pct {
    color: hsl(var(--color-text-faint));
  }

  @media (max-width: 899px) {
    .pf-dash__cols {
      grid-template-columns: 1fr;
    }
  }
</style>
