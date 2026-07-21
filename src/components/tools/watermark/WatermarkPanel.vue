<script setup lang="ts">
  /**
   * WatermarkPanel — the full Add Watermark option editor.
   *
   * Renders a live preview plus text styling, image stamp, position/layout,
   * page targeting and layering controls, and emits the backend-shaped
   * options payload via `update:options` (with `__invalid` carrying the
   * current validation problem, same contract as ToolOptions).
   *
   * The watermark image is picked here (PNG/JPG/SVG — SVGs are rasterized to
   * PNG client-side) and emitted via `update:stampFile`; the workspace
   * uploads it alongside the selected PDFs.
   */
  import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import BaseSelect from '@components/ui/BaseSelect.vue'
  import BaseSlider from '@components/ui/BaseSlider.vue'
  import BaseColorPicker from '@components/ui/BaseColorPicker.vue'
  import BaseToggle from '@components/ui/BaseToggle.vue'
  import SegmentedControl from '@components/ui/SegmentedControl.vue'
  import PositionGrid from './PositionGrid.vue'
  import WatermarkPreview from './WatermarkPreview.vue'
  import { pageRangesError } from '@utils'
  import type {
    WatermarkAlign,
    WatermarkFontFamily,
    WatermarkPreviewState,
  } from './watermark-types'

  const props = defineProps<{
    /** True when the workspace file list already contains a JPG/PNG stamp. */
    hasImageInput?: boolean
  }>()

  const emit = defineEmits<{
    'update:options': [value: Record<string, unknown>]
    'update:stampFile': [value: File | null]
  }>()

  // ─── Editor state ──────────────────────────────────────────────────────
  const FONT_LABELS: Record<string, WatermarkFontFamily> = {
    Helvetica: 'helvetica',
    Times: 'times',
    Courier: 'courier',
  }
  const ALIGN_OPTIONS = [
    { value: 'Left', icon: 'align-left' },
    { value: 'Center', icon: 'align-center' },
    { value: 'Right', icon: 'align-right' },
  ] as const
  const ROTATION_PRESETS: Record<string, number> = { '0°': 0, '45°': 45, '90°': 90 }
  const PAGES_LABELS: Record<string, string> = {
    'All pages': 'all',
    'First page only': 'first',
    'Last page only': 'last',
    'Odd pages': 'odd',
    'Even pages': 'even',
    'Custom range': 'custom',
  }
  const POSITION_LABELS: Record<string, string> = {
    'top-left': 'Top left',
    'top-center': 'Top center',
    'top-right': 'Top right',
    'center-left': 'Center left',
    center: 'Center',
    'center-right': 'Center right',
    'bottom-left': 'Bottom left',
    'bottom-center': 'Bottom center',
    'bottom-right': 'Bottom right',
  }

  const ui = reactive({
    type: 'Text', // 'Text' | 'Image'
    // Text
    text: 'CONFIDENTIAL',
    fontLabel: 'Helvetica',
    fontSize: 48,
    bold: true,
    italic: false,
    underline: false,
    alignLabel: 'Center',
    letterSpacing: 0,
    lineHeight: 1.2,
    color: '#808080',
    // Shared appearance
    opacity: 15, // %
    rotationPreset: '45°',
    rotationCustom: 30,
    // Position & layout
    position: 'center',
    offsetX: '0',
    offsetY: '0',
    margin: 12,
    tile: false,
    // Image sizing
    imageScale: 50, // % of the page's short side
    keepAspect: true,
    imageScaleX: 50,
    imageScaleY: 50,
    // Pages & layer
    pagesLabel: 'All pages',
    pageRange: '',
    layerLabel: 'Above content',
  })

  // ─── Collapsible sections ──────────────────────────────────────────────
  const open = reactive({ format: true, layout: false, pages: false })

  // ─── Watermark image (PNG/JPG/SVG) ─────────────────────────────────────
  const imageInput = ref<HTMLInputElement | null>(null)
  const imageFile = ref<File | null>(null)
  const imageUrl = ref<string | null>(null)
  const imageError = ref<string | null>(null)
  const imageDrag = ref(false)
  const MAX_IMAGE_MB = 20

  function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new globalThis.Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not read the image.'))
      img.src = url
    })
  }

  /** Rasterize an SVG to a PNG File (the backend accepts JPG/PNG only). */
  async function svgToPng(file: File): Promise<File> {
    const url = URL.createObjectURL(new Blob([await file.text()], { type: 'image/svg+xml' }))
    try {
      const img = await loadImage(url)
      const width = img.naturalWidth || 1024
      const height = img.naturalHeight || 1024
      // Render at up to 1024px on the long edge for a crisp stamp.
      const factor = 1024 / Math.max(width, height)
      const canvas = globalThis.document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * factor))
      canvas.height = Math.max(1, Math.round(height * factor))
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not convert the SVG.')
      return new File([blob], file.name.replace(/\.svg$/i, '.png'), { type: 'image/png' })
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  async function setStampImage(file: File) {
    imageError.value = null
    const name = file.name.toLowerCase()
    const isSvg = name.endsWith('.svg') || file.type === 'image/svg+xml'
    if (!isSvg && !/\.(png|jpe?g)$/.test(name)) {
      imageError.value = 'Use a PNG, JPG or SVG image.'
      return
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      imageError.value = `The image is over the ${MAX_IMAGE_MB} MB limit.`
      return
    }
    try {
      const stamp = isSvg ? await svgToPng(file) : file
      if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
      imageFile.value = stamp
      imageUrl.value = URL.createObjectURL(stamp)
      emit('update:stampFile', stamp)
    } catch (error) {
      imageError.value = error instanceof Error ? error.message : 'Could not read the image.'
    }
  }

  function onImagePicked(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) void setStampImage(file)
    input.value = '' // allow re-selecting the same file
  }

  function onImageDrop(event: DragEvent) {
    imageDrag.value = false
    const file = event.dataTransfer?.files?.[0]
    if (file) void setStampImage(file)
  }

  function removeImage() {
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
    imageFile.value = null
    imageUrl.value = null
    imageError.value = null
    emit('update:stampFile', null)
  }

  onBeforeUnmount(() => {
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  })

  // ─── Derived values ────────────────────────────────────────────────────
  const rotation = computed(() =>
    ui.rotationPreset === 'Custom' ? ui.rotationCustom : ROTATION_PRESETS[ui.rotationPreset],
  )
  const isMultiline = computed(() => ui.text.includes('\n'))

  function parseOffset(raw: string): number | null {
    if (!raw.trim()) return 0
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  }

  const pageRangeMessage = computed<string | null>(() =>
    ui.pagesLabel === 'Custom range' ? pageRangesError(ui.pageRange) : null,
  )

  /** The current validation problem, or null when the options are runnable. */
  const problem = computed<string | null>(() => {
    if (ui.type === 'Text' && !ui.text.trim()) return 'Enter the watermark text.'
    if (ui.type === 'Image' && !imageFile.value && !props.hasImageInput) {
      return 'Upload a watermark image (PNG, JPG or SVG).'
    }
    const offsetX = parseOffset(ui.offsetX)
    const offsetY = parseOffset(ui.offsetY)
    if (offsetX === null || offsetY === null) return 'Offsets must be numbers.'
    if (Math.abs(offsetX) > 200 || Math.abs(offsetY) > 200) {
      return 'Offsets must be between -200 and 200 mm.'
    }
    if (ui.pagesLabel === 'Custom range') {
      if (!ui.pageRange.trim()) return 'Enter the page range to watermark.'
      return pageRangeMessage.value
    }
    return null
  })

  /** Backend WatermarkOptions payload. */
  const options = computed<Record<string, unknown>>(() => {
    const common = {
      opacity: ui.opacity / 100,
      rotation: rotation.value,
      position: ui.position,
      offset_x_mm: parseOffset(ui.offsetX) ?? 0,
      offset_y_mm: parseOffset(ui.offsetY) ?? 0,
      margin_mm: ui.margin,
      tile: ui.tile,
      layer: ui.layerLabel === 'Below content' ? 'below' : 'above',
      pages: PAGES_LABELS[ui.pagesLabel] ?? 'all',
      ...(ui.pagesLabel === 'Custom range' && ui.pageRange.trim()
        ? {
            page_range: ui.pageRange
              .split(',')
              .map((token) => token.trim().replace(/\s*-\s*/, '-'))
              .filter(Boolean)
              .join(','),
          }
        : {}),
    }
    if (ui.type === 'Image') {
      return {
        mode: 'image',
        scale: ui.imageScale / 100,
        keep_aspect: ui.keepAspect,
        ...(ui.keepAspect ? {} : { scale_x: ui.imageScaleX / 100, scale_y: ui.imageScaleY / 100 }),
        ...common,
      }
    }
    return {
      mode: 'text',
      text: ui.text,
      font_family: FONT_LABELS[ui.fontLabel] ?? 'helvetica',
      bold: ui.bold,
      italic: ui.italic,
      underline: ui.underline,
      font_size: ui.fontSize,
      align: ui.alignLabel.toLowerCase(),
      letter_spacing: ui.letterSpacing,
      line_height: ui.lineHeight,
      color: ui.color,
      ...common,
    }
  })

  watch(
    [options, problem],
    () => emit('update:options', { ...options.value, __invalid: problem.value }),
    { immediate: true, deep: true },
  )

  // ─── Live preview state ────────────────────────────────────────────────
  const previewState = computed<WatermarkPreviewState>(() => ({
    mode: ui.type === 'Image' ? 'image' : 'text',
    text: ui.text,
    fontFamily: FONT_LABELS[ui.fontLabel] ?? 'helvetica',
    bold: ui.bold,
    italic: ui.italic,
    underline: ui.underline,
    fontSize: ui.fontSize,
    align: ui.alignLabel.toLowerCase() as WatermarkAlign,
    letterSpacing: ui.letterSpacing,
    lineHeight: ui.lineHeight,
    color: ui.color,
    opacity: ui.opacity / 100,
    rotation: rotation.value,
    position: ui.position,
    offsetXmm: parseOffset(ui.offsetX) ?? 0,
    offsetYmm: parseOffset(ui.offsetY) ?? 0,
    marginMm: ui.margin,
    tile: ui.tile,
    scale: ui.imageScale / 100,
    keepAspect: ui.keepAspect,
    scaleX: ui.imageScaleX / 100,
    scaleY: ui.imageScaleY / 100,
    layer: ui.layerLabel === 'Below content' ? 'below' : 'above',
  }))

  // ─── Collapsed-section summaries ───────────────────────────────────────
  const formatSummary = computed(() =>
    ui.type === 'Text'
      ? `${ui.fontLabel} · ${ui.fontSize}pt · ${ui.opacity}%`
      : `${ui.imageScale}% · ${ui.opacity}%`,
  )
  const layoutSummary = computed(() =>
    ui.tile ? `Tiled · ${rotation.value}°` : `${POSITION_LABELS[ui.position]} · ${rotation.value}°`,
  )
  const pagesSummary = computed(
    () =>
      `${ui.pagesLabel === 'Custom range' ? ui.pageRange.trim() || 'Custom range' : ui.pagesLabel} · ${
        ui.layerLabel === 'Below content' ? 'Below' : 'Above'
      }`,
  )
</script>

<template>
  <div class="pf-wm">
    <!-- Live preview -->
    <WatermarkPreview :state="previewState" :image-url="imageUrl" />

    <!-- Type -->
    <div class="pf-wm__row">
      <label class="pf-wm__label">Watermark type</label>
      <SegmentedControl
        v-model="ui.type"
        :options="[
          { value: 'Text', icon: 'type' },
          { value: 'Image', icon: 'image' },
        ]"
      />
    </div>

    <!-- Text content -->
    <div v-if="ui.type === 'Text'" class="pf-wm__row">
      <label class="pf-wm__label" for="pf-wm-text">Watermark text</label>
      <textarea
        id="pf-wm-text"
        v-model="ui.text"
        class="pf-wm__textarea"
        :class="{ 'pf-wm__textarea--invalid': !ui.text.trim() }"
        rows="2"
        maxlength="200"
        placeholder="CONFIDENTIAL"
        spellcheck="false"
      ></textarea>
      <div class="pf-wm__hint">Press Enter for a multi-line watermark.</div>
    </div>

    <!-- Image stamp -->
    <div v-else class="pf-wm__row">
      <label class="pf-wm__label">Watermark image</label>
      <input
        ref="imageInput"
        type="file"
        class="pf-wm__file"
        accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
        @change="onImagePicked"
      />
      <button
        v-if="!imageFile"
        type="button"
        class="pf-wm__drop"
        :class="{ 'pf-wm__drop--active': imageDrag }"
        @click="imageInput?.click()"
        @dragover.prevent="imageDrag = true"
        @dragleave="imageDrag = false"
        @drop.prevent="onImageDrop"
      >
        <BaseIcon name="image" :size="22" />
        <span class="pf-wm__drop-title">Upload watermark image</span>
        <span class="pf-wm__drop-sub">PNG, JPG or SVG · up to {{ MAX_IMAGE_MB }} MB</span>
      </button>
      <div v-else class="pf-wm__stampfile">
        <img v-if="imageUrl" class="pf-wm__stampthumb" :src="imageUrl" alt="Watermark image" />
        <div class="pf-wm__stampmeta">
          <div class="pf-wm__stampname">{{ imageFile.name }}</div>
          <div class="pf-wm__stampactions">
            <button type="button" class="pf-wm__stampaction" @click="imageInput?.click()">
              <BaseIcon name="refresh" :size="13" /> Replace
            </button>
            <button
              type="button"
              class="pf-wm__stampaction pf-wm__stampaction--danger"
              @click="removeImage"
            >
              <BaseIcon name="trash" :size="13" /> Remove
            </button>
          </div>
        </div>
      </div>
      <div v-if="imageError" class="pf-wm__error">
        <BaseIcon name="alert-circle" :size="14" /> {{ imageError }}
      </div>
      <div v-else-if="!imageFile && hasImageInput" class="pf-wm__hint">
        Using the image from your selected files — upload one here to override it.
      </div>
    </div>

    <!-- ── Formatting / image settings ─────────────────────────────────── -->
    <section class="pf-wm__section">
      <button
        type="button"
        class="pf-wm__section-head"
        :aria-expanded="open.format"
        @click="open.format = !open.format"
      >
        <BaseIcon :name="ui.type === 'Text' ? 'type' : 'image'" :size="15" />
        <span class="pf-wm__section-title">{{
          ui.type === 'Text' ? 'Text formatting' : 'Image settings'
        }}</span>
        <span v-if="!open.format" class="pf-wm__section-summary">{{ formatSummary }}</span>
        <BaseIcon
          class="pf-wm__chevron"
          :class="{ 'pf-wm__chevron--open': open.format }"
          name="chevron-down"
          :size="16"
        />
      </button>
      <div class="pf-wm__section-body" :class="{ 'pf-wm__section-body--open': open.format }">
        <div class="pf-wm__section-inner">
          <template v-if="ui.type === 'Text'">
            <div class="pf-wm__grid2">
              <div class="pf-wm__row">
                <label class="pf-wm__label">Font family</label>
                <BaseSelect v-model="ui.fontLabel" :options="Object.keys(FONT_LABELS)" />
              </div>
              <div class="pf-wm__row">
                <label class="pf-wm__label">Style</label>
                <div class="pf-wm__styles" role="group" aria-label="Text style">
                  <button
                    type="button"
                    class="pf-wm__style"
                    :class="{ 'pf-wm__style--on': ui.bold }"
                    :aria-pressed="ui.bold"
                    aria-label="Bold"
                    title="Bold"
                    @click="ui.bold = !ui.bold"
                  >
                    <BaseIcon name="bold" :size="15" />
                  </button>
                  <button
                    type="button"
                    class="pf-wm__style"
                    :class="{ 'pf-wm__style--on': ui.italic }"
                    :aria-pressed="ui.italic"
                    aria-label="Italic"
                    title="Italic"
                    @click="ui.italic = !ui.italic"
                  >
                    <BaseIcon name="italic" :size="15" />
                  </button>
                  <button
                    type="button"
                    class="pf-wm__style"
                    :class="{ 'pf-wm__style--on': ui.underline }"
                    :aria-pressed="ui.underline"
                    aria-label="Underline"
                    title="Underline"
                    @click="ui.underline = !ui.underline"
                  >
                    <BaseIcon name="underline" :size="15" />
                  </button>
                </div>
              </div>
            </div>
            <div class="pf-wm__row">
              <label class="pf-wm__label">Font size</label>
              <BaseSlider v-model="ui.fontSize" :min="8" :max="144" unit="pt" label="Font size" />
            </div>
            <div class="pf-wm__row">
              <label class="pf-wm__label">Text color</label>
              <BaseColorPicker v-model="ui.color" label="Text color" />
            </div>
            <div class="pf-wm__row">
              <label class="pf-wm__label">Alignment</label>
              <SegmentedControl v-model="ui.alignLabel" :options="ALIGN_OPTIONS" />
            </div>
            <div class="pf-wm__row">
              <label class="pf-wm__label">Letter spacing</label>
              <BaseSlider
                v-model="ui.letterSpacing"
                :min="0"
                :max="20"
                :step="0.5"
                unit="pt"
                label="Letter spacing"
              />
            </div>
            <div class="pf-wm__row">
              <label class="pf-wm__label">
                Line height
                <span v-if="!isMultiline" class="pf-wm__label-note">(multi-line text)</span>
              </label>
              <BaseSlider
                v-model="ui.lineHeight"
                :min="0.8"
                :max="3"
                :step="0.1"
                unit="×"
                label="Line height"
                :disabled="!isMultiline"
              />
            </div>
          </template>

          <template v-else>
            <div class="pf-wm__row pf-wm__toggle-row">
              <div>
                <label class="pf-wm__label pf-wm__label--tight">Maintain aspect ratio</label>
                <div class="pf-wm__hint">Turn off to stretch the image freely.</div>
              </div>
              <BaseToggle v-model="ui.keepAspect" label="Maintain aspect ratio" />
            </div>
            <div v-if="ui.keepAspect" class="pf-wm__row">
              <label class="pf-wm__label">Size</label>
              <BaseSlider v-model="ui.imageScale" :min="5" :max="100" unit="%" label="Image size" />
            </div>
            <template v-else>
              <div class="pf-wm__row">
                <label class="pf-wm__label">Width</label>
                <BaseSlider
                  v-model="ui.imageScaleX"
                  :min="5"
                  :max="100"
                  unit="%"
                  label="Image width"
                />
              </div>
              <div class="pf-wm__row">
                <label class="pf-wm__label">Height</label>
                <BaseSlider
                  v-model="ui.imageScaleY"
                  :min="5"
                  :max="100"
                  unit="%"
                  label="Image height"
                />
              </div>
            </template>
          </template>

          <!-- Shared appearance -->
          <div class="pf-wm__row">
            <label class="pf-wm__label">Opacity</label>
            <BaseSlider v-model="ui.opacity" :min="5" :max="100" unit="%" label="Opacity" />
          </div>
          <div class="pf-wm__row">
            <label class="pf-wm__label">Rotation</label>
            <SegmentedControl
              v-model="ui.rotationPreset"
              :options="['0°', '45°', '90°', 'Custom']"
            />
            <div v-if="ui.rotationPreset === 'Custom'" class="pf-wm__subrow">
              <BaseSlider
                v-model="ui.rotationCustom"
                :min="0"
                :max="360"
                unit="°"
                label="Custom rotation"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Position & layout ───────────────────────────────────────────── -->
    <section class="pf-wm__section">
      <button
        type="button"
        class="pf-wm__section-head"
        :aria-expanded="open.layout"
        @click="open.layout = !open.layout"
      >
        <BaseIcon name="grid" :size="15" />
        <span class="pf-wm__section-title">Position &amp; layout</span>
        <span v-if="!open.layout" class="pf-wm__section-summary">{{ layoutSummary }}</span>
        <BaseIcon
          class="pf-wm__chevron"
          :class="{ 'pf-wm__chevron--open': open.layout }"
          name="chevron-down"
          :size="16"
        />
      </button>
      <div class="pf-wm__section-body" :class="{ 'pf-wm__section-body--open': open.layout }">
        <div class="pf-wm__section-inner">
          <div class="pf-wm__row pf-wm__toggle-row">
            <div>
              <label class="pf-wm__label pf-wm__label--tight">Tile across page</label>
              <div class="pf-wm__hint">Repeat the watermark in a mosaic pattern.</div>
            </div>
            <BaseToggle v-model="ui.tile" label="Tile across page" />
          </div>
          <div class="pf-wm__grid-pos">
            <div class="pf-wm__row">
              <label class="pf-wm__label">Position</label>
              <PositionGrid v-model="ui.position" :disabled="ui.tile" />
            </div>
            <div class="pf-wm__pos-fields">
              <div class="pf-wm__row">
                <label class="pf-wm__label" for="pf-wm-offx">Offset X (mm)</label>
                <BaseInput
                  id="pf-wm-offx"
                  v-model="ui.offsetX"
                  type="number"
                  placeholder="0"
                  :invalid="parseOffset(ui.offsetX) === null"
                />
              </div>
              <div class="pf-wm__row">
                <label class="pf-wm__label" for="pf-wm-offy">Offset Y (mm)</label>
                <BaseInput
                  id="pf-wm-offy"
                  v-model="ui.offsetY"
                  type="number"
                  placeholder="0"
                  :invalid="parseOffset(ui.offsetY) === null"
                />
              </div>
            </div>
          </div>
          <div class="pf-wm__row">
            <label class="pf-wm__label">Page margin</label>
            <BaseSlider v-model="ui.margin" :min="0" :max="50" unit="mm" label="Page margin" />
          </div>
        </div>
      </div>
    </section>

    <!-- ── Pages & layering ────────────────────────────────────────────── -->
    <section class="pf-wm__section">
      <button
        type="button"
        class="pf-wm__section-head"
        :aria-expanded="open.pages"
        @click="open.pages = !open.pages"
      >
        <BaseIcon name="layers" :size="15" />
        <span class="pf-wm__section-title">Pages &amp; layering</span>
        <span v-if="!open.pages" class="pf-wm__section-summary">{{ pagesSummary }}</span>
        <BaseIcon
          class="pf-wm__chevron"
          :class="{ 'pf-wm__chevron--open': open.pages }"
          name="chevron-down"
          :size="16"
        />
      </button>
      <div class="pf-wm__section-body" :class="{ 'pf-wm__section-body--open': open.pages }">
        <div class="pf-wm__section-inner">
          <div class="pf-wm__row">
            <label class="pf-wm__label">Apply to</label>
            <BaseSelect v-model="ui.pagesLabel" :options="Object.keys(PAGES_LABELS)" />
          </div>
          <div v-if="ui.pagesLabel === 'Custom range'" class="pf-wm__row">
            <label class="pf-wm__label" for="pf-wm-range">Page range</label>
            <BaseInput
              id="pf-wm-range"
              v-model="ui.pageRange"
              placeholder="e.g. 1-3, 7"
              :invalid="!!pageRangeMessage"
            />
            <div v-if="pageRangeMessage" class="pf-wm__error">
              <BaseIcon name="alert-circle" :size="14" /> {{ pageRangeMessage }}
            </div>
          </div>
          <div class="pf-wm__row">
            <label class="pf-wm__label">Layer</label>
            <SegmentedControl
              v-model="ui.layerLabel"
              :options="['Above content', 'Below content']"
            />
            <div class="pf-wm__hint">
              {{
                ui.layerLabel === 'Below content'
                  ? 'The watermark sits behind the page content — text and images cover it.'
                  : 'The watermark is stamped over the page content.'
              }}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
  .pf-wm {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .pf-wm__row {
    min-width: 0;
  }
  .pf-wm__label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    margin-bottom: 8px;
  }
  .pf-wm__label--tight {
    margin-bottom: 2px;
  }
  .pf-wm__label-note {
    font-weight: 500;
    color: hsl(var(--color-text-faint));
  }
  .pf-wm__hint {
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
    line-height: 1.45;
    margin-top: 6px;
  }
  .pf-wm__toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .pf-wm__toggle-row .pf-wm__hint {
    margin-top: 0;
  }
  .pf-wm__error {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-danger));
  }
  .pf-wm__subrow {
    margin-top: 10px;
  }
  .pf-wm__grid2 {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    align-items: start;
  }
  .pf-wm__grid-pos {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 16px;
    align-items: start;
    margin-top: 14px;
  }
  .pf-wm__pos-fields {
    display: grid;
    gap: 10px;
  }

  /* Multi-line text input, styled to match BaseInput. */
  .pf-wm__textarea {
    width: 100%;
    padding: 12px 14px;
    font-size: 14.5px;
    font-family: inherit;
    color: hsl(var(--color-text));
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    outline: none;
    resize: vertical;
    min-height: 46px;
    max-height: 160px;
    transition: border-color 0.15s;
  }
  .pf-wm__textarea:focus {
    border-color: hsl(var(--color-primary));
  }
  .pf-wm__textarea--invalid {
    border-color: hsl(var(--color-danger));
  }
  .pf-wm__textarea::placeholder {
    color: hsl(var(--color-text-faint));
  }

  /* B / I / U icon toggles */
  .pf-wm__styles {
    display: flex;
    gap: 6px;
  }
  .pf-wm__style {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-faint));
    cursor: pointer;
    transition: all 0.15s;
  }
  .pf-wm__style:hover {
    border-color: hsl(var(--color-border-strong));
    color: hsl(var(--color-text));
  }
  .pf-wm__style--on {
    background: hsl(var(--color-primary) / 0.12);
    border-color: hsl(var(--color-primary) / 0.45);
    color: hsl(var(--color-primary));
  }
  .pf-wm__style:focus-visible {
    outline: 2px solid hsl(var(--color-primary) / 0.6);
    outline-offset: 2px;
  }

  /* Image stamp upload */
  .pf-wm__file {
    display: none;
  }
  .pf-wm__drop {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 18px 14px;
    border: 2px dashed hsl(var(--color-border-strong));
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface-muted));
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    transition: all 0.2s;
  }
  .pf-wm__drop:hover,
  .pf-wm__drop--active {
    border-color: hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.06);
    color: hsl(var(--color-primary));
  }
  .pf-wm__drop-title {
    font-weight: 700;
    font-size: 13.5px;
    color: hsl(var(--color-text));
  }
  .pf-wm__drop-sub {
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
  }
  .pf-wm__stampfile {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--radius-lg);
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface-muted));
  }
  .pf-wm__stampthumb {
    width: 44px;
    height: 44px;
    object-fit: contain;
    border-radius: var(--radius-md);
    background: repeating-conic-gradient(
        hsl(var(--color-chip)) 0% 25%,
        hsl(var(--color-surface)) 0% 50%
      )
      0 0 / 12px 12px;
    border: 1px solid hsl(var(--color-border));
    flex: none;
  }
  .pf-wm__stampmeta {
    min-width: 0;
    flex: 1;
  }
  .pf-wm__stampname {
    font-weight: 600;
    font-size: 13px;
    color: hsl(var(--color-text));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }
  .pf-wm__stampactions {
    display: flex;
    gap: 12px;
  }
  .pf-wm__stampaction {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    padding: 0;
    font-size: 12.5px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
  }
  .pf-wm__stampaction:hover {
    color: hsl(var(--color-primary));
  }
  .pf-wm__stampaction--danger:hover {
    color: hsl(var(--color-danger));
  }

  /* Collapsible sections */
  .pf-wm__section {
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface));
    overflow: hidden;
  }
  .pf-wm__section-head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 13px 14px;
    background: none;
    border: none;
    cursor: pointer;
    color: hsl(var(--color-text-muted));
    text-align: left;
  }
  .pf-wm__section-head:hover {
    color: hsl(var(--color-text));
  }
  .pf-wm__section-head:focus-visible {
    outline: 2px solid hsl(var(--color-primary) / 0.6);
    outline-offset: -2px;
    border-radius: var(--radius-lg);
  }
  .pf-wm__section-title {
    font-size: 13.5px;
    font-weight: 700;
    color: hsl(var(--color-text));
    flex: none;
  }
  .pf-wm__section-summary {
    flex: 1;
    min-width: 0;
    text-align: right;
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pf-wm__chevron {
    flex: none;
    margin-left: auto;
    transition: transform 0.2s;
  }
  .pf-wm__section-summary + .pf-wm__chevron {
    margin-left: 0;
  }
  .pf-wm__chevron--open {
    transform: rotate(180deg);
  }
  .pf-wm__section-body {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.25s ease;
  }
  .pf-wm__section-body--open {
    grid-template-rows: 1fr;
  }
  .pf-wm__section-inner {
    overflow: hidden;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 0 14px;
  }
  .pf-wm__section-body--open .pf-wm__section-inner {
    padding: 2px 14px 16px;
  }

  @media (max-width: 420px) {
    .pf-wm__grid2,
    .pf-wm__grid-pos {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pf-wm__section-body,
    .pf-wm__chevron {
      transition: none;
    }
  }
</style>
