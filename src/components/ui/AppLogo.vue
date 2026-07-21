<script setup lang="ts">
  /**
   * AppLogo — the PDFly wordmark. Links to the home route.
   */
  import { computed } from 'vue'
  import { RouterLink } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { ROUTE_NAMES } from '@constants'

  const props = withDefaults(
    defineProps<{
      size?: number
    }>(),
    { size: 32 },
  )

  const markStyle = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`,
  }))
  const wordStyle = computed(() => ({ fontSize: `${props.size * 0.62}px` }))
</script>

<template>
  <RouterLink :to="{ name: ROUTE_NAMES.HOME }" class="pf-logo" aria-label="PDFly home">
    <span class="pf-logo__mark" :style="markStyle">
      <BaseIcon name="file-text" :size="size * 0.55" />
    </span>
    <span class="pf-logo__word" :style="wordStyle">PDF<span class="pf-logo__accent">ly</span></span>
  </RouterLink>
</template>

<style scoped>
  .pf-logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
  }
  .pf-logo__mark {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-lg);
    background: linear-gradient(145deg, hsl(var(--color-primary)), hsl(var(--color-indigo)));
    color: #fff;
    box-shadow: 0 6px 16px -6px hsl(var(--color-indigo) / 0.6);
    flex: none;
  }
  .pf-logo__word {
    font-weight: 800;
    letter-spacing: -0.02em;
    color: hsl(var(--color-text));
  }
  .pf-logo__accent {
    color: hsl(var(--color-primary));
  }
</style>
