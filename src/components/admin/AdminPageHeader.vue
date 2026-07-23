<script setup lang="ts">
  defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="ad-page-header">
    <div>
      <h1 class="ad-h1">{{ title }}</h1>
      <p v-if="subtitle" class="ad-sub">{{ subtitle }}</p>
    </div>
    <div class="ad-page-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
  .ad-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .ad-page-header__actions { display: flex; gap: 8px; align-items: center; }
</style>
