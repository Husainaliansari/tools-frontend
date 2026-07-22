<script setup lang="ts">
/**
 * EditorRibbon — Foxit / Acrobat / MS-Office-style tabbed ribbon.
 *
 * Layout
 *   ┌ Quick Access ┊ Home · Comment · Insert … ┊ [Text Format]      Collapse ┐
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │  ▢ ▢ ▢   ┊   ▢ ▢   ┊   ▢ ▢ ▢     …groups…            [ ⋯ More ]        │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * Key behaviours
 *   • Groups are cleanly separated with generous whitespace + dividers.
 *   • A hidden "ghost" row measures each group's natural width; a
 *     ResizeObserver then decides how many fit and folds the remainder into a
 *     single "More" overflow popover — so the ribbon never scrolls sideways on
 *     desktop and never shifts when switching tools.
 *   • Collapse toggle (Ctrl+F1) with session persistence.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseIcon from '@components/icons/BaseIcon.vue'
import QuickAccessToolbar from './QuickAccessToolbar.vue'
import RibbonGroup from './RibbonGroup.vue'
import { useEditor } from './useEditor'
import { RIBBON, type EditorAction, type RibbonItem } from './editor-tools'

const emit = defineEmits<{ action: [EditorAction] }>()
const editor = useEditor()
const activeTab = ref('home')

const isCollapsed = ref(globalThis.sessionStorage.getItem('pdf_editor_ribbon_collapsed') === 'true')

function toggleCollapse(): void {
  isCollapsed.value = !isCollapsed.value
  globalThis.sessionStorage.setItem('pdf_editor_ribbon_collapsed', String(isCollapsed.value))
}

function selectTab(id: string): void {
  activeTab.value = id
  showOverflow.value = false
  if (isCollapsed.value) {
    isCollapsed.value = false
    globalThis.sessionStorage.setItem('pdf_editor_ribbon_collapsed', 'false')
  }
}

const activeGroups = computed(() => RIBBON.find((t) => t.id === activeTab.value)?.groups ?? [])

// ─── Text Selection Context (drives the contextual badge) ────────────────────
const cEdit = computed(() => editor.selectedContentEdit.value)
const cDet = computed(() => editor.selectedDetected.value)
const cText = computed(() => {
  const e = cEdit.value
  if (e && e.kind === 'text') return e
  const d = cDet.value
  if (d && d.kind === 'text') return d
  return null
})
const isAnnoText = computed(() => editor.selected.value?.type === 'text')
const hasTextSelection = computed(
  () => !!cText.value || isAnnoText.value || editor.editMode.value === 'text' || editor.activeTool.value === 'text',
)

// ─── Responsive overflow ─────────────────────────────────────────────────────
const bodyEl = ref<HTMLElement | null>(null)
const ghostEl = ref<HTMLElement | null>(null)
const visibleCount = ref(999)
const showOverflow = ref(false)
const moreBtnEl = ref<HTMLElement | null>(null)
const popEl = ref<HTMLElement | null>(null)
const popStyle = ref<Record<string, string>>({})
let groupWidths: number[] = []
const MORE_RESERVE = 78 // width budget kept free for the "More" button
const GROUP_GAP = 4

const visibleGroups = computed(() => activeGroups.value.slice(0, visibleCount.value))
const overflowGroups = computed(() => activeGroups.value.slice(visibleCount.value))

function measure(): void {
  const ghost = ghostEl.value
  if (!ghost) return
  groupWidths = [...ghost.children].map((el) => (el as HTMLElement).offsetWidth)
  computeVisible()
}

function computeVisible(): void {
  const container = bodyEl.value
  if (!container || !groupWidths.length) return
  const avail = container.clientWidth
  const total = groupWidths.reduce((sum, w) => sum + w + GROUP_GAP, 0)
  if (total <= avail) {
    visibleCount.value = groupWidths.length
    return
  }
  let used = 0
  let count = 0
  for (const w of groupWidths) {
    if (used + w + GROUP_GAP + MORE_RESERVE <= avail) {
      used += w + GROUP_GAP
      count += 1
    } else break
  }
  visibleCount.value = Math.max(1, count)
}

let ro: ResizeObserver | null = null
function remeasureSoon(): void {
  visibleCount.value = 999 // reveal all so the ghost reflects the active tab
  void nextTick(() => globalThis.requestAnimationFrame(measure))
}

watch(activeTab, remeasureSoon)
watch(isCollapsed, (c) => {
  if (!c) remeasureSoon()
})

function toggleOverflow(): void {
  if (showOverflow.value) {
    showOverflow.value = false
    return
  }
  const r = moreBtnEl.value?.getBoundingClientRect()
  if (r) popStyle.value = { top: `${r.bottom + 6}px`, right: `${globalThis.innerWidth - r.right}px` }
  showOverflow.value = true
}
function onDocClick(e: MouseEvent): void {
  const t = e.target as Node
  if (!showOverflow.value) return
  if (moreBtnEl.value?.contains(t) || popEl.value?.contains(t)) return
  showOverflow.value = false
}
function closeOverflow(): void {
  showOverflow.value = false
}

onMounted(() => {
  remeasureSoon()
  if (bodyEl.value && 'ResizeObserver' in globalThis) {
    ro = new globalThis.ResizeObserver(() => {
      computeVisible()
      closeOverflow()
    })
    ro.observe(bodyEl.value)
  }
  globalThis.document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  globalThis.document.removeEventListener('click', onDocClick)
})

// ─── Item dispatch ───────────────────────────────────────────────────────────
function onItem(item: RibbonItem): void {
  if (item.soon) return
  showOverflow.value = false
  if (item.action === 'format-painter') return editor.toggleFormatPainter()
  if (item.action === 'clear-formatting') return editor.clearFormatting()
  if (item.tool) editor.setTool(item.tool)
  else if (item.action) emit('action', item.action)
}

function isActive(item: RibbonItem): boolean {
  if (item.action === 'format-painter') return editor.formatPainterActive.value
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
  if (a === 'duplicate' || a === 'copy' || a === 'cut') return !selCount
  if (a === 'paste') return !editor.clipboard.value.length && !editor.clipboardContentEdits.value.length
  if (a === 'bring-front' || a === 'send-back') return !editor.selectedIds.value.length
  if (a?.startsWith('align-')) return selCount < 2
  if (a?.startsWith('distribute-')) return selCount < 3
  if (a === 'delete-page') return editor.pageCount.value <= 1 || editor.docBusy.value
  if (a === 'rotate-left' || a === 'rotate-right' || a === 'insert-page' || a === 'duplicate-page') {
    return editor.docBusy.value
  }
  return false
}
</script>

<template>
  <div class="ribbon" :class="{ 'ribbon--collapsed': isCollapsed }">
    <!-- Header: Quick Access · Tabs · Collapse -->
    <div class="ribbon__header">
      <QuickAccessToolbar @action="emit('action', $event)" @toggle-collapse="toggleCollapse" />

      <span class="ribbon__hdiv" />

      <div class="ribbon__tabs" role="tablist" aria-label="Editor tools">
        <button
          v-for="tab in RIBBON"
          :key="tab.id"
          type="button"
          role="tab"
          class="ribbon__tab"
          :class="{ 'ribbon__tab--active': tab.id === activeTab }"
          :aria-selected="tab.id === activeTab"
          @click="selectTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <transition name="ribbon-badge">
        <span v-if="hasTextSelection" class="ribbon__badge" title="Text formatting tools are active">
          <BaseIcon name="type" :size="11" /> Text Format
        </span>
      </transition>

      <div class="ribbon__spacer" />

      <button
        type="button"
        class="ribbon__collapse"
        :title="isCollapsed ? 'Expand ribbon (Ctrl+F1)' : 'Collapse ribbon (Ctrl+F1)'"
        :aria-expanded="!isCollapsed"
        @click="toggleCollapse"
      >
        <BaseIcon :name="isCollapsed ? 'chevron-down' : 'chevron-up'" :size="14" />
        <span class="ribbon__collapse-label">{{ isCollapsed ? 'Expand' : 'Collapse' }}</span>
      </button>
    </div>

    <!-- Groups surface -->
    <div v-show="!isCollapsed" class="ribbon__surface">
      <!-- Hidden measurer: renders every group of the active tab at natural width -->
      <div ref="ghostEl" class="ribbon__groups ribbon__groups--ghost" aria-hidden="true">
        <div v-for="group in activeGroups" :key="group.label" class="ribbon__group">
          <RibbonGroup :group="group" :is-active="isActive" :is-disabled="isDisabled" />
        </div>
      </div>

      <!-- Visible groups -->
      <div ref="bodyEl" class="ribbon__groups">
        <div v-for="group in visibleGroups" :key="group.label" class="ribbon__group">
          <RibbonGroup :group="group" :is-active="isActive" :is-disabled="isDisabled" @select="onItem" />
        </div>

        <!-- Overflow "More" -->
        <div v-if="overflowGroups.length" class="ribbon__group ribbon__more">
          <button
            ref="moreBtnEl"
            type="button"
            class="ribbon__more-btn"
            :class="{ 'ribbon__more-btn--open': showOverflow }"
            :aria-expanded="showOverflow"
            title="More tools"
            @click.stop="toggleOverflow"
          >
            <BaseIcon name="dots" :size="19" />
            <span class="ribbon__more-label">More</span>
          </button>
          <div class="ribbon__group-footer">More</div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <transition name="ribbon-pop">
        <div v-if="showOverflow" ref="popEl" class="ribbon__pop" role="menu" :style="popStyle">
          <RibbonGroup
            v-for="group in overflowGroups"
            :key="group.label"
            :group="group"
            variant="stacked"
            :is-active="isActive"
            :is-disabled="isDisabled"
            @select="onItem"
          />
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.ribbon {
  background: hsl(var(--color-surface));
  border-bottom: 1px solid hsl(var(--color-border));
  flex: none;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.ribbon__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: hsl(var(--color-surface-muted));
  border-bottom: 1px solid hsl(var(--color-border));
}
.ribbon--collapsed .ribbon__header {
  border-bottom: none;
}
.ribbon__hdiv {
  width: 1px;
  height: 22px;
  background: hsl(var(--color-border));
  flex: none;
}
.ribbon__tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
  min-width: 0;
}
.ribbon__tabs::-webkit-scrollbar {
  display: none;
}
.ribbon__tab {
  position: relative;
  padding: 8px 14px;
  border: none;
  background: none;
  color: hsl(var(--color-text-muted));
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: color 0.15s ease, background 0.15s ease;
}
.ribbon__tab:hover {
  color: hsl(var(--color-text));
  background: hsl(var(--color-chip) / 0.7);
}
.ribbon__tab--active {
  color: hsl(var(--color-primary));
  font-weight: 700;
}
.ribbon__tab--active::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -5px;
  height: 2.5px;
  border-radius: var(--radius-full);
  background: hsl(var(--color-primary));
}
.ribbon__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: hsl(var(--color-primary) / 0.12);
  color: hsl(var(--color-primary));
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  flex: none;
}
.ribbon__spacer {
  flex: 1;
  min-width: 8px;
}
.ribbon__collapse {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid hsl(var(--color-border));
  border-radius: var(--radius-md);
  background: hsl(var(--color-surface));
  color: hsl(var(--color-text-muted));
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  flex: none;
  transition: all 0.15s ease;
}
.ribbon__collapse:hover {
  background: hsl(var(--color-chip));
  color: hsl(var(--color-text));
  border-color: hsl(var(--color-border-strong));
}

/* ── Groups surface ──────────────────────────────────────────────────────── */
.ribbon__surface {
  position: relative;
  background: hsl(var(--color-surface));
}
.ribbon__groups {
  display: flex;
  align-items: stretch;
  gap: 4px;
  padding: 10px 12px;
  overflow: hidden;
}
.ribbon__groups--ghost {
  position: absolute;
  top: 0;
  left: 0;
  visibility: hidden;
  pointer-events: none;
  overflow: hidden;
  max-width: 100%;
  width: max-content;
}
.ribbon__group {
  display: flex;
  align-items: center;
  padding: 0 12px;
  flex: none;
}
.ribbon__group + .ribbon__group,
.ribbon__more {
  border-left: 1px solid hsl(var(--color-border) / 0.75);
}

/* ── Overflow "More" ─────────────────────────────────────────────────────── */
.ribbon__more {
  flex-direction: column;
  justify-content: flex-start;
  gap: 6px;
  padding-top: 8px;
}
.ribbon__more-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 60px;
  padding: 8px 6px 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: none;
  color: hsl(var(--color-text-muted));
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ribbon__more-btn:hover,
.ribbon__more-btn--open {
  background: hsl(var(--color-chip));
  color: hsl(var(--color-text));
}
.ribbon__group-footer {
  font-size: 9.5px;
  font-weight: 700;
  color: hsl(var(--color-text-faint));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.ribbon__pop {
  position: fixed;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 240px;
  max-width: 360px;
  padding: 14px;
  background: hsl(var(--color-surface));
  border: 1px solid hsl(var(--color-border));
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.ribbon__pop > * + * {
  padding-top: 10px;
  border-top: 1px solid hsl(var(--color-border) / 0.6);
}

/* ── Transitions ─────────────────────────────────────────────────────────── */
.ribbon-pop-enter-active,
.ribbon-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.ribbon-pop-enter-from,
.ribbon-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.ribbon-badge-enter-active,
.ribbon-badge-leave-active {
  transition: opacity 0.15s ease;
}
.ribbon-badge-enter-from,
.ribbon-badge-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .ribbon__collapse-label {
    display: none;
  }
  .ribbon__tab {
    padding: 7px 11px;
    font-size: 12.5px;
  }
}
</style>
