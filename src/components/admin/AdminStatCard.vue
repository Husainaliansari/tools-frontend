<script setup lang="ts">
  import AdminCard from './AdminCard.vue'
  import AdminIcon from './AdminIcon.vue'
  import AdminSparkline from './AdminSparkline.vue'

  withDefaults(
    defineProps<{
      label: string
      value: string | number
      change?: string
      up?: boolean
      icon?: string
      color?: string
      spark?: number[]
    }>(),
    { up: true, color: 'var(--ad-primary)' },
  )
</script>

<template>
  <AdminCard>
    <div class="ad-stat">
      <div class="ad-stat__body">
        <div class="ad-stat__head">
          <div
            v-if="icon"
            class="ad-stat__icon"
            :style="{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }"
          >
            <AdminIcon :name="icon" :size="14" />
          </div>
          <span class="ad-stat__label">{{ label }}</span>
        </div>
        <div class="ad-stat__value">{{ value }}</div>
        <div
          v-if="change"
          class="ad-stat__change"
          :style="{ color: up ? 'var(--ad-success)' : 'var(--ad-warning)' }"
        >
          <AdminIcon :name="up ? 'trending-up' : 'alert-circle'" :size="13" />
          {{ change }}
        </div>
      </div>
      <div v-if="spark" class="ad-stat__spark">
        <AdminSparkline :data="spark" :color="color" />
      </div>
    </div>
  </AdminCard>
</template>

<style scoped>
  .ad-stat { padding: 16px 18px; display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .ad-stat__head { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; }
  .ad-stat__icon { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; }
  .ad-stat__label { font-size: 12px; font-weight: 500; color: var(--ad-text3); }
  .ad-stat__value { font-size: 22px; font-weight: 800; color: var(--ad-text); letter-spacing: -0.02em; line-height: 1; }
  .ad-stat__change { display: flex; align-items: center; gap: 4px; margin-top: 8px; font-size: 12px; font-weight: 600; }
  .ad-stat__spark { padding-top: 12px; }
</style>
