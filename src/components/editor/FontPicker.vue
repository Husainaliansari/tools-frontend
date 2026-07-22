<script setup lang="ts">
/**
 * FontPicker — a searchable font-family combobox with live per-font previews.
 *
 * • Trigger shows the current family rendered in its own typeface.
 * • Popover (teleported to <body> so it escapes toolbar overflow clipping) has
 *   a search field and a scrollable list grouped into "Document fonts" (fonts
 *   actually used in the loaded PDF) and "System fonts" (a curated web-safe set).
 * • Keyboard: ↑/↓ move, Enter selects, Esc closes; type to filter.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseIcon from '@components/icons/BaseIcon.vue'

const props = defineProps<{
  modelValue: string
  /** Fonts detected in the document (rendered first, under a "Document" header). */
  documentFonts?: string[]
  /** Stretch the trigger to fill its container (sidebar use). */
  block?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

/** Curated web-safe / commonly-embedded families offered even when not in-doc. */
const SYSTEM_FONTS = [
  'Calibri', 'Aptos', 'Segoe UI', 'Arial', 'Helvetica', 'Verdana', 'Tahoma',
  'Trebuchet MS', 'Times New Roman', 'Georgia', 'Cambria', 'Garamond',
  'Palatino', 'Book Antiqua', 'Courier New', 'Consolas', 'Roboto', 'Open Sans',
  'Lato', 'Montserrat', 'Inter', 'Poppins', 'Merriweather', 'Comic Sans MS',
]

const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const btnEl = ref<HTMLElement | null>(null)
const popEl = ref<HTMLElement | null>(null)
const searchEl = ref<HTMLInputElement | null>(null)
const popStyle = ref<Record<string, string>>({})

interface Row { name: string; group: 'doc' | 'system' }

const rows = computed<Row[]>(() => {
  const doc = (props.documentFonts ?? []).filter(Boolean)
  const docLower = new Set(doc.map((f) => f.toLowerCase()))
  const system = SYSTEM_FONTS.filter((f) => !docLower.has(f.toLowerCase()))
  return [
    ...doc.map((name): Row => ({ name, group: 'doc' })),
    ...system.map((name): Row => ({ name, group: 'system' })),
  ]
})

const filtered = computed<Row[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((r) => r.name.toLowerCase().includes(q))
})

const firstSystemName = computed(() => filtered.value.find((r) => r.group === 'system')?.name)

function toggle(): void {
  if (open.value) {
    close()
    return
  }
  const r = btnEl.value?.getBoundingClientRect()
  if (r) {
    const width = Math.max(r.width, 240)
    const left = Math.min(r.left, globalThis.innerWidth - width - 8)
    popStyle.value = { top: `${r.bottom + 6}px`, left: `${Math.max(8, left)}px`, width: `${width}px` }
  }
  query.value = ''
  open.value = true
  const idx = filtered.value.findIndex((row) => row.name === props.modelValue)
  activeIndex.value = idx >= 0 ? idx : 0
  void nextTick(() => {
    searchEl.value?.focus()
    scrollActiveIntoView()
  })
}
function close(): void {
  open.value = false
}
function choose(name: string): void {
  emit('update:modelValue', name)
  close()
}

function scrollActiveIntoView(): void {
  const el = popEl.value?.querySelector<HTMLElement>(`[data-idx="${activeIndex.value}"]`)
  el?.scrollIntoView({ block: 'nearest' })
}
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(filtered.value.length - 1, activeIndex.value + 1)
    scrollActiveIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(0, activeIndex.value - 1)
    scrollActiveIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const row = filtered.value[activeIndex.value]
    if (row) choose(row.name)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}
watch(query, () => {
  activeIndex.value = 0
})

function onDocClick(e: MouseEvent): void {
  const t = e.target as Node
  if (!open.value) return
  if (btnEl.value?.contains(t) || popEl.value?.contains(t)) return
  close()
}
onMounted(() => {
  globalThis.document.addEventListener('click', onDocClick)
  globalThis.addEventListener('resize', close)
})
onBeforeUnmount(() => {
  globalThis.document.removeEventListener('click', onDocClick)
  globalThis.removeEventListener('resize', close)
})
</script>

<template>
  <div class="fp" :class="{ 'fp--block': block }">
    <button
      ref="btnEl"
      type="button"
      class="fp__trigger"
      :class="{ 'fp__trigger--open': open }"
      :title="`Font: ${modelValue}`"
      :aria-expanded="open"
      @click.stop="toggle"
    >
      <span class="fp__current" :style="{ fontFamily: `'${modelValue}', sans-serif` }">{{ modelValue }}</span>
      <BaseIcon name="chevron-down" :size="13" class="fp__caret" />
    </button>

    <Teleport to="body">
      <transition name="fp-pop">
        <div v-if="open" ref="popEl" class="fp__pop" :style="popStyle" role="listbox">
          <div class="fp__search">
            <BaseIcon name="search" :size="14" />
            <input
              ref="searchEl"
              v-model="query"
              type="text"
              class="fp__search-input"
              placeholder="Search fonts…"
              aria-label="Search fonts"
              @keydown="onKeydown"
            />
          </div>

          <div class="fp__list">
            <template v-for="(row, i) in filtered" :key="row.group + row.name">
              <div v-if="row.group === 'doc' && i === 0" class="fp__group">In this document</div>
              <div v-else-if="row.group === 'system' && row.name === firstSystemName" class="fp__group">System fonts</div>
              <button
                type="button"
                class="fp__opt"
                :class="{ 'fp__opt--active': i === activeIndex, 'fp__opt--selected': row.name === modelValue }"
                :data-idx="i"
                role="option"
                :aria-selected="row.name === modelValue"
                @mouseenter="activeIndex = i"
                @click="choose(row.name)"
              >
                <BaseIcon v-if="row.name === modelValue" name="check" :size="14" class="fp__tick" />
                <span v-else class="fp__tick-spacer" />
                <span class="fp__opt-name" :style="{ fontFamily: `'${row.name}', sans-serif` }">{{ row.name }}</span>
              </button>
            </template>
            <div v-if="!filtered.length" class="fp__empty">No fonts match “{{ query }}”.</div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fp {
  display: inline-flex;
  flex: none;
}
.fp--block {
  display: flex;
  flex: 1;
  min-width: 0;
}
.fp--block .fp__trigger {
  width: 100%;
}
.fp__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 150px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid hsl(var(--color-border));
  border-radius: var(--radius-md);
  background: hsl(var(--color-surface));
  color: hsl(var(--color-text));
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.fp__trigger:hover {
  border-color: hsl(var(--color-border-strong));
}
.fp__trigger--open {
  border-color: hsl(var(--color-primary));
  box-shadow: 0 0 0 2px hsl(var(--color-primary) / 0.15);
}
.fp__current {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-size: 12.5px;
  font-weight: 600;
}
.fp__caret {
  flex: none;
  color: hsl(var(--color-text-faint));
}

.fp__pop {
  position: fixed;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  min-width: 240px;
  max-height: 340px;
  background: hsl(var(--color-surface));
  border: 1px solid hsl(var(--color-border));
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.fp__search {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 11px;
  border-bottom: 1px solid hsl(var(--color-border));
  color: hsl(var(--color-text-faint));
}
.fp__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  outline: none;
  color: hsl(var(--color-text));
  font-size: 13px;
}
.fp__list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}
.fp__group {
  padding: 8px 10px 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--color-text-faint));
}
.fp__opt {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  color: hsl(var(--color-text));
  cursor: pointer;
  text-align: left;
}
.fp__opt--active {
  background: hsl(var(--color-chip));
}
.fp__opt--selected {
  color: hsl(var(--color-primary));
}
.fp__tick {
  flex: none;
  color: hsl(var(--color-primary));
}
.fp__tick-spacer {
  width: 14px;
  flex: none;
}
.fp__opt-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  line-height: 1.3;
}
.fp__empty {
  padding: 16px 12px;
  text-align: center;
  font-size: 12.5px;
  color: hsl(var(--color-text-faint));
}

.fp-pop-enter-active,
.fp-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.fp-pop-enter-from,
.fp-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
