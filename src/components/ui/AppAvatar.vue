<script setup lang="ts">
  /**
   * AppAvatar — gradient initials badge.
   */
  import { computed } from 'vue'
  import { DEMO_USER } from '@constants'

  const props = withDefaults(
    defineProps<{
      size?: number
      initials?: string
    }>(),
    {
      size: 36,
      initials: DEMO_USER.initials,
    },
  )

  const style = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`,
    fontSize: `${props.size * 0.38}px`,
  }))
</script>

<template>
  <div class="pf-avatar" :style="style">{{ initials }}</div>
</template>

<style scoped>
  .pf-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, hsl(var(--color-indigo)), hsl(var(--color-navy)));
    color: #fff;
    font-weight: 700;
  }
</style>
