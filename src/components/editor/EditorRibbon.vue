<script setup lang="ts">
  /**
   * EditorRibbon — the Foxit-style tabbed toolbar (Home / Comment / Edit /
   * Protect). Tab switches are local; tool buttons drive the editor's active
   * tool; action buttons bubble up to the shell via `action`.
   */
  import { ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { useEditor } from './useEditor'
  import { RIBBON, type EditorAction, type RibbonItem } from './editor-tools'

  const emit = defineEmits<{ action: [EditorAction] }>()
  const editor = useEditor()
  const activeTab = ref('home')

  function onItem(item: RibbonItem): void {
    if (item.soon) return
    if (item.tool) {
      editor.setTool(item.tool)
    } else if (item.action) emit('action', item.action)
  }

  function isActive(item: RibbonItem): boolean {
    if (item.mode) return editor.editMode.value === item.mode
    return !!item.tool && editor.activeTool.value === item.tool
  }
  function isDisabled(item: RibbonItem): boolean {
    if (item.soon) return true
    const a = item.action
    if (a === 'edit-done') return editor.editMode.value === 'none'
    const selCount = editor.selectedIds.value.length + editor.selectedContentIds.value.length
    if (a === 'undo') return !editor.canUndo.value
    if (a === 'redo') return !editor.canRedo.value
    if (a === 'duplicate' || a === 'copy') return !selCount
    if (a === 'paste') return !editor.clipboard.value.length
    if (a === 'bring-front' || a === 'send-back') return !editor.selectedIds.value.length
    if (a?.startsWith('align-')) return selCount < 2
    if (a?.startsWith('distribute-')) return selCount < 3
    if (a === 'delete-page') return editor.pageCount.value <= 1 || editor.docBusy.value
    if (
      a === 'rotate-left' ||
      a === 'rotate-right' ||
      a === 'insert-page' ||
      a === 'duplicate-page'
    ) {
      return editor.docBusy.value
    }
    return false
  }
</script>

<template>
  <div class="ribbon">
    <!-- Tabs -->
    <div class="ribbon__tabs" role="tablist">
      <button
        v-for="tab in RIBBON"
        :key="tab.id"
        type="button"
        role="tab"
        class="ribbon__tab"
        :class="{ 'ribbon__tab--active': tab.id === activeTab }"
        :aria-selected="tab.id === activeTab"
        @click="activeTab = tab.id"
      >
        <BaseIcon :name="tab.icon" :size="15" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Active tab's groups -->
    <div v-for="tab in RIBBON" v-show="tab.id === activeTab" :key="tab.id" class="ribbon__groups">
      <div v-for="group in tab.groups" :key="group.label" class="ribbon__group">
        <div class="ribbon__items">
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="ribbon__btn"
            :class="{ 'ribbon__btn--active': isActive(item), 'ribbon__btn--soon': item.soon }"
            :disabled="isDisabled(item)"
            :title="item.soon ? `${item.label} — coming soon` : item.label"
            @click="onItem(item)"
          >
            <BaseIcon :name="item.icon" :size="19" />
            <span class="ribbon__label">{{ item.label }}</span>
          </button>
        </div>
        <div class="ribbon__group-label">{{ group.label }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .ribbon {
    background: hsl(var(--color-surface));
    border-bottom: 1px solid hsl(var(--color-border));
    flex: none;
  }
  .ribbon__tabs {
    display: flex;
    gap: 2px;
    padding: 6px 10px 0;
  }
  .ribbon__tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 16px;
    border: none;
    background: none;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    color: hsl(var(--color-text-muted));
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .ribbon__tab:hover {
    color: hsl(var(--color-text));
    background: hsl(var(--color-chip));
  }
  .ribbon__tab--active {
    color: hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.1);
  }
  .ribbon__groups {
    display: flex;
    gap: 4px;
    padding: 10px 12px;
    overflow-x: auto;
  }
  .ribbon__group {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 0 12px;
    border-right: 1px solid hsl(var(--color-border));
  }
  .ribbon__group:last-child {
    border-right: none;
  }
  .ribbon__items {
    display: flex;
    gap: 3px;
    flex: 1;
    align-items: stretch;
  }
  .ribbon__btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 60px;
    padding: 7px 9px;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    background: none;
    color: hsl(var(--color-text-muted));
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
  }
  .ribbon__btn:hover:not(:disabled) {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .ribbon__btn--active {
    background: hsl(var(--color-primary) / 0.12);
    border-color: hsl(var(--color-primary) / 0.35);
    color: hsl(var(--color-primary));
  }
  .ribbon__btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .ribbon__btn--soon {
    opacity: 0.45;
  }
  .ribbon__label {
    white-space: nowrap;
  }
  .ribbon__group-label {
    text-align: center;
    font-size: 10.5px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  @media (max-width: 760px) {
    .ribbon__label,
    .ribbon__group-label {
      display: none;
    }
    .ribbon__btn {
      min-width: 40px;
    }
  }
</style>
