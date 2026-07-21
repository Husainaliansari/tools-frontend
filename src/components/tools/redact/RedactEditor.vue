<script setup lang="ts">
  /**
   * RedactEditor — interactive area-redaction editor for one PDF.
   *
   * Renders a live pdf.js preview with page navigation, zoom and pan, and
   * lets the user drag out redaction regions directly on the page. Regions
   * can be moved, resized, restyled (black / white / color / blur /
   * pixelate), deleted, and undone/redone. Every region previews its final
   * effect in real time; the actual content removal happens server-side.
   *
   * Regions are held in PDF points with a top-left origin (the backend's
   * coordinate space) and exposed via `v-model:regions`.
   */
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import BaseColorPicker from '@components/ui/BaseColorPicker.vue'
  import BaseSlider from '@components/ui/BaseSlider.vue'
  import SegmentedControl from '@components/ui/SegmentedControl.vue'
  import { hexAlpha } from '@utils'
  import { usePdfDocument, type RenderedPage } from './usePdfDocument'
  import {
    MODE_HINTS,
    MODE_LABELS,
    REDACTION_MODES,
    nextRegionId,
    type RedactionMode,
    type RedactionRegion,
  } from './redact-types'

  const props = defineProps<{ file: File }>()
  const regions = defineModel<RedactionRegion[]>('regions', { required: true })

  const { pageCount, loading, error, load, renderPage, destroy } = usePdfDocument()

  // ─── Viewer state ──────────────────────────────────────────────────────────
  const stageEl = ref<HTMLDivElement | null>(null)
  const pageEl = ref<HTMLDivElement | null>(null)
  const canvasEl = ref<HTMLCanvasElement | null>(null)

  const pageNumber = ref(1)
  const scale = ref(1)
  const fitMode = ref<'width' | 'page' | 'custom'>('width')
  const metrics = ref<RenderedPage | null>(null)
  /** Bumped after each successful page render — retriggers effect previews. */
  const renderStamp = ref(0)

  const toolMode = ref<'draw' | 'pan'>('draw')

  const MIN_SCALE = 0.25
  const MAX_SCALE = 4

  // ─── Selection & style state ───────────────────────────────────────────────
  const selectedId = ref<string | null>(null)
  /** Style applied to newly drawn regions (updated by any style change). */
  const defaults = ref<{ mode: RedactionMode; color: string; opacity: number }>({
    mode: 'black',
    color: '#111827',
    opacity: 0.85,
  })

  const selectedRegion = computed(
    () => regions.value.find((region) => region.id === selectedId.value) ?? null,
  )
  const pageRegions = computed(() =>
    regions.value.filter((region) => region.page === pageNumber.value),
  )

  const activeMode = computed<RedactionMode>(
    () => selectedRegion.value?.mode ?? defaults.value.mode,
  )
  const activeColor = computed(() => selectedRegion.value?.color ?? defaults.value.color)
  const activeOpacity = computed(() =>
    Math.round((selectedRegion.value?.opacity ?? defaults.value.opacity) * 100),
  )

  const modeLabel = computed({
    get: () => MODE_LABELS[activeMode.value],
    set: (label: string) => {
      const mode = REDACTION_MODES.find((candidate) => MODE_LABELS[candidate] === label)
      if (mode) applyStyle({ mode })
    },
  })
  const modeOptions = REDACTION_MODES.map((mode) => MODE_LABELS[mode])

  // ─── History (undo/redo) ───────────────────────────────────────────────────
  const past = ref<string[]>([])
  const future = ref<string[]>([])
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  /** Coalesce rapid same-control style tweaks (slider drags) into one entry. */
  let lastStyleStamp = { key: '', time: 0 }

  function snapshot(): string {
    return JSON.stringify(regions.value)
  }

  function pushHistory(previous: string): void {
    past.value.push(previous)
    if (past.value.length > 100) past.value.shift()
    future.value = []
  }

  function commit(next: RedactionRegion[], previous: string = snapshot()): void {
    pushHistory(previous)
    regions.value = next
  }

  function undo(): void {
    if (!past.value.length) return
    future.value.push(snapshot())
    regions.value = JSON.parse(past.value.pop() as string)
    ensureSelectionExists()
  }

  function redo(): void {
    if (!future.value.length) return
    past.value.push(snapshot())
    regions.value = JSON.parse(future.value.pop() as string)
    ensureSelectionExists()
  }

  function ensureSelectionExists(): void {
    if (selectedId.value && !regions.value.some((region) => region.id === selectedId.value)) {
      selectedId.value = null
    }
  }

  // ─── Region operations ─────────────────────────────────────────────────────
  function applyStyle(patch: Partial<Pick<RedactionRegion, 'mode' | 'color' | 'opacity'>>): void {
    defaults.value = { ...defaults.value, ...patch }
    const region = selectedRegion.value
    if (!region) return
    const key = `${region.id}:${Object.keys(patch).join(',')}`
    const now = Date.now()
    const previous = snapshot()
    const next = regions.value.map((candidate) =>
      candidate.id === region.id ? { ...candidate, ...patch } : candidate,
    )
    if (lastStyleStamp.key === key && now - lastStyleStamp.time < 800) {
      regions.value = next // same control, rapid tweak — no extra undo step
    } else {
      commit(next, previous)
    }
    lastStyleStamp = { key, time: now }
  }

  function deleteRegion(id: string): void {
    commit(regions.value.filter((region) => region.id !== id))
    if (selectedId.value === id) selectedId.value = null
  }

  function clearPage(): void {
    if (!pageRegions.value.length) return
    commit(regions.value.filter((region) => region.page !== pageNumber.value))
    ensureSelectionExists()
  }

  function resetAll(): void {
    if (!regions.value.length) return
    commit([])
    selectedId.value = null
  }

  // ─── Coordinate helpers ────────────────────────────────────────────────────
  function clientToPagePoints(clientX: number, clientY: number): { x: number; y: number } {
    const rect = pageEl.value?.getBoundingClientRect()
    if (!rect || !metrics.value) return { x: 0, y: 0 }
    const x = (clientX - rect.left) / scale.value
    const y = (clientY - rect.top) / scale.value
    return {
      x: Math.min(Math.max(x, 0), metrics.value.pointWidth),
      y: Math.min(Math.max(y, 0), metrics.value.pointHeight),
    }
  }

  function regionBoxStyle(region: RedactionRegion): Record<string, string> {
    return {
      left: `${region.x0 * scale.value}px`,
      top: `${region.y0 * scale.value}px`,
      width: `${(region.x1 - region.x0) * scale.value}px`,
      height: `${(region.y1 - region.y0) * scale.value}px`,
    }
  }

  function regionFillStyle(region: RedactionRegion): Record<string, string> {
    switch (region.mode) {
      case 'black':
        return { background: '#000000' }
      case 'white':
        return { background: '#ffffff' }
      case 'color':
        return { background: hexAlpha(region.color, region.opacity) }
      case 'blur':
        return {
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          background: 'rgb(255 255 255 / 0.05)',
        }
      default: // pixelate — painted by its own canvas
        return {}
    }
  }

  // ─── Drag interactions (create / move / resize / pan) ─────────────────────
  type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  const MIN_SIZE_PT = 4

  interface DragState {
    kind: 'create' | 'move' | 'resize' | 'pan'
    startX: number
    startY: number
    regionId?: string
    origin?: RedactionRegion
    handle?: Handle
    scrollLeft?: number
    scrollTop?: number
    previous: string
    changed: boolean
  }
  const drag = ref<DragState | null>(null)
  /** In-progress rectangle while drawing a new region (PDF points). */
  const draft = ref<{ x0: number; y0: number; x1: number; y1: number } | null>(null)

  function onOverlayPointerDown(event: PointerEvent): void {
    if (!metrics.value || event.button !== 0) return
    if (toolMode.value === 'pan') {
      startPan(event)
      return
    }
    selectedId.value = null
    const point = clientToPagePoints(event.clientX, event.clientY)
    drag.value = {
      kind: 'create',
      startX: point.x,
      startY: point.y,
      previous: snapshot(),
      changed: false,
    }
    draft.value = { x0: point.x, y0: point.y, x1: point.x, y1: point.y }
    attachWindowDrag()
  }

  function onRegionPointerDown(event: PointerEvent, region: RedactionRegion): void {
    if (event.button !== 0) return
    if (toolMode.value === 'pan') {
      startPan(event)
      return
    }
    event.stopPropagation()
    selectedId.value = region.id
    const point = clientToPagePoints(event.clientX, event.clientY)
    drag.value = {
      kind: 'move',
      startX: point.x,
      startY: point.y,
      regionId: region.id,
      origin: { ...region },
      previous: snapshot(),
      changed: false,
    }
    attachWindowDrag()
  }

  function onHandlePointerDown(event: PointerEvent, region: RedactionRegion, handle: Handle): void {
    if (event.button !== 0) return
    event.stopPropagation()
    selectedId.value = region.id
    const point = clientToPagePoints(event.clientX, event.clientY)
    drag.value = {
      kind: 'resize',
      startX: point.x,
      startY: point.y,
      regionId: region.id,
      origin: { ...region },
      handle,
      previous: snapshot(),
      changed: false,
    }
    attachWindowDrag()
  }

  function startPan(event: PointerEvent): void {
    const stage = stageEl.value
    if (!stage) return
    drag.value = {
      kind: 'pan',
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: stage.scrollLeft,
      scrollTop: stage.scrollTop,
      previous: '',
      changed: false,
    }
    attachWindowDrag()
  }

  function onWindowPointerMove(event: PointerEvent): void {
    const state = drag.value
    if (!state) return

    if (state.kind === 'pan') {
      const stage = stageEl.value
      if (!stage) return
      stage.scrollLeft = (state.scrollLeft ?? 0) - (event.clientX - state.startX)
      stage.scrollTop = (state.scrollTop ?? 0) - (event.clientY - state.startY)
      return
    }

    const point = clientToPagePoints(event.clientX, event.clientY)

    if (state.kind === 'create' && draft.value) {
      draft.value = {
        x0: Math.min(state.startX, point.x),
        y0: Math.min(state.startY, point.y),
        x1: Math.max(state.startX, point.x),
        y1: Math.max(state.startY, point.y),
      }
      return
    }

    const origin = state.origin
    if (!origin || !metrics.value) return
    const deltaX = point.x - state.startX
    const deltaY = point.y - state.startY

    if (state.kind === 'move') {
      const width = origin.x1 - origin.x0
      const height = origin.y1 - origin.y0
      const x0 = Math.min(Math.max(origin.x0 + deltaX, 0), metrics.value.pointWidth - width)
      const y0 = Math.min(Math.max(origin.y0 + deltaY, 0), metrics.value.pointHeight - height)
      mutateRegion(state, { x0, y0, x1: x0 + width, y1: y0 + height })
      return
    }

    // Resize
    const handle = state.handle as Handle
    let { x0, y0, x1, y1 } = origin
    if (handle.includes('w')) x0 = Math.min(origin.x0 + deltaX, x1 - MIN_SIZE_PT)
    if (handle.includes('e')) x1 = Math.max(origin.x1 + deltaX, x0 + MIN_SIZE_PT)
    if (handle.includes('n')) y0 = Math.min(origin.y0 + deltaY, y1 - MIN_SIZE_PT)
    if (handle.includes('s')) y1 = Math.max(origin.y1 + deltaY, y0 + MIN_SIZE_PT)
    x0 = Math.max(0, x0)
    y0 = Math.max(0, y0)
    x1 = Math.min(metrics.value.pointWidth, x1)
    y1 = Math.min(metrics.value.pointHeight, y1)
    mutateRegion(state, { x0, y0, x1, y1 })
  }

  function mutateRegion(state: DragState, rect: Pick<RedactionRegion, 'x0' | 'y0' | 'x1' | 'y1'>) {
    state.changed = true
    regions.value = regions.value.map((region) =>
      region.id === state.regionId ? { ...region, ...rect } : region,
    )
  }

  function onWindowPointerUp(): void {
    const state = drag.value
    drag.value = null
    detachWindowDrag()
    if (!state) return

    if (state.kind === 'create') {
      const rect = draft.value
      draft.value = null
      if (rect && rect.x1 - rect.x0 >= MIN_SIZE_PT && rect.y1 - rect.y0 >= MIN_SIZE_PT) {
        const region: RedactionRegion = {
          id: nextRegionId(),
          page: pageNumber.value,
          ...rect,
          ...defaults.value,
        }
        commit([...regions.value, region], state.previous)
        selectedId.value = region.id
      }
      return
    }
    // A move/resize that actually changed geometry becomes one undo step.
    if ((state.kind === 'move' || state.kind === 'resize') && state.changed) {
      pushHistory(state.previous)
    }
  }

  function attachWindowDrag(): void {
    globalThis.addEventListener('pointermove', onWindowPointerMove)
    globalThis.addEventListener('pointerup', onWindowPointerUp)
  }
  function detachWindowDrag(): void {
    globalThis.removeEventListener('pointermove', onWindowPointerMove)
    globalThis.removeEventListener('pointerup', onWindowPointerUp)
  }

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  function onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null
    if (target?.closest('input, textarea, select, [contenteditable]')) return

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      redo()
      return
    }
    if (!selectedRegion.value) return

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      deleteRegion(selectedRegion.value.id)
      return
    }
    if (event.key === 'Escape') {
      selectedId.value = null
      return
    }
    const step = event.shiftKey ? 10 : 1
    const nudges: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const nudge = nudges[event.key]
    if (nudge && metrics.value) {
      event.preventDefault()
      const region = selectedRegion.value
      const width = region.x1 - region.x0
      const height = region.y1 - region.y0
      const x0 = Math.min(Math.max(region.x0 + nudge[0], 0), metrics.value.pointWidth - width)
      const y0 = Math.min(Math.max(region.y0 + nudge[1], 0), metrics.value.pointHeight - height)
      commit(
        regions.value.map((candidate) =>
          candidate.id === region.id
            ? { ...candidate, x0, y0, x1: x0 + width, y1: y0 + height }
            : candidate,
        ),
      )
    }
  }

  // ─── Zoom / fit / navigation ───────────────────────────────────────────────
  function setScale(next: number): void {
    scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
  }
  function zoomIn(): void {
    fitMode.value = 'custom'
    setScale(scale.value * 1.25)
  }
  function zoomOut(): void {
    fitMode.value = 'custom'
    setScale(scale.value / 1.25)
  }

  /** Scale so the page fills the stage width (or fits entirely, for 'page'). */
  function applyFit(): void {
    const stage = stageEl.value
    const size = metrics.value
    if (!stage || !size || fitMode.value === 'custom') return
    const padding = 48
    const widthScale = (stage.clientWidth - padding) / size.pointWidth
    const heightScale = (stage.clientHeight - padding) / size.pointHeight
    setScale(fitMode.value === 'page' ? Math.min(widthScale, heightScale) : widthScale)
  }

  function fitWidth(): void {
    fitMode.value = 'width'
    applyFit()
  }
  function fitPage(): void {
    fitMode.value = 'page'
    applyFit()
  }

  function goToPage(next: number): void {
    pageNumber.value = Math.min(Math.max(1, Math.round(next) || 1), pageCount.value || 1)
  }

  function onPageInput(event: Event): void {
    goToPage(Number((event.target as HTMLInputElement).value))
  }

  function onStageWheel(event: WheelEvent): void {
    if (!event.ctrlKey) return
    event.preventDefault()
    if (event.deltaY < 0) zoomIn()
    else zoomOut()
  }

  // ─── Rendering pipeline ────────────────────────────────────────────────────
  let renderQueued = false
  async function render(): Promise<void> {
    const canvas = canvasEl.value
    if (!canvas || !pageCount.value) return
    if (renderQueued) return
    renderQueued = true
    await nextTick()
    renderQueued = false
    const rendered = await renderPage(canvas, pageNumber.value, scale.value)
    if (rendered) {
      metrics.value = rendered
      renderStamp.value += 1
    }
  }

  watch([pageNumber, scale], () => void render())

  // ─── Pixelate live previews ────────────────────────────────────────────────
  const pixelateEls = new Map<string, HTMLCanvasElement>()

  function setPixelateRef(id: string) {
    return (el: unknown) => {
      if (el) pixelateEls.set(id, el as HTMLCanvasElement)
      else pixelateEls.delete(id)
    }
  }

  function paintPixelatePreviews(): void {
    const source = canvasEl.value
    const size = metrics.value
    if (!source || !size || !source.width) return
    const dpr = source.width / size.cssWidth
    for (const region of pageRegions.value) {
      if (region.mode !== 'pixelate') continue
      const el = pixelateEls.get(region.id)
      if (!el) continue
      const cssW = (region.x1 - region.x0) * scale.value
      const cssH = (region.y1 - region.y0) * scale.value
      const blockCss = 10 // one mosaic block ≈ 10 css px
      const smallW = Math.max(1, Math.round(cssW / blockCss))
      const smallH = Math.max(1, Math.round(cssH / blockCss))
      el.width = smallW
      el.height = smallH
      const context = el.getContext('2d')
      if (!context) continue
      context.imageSmoothingEnabled = true
      context.drawImage(
        source,
        region.x0 * scale.value * dpr,
        region.y0 * scale.value * dpr,
        Math.max(1, cssW * dpr),
        Math.max(1, cssH * dpr),
        0,
        0,
        smallW,
        smallH,
      )
    }
  }

  watch(
    [
      renderStamp,
      () =>
        pageRegions.value
          .filter((region) => region.mode === 'pixelate')
          .map((region) => `${region.id}:${region.x0},${region.y0},${region.x1},${region.y1}`)
          .join('|'),
    ],
    () => void nextTick(paintPixelatePreviews),
  )

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  let resizeObserver: ResizeObserver | null = null

  async function loadFile(): Promise<void> {
    metrics.value = null
    pageNumber.value = 1
    selectedId.value = null
    past.value = []
    future.value = []
    await load(props.file)
    if (!pageCount.value) return
    // First fit needs page metrics: render once at scale 1, then fit.
    await render()
    fitWidth()
  }

  watch(() => props.file, () => void loadFile())

  onMounted(() => {
    void loadFile()
    globalThis.addEventListener('keydown', onKeyDown)
    resizeObserver = new ResizeObserver(() => applyFit())
    if (stageEl.value) resizeObserver.observe(stageEl.value)
  })

  onBeforeUnmount(() => {
    globalThis.removeEventListener('keydown', onKeyDown)
    detachWindowDrag()
    resizeObserver?.disconnect()
    destroy()
  })

  const zoomPercent = computed(() => `${Math.round(scale.value * 100)}%`)
  const totalRegions = computed(() => regions.value.length)
</script>

<template>
  <div class="rx">
    <!-- Toolbar -->
    <div class="rx__toolbar">
      <div class="rx__group" role="group" aria-label="Pointer tool">
        <button
          type="button"
          class="rx__tbtn"
          :class="{ 'rx__tbtn--active': toolMode === 'draw' }"
          title="Draw redaction boxes (drag on the page)"
          @click="toolMode = 'draw'"
        >
          <BaseIcon name="box-select" :size="16" /><span class="rx__tbtn-label">Draw</span>
        </button>
        <button
          type="button"
          class="rx__tbtn"
          :class="{ 'rx__tbtn--active': toolMode === 'pan' }"
          title="Pan / scroll the page"
          @click="toolMode = 'pan'"
        >
          <BaseIcon name="hand" :size="16" /><span class="rx__tbtn-label">Pan</span>
        </button>
      </div>

      <div class="rx__group" role="group" aria-label="Page navigation">
        <button
          type="button"
          class="rx__tbtn"
          title="Previous page"
          :disabled="pageNumber <= 1"
          @click="goToPage(pageNumber - 1)"
        >
          <BaseIcon name="chevron-left" :size="16" />
        </button>
        <span class="rx__pages">
          <input
            class="rx__page-input"
            type="number"
            :value="pageNumber"
            :min="1"
            :max="pageCount"
            aria-label="Page number"
            @change="onPageInput"
          />
          / {{ pageCount || '—' }}
        </span>
        <button
          type="button"
          class="rx__tbtn"
          title="Next page"
          :disabled="pageNumber >= pageCount"
          @click="goToPage(pageNumber + 1)"
        >
          <BaseIcon name="chevron-right" :size="16" />
        </button>
      </div>

      <div class="rx__group" role="group" aria-label="Zoom">
        <button type="button" class="rx__tbtn" title="Zoom out" @click="zoomOut">
          <BaseIcon name="zoom-out" :size="16" />
        </button>
        <span class="rx__zoom">{{ zoomPercent }}</span>
        <button type="button" class="rx__tbtn" title="Zoom in" @click="zoomIn">
          <BaseIcon name="zoom-in" :size="16" />
        </button>
        <button
          type="button"
          class="rx__tbtn"
          :class="{ 'rx__tbtn--active': fitMode === 'width' }"
          title="Fit width"
          @click="fitWidth"
        >
          <BaseIcon name="move-vertical" :size="16" style="transform: rotate(90deg)" />
        </button>
        <button
          type="button"
          class="rx__tbtn"
          :class="{ 'rx__tbtn--active': fitMode === 'page' }"
          title="Fit whole page"
          @click="fitPage"
        >
          <BaseIcon name="maximize" :size="16" />
        </button>
      </div>

      <div class="rx__group" role="group" aria-label="History">
        <button
          type="button"
          class="rx__tbtn"
          title="Undo (Ctrl+Z)"
          :disabled="!canUndo"
          @click="undo"
        >
          <BaseIcon name="undo" :size="16" />
        </button>
        <button
          type="button"
          class="rx__tbtn"
          title="Redo (Ctrl+Shift+Z)"
          :disabled="!canRedo"
          @click="redo"
        >
          <BaseIcon name="redo" :size="16" />
        </button>
      </div>

      <div class="rx__group rx__group--right" role="group" aria-label="Clear">
        <span v-if="totalRegions" class="rx__count">
          {{ totalRegions }} area{{ totalRegions === 1 ? '' : 's' }}
        </span>
        <button
          type="button"
          class="rx__tbtn"
          title="Remove all areas on this page"
          :disabled="!pageRegions.length"
          @click="clearPage"
        >
          <BaseIcon name="eraser" :size="16" /><span class="rx__tbtn-label">Clear page</span>
        </button>
        <button
          type="button"
          class="rx__tbtn"
          title="Remove all areas in the document"
          :disabled="!totalRegions"
          @click="resetAll"
        >
          <BaseIcon name="refresh" :size="16" /><span class="rx__tbtn-label">Reset</span>
        </button>
      </div>
    </div>

    <!-- Style bar: edits the selected region, or sets the style for new ones -->
    <div class="rx__stylebar">
      <div class="rx__style-main">
        <span class="rx__style-label">
          {{ selectedRegion ? 'Selected area' : 'New areas' }}
        </span>
        <SegmentedControl v-model="modeLabel" :options="modeOptions" class="rx__modes" />
        <template v-if="activeMode === 'color'">
          <BaseColorPicker
            :model-value="activeColor"
            label="Redaction color"
            class="rx__color"
            @update:model-value="applyStyle({ color: $event })"
          />
          <div class="rx__opacity">
            <span class="rx__opacity-label">Opacity</span>
            <BaseSlider
              :model-value="activeOpacity"
              :min="10"
              :max="100"
              unit="%"
              label="Fill opacity"
              @update:model-value="applyStyle({ opacity: $event / 100 })"
            />
          </div>
        </template>
        <BaseButton
          v-if="selectedRegion"
          variant="danger"
          size="sm"
          icon="trash"
          @click="deleteRegion(selectedRegion.id)"
        >
          Delete
        </BaseButton>
      </div>
      <p class="rx__hint">{{ MODE_HINTS[activeMode] }}</p>
    </div>

    <!-- Stage -->
    <div
      ref="stageEl"
      class="rx__stage"
      :class="{ 'rx__stage--pan': toolMode === 'pan', 'rx__stage--panning': drag?.kind === 'pan' }"
      @wheel="onStageWheel"
    >
      <div v-if="loading" class="rx__status">
        <BaseIcon name="refresh" :size="18" class="rx__spin" /> Loading preview…
      </div>
      <div v-else-if="error" class="rx__status rx__status--error">
        <BaseIcon name="alert-circle" :size="18" /> {{ error }}
      </div>

      <div
        v-show="!loading && !error"
        ref="pageEl"
        class="rx__page"
        :style="metrics ? { width: `${metrics.cssWidth}px`, height: `${metrics.cssHeight}px` } : {}"
      >
        <canvas ref="canvasEl" class="rx__canvas" />
        <div
          class="rx__overlay"
          :class="{ 'rx__overlay--draw': toolMode === 'draw' }"
          @pointerdown="onOverlayPointerDown"
        >
          <!-- Existing regions on this page -->
          <div
            v-for="region in pageRegions"
            :key="region.id"
            class="rx__region"
            :class="{ 'rx__region--selected': region.id === selectedId }"
            :style="regionBoxStyle(region)"
            @pointerdown="onRegionPointerDown($event, region)"
          >
            <canvas
              v-if="region.mode === 'pixelate'"
              :ref="setPixelateRef(region.id)"
              class="rx__pixelate"
            />
            <div class="rx__region-fill" :style="regionFillStyle(region)" />
            <template v-if="region.id === selectedId">
              <span
                v-for="handle in HANDLES"
                :key="handle"
                class="rx__handle"
                :class="`rx__handle--${handle}`"
                @pointerdown="onHandlePointerDown($event, region, handle)"
              />
            </template>
          </div>

          <!-- Box being drawn right now -->
          <div
            v-if="draft"
            class="rx__region rx__region--draft"
            :style="{
              left: `${draft.x0 * scale}px`,
              top: `${draft.y0 * scale}px`,
              width: `${(draft.x1 - draft.x0) * scale}px`,
              height: `${(draft.y1 - draft.y0) * scale}px`,
            }"
          />
        </div>

        <!-- First-use hint -->
        <div v-if="metrics && !totalRegions && !draft" class="rx__coach">
          <BaseIcon name="box-select" :size="15" />
          Click and drag on the page to mark an area for redaction
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .rx {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
  }

  /* Toolbar */
  .rx__toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 14px;
    padding: 10px 12px;
    border-bottom: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface-muted));
  }
  .rx__group {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .rx__group--right {
    margin-left: auto;
  }
  .rx__tbtn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 9px;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: hsl(var(--color-text-muted));
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .rx__tbtn:hover:not(:disabled) {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .rx__tbtn--active {
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
  }
  .rx__tbtn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .rx__pages {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .rx__page-input {
    width: 44px;
    padding: 5px 6px;
    text-align: center;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 13px;
    font-weight: 600;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .rx__page-input::-webkit-outer-spin-button,
  .rx__page-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .rx__zoom {
    min-width: 44px;
    text-align: center;
    font-size: 12.5px;
    font-weight: 700;
    color: hsl(var(--color-text-muted));
    font-variant-numeric: tabular-nums;
  }
  .rx__count {
    font-size: 12.5px;
    font-weight: 700;
    color: hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.1);
    padding: 4px 10px;
    border-radius: var(--radius-full);
    white-space: nowrap;
  }

  /* Style bar */
  .rx__stylebar {
    padding: 10px 12px 8px;
    border-bottom: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
  }
  .rx__style-main {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 14px;
  }
  .rx__style-label {
    font-size: 12.5px;
    font-weight: 700;
    color: hsl(var(--color-text));
    white-space: nowrap;
  }
  .rx__modes {
    flex: 0 1 auto;
  }
  .rx__color {
    flex: 0 1 auto;
  }
  .rx__opacity {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 190px;
    flex: 0 1 220px;
  }
  .rx__opacity-label {
    font-size: 12.5px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    white-space: nowrap;
  }
  .rx__opacity > :deep(.pf-slider) {
    flex: 1;
  }
  .rx__hint {
    margin: 8px 0 0;
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
  }

  /* Stage */
  .rx__stage {
    position: relative;
    overflow: auto;
    height: clamp(420px, 62vh, 760px);
    background:
      radial-gradient(hsl(var(--color-border)) 1px, transparent 1px) 0 0 / 22px 22px,
      hsl(var(--color-surface-muted));
    padding: 24px;
  }
  .rx__stage--pan {
    cursor: grab;
  }
  .rx__stage--panning {
    cursor: grabbing;
  }
  .rx__status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    height: 100%;
    font-size: 14px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
  }
  .rx__status--error {
    color: hsl(var(--color-danger));
    text-align: center;
    padding: 0 24px;
  }
  .rx__spin {
    animation: rx-rotate 1.2s linear infinite;
  }

  .rx__page {
    position: relative;
    margin: 0 auto;
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.12),
      0 8px 28px -8px rgb(0 0 0 / 0.25);
    border-radius: 3px;
    background: white;
    width: fit-content;
  }
  .rx__canvas {
    display: block;
    border-radius: 3px;
  }
  .rx__overlay {
    position: absolute;
    inset: 0;
    touch-action: none;
  }
  .rx__overlay--draw {
    cursor: crosshair;
  }

  /* Regions */
  .rx__region {
    position: absolute;
    cursor: move;
    outline: 1px solid rgb(0 0 0 / 0.25);
    outline-offset: 0;
  }
  .rx__region-fill {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .rx__region--selected {
    outline: 2px solid hsl(var(--color-primary));
    z-index: 2;
  }
  .rx__region--draft {
    background: hsl(var(--color-primary) / 0.15);
    outline: 2px dashed hsl(var(--color-primary));
    pointer-events: none;
    z-index: 3;
  }
  .rx__pixelate {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    pointer-events: none;
  }

  .rx__handle {
    position: absolute;
    width: 11px;
    height: 11px;
    border-radius: 3px;
    background: hsl(var(--color-surface));
    border: 2px solid hsl(var(--color-primary));
    z-index: 4;
  }
  .rx__handle--nw {
    top: -6px;
    left: -6px;
    cursor: nwse-resize;
  }
  .rx__handle--n {
    top: -6px;
    left: calc(50% - 5px);
    cursor: ns-resize;
  }
  .rx__handle--ne {
    top: -6px;
    right: -6px;
    cursor: nesw-resize;
  }
  .rx__handle--e {
    top: calc(50% - 5px);
    right: -6px;
    cursor: ew-resize;
  }
  .rx__handle--se {
    bottom: -6px;
    right: -6px;
    cursor: nwse-resize;
  }
  .rx__handle--s {
    bottom: -6px;
    left: calc(50% - 5px);
    cursor: ns-resize;
  }
  .rx__handle--sw {
    bottom: -6px;
    left: -6px;
    cursor: nesw-resize;
  }
  .rx__handle--w {
    top: calc(50% - 5px);
    left: -6px;
    cursor: ew-resize;
  }

  /* First-use coach mark */
  .rx__coach {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-text) / 0.85);
    color: hsl(var(--color-surface));
    font-size: 12.5px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    backdrop-filter: blur(4px);
  }

  @keyframes rx-rotate {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 640px) {
    .rx__tbtn-label {
      display: none;
    }
    .rx__stage {
      padding: 12px;
      height: clamp(340px, 55vh, 560px);
    }
  }
</style>
