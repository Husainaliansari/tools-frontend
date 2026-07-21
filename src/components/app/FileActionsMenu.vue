<script setup lang="ts">
  /**
   * FileActionsMenu — the "⋯" dropdown for a file row/card.
   */
  import { ref } from 'vue'
  import { onClickOutside } from '@vueuse/core'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { useFeedback } from '@composables'

  const { showToast, confirm } = useFeedback()

  const open = ref(false)
  const root = ref<HTMLElement | null>(null)
  onClickOutside(root, () => (open.value = false))

  const actions = [
    { label: 'Download', icon: 'download', run: () => showToast('Download started') },
    { label: 'Rename', icon: 'edit', run: () => showToast('Rename dialog') },
    { label: 'Share', icon: 'globe', run: () => showToast('Link copied') },
    {
      label: 'Delete',
      icon: 'trash',
      danger: true,
      run: () =>
        confirm({
          title: 'Delete file?',
          body: 'This file will be permanently removed. This action cannot be undone.',
          toast: 'File deleted',
        }),
    },
  ]

  function pick(run: () => void) {
    open.value = false
    run()
  }
</script>

<template>
  <div ref="root" class="pf-fmenu">
    <button
      type="button"
      class="pf-fmenu__btn"
      aria-label="File actions"
      @click.stop="open = !open"
    >
      <BaseIcon name="dots" :size="18" />
    </button>
    <div v-if="open" class="pf-fmenu__panel animate-fade-up">
      <button
        v-for="action in actions"
        :key="action.label"
        type="button"
        class="pf-fmenu__item"
        :class="{ 'pf-fmenu__item--danger': action.danger }"
        @click.stop="pick(action.run)"
      >
        <BaseIcon :name="action.icon" :size="16" />
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
  .pf-fmenu {
    position: relative;
  }
  .pf-fmenu__btn {
    background: none;
    border: none;
    color: hsl(var(--color-text-faint));
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    display: flex;
  }
  .pf-fmenu__btn:hover {
    color: hsl(var(--color-text));
    background: hsl(var(--color-chip));
  }
  .pf-fmenu__panel {
    position: absolute;
    right: 0;
    top: 34px;
    width: 170px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-dropdown);
    overflow: hidden;
  }
  .pf-fmenu__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    font-size: 13.5px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    background: none;
    border: none;
    text-align: left;
  }
  .pf-fmenu__item:hover {
    background: hsl(var(--color-chip));
  }
  .pf-fmenu__item--danger {
    color: hsl(var(--color-danger));
  }
</style>
