<script setup lang="ts">
/**
 * FontSizeField — an editable font-size combobox (Office/Acrobat style).
 *
 * • Type any value directly into the input (committed on Enter/blur, clamped).
 * • ↑/↓ arrow keys nudge by 1.
 * • A caret opens a preset list (teleported so it escapes toolbar clipping).
 * • Optional A⁺ / A⁻ stepper buttons for coarse one-click changes.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseIcon from '@components/icons/BaseIcon.vue'

const props = withDefaults(
  defineProps<{ modelValue: number; min?: number; max?: number }>(),
  { min: 4, max: 288 },
)
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const PRESETS = [6, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96]

const draft = ref(String(props.modelValue))
watch(() => props.modelValue, (v) => { draft.value = String(v) })

const open = ref(false)
const wrapEl = ref<HTMLElement | null>(null)
const popEl = ref<HTMLElement | null>(null)
const popStyle = ref<Record<string, string>>({})

function commit(raw: string): void {
  const n = Math.round(Number.parseFloat(raw))
  if (Number.isFinite(n)) {
    const clamped = Math.max(props.min, Math.min(props.max, n))
    emit('update:modelValue', clamped)
    draft.value = String(clamped)
  } else {
    draft.value = String(props.modelValue)
  }
}
function nudge(delta: number): void {
  emit('update:modelValue', Math.max(props.min, Math.min(props.max, props.modelValue + delta)))
}
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') { e.preventDefault(); commit(draft.value); (e.target as HTMLInputElement).blur() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); nudge(1) }
  else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-1) }
  else if (e.key === 'Escape') { draft.value = String(props.modelValue); (e.target as HTMLInputElement).blur() }
}

function toggle(): void {
  if (open.value) { open.value = false; return }
  const r = wrapEl.value?.getBoundingClientRect()
  if (r) popStyle.value = { top: `${r.bottom + 6}px`, left: `${r.left}px`, minWidth: `${r.width}px` }
  open.value = true
}
function pick(v: number): void {
  emit('update:modelValue', v)
  open.value = false
}
function onDocClick(e: MouseEvent): void {
  const t = e.target as Node
  if (!open.value) return
  if (wrapEl.value?.contains(t) || popEl.value?.contains(t)) return
  open.value = false
}
onMounted(() => {
  globalThis.document.addEventListener('click', onDocClick)
  globalThis.addEventListener('resize', () => { open.value = false })
})
onBeforeUnmount(() => globalThis.document.removeEventListener('click', onDocClick))
void nextTick
</script>

<template>
  <div class="fs">
    <div ref="wrapEl" class="fs__box" :class="{ 'fs__box--open': open }">
      <input
        v-model="draft"
        type="text"
        inputmode="numeric"
        class="fs__input"
        aria-label="Font size"
        title="Font size — type a value or pick a preset"
        @keydown="onKeydown"
        @blur="commit(draft)"
      />
      <button type="button" class="fs__caret" aria-label="Font size presets" @click.stop="toggle">
        <BaseIcon name="chevron-down" :size="12" />
      </button>
    </div>
    <div class="fs__steppers">
      <button type="button" class="fs__step" title="Increase font size" @click="nudge(1)">A⁺</button>
      <button type="button" class="fs__step" title="Decrease font size" @click="nudge(-1)">A⁻</button>
    </div>

    <Teleport to="body">
      <transition name="fs-pop">
        <div v-if="open" ref="popEl" class="fs__pop" :style="popStyle" role="listbox">
          <button
            v-for="p in PRESETS"
            :key="p"
            type="button"
            class="fs__opt"
            :class="{ 'fs__opt--selected': p === modelValue }"
            role="option"
            :aria-selected="p === modelValue"
            @click="pick(p)"
          >{{ p }}</button>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fs { display: inline-flex; align-items: center; gap: 4px; flex: none; }
.fs__box {
  display: inline-flex;
  align-items: center;
  height: 30px;
  border: 1px solid hsl(var(--color-border));
  border-radius: var(--radius-md);
  background: hsl(var(--color-surface));
  overflow: hidden;
}
.fs__box:hover { border-color: hsl(var(--color-border-strong)); }
.fs__box--open, .fs__box:focus-within {
  border-color: hsl(var(--color-primary));
  box-shadow: 0 0 0 2px hsl(var(--color-primary) / 0.15);
}
.fs__input {
  width: 34px;
  height: 100%;
  padding: 0 0 0 8px;
  border: none;
  background: none;
  outline: none;
  color: hsl(var(--color-text));
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
}
.fs__input::-webkit-outer-spin-button,
.fs__input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.fs__caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 100%;
  border: none;
  border-left: 1px solid hsl(var(--color-border));
  background: none;
  color: hsl(var(--color-text-faint));
  cursor: pointer;
}
.fs__caret:hover { background: hsl(var(--color-chip)); color: hsl(var(--color-text)); }

.fs__steppers {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid hsl(var(--color-border));
  border-radius: var(--radius-md);
  background: hsl(var(--color-surface));
}
.fs__step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: hsl(var(--color-text-muted));
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}
.fs__step:hover { background: hsl(var(--color-chip)); color: hsl(var(--color-text)); }

.fs__pop {
  position: fixed;
  z-index: 3000;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  max-height: 260px;
  overflow-y: auto;
  padding: 5px;
  background: hsl(var(--color-surface));
  border: 1px solid hsl(var(--color-border));
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}
.fs__opt {
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: hsl(var(--color-text));
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}
.fs__opt:hover { background: hsl(var(--color-chip)); }
.fs__opt--selected { background: hsl(var(--color-primary) / 0.14); color: hsl(var(--color-primary)); }

.fs-pop-enter-active, .fs-pop-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.fs-pop-enter-from, .fs-pop-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
