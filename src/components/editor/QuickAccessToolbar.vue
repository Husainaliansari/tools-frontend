<script setup lang="ts">
/**
 * QuickAccessToolbar — MS Office / Foxit-style customizable top bar.
 * Allows users to pin frequently used actions and persists choices in localStorage.
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import BaseIcon from '@components/icons/BaseIcon.vue'
import { useEditor } from './useEditor'
import type { EditorAction } from './editor-tools'

const emit = defineEmits<{ action: [EditorAction]; toggleCollapse: [] }>()
const editor = useEditor()

export interface QatAction {
  id: string
  label: string
  icon: string
  shortcut?: string
  action?: EditorAction
  tool?: string
  isToggleCollapse?: boolean
}

const ALL_QAT_ACTIONS: QatAction[] = [
  { id: 'save', label: 'Save / Export PDF', icon: 'save', shortcut: 'Ctrl+S', action: 'export' },
  { id: 'undo', label: 'Undo', icon: 'undo', shortcut: 'Ctrl+Z', action: 'undo' },
  { id: 'redo', label: 'Redo', icon: 'redo', shortcut: 'Ctrl+Y', action: 'redo' },
  { id: 'print', label: 'Print', icon: 'printer', shortcut: 'Ctrl+P', action: 'print' },
  { id: 'find', label: 'Find & Replace', icon: 'find-replace', shortcut: 'Ctrl+F', action: 'find-replace' },
  { id: 'format-painter', label: 'Format Painter', icon: 'format-painter', shortcut: 'Ctrl+Shift+C', action: 'format-painter' },
  { id: 'select', label: 'Select Tool', icon: 'mouse-pointer', shortcut: 'V', tool: 'select' },
  { id: 'text', label: 'Text Box', icon: 'type', shortcut: 'T', tool: 'text' },
  { id: 'highlight', label: 'Highlight', icon: 'highlighter', shortcut: 'H', tool: 'highlight' },
  { id: 'collapse', label: 'Toggle Ribbon', icon: 'panel-top', shortcut: 'Ctrl+F1', isToggleCollapse: true },
]

const DEFAULT_PINNED = ['save', 'undo', 'redo', 'print', 'find', 'format-painter']
const pinnedIds = ref<string[]>(DEFAULT_PINNED)
const showDropdown = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  try {
    const stored = localStorage.getItem('pdf_editor_qat_pins')
    if (stored) {
      pinnedIds.value = JSON.parse(stored)
    }
  } catch {
    /* fallback to default */
  }
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

function handleClickOutside(e: MouseEvent): void {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    showDropdown.value = false
  }
}

watch(pinnedIds, (val) => {
  try {
    localStorage.setItem('pdf_editor_qat_pins', JSON.stringify(val))
  } catch {
    /* ignore */
  }
}, { deep: true })

function togglePin(id: string): void {
  if (pinnedIds.value.includes(id)) {
    pinnedIds.value = pinnedIds.value.filter((item) => item !== id)
  } else {
    pinnedIds.value.push(id)
  }
}

function handleQatClick(item: QatAction): void {
  if (item.isToggleCollapse) {
    emit('toggleCollapse')
    return
  }
  if (item.action === 'format-painter') {
    editor.toggleFormatPainter()
    return
  }
  if (item.tool) {
    editor.setTool(item.tool as any)
  } else if (item.action) {
    emit('action', item.action)
  }
}

function isDisabled(item: QatAction): boolean {
  if (item.action === 'undo') return !editor.canUndo.value
  if (item.action === 'redo') return !editor.canRedo.value
  return false
}

function isActive(item: QatAction): boolean {
  if (item.action === 'format-painter') return editor.formatPainterActive.value
  if (item.tool) return editor.activeTool.value === item.tool
  return false
}
</script>

<template>
  <div class="qat">
    <div class="qat__items">
      <template v-for="action in ALL_QAT_ACTIONS" :key="action.id">
        <button
          v-if="pinnedIds.includes(action.id)"
          type="button"
          class="qat__btn"
          :class="{ 'qat__btn--active': isActive(action) }"
          :disabled="isDisabled(action)"
          :title="action.shortcut ? `${action.label} (${action.shortcut})` : action.label"
          @click="handleQatClick(action)"
        >
          <BaseIcon :name="action.icon" :size="15" />
        </button>
      </template>

      <!-- Dropdown toggle to customize QAT -->
      <div ref="dropdownRef" class="qat__dropdown-wrap">
        <button
          type="button"
          class="qat__menu-btn"
          title="Customize Quick Access Toolbar"
          @click="showDropdown = !showDropdown"
        >
          <BaseIcon name="chevron-down" :size="12" />
        </button>

        <div v-if="showDropdown" class="qat__dropdown" role="menu">
          <div class="qat__dropdown-header">Customize Quick Access Toolbar</div>
          <label
            v-for="action in ALL_QAT_ACTIONS"
            :key="action.id"
            class="qat__dropdown-item"
          >
            <input
              type="checkbox"
              :checked="pinnedIds.includes(action.id)"
              @change="togglePin(action.id)"
            />
            <BaseIcon :name="action.icon" :size="14" class="qat__item-icon" />
            <span>{{ action.label }}</span>
            <span v-if="action.shortcut" class="qat__item-shortcut">{{ action.shortcut }}</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qat {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
}
.qat__items {
  display: flex;
  align-items: center;
  gap: 2px;
}
.qat__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 4px);
  background: transparent;
  color: hsl(var(--color-text-muted));
  cursor: pointer;
  transition: all 0.15s ease;
}
.qat__btn:hover:not(:disabled) {
  background: hsl(var(--color-chip));
  color: hsl(var(--color-text));
}
.qat__btn--active {
  background: hsl(var(--color-primary) / 0.15);
  color: hsl(var(--color-primary));
  border-color: hsl(var(--color-primary) / 0.3);
}
.qat__btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.qat__dropdown-wrap {
  position: relative;
  display: inline-flex;
}
.qat__menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 28px;
  border: none;
  background: transparent;
  color: hsl(var(--color-text-muted));
  cursor: pointer;
  border-radius: var(--radius-sm, 4px);
}
.qat__menu-btn:hover {
  background: hsl(var(--color-chip));
  color: hsl(var(--color-text));
}
.qat__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  margin-top: 4px;
  min-width: 230px;
  background: hsl(var(--color-surface));
  border: 1px solid hsl(var(--color-border));
  border-radius: var(--radius-md, 6px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  padding: 6px 0;
  font-size: 12.5px;
}
.qat__dropdown-header {
  padding: 6px 12px 4px;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: hsl(var(--color-text-muted));
  border-bottom: 1px solid hsl(var(--color-border));
  margin-bottom: 4px;
}
.qat__dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  color: hsl(var(--color-text));
  transition: background 0.15s ease;
}
.qat__dropdown-item:hover {
  background: hsl(var(--color-chip));
}
.qat__item-icon {
  color: hsl(var(--color-text-muted));
}
.qat__item-shortcut {
  margin-left: auto;
  font-size: 10.5px;
  color: hsl(var(--color-text-muted));
  font-weight: 600;
}
</style>
