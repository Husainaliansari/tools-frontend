<script setup lang="ts">
  withDefaults(defineProps<{ pad?: boolean }>(), { pad: false })
</script>

<template>
  <div class="ad-card" :class="{ 'ad-card--pad': pad }">
    <slot />
  </div>
</template>

<style scoped>
  .ad-card--pad { padding: 20px; }
</style>
