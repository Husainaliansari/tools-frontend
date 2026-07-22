<script setup lang="ts">
  /**
   * BaseColorPicker — a professional popover color picker.
   * Supports HEX, RGB, HSL modes, manual input fields, opacity slider/entry,
   * recent colors, preset palette swatches, and a native color wheel.
   *
   * @example
   * <BaseColorPicker v-model="color" v-model:opacity="opacity" label="Text color" :show-opacity="true" />
   */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseIcon from '@components/icons/BaseIcon.vue'
import NumberStepper from './NumberStepper.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    opacity?: number
    label?: string
    showOpacity?: boolean
    presets?: readonly string[]
    swatchOnly?: boolean
  }>(),
  {
    opacity: 1,
    label: 'Color',
    showOpacity: false,
    presets: () => [
      '#000000', '#1f2937', '#4b5563', '#9ca3af', '#e5e7eb', '#ffffff',
      '#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#0d9488', '#2563eb',
      '#4f46e5', '#7c3aed', '#c026d3', '#db2777',
    ],
    swatchOnly: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:opacity': [value: number]
}>()

const isOpen = ref(false)
const rootEl = ref<HTMLDivElement | null>(null)
const popoverEl = ref<HTMLDivElement | null>(null)
const colorMode = ref<'hex' | 'rgb' | 'hsl'>('hex')
const popoverStyle = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })

// Recent colors stored in localStorage
const RECENT_KEY = 'pdf_editor_recent_colors'
const recentColors = ref<string[]>([])

function loadRecentColors(): void {
  try {
    const stored = globalThis.localStorage.getItem(RECENT_KEY)
    if (stored) recentColors.value = JSON.parse(stored)
  } catch {
    recentColors.value = ['#1f2937', '#dc2626', '#2563eb', '#16a34a', '#7c3aed']
  }
}

function addRecentColor(color: string): void {
  const norm = color.toLowerCase()
  const list = recentColors.value.filter((c) => c.toLowerCase() !== norm)
  list.unshift(norm)
  recentColors.value = list.slice(0, 10)
  try {
    globalThis.localStorage.setItem(RECENT_KEY, JSON.stringify(recentColors.value))
  } catch {
    // ignore storage errors
  }
}

function updatePosition(): void {
  if (!rootEl.value) return
  const rect = rootEl.value.getBoundingClientRect()
  const popoverWidth = 260
  let top = rect.bottom + 6
  let left = rect.left

  if (left + popoverWidth > globalThis.innerWidth - 12) {
    left = Math.max(12, globalThis.innerWidth - popoverWidth - 12)
  }

  const popoverHeight = popoverEl.value?.offsetHeight || 340
  if (top + popoverHeight > globalThis.innerHeight - 12 && rect.top - popoverHeight > 12) {
    top = rect.top - popoverHeight - 6
  }

  popoverStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
  }
}

function toggleOpen(): void {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      updatePosition()
    })
  }
}

function handleClickOutside(event: PointerEvent | MouseEvent): void {
  if (!isOpen.value) return
  const target = event.target as Node
  if (
    rootEl.value && !rootEl.value.contains(target) &&
    popoverEl.value && !popoverEl.value.contains(target)
  ) {
    isOpen.value = false
  }
}

function handleScrollOrResize(): void {
  if (isOpen.value) {
    updatePosition()
  }
}

watch(isOpen, (newVal) => {
  if (newVal) {
    nextTick(() => {
      updatePosition()
    })
  }
})

onMounted(() => {
  loadRecentColors()
  globalThis.document.addEventListener('pointerdown', handleClickOutside, true)
  globalThis.addEventListener('scroll', handleScrollOrResize, true)
  globalThis.addEventListener('resize', handleScrollOrResize)
})

onBeforeUnmount(() => {
  globalThis.document.removeEventListener('pointerdown', handleClickOutside, true)
  globalThis.removeEventListener('scroll', handleScrollOrResize, true)
  globalThis.removeEventListener('resize', handleScrollOrResize)
})

  // ─── Color Parsing & Conversion ──────────────────────────────────────────
  function parseToRgb(color: string): { r: number; g: number; b: number } {
    let hex = color.replace('#', '').trim()
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('')
    }
    const num = parseInt(hex, 16)
    if (isNaN(num)) return { r: 0, g: 0, b: 0 }
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
  }

  function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rNorm = r / 255
    const gNorm = g / 255
    const bNorm = b / 255
    const max = Math.max(rNorm, gNorm, bNorm)
    const min = Math.min(rNorm, gNorm, bNorm)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case rNorm:
          h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)
          break
        case gNorm:
          h = (bNorm - rNorm) / d + 2
          break
        case bNorm:
          h = (rNorm - gNorm) / d + 4
          break
      }
      h /= 6
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    }
  }

  function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const hNorm = h / 360
    const sNorm = s / 100
    const lNorm = l / 100

    if (sNorm === 0) {
      const val = Math.round(lNorm * 255)
      return { r: val, g: val, b: val }
    }

    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm
    const p = 2 * lNorm - q

    const hue2rgb = (t: number) => {
      let temp = t
      if (temp < 0) temp += 1
      if (temp > 1) temp -= 1
      if (temp < 1 / 6) return p + (q - p) * 6 * temp
      if (temp < 1 / 2) return q
      if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6
      return p
    }

    return {
      r: Math.round(hue2rgb(hNorm + 1 / 3) * 255),
      g: Math.round(hue2rgb(hNorm) * 255),
      b: Math.round(hue2rgb(hNorm - 1 / 3) * 255),
    }
  }

  const normalizedHex = computed(() => {
    let hex = (props.modelValue ?? '').trim()
    if (!hex) hex = '#000000'
    if (!hex.startsWith('#')) hex = `#${hex}`
    return hex.toLowerCase()
  })

  const currentRgb = computed(() => parseToRgb(normalizedHex.value))
  const currentHsl = computed(() => {
    const { r, g, b } = currentRgb.value
    return rgbToHsl(r, g, b)
  })

  function selectColor(color: string): void {
    emit('update:modelValue', color)
    addRecentColor(color)
  }

  function onHexInput(event: Event): void {
    let value = (event.target as HTMLInputElement).value.trim()
    if (!value.startsWith('#')) value = `#${value}`
    if (/^#([0-9a-f]{3}){1,2}$/i.test(value)) {
      emit('update:modelValue', value)
      addRecentColor(value)
    }
  }

  function onRgbInput(channel: 'r' | 'g' | 'b', val: number): void {
    const rgbObj = { ...currentRgb.value, [channel]: val }
    const hex = rgbToHex(rgbObj.r, rgbObj.g, rgbObj.b)
    emit('update:modelValue', hex)
    addRecentColor(hex)
  }

  function onHslInput(channel: 'h' | 's' | 'l', val: number): void {
    const hslObj = { ...currentHsl.value, [channel]: val }
    const { r, g, b } = hslToRgb(hslObj.h, hslObj.s, hslObj.l)
    const hex = rgbToHex(r, g, b)
    emit('update:modelValue', hex)
    addRecentColor(hex)
  }

  function onNativeColorInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value
    emit('update:modelValue', value)
    addRecentColor(value)
  }

  const opacityPct = computed({
    get: () => Math.round((props.opacity ?? 1) * 100),
    set: (v: number) => emit('update:opacity', v / 100),
  })
</script>

<template>
  <div ref="rootEl" class="pf-color-picker">
    <!-- Trigger Button in Toolbar -->
    <button
      type="button"
      class="pf-color-picker__trigger"
      :class="{ 'pf-color-picker__trigger--swatch-only': swatchOnly }"
      :aria-label="label"
      :title="`${label}: ${normalizedHex}`"
      @click="toggleOpen"
    >
      <span
        class="pf-color-picker__swatch"
        :class="{ 'pf-color-picker__swatch--rect': swatchOnly }"
        :style="{ background: normalizedHex, opacity: opacity ?? 1 }"
      />
      <span v-if="!swatchOnly" class="pf-color-picker__hex">{{ normalizedHex }}</span>
      <span v-if="showOpacity && !swatchOnly" class="pf-color-picker__op-badge">{{ opacityPct }}%</span>
      <BaseIcon name="chevron-down" :size="12" class="pf-color-picker__arrow" />
    </button>

    <!-- Popover Dropdown Panel -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popoverEl"
        class="pf-color-picker__popover"
        :style="popoverStyle"
        role="dialog"
        :aria-label="label"
      >
        <!-- Swatch Palette Grid -->
        <div class="pf-color-picker__section">
          <span class="pf-color-picker__sec-title">Palette Swatches</span>
          <div class="pf-color-picker__grid">
            <button
              v-for="preset in presets"
              :key="preset"
              type="button"
              class="pf-color-picker__grid-swatch"
              :class="{ 'pf-color-picker__grid-swatch--active': preset.toLowerCase() === normalizedHex }"
              :style="{ background: preset }"
              :aria-label="`Select color ${preset}`"
              @click="selectColor(preset)"
            />
          </div>
        </div>

        <!-- Recent Colors -->
        <div v-if="recentColors.length" class="pf-color-picker__section">
          <span class="pf-color-picker__sec-title">Recent Colors</span>
          <div class="pf-color-picker__recent">
            <button
              v-for="rColor in recentColors"
              :key="`recent-${rColor}`"
              type="button"
              class="pf-color-picker__grid-swatch pf-color-picker__grid-swatch--sm"
              :class="{ 'pf-color-picker__grid-swatch--active': rColor.toLowerCase() === normalizedHex }"
              :style="{ background: rColor }"
              :aria-label="`Select recent color ${rColor}`"
              @click="selectColor(rColor)"
            />
          </div>
        </div>

        <!-- Mode Switcher Tabs & Numeric Inputs -->
        <div class="pf-color-picker__section">
          <div class="pf-color-picker__mode-tabs">
            <button
              type="button"
              class="pf-color-picker__mode-btn"
              :class="{ 'pf-color-picker__mode-btn--on': colorMode === 'hex' }"
              @click="colorMode = 'hex'"
            >
              HEX
            </button>
            <button
              type="button"
              class="pf-color-picker__mode-btn"
              :class="{ 'pf-color-picker__mode-btn--on': colorMode === 'rgb' }"
              @click="colorMode = 'rgb'"
            >
              RGB
            </button>
            <button
              type="button"
              class="pf-color-picker__mode-btn"
              :class="{ 'pf-color-picker__mode-btn--on': colorMode === 'hsl' }"
              @click="colorMode = 'hsl'"
            >
              HSL
            </button>
          </div>

          <div class="pf-color-picker__inputs">
            <!-- HEX Mode -->
            <div v-if="colorMode === 'hex'" class="pf-color-picker__hex-row">
              <span class="pf-color-picker__lbl">HEX</span>
              <input
                type="text"
                class="pf-color-picker__hex-input"
                :value="normalizedHex"
                @change="onHexInput"
                @keyup.enter="onHexInput"
              />
              <label class="pf-color-picker__wheel-btn" title="Custom Color Spectrum">
                <span class="pf-color-picker__wheel-icon" />
                <input
                  type="color"
                  class="pf-color-picker__native-input"
                  :value="normalizedHex"
                  @input="onNativeColorInput"
                />
              </label>
            </div>

            <!-- RGB Mode -->
            <div v-else-if="colorMode === 'rgb'" class="pf-color-picker__row">
              <div class="pf-color-picker__field">
                <span class="pf-color-picker__field-lbl">R</span>
                <NumberStepper
                  :model-value="currentRgb.r"
                  :min="0"
                  :max="255"
                  :step="1"
                  compact
                  @update:model-value="onRgbInput('r', $event)"
                />
              </div>
              <div class="pf-color-picker__field">
                <span class="pf-color-picker__field-lbl">G</span>
                <NumberStepper
                  :model-value="currentRgb.g"
                  :min="0"
                  :max="255"
                  :step="1"
                  compact
                  @update:model-value="onRgbInput('g', $event)"
                />
              </div>
              <div class="pf-color-picker__field">
                <span class="pf-color-picker__field-lbl">B</span>
                <NumberStepper
                  :model-value="currentRgb.b"
                  :min="0"
                  :max="255"
                  :step="1"
                  compact
                  @update:model-value="onRgbInput('b', $event)"
                />
              </div>
            </div>

            <!-- HSL Mode -->
            <div v-else-if="colorMode === 'hsl'" class="pf-color-picker__row">
              <div class="pf-color-picker__field">
                <span class="pf-color-picker__field-lbl">H</span>
                <NumberStepper
                  :model-value="currentHsl.h"
                  :min="0"
                  :max="360"
                  :step="1"
                  compact
                  @update:model-value="onHslInput('h', $event)"
                />
              </div>
              <div class="pf-color-picker__field">
                <span class="pf-color-picker__field-lbl">S%</span>
                <NumberStepper
                  :model-value="currentHsl.s"
                  :min="0"
                  :max="100"
                  :step="1"
                  compact
                  @update:model-value="onHslInput('s', $event)"
                />
              </div>
              <div class="pf-color-picker__field">
                <span class="pf-color-picker__field-lbl">L%</span>
                <NumberStepper
                  :model-value="currentHsl.l"
                  :min="0"
                  :max="100"
                  :step="1"
                  compact
                  @update:model-value="onHslInput('l', $event)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Opacity Slider -->
        <div v-if="showOpacity" class="pf-color-picker__section pf-color-picker__sec--border">
          <div class="pf-color-picker__op-head">
            <span class="pf-color-picker__sec-title">Opacity</span>
            <NumberStepper
              v-model="opacityPct"
              :min="0"
              :max="100"
              :step="5"
              unit="%"
              compact
              label="Opacity"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
  .pf-color-picker {
    position: relative;
    display: inline-block;
    flex: none;
  }

  .pf-color-picker__trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 8px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
    user-select: none;
  }
  .pf-color-picker__trigger:hover {
    background: hsl(var(--color-chip));
    border-color: hsl(var(--color-primary) / 0.4);
  }

  .pf-color-picker__swatch {
    width: 16px;
    height: 16px;
    border-radius: var(--radius-full);
    border: 1px solid rgba(0, 0, 0, 0.2);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4) inset;
    flex: none;
  }

  .pf-color-picker__hex {
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text));
    font-variant-numeric: tabular-nums;
  }

  .pf-color-picker__op-badge {
    font-size: 11px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    background: hsl(var(--color-border) / 0.5);
    padding: 1px 4px;
    border-radius: var(--radius-sm);
  }

  .pf-color-picker__arrow {
    color: hsl(var(--color-text-muted));
  }

  /* Popover */
  .pf-color-picker__popover {
    position: fixed;
    z-index: 9999;
    width: 260px;
    padding: 12px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pf-color-picker__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .pf-color-picker__sec--border {
    border-top: 1px solid hsl(var(--color-border));
    padding-top: 8px;
  }

  .pf-color-picker__sec-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: hsl(var(--color-text-muted));
  }

  .pf-color-picker__grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 6px;
  }

  .pf-color-picker__recent {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .pf-color-picker__grid-swatch {
    width: 22px;
    height: 22px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(0, 0, 0, 0.15);
    cursor: pointer;
    padding: 0;
    transition: transform 0.12s, border-color 0.12s, box-shadow 0.12s;
  }
  .pf-color-picker__grid-swatch--sm {
    width: 18px;
    height: 18px;
  }
  .pf-color-picker__grid-swatch:hover {
    transform: scale(1.15);
    z-index: 1;
  }
  .pf-color-picker__grid-swatch--active {
    border-color: hsl(var(--color-primary));
    box-shadow: 0 0 0 2px hsl(var(--color-primary) / 0.4);
  }

  /* Mode Tabs */
  .pf-color-picker__mode-tabs {
    display: flex;
    background: hsl(var(--color-chip));
    padding: 2px;
    border-radius: var(--radius-md);
    gap: 2px;
  }
  .pf-color-picker__mode-btn {
    flex: 1;
    border: none;
    background: transparent;
    padding: 3px 0;
    font-size: 11px;
    font-weight: 700;
    color: hsl(var(--color-text-muted));
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background-color 0.12s, color 0.12s;
  }
  .pf-color-picker__mode-btn--on {
    background: hsl(var(--color-surface));
    color: hsl(var(--color-primary));
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  .pf-color-picker__hex-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pf-color-picker__lbl {
    font-size: 11px;
    font-weight: 700;
    color: hsl(var(--color-text-muted));
  }
  .pf-color-picker__hex-input {
    flex: 1;
    height: 28px;
    padding: 0 8px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .pf-color-picker__wheel-btn {
    position: relative;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    overflow: hidden;
    cursor: pointer;
    border: 1px solid hsl(var(--color-border));
    flex: none;
  }
  .pf-color-picker__wheel-icon {
    position: absolute;
    inset: 0;
    background: conic-gradient(#f87171, #facc15, #4ade80, #38bdf8, #a78bfa, #f87171);
  }
  .pf-color-picker__native-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    border: none;
    padding: 0;
  }

  .pf-color-picker__row {
    display: flex;
    gap: 6px;
  }
  .pf-color-picker__field {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .pf-color-picker__field-lbl {
    font-size: 10px;
    font-weight: 700;
    color: hsl(var(--color-text-muted));
  }

  .pf-color-picker__op-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pf-color-picker__trigger--swatch-only {
    padding: 0 4px;
    height: 26px;
    gap: 4px;
  }
  .pf-color-picker__swatch--rect {
    border-radius: var(--radius-sm) !important;
    width: 18px !important;
    height: 18px !important;
  }
</style>
