<script setup lang="ts">
  import { computed } from 'vue'

  const props = withDefaults(
    defineProps<{ data: { m: string; v: number }[]; color?: string }>(),
    { color: 'var(--ad-primary)' },
  )

  const max = computed(() => Math.max(1, ...props.data.map((d) => d.v)))
</script>

<template>
  <div class="ad-bars">
    <div v-if="!data.length" class="ad-bars__empty">No data yet.</div>
    <div
      v-for="(d, i) in data"
      :key="i"
      class="ad-bars__col"
    >
      <div
        class="ad-bars__bar"
        :style="{
          height: `${Math.max(4, (d.v / max) * 140)}px`,
          background: color,
          animationDelay: `${i * 30}ms`,
        }"
        :title="`${d.m}: ${d.v}`"
      />
      <span class="ad-bars__label">{{ d.m }}</span>
    </div>
  </div>
</template>

<style scoped>
  .ad-bars {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 160px;
    padding: 0 4px;
  }
  .ad-bars__empty {
    color: var(--ad-text3);
    font-size: 13px;
    align-self: center;
    margin: auto;
  }
  .ad-bars__col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .ad-bars__bar {
    width: 100%;
    border-radius: 4px 4px 0 0;
    opacity: 0.62;
    transform-origin: bottom;
    transition: opacity 0.15s;
    animation: adBarGrow 0.5s ease-out both;
  }
  .ad-bars__bar:hover { opacity: 1; }
  .ad-bars__label {
    font-size: 10px;
    color: var(--ad-text3);
    white-space: nowrap;
  }
</style>
