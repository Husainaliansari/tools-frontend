<script setup lang="ts">
  /**
   * ContextMenu — a teleported right-click menu.
   *
   * Purely presentational: callers pass positioned `items` and listen for
   * `pick`. Closes on outside pointer-down, Escape, scroll or resize.
   */
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'

  export interface MenuItem {
    id: string
    label: string
    icon?: string
    danger?: boolean
    disabled?: boolean
    /** Draw a separator above this item. */
    divider?: boolean
  }

  const props = defineProps<{ x: number; y: number; items: MenuItem[] }>()
  const emit = defineEmits<{ pick: [string]; close: [] }>()

  const menuEl = ref<HTMLDivElement | null>(null)
  const placed = ref({ x: props.x, y: props.y })

  const style = computed(() => ({ left: `${placed.value.x}px`, top: `${placed.value.y}px` }))

  function onPick(item: MenuItem): void {
    if (item.disabled) return
    emit('pick', item.id)
    emit('close')
  }

  function onGlobalDown(event: PointerEvent): void {
    if (!menuEl.value?.contains(event.target as Node)) emit('close')
  }
  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') emit('close')
  }
  function onDismiss(): void {
    emit('close')
  }

  onMounted(() => {
    // Clamp inside the viewport once we know the rendered size.
    globalThis.requestAnimationFrame(() => {
      const rect = menuEl.value?.getBoundingClientRect()
      if (!rect) return
      placed.value = {
        x: Math.min(props.x, globalThis.innerWidth - rect.width - 8),
        y: Math.min(props.y, globalThis.innerHeight - rect.height - 8),
      }
    })
    globalThis.addEventListener('pointerdown', onGlobalDown, true)
    globalThis.addEventListener('keydown', onKey, true)
    globalThis.addEventListener('resize', onDismiss)
    globalThis.addEventListener('wheel', onDismiss, { passive: true })
  })
  onBeforeUnmount(() => {
    globalThis.removeEventListener('pointerdown', onGlobalDown, true)
    globalThis.removeEventListener('keydown', onKey, true)
    globalThis.removeEventListener('resize', onDismiss)
    globalThis.removeEventListener('wheel', onDismiss)
  })
</script>

<template>
  <Teleport to="body">
    <div ref="menuEl" class="cm" :style="style" role="menu" @contextmenu.prevent>
      <template v-for="item in items" :key="item.id">
        <div v-if="item.divider" class="cm__sep" />
        <button
          type="button"
          role="menuitem"
          class="cm__item"
          :class="{ 'cm__item--danger': item.danger }"
          :disabled="item.disabled"
          @pointerdown.stop
          @click="onPick(item)"
        >
          <BaseIcon v-if="item.icon" :name="item.icon" :size="14" class="cm__icon" />
          <span v-else class="cm__icon" />
          {{ item.label }}
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
  .cm {
    position: fixed;
    z-index: calc(var(--z-modal) + 5);
    min-width: 190px;
    padding: 5px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    animation: cm-in 0.1s ease;
  }
  @keyframes cm-in {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }
  .cm__item {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 7px 10px;
    border: none;
    border-radius: var(--radius-md);
    background: none;
    color: hsl(var(--color-text));
    font-size: 12.5px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  .cm__item:hover:not(:disabled) {
    background: hsl(var(--color-chip));
  }
  .cm__item:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .cm__item--danger {
    color: hsl(var(--color-danger));
  }
  .cm__item--danger:hover:not(:disabled) {
    background: hsl(var(--color-danger) / 0.08);
  }
  .cm__icon {
    width: 14px;
    flex: none;
    color: hsl(var(--color-text-muted));
  }
  .cm__item--danger .cm__icon {
    color: hsl(var(--color-danger));
  }
  .cm__sep {
    height: 1px;
    margin: 4px 8px;
    background: hsl(var(--color-border));
  }
</style>
