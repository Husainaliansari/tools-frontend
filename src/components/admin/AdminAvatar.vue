<script setup lang="ts">
  import { computed } from 'vue'

  const props = withDefaults(
    defineProps<{ name?: string; initials?: string; size?: number }>(),
    { size: 32 },
  )

  const text = computed(() => {
    if (props.initials) return props.initials
    if (!props.name) return '?'
    return props.name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase()
  })
</script>

<template>
  <div
    class="ad-avatar"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.38}px` }"
  >
    {{ text }}
  </div>
</template>

<style scoped>
  .ad-avatar {
    border-radius: 999px;
    background: linear-gradient(135deg, var(--ad-primary), var(--ad-purple));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    letter-spacing: 0.02em;
    flex: none;
  }
</style>
