<script setup lang="ts">
  /**
   * NotifBell — topbar notifications dropdown.
   */
  import { ref } from 'vue'
  import { onClickOutside } from '@vueuse/core'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { MOCK_NOTIFICATIONS } from '@constants'
  import { hexAlpha } from '@utils'

  const open = ref(false)
  const root = ref<HTMLElement | null>(null)
  onClickOutside(root, () => (open.value = false))
</script>

<template>
  <div ref="root" class="pf-bell">
    <button type="button" class="pf-bell__btn" aria-label="Notifications" @click="open = !open">
      <BaseIcon name="bell" :size="18" />
      <span class="pf-bell__dot" />
    </button>

    <div v-if="open" class="pf-bell__panel animate-fade-up">
      <div class="pf-bell__head">
        <span class="pf-bell__title">Notifications</span>
        <span class="pf-bell__mark">Mark all read</span>
      </div>
      <div
        v-for="(n, i) in MOCK_NOTIFICATIONS"
        :key="i"
        class="pf-bell__item"
        :class="{ 'pf-bell__item--last': i === MOCK_NOTIFICATIONS.length - 1 }"
      >
        <span
          class="pf-bell__icon"
          :style="{ color: n.color, background: hexAlpha(n.color, 0.14) }"
        >
          <BaseIcon :name="n.icon" :size="17" />
        </span>
        <div class="pf-bell__text">
          <div class="pf-bell__item-title">{{ n.title }}</div>
          <div class="pf-bell__desc">{{ n.description }}</div>
          <div class="pf-bell__time">{{ n.time }} ago</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .pf-bell {
    position: relative;
  }
  .pf-bell__btn {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    transition: all 0.15s;
  }
  .pf-bell__btn:hover {
    color: hsl(var(--color-text));
  }
  .pf-bell__dot {
    position: absolute;
    top: 8px;
    right: 9px;
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-danger));
    border: 2px solid hsl(var(--color-surface));
  }
  .pf-bell__panel {
    position: absolute;
    right: 0;
    top: 48px;
    width: 320px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-dropdown);
    overflow: hidden;
  }
  .pf-bell__head {
    padding: 14px 16px;
    border-bottom: 1px solid hsl(var(--color-border));
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .pf-bell__title {
    font-weight: 700;
    color: hsl(var(--color-text));
  }
  .pf-bell__mark {
    font-size: 12px;
    color: hsl(var(--color-primary));
    font-weight: 600;
    cursor: pointer;
  }
  .pf-bell__item {
    display: flex;
    gap: 12px;
    padding: 13px 16px;
    border-bottom: 1px solid hsl(var(--color-border));
    cursor: pointer;
  }
  .pf-bell__item--last {
    border-bottom: none;
  }
  .pf-bell__item:hover {
    background: hsl(var(--color-chip));
  }
  .pf-bell__icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .pf-bell__text {
    min-width: 0;
  }
  .pf-bell__item-title {
    font-weight: 700;
    font-size: 13.5px;
    color: hsl(var(--color-text));
  }
  .pf-bell__desc {
    font-size: 12.5px;
    color: hsl(var(--color-text-muted));
    line-height: 1.4;
  }
  .pf-bell__time {
    font-size: 11.5px;
    color: hsl(var(--color-text-faint));
    margin-top: 3px;
  }
</style>
