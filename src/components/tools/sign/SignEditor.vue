<script setup lang="ts">
  /**
   * SignEditor — the interactive signing surface for one PDF.
   *
   * Live pdf.js preview with page navigation, zoom, pan and page thumbnails.
   * Signatures, initials, text, dates, stamps and images are placed by
   * drag-and-drop (or click) from the field palette, then moved, resized,
   * rotated, duplicated and deleted directly on the page with smart
   * alignment guides, optional snap-to-grid, undo/redo and a floating
   * context toolbar. Elements live in PDF points, top-left origin — see
   * sign-types.ts.
   */
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseSlider from '@components/ui/BaseSlider.vue'
  import { usePdfDocument, type RenderedPage } from '@components/tools/redact/usePdfDocument'
  import {
    DATE_FORMATS,
    INK_COLORS,
    STAMP_PRESETS,
    TEXT_FONTS,
    formatSignDate,
    isImageElement,
    measureTextElement,
    nextElementId,
    type SignElement,
  } from './sign-types'
  import SignatureCreatorModal from './SignatureCreatorModal.vue'
  import SignElementNode from './SignElementNode.vue'
  import { useSignatureLibrary, type SavedSignature } from './useSignatureLibrary'

  const props = defineProps<{ file: File }>()

  const elements = defineModel<SignElement[]>('elements', { required: true })
  const pageSizes = defineModel<Record<number, { width: number; height: number }>>('pageSizes', {
    required: true,
  })

  const { doc, pageCount, loading, error, load, renderPage, destroy } = usePdfDocument()
  const { saved, save: saveToLibrary, remove: removeSaved } = useSignatureLibrary()

  // ─── Viewer state ────────────────────────────────────────────────────────────
  const stageEl = ref<HTMLDivElement | null>(null)
  const pageEl = ref<HTMLDivElement | null>(null)
  const canvasEl = ref<HTMLCanvasElement | null>(null)

  const pageNumber = ref(1)
  const scale = ref(1)
  const fitMode = ref<'width' | 'page' | 'custom'>('width')
  const metrics = ref<RenderedPage | null>(null)
  const toolMode = ref<'select' | 'pan'>('select')
  const snapEnabled = ref(true)
  const gridEnabled = ref(false)

  const MIN_SCALE = 0.25
  const MAX_SCALE = 4
  const GRID_PT = 8
  const PAGE_MARGIN_PT = 36

  // ─── Selection ───────────────────────────────────────────────────────────────
  const selectedId = ref<string | null>(null)
  const selected = computed(
    () => elements.value.find((element) => element.id === selectedId.value) ?? null,
  )
  const pageElements = computed(() =>
    elements.value.filter((element) => element.page === pageNumber.value),
  )
  const elementCountByPage = computed(() => {
    const counts: Record<number, number> = {}
    for (const element of elements.value) counts[element.page] = (counts[element.page] ?? 0) + 1
    return counts
  })

  // ─── History (undo/redo) ─────────────────────────────────────────────────────
  const past = ref<string[]>([])
  const future = ref<string[]>([])
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  let lastCoalesce = { key: '', time: 0 }

  function snapshot(): string {
    return JSON.stringify(elements.value)
  }
  function pushHistory(previous: string): void {
    past.value.push(previous)
    if (past.value.length > 100) past.value.shift()
    future.value = []
  }
  function commit(next: SignElement[], previous: string = snapshot()): void {
    pushHistory(previous)
    elements.value = next
  }
  function undo(): void {
    if (!past.value.length) return
    future.value.push(snapshot())
    elements.value = JSON.parse(past.value.pop() as string)
    ensureSelectionExists()
  }
  function redo(): void {
    if (!future.value.length) return
    past.value.push(snapshot())
    elements.value = JSON.parse(future.value.pop() as string)
    ensureSelectionExists()
  }
  function ensureSelectionExists(): void {
    if (selectedId.value && !elements.value.some((element) => element.id === selectedId.value)) {
      selectedId.value = null
    }
  }

  // ─── Element updates ─────────────────────────────────────────────────────────
  /** Patch the selected element; rapid same-control tweaks share one undo step. */
  function updateSelected(patch: Partial<SignElement>, coalesceKey?: string): void {
    const element = selected.value
    if (!element) return
    const previous = snapshot()
    let merged = { ...element, ...patch }
    // Text-like boxes track their content: re-measure after any text change.
    if (
      !isImageElement(merged) &&
      ('text' in patch || 'font' in patch || 'fontSize' in patch || 'bold' in patch || 'italic' in patch)
    ) {
      const size = measureTextElement(merged)
      merged = { ...merged, width: size.width, height: size.height }
    }
    merged = clampToPage(merged)
    const next = elements.value.map((candidate) =>
      candidate.id === element.id ? merged : candidate,
    )
    const now = Date.now()
    const key = `${element.id}:${coalesceKey ?? Object.keys(patch).join(',')}`
    if (coalesceKey && lastCoalesce.key === key && now - lastCoalesce.time < 800) {
      elements.value = next
    } else {
      commit(next, previous)
    }
    lastCoalesce = { key, time: now }
  }

  function duplicateElement(id: string): void {
    const source = elements.value.find((element) => element.id === id)
    if (!source) return
    const copy = clampToPage({
      ...source,
      id: nextElementId(),
      x: source.x + 14,
      y: source.y + 14,
    })
    commit([...elements.value, copy])
    selectedId.value = copy.id
  }

  function deleteElement(id: string): void {
    commit(elements.value.filter((element) => element.id !== id))
    if (selectedId.value === id) selectedId.value = null
  }

  function clearAll(): void {
    if (!elements.value.length) return
    commit([])
    selectedId.value = null
  }

  function clampToPage(element: SignElement): SignElement {
    const size = pageSizes.value[element.page]
    if (!size) return element
    const width = Math.min(element.width, size.width)
    const height = element.width === width ? element.height : (element.height * width) / element.width
    return {
      ...element,
      width,
      height,
      x: Math.min(Math.max(element.x, 0), size.width - width),
      y: Math.min(Math.max(element.y, 0), size.height - height),
    }
  }

  // ─── Adding elements ─────────────────────────────────────────────────────────
  const creatorOpen = ref(false)
  const creatorKind = ref<'signature' | 'initials'>('signature')
  const imageInput = ref<HTMLInputElement | null>(null)

  function loadBitmapSize(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const image = new globalThis.Image()
      image.onload = () => resolve({ width: image.naturalWidth || 300, height: image.naturalHeight || 120 })
      image.onerror = () => resolve({ width: 300, height: 120 })
      image.src = src
    })
  }

  /** Center of the visible part of the page, in points. */
  function viewCenterPoint(): { x: number; y: number } {
    const stage = stageEl.value
    const size = pageSizes.value[pageNumber.value]
    if (!stage || !size) return { x: 200, y: 200 }
    const rect = stage.getBoundingClientRect()
    const pageRect = pageEl.value?.getBoundingClientRect()
    if (!pageRect) return { x: size.width / 2, y: size.height / 2 }
    const cx = (rect.left + rect.width / 2 - pageRect.left) / scale.value
    const cy = (rect.top + rect.height / 2 - pageRect.top) / scale.value
    return {
      x: Math.min(Math.max(cx, 0), size.width),
      y: Math.min(Math.max(cy, 0), size.height),
    }
  }

  function placeElement(element: SignElement): void {
    commit([...elements.value, clampToPage(element)])
    selectedId.value = element.id
  }

  async function addImageLike(
    type: 'signature' | 'initials' | 'image',
    src: string,
    at?: { x: number; y: number },
  ): Promise<void> {
    const natural = await loadBitmapSize(src)
    const size = pageSizes.value[pageNumber.value]
    const targetWidth = Math.min(
      type === 'initials' ? 90 : type === 'image' ? 220 : 190,
      (size?.width ?? 612) * 0.45,
    )
    const height = (targetWidth * natural.height) / natural.width
    const center = at ?? viewCenterPoint()
    placeElement({
      id: nextElementId(),
      type,
      page: pageNumber.value,
      x: center.x - targetWidth / 2,
      y: center.y - height / 2,
      width: targetWidth,
      height,
      rotation: 0,
      opacity: 1,
      src,
      naturalWidth: natural.width,
      naturalHeight: natural.height,
    })
  }

  function addTextLike(
    type: 'text' | 'date' | 'stamp',
    at?: { x: number; y: number },
    stampPreset?: { text: string; color: string },
  ): void {
    const base: SignElement = {
      id: nextElementId(),
      type,
      page: pageNumber.value,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      opacity: 1,
      text:
        type === 'date'
          ? formatSignDate('long')
          : type === 'stamp'
            ? (stampPreset?.text ?? 'APPROVED')
            : 'Add text',
      font: TEXT_FONTS[0].family,
      fontSize: type === 'stamp' ? 20 : 14,
      color: type === 'stamp' ? (stampPreset?.color ?? '#b91c1c') : '#1f2430',
      bold: false,
      italic: false,
      dateFormat: type === 'date' ? 'long' : undefined,
    }
    const size = measureTextElement(base)
    const center = at ?? viewCenterPoint()
    placeElement({
      ...base,
      width: size.width,
      height: size.height,
      x: center.x - size.width / 2,
      y: center.y - size.height / 2,
    })
  }

  function onSignatureCreated(payload: { dataUrl: string; save: boolean }): void {
    if (payload.save) saveToLibrary(creatorKind.value, payload.dataUrl)
    creatorOpen.value = false
    void addImageLike(creatorKind.value, payload.dataUrl, pendingDropPoint ?? undefined)
    pendingDropPoint = null
  }

  function openCreator(kind: 'signature' | 'initials'): void {
    creatorKind.value = kind
    creatorOpen.value = true
  }

  function onImagePicked(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0]
    ;(event.target as HTMLInputElement).value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') void addImageLike('image', reader.result)
    }
    reader.readAsDataURL(file)
  }

  // ─── Palette drag & drop ─────────────────────────────────────────────────────
  const DRAG_MIME = 'application/x-sign-item'
  /** Where a palette drop landed while the creator modal collects the artwork. */
  let pendingDropPoint: { x: number; y: number } | null = null

  interface PaletteDragPayload {
    kind: 'saved' | 'new-signature' | 'new-initials' | 'text' | 'date' | 'stamp'
    src?: string
    stamp?: { text: string; color: string }
  }

  function onPaletteDragStart(event: DragEvent, payload: PaletteDragPayload): void {
    event.dataTransfer?.setData(DRAG_MIME, JSON.stringify(payload))
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
  }

  const dropHover = ref(false)

  function onOverlayDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(DRAG_MIME)) {
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
      dropHover.value = true
    }
  }

  function onOverlayDrop(event: DragEvent): void {
    dropHover.value = false
    const raw = event.dataTransfer?.getData(DRAG_MIME)
    if (!raw) return
    event.preventDefault()
    const payload = JSON.parse(raw) as PaletteDragPayload
    const point = clientToPagePoints(event.clientX, event.clientY)
    if (payload.kind === 'saved' && payload.src) {
      void addImageLike('signature', payload.src, point)
    } else if (payload.kind === 'new-signature' || payload.kind === 'new-initials') {
      pendingDropPoint = point
      openCreator(payload.kind === 'new-initials' ? 'initials' : 'signature')
    } else if (payload.kind === 'stamp') {
      addTextLike('stamp', point, payload.stamp)
    } else if (payload.kind === 'text' || payload.kind === 'date') {
      addTextLike(payload.kind, point)
    }
  }

  function useSaved(item: SavedSignature): void {
    void addImageLike(item.kind, item.dataUrl)
  }

  // ─── Coordinates, guides & snapping ─────────────────────────────────────────
  function clientToPagePoints(clientX: number, clientY: number): { x: number; y: number } {
    const rect = pageEl.value?.getBoundingClientRect()
    if (!rect || !metrics.value) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left) / scale.value,
      y: (clientY - rect.top) / scale.value,
    }
  }

  /** Active alignment guides (point coordinates on the current page). */
  const guides = ref<{ x: number | null; y: number | null }>({ x: null, y: null })

  interface SnapResult {
    x: number
    y: number
    guideX: number | null
    guideY: number | null
  }

  /** Snap a proposed top-left position against page/element alignment lines. */
  function snapPosition(element: SignElement, nx: number, ny: number, disable: boolean): SnapResult {
    const size = pageSizes.value[element.page]
    if (!size || disable || !snapEnabled.value) {
      return { x: gridSnap(nx), y: gridSnap(ny), guideX: null, guideY: null }
    }
    const tolerance = 6 / scale.value
    const xTargets = [0, PAGE_MARGIN_PT, size.width / 2, size.width - PAGE_MARGIN_PT, size.width]
    const yTargets = [0, PAGE_MARGIN_PT, size.height / 2, size.height - PAGE_MARGIN_PT, size.height]
    for (const other of pageElements.value) {
      if (other.id === element.id) continue
      xTargets.push(other.x, other.x + other.width / 2, other.x + other.width)
      yTargets.push(other.y, other.y + other.height / 2, other.y + other.height)
    }

    let bestX: { delta: number; x: number; guide: number } | null = null
    for (const target of xTargets) {
      for (const anchor of [0, element.width / 2, element.width]) {
        const delta = Math.abs(nx + anchor - target)
        if (delta < tolerance && (!bestX || delta < bestX.delta)) {
          bestX = { delta, x: target - anchor, guide: target }
        }
      }
    }
    let bestY: { delta: number; y: number; guide: number } | null = null
    for (const target of yTargets) {
      for (const anchor of [0, element.height / 2, element.height]) {
        const delta = Math.abs(ny + anchor - target)
        if (delta < tolerance && (!bestY || delta < bestY.delta)) {
          bestY = { delta, y: target - anchor, guide: target }
        }
      }
    }
    return {
      x: bestX ? bestX.x : gridSnap(nx),
      y: bestY ? bestY.y : gridSnap(ny),
      guideX: bestX?.guide ?? null,
      guideY: bestY?.guide ?? null,
    }
  }

  function gridSnap(value: number): number {
    return gridEnabled.value ? Math.round(value / GRID_PT) * GRID_PT : value
  }

  // ─── Drag interactions (move / resize / rotate / pan) ───────────────────────
  type Corner = 'nw' | 'ne' | 'se' | 'sw'

  interface DragState {
    kind: 'move' | 'resize' | 'rotate' | 'pan'
    elementId?: string
    origin?: SignElement
    corner?: Corner
    startX: number
    startY: number
    scrollLeft?: number
    scrollTop?: number
    previous: string
    changed: boolean
  }
  const drag = ref<DragState | null>(null)
  const interacting = computed(
    () => !!drag.value && drag.value.kind !== 'pan' && drag.value.changed,
  )

  function onElementGrab(event: PointerEvent, element: SignElement): void {
    if (event.button !== 0) return
    if (toolMode.value === 'pan') return startPan(event)
    event.stopPropagation()
    selectedId.value = element.id
    const point = clientToPagePoints(event.clientX, event.clientY)
    drag.value = {
      kind: 'move',
      elementId: element.id,
      origin: { ...element },
      startX: point.x,
      startY: point.y,
      previous: snapshot(),
      changed: false,
    }
    attachWindowDrag()
  }

  function onElementResize(event: PointerEvent, element: SignElement, corner: Corner): void {
    if (event.button !== 0) return
    selectedId.value = element.id
    const point = clientToPagePoints(event.clientX, event.clientY)
    drag.value = {
      kind: 'resize',
      elementId: element.id,
      origin: { ...element },
      corner,
      startX: point.x,
      startY: point.y,
      previous: snapshot(),
      changed: false,
    }
    attachWindowDrag()
  }

  function onElementRotate(event: PointerEvent, element: SignElement): void {
    if (event.button !== 0) return
    selectedId.value = element.id
    drag.value = {
      kind: 'rotate',
      elementId: element.id,
      origin: { ...element },
      startX: event.clientX,
      startY: event.clientY,
      previous: snapshot(),
      changed: false,
    }
    attachWindowDrag()
  }

  function onOverlayPointerDown(event: PointerEvent): void {
    if (event.button === 1 || toolMode.value === 'pan') {
      startPan(event)
      return
    }
    if (event.button === 0) selectedId.value = null
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

  function mutateElement(state: DragState, patch: Partial<SignElement>): void {
    state.changed = true
    elements.value = elements.value.map((element) =>
      element.id === state.elementId ? { ...element, ...patch } : element,
    )
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

    const origin = state.origin
    const size = origin ? pageSizes.value[origin.page] : null
    if (!origin || !size) return

    if (state.kind === 'move') {
      const point = clientToPagePoints(event.clientX, event.clientY)
      const rawX = origin.x + (point.x - state.startX)
      const rawY = origin.y + (point.y - state.startY)
      const snapped = snapPosition(origin, rawX, rawY, event.altKey)
      const x = Math.min(Math.max(snapped.x, 0), size.width - origin.width)
      const y = Math.min(Math.max(snapped.y, 0), size.height - origin.height)
      guides.value = {
        x: x === snapped.x ? snapped.guideX : null,
        y: y === snapped.y ? snapped.guideY : null,
      }
      mutateElement(state, { x, y })
      return
    }

    if (state.kind === 'resize') {
      const point = clientToPagePoints(event.clientX, event.clientY)
      const rotated = (origin.rotation ?? 0) % 360 !== 0
      // Fixed anchor: the opposite corner (or the center once rotated, which
      // avoids drift without rotating the resize math).
      const anchor = rotated
        ? { x: origin.x + origin.width / 2, y: origin.y + origin.height / 2 }
        : {
            x: state.corner?.includes('w') ? origin.x + origin.width : origin.x,
            y: state.corner?.includes('n') ? origin.y + origin.height : origin.y,
          }
      const factorX = Math.abs(point.x - anchor.x) / (rotated ? origin.width / 2 : origin.width)
      const factorY = Math.abs(point.y - anchor.y) / (rotated ? origin.height / 2 : origin.height)
      let factor = Math.max(factorX, factorY)
      const minWidth = 14
      factor = Math.max(factor, minWidth / origin.width)
      // Keep the element inside the page.
      const maxFactorW = size.width / origin.width
      const maxFactorH = size.height / origin.height
      factor = Math.min(factor, maxFactorW, maxFactorH)

      const width = origin.width * factor
      const height = origin.height * factor
      let x: number
      let y: number
      if (rotated) {
        x = anchor.x - width / 2
        y = anchor.y - height / 2
      } else {
        x = state.corner?.includes('w') ? anchor.x - width : anchor.x
        y = state.corner?.includes('n') ? anchor.y - height : anchor.y
      }
      x = Math.min(Math.max(x, 0), size.width - width)
      y = Math.min(Math.max(y, 0), size.height - height)
      const patch: Partial<SignElement> = { x, y, width, height }
      if (!isImageElement(origin)) patch.fontSize = (origin.fontSize ?? 16) * factor
      mutateElement(state, patch)
      return
    }

    // Rotate: angle from the element center to the pointer.
    const rect = pageEl.value?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + (origin.x + origin.width / 2) * scale.value
    const centerY = rect.top + (origin.y + origin.height / 2) * scale.value
    const startAngle = Math.atan2(state.startY - centerY, state.startX - centerX)
    const nowAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX)
    let rotation = (origin.rotation ?? 0) + ((nowAngle - startAngle) * 180) / Math.PI
    rotation = ((rotation % 360) + 360) % 360
    // Gentle magnetism to the compass points.
    for (const target of [0, 45, 90, 135, 180, 225, 270, 315, 360]) {
      if (Math.abs(rotation - target) < 4) {
        rotation = target % 360
        break
      }
    }
    mutateElement(state, { rotation })
  }

  function onWindowPointerUp(): void {
    const state = drag.value
    drag.value = null
    guides.value = { x: null, y: null }
    detachWindowDrag()
    if (state && state.kind !== 'pan' && state.changed) pushHistory(state.previous)
  }

  function attachWindowDrag(): void {
    globalThis.addEventListener('pointermove', onWindowPointerMove)
    globalThis.addEventListener('pointerup', onWindowPointerUp)
  }
  function detachWindowDrag(): void {
    globalThis.removeEventListener('pointermove', onWindowPointerMove)
    globalThis.removeEventListener('pointerup', onWindowPointerUp)
  }

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────
  function onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null
    if (target?.closest('input, textarea, select, [contenteditable]')) return

    const isMod = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()
    if (isMod && key === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
      return
    }
    if (isMod && key === 'y') {
      event.preventDefault()
      redo()
      return
    }
    if (isMod && key === 'd' && selected.value) {
      event.preventDefault()
      duplicateElement(selected.value.id)
      return
    }
    if (!selected.value) return
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      deleteElement(selected.value.id)
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
    if (nudge) {
      event.preventDefault()
      updateSelected({ x: selected.value.x + nudge[0], y: selected.value.y + nudge[1] }, 'nudge')
    }
  }

  // ─── Zoom / fit / navigation ─────────────────────────────────────────────────
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
  function applyFit(): void {
    const stage = stageEl.value
    const size = metrics.value
    if (!stage || !size || fitMode.value === 'custom') return
    const padding = 56
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

  // ─── Render pipeline ─────────────────────────────────────────────────────────
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
      pageSizes.value = {
        ...pageSizes.value,
        [pageNumber.value]: { width: rendered.pointWidth, height: rendered.pointHeight },
      }
    }
  }
  watch([pageNumber, scale], () => void render())

  // ─── Page thumbnails ─────────────────────────────────────────────────────────
  const THUMB_WIDTH = 54
  const MAX_THUMBS = 40
  const thumbs = ref<string[]>([])

  async function renderThumbs(): Promise<void> {
    const document = doc.value
    if (!document) return
    const total = Math.min(pageCount.value, MAX_THUMBS)
    const list: string[] = []
    for (let index = 1; index <= total; index += 1) {
      try {
        const page = await document.getPage(index)
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: (THUMB_WIDTH * 2) / base.width })
        const canvas = globalThis.document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        await page.render({ canvas, viewport }).promise
        list.push(canvas.toDataURL('image/jpeg', 0.7))
      } catch {
        list.push('')
      }
      thumbs.value = [...list]
    }
  }

  // ─── Context toolbar helpers ─────────────────────────────────────────────────
  const fontLabel = computed({
    get: () =>
      TEXT_FONTS.find((font) => font.family === selected.value?.font)?.label ?? TEXT_FONTS[0].label,
    set: (label: string) => {
      const font = TEXT_FONTS.find((candidate) => candidate.label === label)
      if (font) updateSelected({ font: font.family })
    },
  })

  const dateFormatLabel = computed({
    get: () =>
      DATE_FORMATS.find((format) => format.key === selected.value?.dateFormat)?.label ??
      DATE_FORMATS[0].label,
    set: (label: string) => {
      const format = DATE_FORMATS.find((candidate) => candidate.label === label)
      if (format) updateSelected({ dateFormat: format.key, text: formatSignDate(format.key) })
    },
  })

  function stepFontSize(direction: 1 | -1): void {
    const current = selected.value?.fontSize ?? 16
    updateSelected({ fontSize: Math.min(96, Math.max(7, current + direction)) }, 'fontSize')
  }

  const selectedOpacity = computed(() => Math.round((selected.value?.opacity ?? 1) * 100))

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  let resizeObserver: ResizeObserver | null = null

  async function loadFile(): Promise<void> {
    metrics.value = null
    pageNumber.value = 1
    selectedId.value = null
    past.value = []
    future.value = []
    thumbs.value = []
    await load(props.file)
    if (!pageCount.value) return
    await render()
    fitWidth()
    void renderThumbs()
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
  const totalElements = computed(() => elements.value.length)
</script>

<template>
  <div class="se">
    <input ref="imageInput" type="file" accept=".png,.jpg,.jpeg" class="se__hidden" @change="onImagePicked" />

    <!-- ══ Top toolbar ══ -->
    <div class="se__toolbar">
      <div class="se__group" role="group" aria-label="Pointer tool">
        <button
          type="button"
          class="se__tbtn"
          :class="{ 'se__tbtn--active': toolMode === 'select' }"
          title="Select and move elements"
          @click="toolMode = 'select'"
        >
          <BaseIcon name="box-select" :size="16" /><span class="se__tbtn-label">Select</span>
        </button>
        <button
          type="button"
          class="se__tbtn"
          :class="{ 'se__tbtn--active': toolMode === 'pan' }"
          title="Pan / scroll the page"
          @click="toolMode = 'pan'"
        >
          <BaseIcon name="hand" :size="16" /><span class="se__tbtn-label">Pan</span>
        </button>
      </div>

      <div class="se__group" role="group" aria-label="Page navigation">
        <button
          type="button"
          class="se__tbtn"
          title="Previous page"
          :disabled="pageNumber <= 1"
          @click="goToPage(pageNumber - 1)"
        >
          <BaseIcon name="chevron-left" :size="16" />
        </button>
        <span class="se__pages">
          <input
            class="se__page-input"
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
          class="se__tbtn"
          title="Next page"
          :disabled="pageNumber >= pageCount"
          @click="goToPage(pageNumber + 1)"
        >
          <BaseIcon name="chevron-right" :size="16" />
        </button>
      </div>

      <div class="se__group" role="group" aria-label="Zoom">
        <button type="button" class="se__tbtn" title="Zoom out" @click="zoomOut">
          <BaseIcon name="zoom-out" :size="16" />
        </button>
        <span class="se__zoom">{{ zoomPercent }}</span>
        <button type="button" class="se__tbtn" title="Zoom in" @click="zoomIn">
          <BaseIcon name="zoom-in" :size="16" />
        </button>
        <button
          type="button"
          class="se__tbtn"
          :class="{ 'se__tbtn--active': fitMode === 'width' }"
          title="Fit width"
          @click="fitWidth"
        >
          <BaseIcon name="move-vertical" :size="16" style="transform: rotate(90deg)" />
        </button>
        <button
          type="button"
          class="se__tbtn"
          :class="{ 'se__tbtn--active': fitMode === 'page' }"
          title="Fit whole page"
          @click="fitPage"
        >
          <BaseIcon name="maximize" :size="16" />
        </button>
      </div>

      <div class="se__group" role="group" aria-label="Snapping">
        <button
          type="button"
          class="se__tbtn"
          :class="{ 'se__tbtn--active': snapEnabled }"
          title="Smart alignment guides (hold Alt to bypass)"
          @click="snapEnabled = !snapEnabled"
        >
          <BaseIcon name="magnet" :size="16" /><span class="se__tbtn-label">Snap</span>
        </button>
        <button
          type="button"
          class="se__tbtn"
          :class="{ 'se__tbtn--active': gridEnabled }"
          title="Snap to grid"
          @click="gridEnabled = !gridEnabled"
        >
          <BaseIcon name="grid" :size="16" /><span class="se__tbtn-label">Grid</span>
        </button>
      </div>

      <div class="se__group" role="group" aria-label="History">
        <button type="button" class="se__tbtn" title="Undo (Ctrl+Z)" :disabled="!canUndo" @click="undo">
          <BaseIcon name="undo" :size="16" />
        </button>
        <button type="button" class="se__tbtn" title="Redo (Ctrl+Shift+Z)" :disabled="!canRedo" @click="redo">
          <BaseIcon name="redo" :size="16" />
        </button>
      </div>

      <div class="se__group se__group--right">
        <span v-if="totalElements" class="se__count">
          {{ totalElements }} element{{ totalElements === 1 ? '' : 's' }}
        </span>
        <button
          type="button"
          class="se__tbtn"
          title="Remove every element in the document"
          :disabled="!totalElements"
          @click="clearAll"
        >
          <BaseIcon name="eraser" :size="16" /><span class="se__tbtn-label">Clear all</span>
        </button>
      </div>
    </div>

    <div class="se__body">
      <!-- ══ Field palette ══ -->
      <aside class="se__palette" aria-label="Signing fields">
        <div class="se__palette-title">Fields</div>
        <div class="se__fields">
          <button
            type="button"
            class="se__field"
            draggable="true"
            title="Drag onto the page, or click to place"
            @dragstart="onPaletteDragStart($event, { kind: 'new-signature' })"
            @click="openCreator('signature')"
          >
            <span class="se__field-icon se__field-icon--sig"><BaseIcon name="file-signature" :size="17" /></span>
            <span class="se__field-name">Signature</span>
            <BaseIcon name="plus" :size="13" class="se__field-plus" />
          </button>
          <button
            type="button"
            class="se__field"
            draggable="true"
            title="Drag onto the page, or click to place"
            @dragstart="onPaletteDragStart($event, { kind: 'new-initials' })"
            @click="openCreator('initials')"
          >
            <span class="se__field-icon se__field-icon--ini"><BaseIcon name="type" :size="16" /></span>
            <span class="se__field-name">Initials</span>
            <BaseIcon name="plus" :size="13" class="se__field-plus" />
          </button>
          <button
            type="button"
            class="se__field"
            draggable="true"
            title="Drag onto the page, or click to place"
            @dragstart="onPaletteDragStart($event, { kind: 'text' })"
            @click="addTextLike('text')"
          >
            <span class="se__field-icon se__field-icon--txt"><BaseIcon name="edit" :size="16" /></span>
            <span class="se__field-name">Text</span>
            <BaseIcon name="plus" :size="13" class="se__field-plus" />
          </button>
          <button
            type="button"
            class="se__field"
            draggable="true"
            title="Drag onto the page, or click to place"
            @dragstart="onPaletteDragStart($event, { kind: 'date' })"
            @click="addTextLike('date')"
          >
            <span class="se__field-icon se__field-icon--date"><BaseIcon name="calendar" :size="16" /></span>
            <span class="se__field-name">Date</span>
            <BaseIcon name="plus" :size="13" class="se__field-plus" />
          </button>
          <button
            type="button"
            class="se__field"
            title="Add an image from your device"
            @click="imageInput?.click()"
          >
            <span class="se__field-icon se__field-icon--img"><BaseIcon name="image" :size="16" /></span>
            <span class="se__field-name">Image</span>
            <BaseIcon name="plus" :size="13" class="se__field-plus" />
          </button>
        </div>

        <div class="se__palette-title">Stamps</div>
        <div class="se__stamps">
          <button
            v-for="stamp in STAMP_PRESETS"
            :key="stamp.text"
            type="button"
            class="se__stamp"
            :style="{ color: stamp.color, borderColor: stamp.color }"
            draggable="true"
            :title="`Place a ${stamp.text} stamp`"
            @dragstart="onPaletteDragStart($event, { kind: 'stamp', stamp })"
            @click="addTextLike('stamp', undefined, stamp)"
          >
            {{ stamp.text }}
          </button>
        </div>

        <template v-if="saved.length">
          <div class="se__palette-title">Saved</div>
          <div class="se__saved-list">
            <div
              v-for="item in saved"
              :key="item.id"
              class="se__saved"
              draggable="true"
              role="button"
              tabindex="0"
              :title="`Place saved ${item.kind}`"
              @dragstart="onPaletteDragStart($event, { kind: 'saved', src: item.dataUrl })"
              @click="useSaved(item)"
              @keydown.enter.prevent="useSaved(item)"
            >
              <img :src="item.dataUrl" alt="Saved signature" />
              <button
                type="button"
                class="se__saved-remove"
                :aria-label="`Delete saved ${item.kind}`"
                @click.stop="removeSaved(item.id)"
              >
                <BaseIcon name="x" :size="11" />
              </button>
            </div>
          </div>
        </template>
      </aside>

      <!-- ══ Stage ══ -->
      <div class="se__main">
        <!-- Floating context toolbar -->
        <Transition name="se-ctx">
          <div v-if="selected" class="se__ctx" role="toolbar" aria-label="Element options">
            <template v-if="selected.type === 'text' || selected.type === 'date'">
              <input
                v-if="selected.type === 'text'"
                class="se__ctx-input"
                type="text"
                :value="selected.text"
                maxlength="120"
                aria-label="Text content"
                @input="updateSelected({ text: ($event.target as HTMLInputElement).value }, 'text')"
              />
              <select
                v-else
                class="se__ctx-select"
                :value="dateFormatLabel"
                aria-label="Date format"
                @change="dateFormatLabel = ($event.target as HTMLSelectElement).value"
              >
                <option v-for="format in DATE_FORMATS" :key="format.key">{{ format.label }}</option>
              </select>
              <select
                class="se__ctx-select"
                :value="fontLabel"
                aria-label="Font"
                @change="fontLabel = ($event.target as HTMLSelectElement).value"
              >
                <option v-for="font in TEXT_FONTS" :key="font.label">{{ font.label }}</option>
              </select>
              <div class="se__ctx-size" role="group" aria-label="Font size">
                <button type="button" class="se__ctx-btn" title="Smaller" @click="stepFontSize(-1)">−</button>
                <span class="se__ctx-size-value">{{ Math.round(selected.fontSize ?? 16) }}</span>
                <button type="button" class="se__ctx-btn" title="Larger" @click="stepFontSize(1)">+</button>
              </div>
              <button
                v-if="selected.type === 'text'"
                type="button"
                class="se__ctx-btn"
                :class="{ 'se__ctx-btn--active': selected.bold }"
                title="Bold"
                @click="updateSelected({ bold: !selected.bold })"
              >
                <BaseIcon name="bold" :size="14" />
              </button>
              <button
                v-if="selected.type === 'text'"
                type="button"
                class="se__ctx-btn"
                :class="{ 'se__ctx-btn--active': selected.italic }"
                title="Italic"
                @click="updateSelected({ italic: !selected.italic })"
              >
                <BaseIcon name="italic" :size="14" />
              </button>
            </template>

            <div
              v-if="!isImageElement(selected)"
              class="se__ctx-inks"
              role="group"
              aria-label="Color"
            >
              <button
                v-for="ink in INK_COLORS"
                :key="ink.value"
                type="button"
                class="se__ctx-ink"
                :class="{ 'se__ctx-ink--active': selected.color === ink.value }"
                :style="{ background: ink.value }"
                :title="ink.label"
                @click="updateSelected({ color: ink.value })"
              />
            </div>

            <div class="se__ctx-opacity">
              <span class="se__ctx-mini-label">Opacity</span>
              <BaseSlider
                :model-value="selectedOpacity"
                :min="20"
                :max="100"
                unit="%"
                label="Element opacity"
                @update:model-value="updateSelected({ opacity: $event / 100 }, 'opacity')"
              />
            </div>

            <button
              v-if="selected.rotation"
              type="button"
              class="se__ctx-btn"
              title="Reset rotation"
              @click="updateSelected({ rotation: 0 })"
            >
              <BaseIcon name="rotate-cw" :size="14" />
              <span class="se__ctx-rot">{{ Math.round(selected.rotation) }}°</span>
            </button>
          </div>
        </Transition>

        <div
          ref="stageEl"
          class="se__stage"
          :class="{
            'se__stage--pan': toolMode === 'pan',
            'se__stage--panning': drag?.kind === 'pan',
          }"
          @wheel="onStageWheel"
        >
          <div v-if="loading" class="se__status">
            <BaseIcon name="refresh" :size="18" class="se__spin" /> Loading preview…
          </div>
          <div v-else-if="error" class="se__status se__status--error">
            <BaseIcon name="alert-circle" :size="18" /> {{ error }}
          </div>

          <div
            v-show="!loading && !error"
            ref="pageEl"
            class="se__page"
            :class="{ 'se__page--drop': dropHover }"
            :style="metrics ? { width: `${metrics.cssWidth}px`, height: `${metrics.cssHeight}px` } : {}"
          >
            <canvas ref="canvasEl" class="se__canvas" />

            <!-- Snap grid preview -->
            <div
              v-if="gridEnabled"
              class="se__grid"
              :style="{ backgroundSize: `${GRID_PT * scale}px ${GRID_PT * scale}px` }"
              aria-hidden="true"
            />

            <div
              class="se__overlay"
              @pointerdown="onOverlayPointerDown"
              @dragover="onOverlayDragOver"
              @dragleave="dropHover = false"
              @drop="onOverlayDrop"
            >
              <SignElementNode
                v-for="element in pageElements"
                :key="element.id"
                :element="element"
                :scale="scale"
                :selected="element.id === selectedId"
                :interacting="interacting"
                @grab="onElementGrab($event, element)"
                @resize="(event, corner) => onElementResize(event, element, corner)"
                @rotate="onElementRotate($event, element)"
                @duplicate="duplicateElement(element.id)"
                @remove="deleteElement(element.id)"
              />

              <!-- Alignment guides -->
              <div
                v-if="guides.x !== null"
                class="se__guide se__guide--v"
                :style="{ left: `${guides.x * scale}px` }"
                aria-hidden="true"
              />
              <div
                v-if="guides.y !== null"
                class="se__guide se__guide--h"
                :style="{ top: `${guides.y * scale}px` }"
                aria-hidden="true"
              />
            </div>

            <!-- First-use coach mark -->
            <div v-if="metrics && !totalElements && !dropHover" class="se__coach">
              <BaseIcon name="file-signature" :size="15" />
              Drag a field onto the page — or click one to place it
            </div>
          </div>
        </div>

        <!-- ══ Page thumbnails ══ -->
        <div v-if="pageCount > 1" class="se__thumbs" role="tablist" aria-label="Pages">
          <button
            v-for="index in Math.min(pageCount, MAX_THUMBS)"
            :key="index"
            type="button"
            role="tab"
            class="se__thumb"
            :class="{ 'se__thumb--active': index === pageNumber }"
            :aria-selected="index === pageNumber"
            :title="`Page ${index}`"
            @click="goToPage(index)"
          >
            <span class="se__thumb-frame">
              <img v-if="thumbs[index - 1]" :src="thumbs[index - 1]" alt="" />
              <span v-else class="se__thumb-skeleton" />
              <span v-if="elementCountByPage[index]" class="se__thumb-badge">
                {{ elementCountByPage[index] }}
              </span>
            </span>
            <span class="se__thumb-number">{{ index }}</span>
          </button>
          <span v-if="pageCount > MAX_THUMBS" class="se__thumb-more">
            +{{ pageCount - MAX_THUMBS }} more
          </span>
        </div>
      </div>
    </div>

    <SignatureCreatorModal
      v-if="creatorOpen"
      :kind="creatorKind"
      @close="((creatorOpen = false), (pendingDropPoint = null))"
      @created="onSignatureCreated"
    />
  </div>
</template>

<style scoped>
  .se {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
  }
  .se__hidden {
    display: none;
  }

  /* ── Toolbar ── */
  .se__toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 12px;
    padding: 10px 12px;
    border-bottom: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface-muted));
  }
  .se__group {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .se__group--right {
    margin-left: auto;
  }
  .se__tbtn {
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
  .se__tbtn:hover:not(:disabled) {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .se__tbtn--active {
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
  }
  .se__tbtn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .se__pages {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .se__page-input {
    width: 44px;
    padding: 5px 6px;
    text-align: center;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 13px;
    font-weight: 600;
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .se__page-input::-webkit-outer-spin-button,
  .se__page-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .se__zoom {
    min-width: 44px;
    text-align: center;
    font-size: 12.5px;
    font-weight: 700;
    color: hsl(var(--color-text-muted));
    font-variant-numeric: tabular-nums;
  }
  .se__count {
    font-size: 12.5px;
    font-weight: 700;
    color: hsl(var(--color-purple));
    background: hsl(var(--color-purple) / 0.1);
    padding: 4px 10px;
    border-radius: var(--radius-full);
    white-space: nowrap;
  }

  /* ── Body layout ── */
  .se__body {
    display: flex;
    align-items: stretch;
    min-height: 0;
  }

  /* ── Palette ── */
  .se__palette {
    flex: 0 0 200px;
    padding: 14px 12px;
    border-right: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    overflow-y: auto;
    max-height: clamp(480px, 66vh, 820px);
  }
  .se__palette-title {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: hsl(var(--color-text-faint));
    margin: 14px 0 8px;
  }
  .se__palette-title:first-child {
    margin-top: 0;
  }
  .se__fields {
    display: grid;
    gap: 6px;
  }
  .se__field {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 8px 9px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 13px;
    font-weight: 600;
    cursor: grab;
    transition:
      border-color 0.15s,
      box-shadow 0.15s,
      transform 0.15s;
  }
  .se__field:hover {
    border-color: hsl(var(--color-primary) / 0.5);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }
  .se__field:active {
    cursor: grabbing;
  }
  .se__field-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    flex: none;
  }
  .se__field-icon--sig {
    color: #7c3aed;
    background: rgb(124 58 237 / 0.12);
  }
  .se__field-icon--ini {
    color: #1d4ed8;
    background: rgb(29 78 216 / 0.12);
  }
  .se__field-icon--txt {
    color: #0e7490;
    background: rgb(14 116 144 / 0.12);
  }
  .se__field-icon--date {
    color: #b45309;
    background: rgb(180 83 9 / 0.12);
  }
  .se__field-icon--img {
    color: #15803d;
    background: rgb(21 128 61 / 0.12);
  }
  .se__field-name {
    flex: 1;
    text-align: left;
  }
  .se__field-plus {
    color: hsl(var(--color-text-faint));
  }

  .se__stamps {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .se__stamp {
    padding: 4px 8px;
    border: 1.5px solid;
    border-radius: 6px;
    background: transparent;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.06em;
    cursor: grab;
    transition:
      transform 0.15s,
      box-shadow 0.15s;
  }
  .se__stamp:hover {
    transform: translateY(-1px) rotate(-2deg);
    box-shadow: var(--shadow-sm);
  }

  .se__saved-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .se__saved {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 52px;
    padding: 6px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface-muted));
    cursor: grab;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .se__saved:hover {
    border-color: hsl(var(--color-primary) / 0.5);
    box-shadow: var(--shadow-sm);
  }
  .se__saved img {
    max-width: 100%;
    max-height: 100%;
    pointer-events: none;
  }
  .se__saved-remove {
    position: absolute;
    top: -6px;
    right: -6px;
    display: none;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 50%;
    background: hsl(var(--color-danger));
    color: white;
    cursor: pointer;
  }
  .se__saved:hover .se__saved-remove {
    display: flex;
  }

  /* ── Main / stage ── */
  .se__main {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .se__stage {
    position: relative;
    overflow: auto;
    flex: 1;
    height: clamp(420px, 62vh, 760px);
    background:
      radial-gradient(hsl(var(--color-border)) 1px, transparent 1px) 0 0 / 22px 22px,
      hsl(var(--color-surface-muted));
    padding: 26px;
  }
  .se__stage--pan {
    cursor: grab;
  }
  .se__stage--panning {
    cursor: grabbing;
  }
  .se__status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    height: 100%;
    font-size: 14px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
  }
  .se__status--error {
    color: hsl(var(--color-danger));
    text-align: center;
    padding: 0 24px;
  }
  .se__spin {
    animation: se-rotate 1.2s linear infinite;
  }

  .se__page {
    position: relative;
    margin: 0 auto;
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.12),
      0 8px 28px -8px rgb(0 0 0 / 0.25);
    border-radius: 3px;
    background: white;
    width: fit-content;
    transition: box-shadow 0.15s ease;
  }
  .se__page--drop {
    box-shadow:
      0 0 0 3px hsl(var(--color-primary) / 0.45),
      0 8px 28px -8px rgb(0 0 0 / 0.25);
  }
  .se__canvas {
    display: block;
    border-radius: 3px;
  }
  .se__grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(to right, rgb(29 78 216 / 0.07) 1px, transparent 1px),
      linear-gradient(to bottom, rgb(29 78 216 / 0.07) 1px, transparent 1px);
  }
  .se__overlay {
    position: absolute;
    inset: 0;
    touch-action: none;
  }

  .se__guide {
    position: absolute;
    pointer-events: none;
    z-index: 6;
    background: #e11d8f;
  }
  .se__guide--v {
    top: 0;
    bottom: 0;
    width: 1px;
  }
  .se__guide--h {
    left: 0;
    right: 0;
    height: 1px;
  }

  .se__coach {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: calc(100% - 28px);
    padding: 8px 14px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-text) / 0.85);
    color: hsl(var(--color-surface));
    font-size: 12.5px;
    font-weight: 600;
    pointer-events: none;
    backdrop-filter: blur(4px);
    text-align: center;
  }

  /* ── Floating context toolbar ── */
  .se__ctx {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: calc(100% - 24px);
    padding: 8px 10px;
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface) / 0.92);
    border: 1px solid hsl(var(--color-border));
    box-shadow: var(--shadow-xl);
    backdrop-filter: blur(10px);
  }
  .se-ctx-enter-active,
  .se-ctx-leave-active {
    transition:
      opacity 0.18s ease,
      transform 0.18s ease;
  }
  .se-ctx-enter-from,
  .se-ctx-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px);
  }
  .se__ctx-input {
    width: 150px;
    padding: 6px 9px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 13px;
    font-weight: 600;
  }
  .se__ctx-input:focus {
    outline: none;
    border-color: hsl(var(--color-primary));
  }
  .se__ctx-select {
    padding: 6px 8px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .se__ctx-size {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
  .se__ctx-size-value {
    min-width: 26px;
    text-align: center;
    font-size: 12.5px;
    font-weight: 700;
    color: hsl(var(--color-text));
    font-variant-numeric: tabular-nums;
  }
  .se__ctx-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 28px;
    height: 28px;
    padding: 0 6px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .se__ctx-btn:hover {
    border-color: hsl(var(--color-border-strong));
    color: hsl(var(--color-text));
  }
  .se__ctx-btn--active {
    background: hsl(var(--color-primary) / 0.12);
    border-color: hsl(var(--color-primary) / 0.5);
    color: hsl(var(--color-primary));
  }
  .se__ctx-rot {
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
  }
  .se__ctx-inks {
    display: flex;
    gap: 5px;
  }
  .se__ctx-ink {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    outline: 2px solid transparent;
    outline-offset: 2px;
    cursor: pointer;
    transition:
      transform 0.15s,
      outline-color 0.15s;
  }
  .se__ctx-ink:hover {
    transform: scale(1.15);
  }
  .se__ctx-ink--active {
    outline-color: hsl(var(--color-primary));
  }
  .se__ctx-opacity {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 140px;
  }
  .se__ctx-opacity > :deep(.pf-slider) {
    flex: 1;
  }
  .se__ctx-mini-label {
    font-size: 11.5px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
    white-space: nowrap;
  }

  /* ── Thumbnails ── */
  .se__thumbs {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 10px 14px;
    overflow-x: auto;
    border-top: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
  }
  .se__thumb {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    flex: none;
  }
  .se__thumb-frame {
    position: relative;
    display: flex;
    width: 54px;
    border-radius: 4px;
    border: 2px solid hsl(var(--color-border));
    overflow: visible;
    background: white;
    transition:
      border-color 0.15s,
      transform 0.15s;
  }
  .se__thumb:hover .se__thumb-frame {
    transform: translateY(-2px);
  }
  .se__thumb--active .se__thumb-frame {
    border-color: hsl(var(--color-primary));
    box-shadow: 0 0 0 3px hsl(var(--color-primary) / 0.18);
  }
  .se__thumb-frame img {
    width: 100%;
    display: block;
    border-radius: 2px;
  }
  .se__thumb-skeleton {
    width: 100%;
    height: 68px;
    background: hsl(var(--color-chip));
    border-radius: 2px;
  }
  .se__thumb-badge {
    position: absolute;
    top: -7px;
    right: -7px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    background: hsl(var(--color-purple));
    color: white;
    font-size: 10px;
    font-weight: 800;
  }
  .se__thumb-number {
    font-size: 11px;
    font-weight: 700;
    color: hsl(var(--color-text-faint));
  }
  .se__thumb--active .se__thumb-number {
    color: hsl(var(--color-primary));
  }
  .se__thumb-more {
    font-size: 11.5px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
    white-space: nowrap;
    align-self: center;
  }

  @keyframes se-rotate {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 899px) {
    .se__body {
      flex-direction: column;
    }
    /* Keep the "Clear all" control inline with history rather than orphaning
       it onto its own wrapped toolbar row. */
    .se__group--right {
      margin-left: 0;
    }
    .se__palette {
      flex: none;
      max-height: none;
      border-right: none;
      border-bottom: 1px solid hsl(var(--color-border));
      display: flex;
      gap: 12px;
      align-items: center;
      overflow-x: auto;
      padding: 10px 12px;
    }
    .se__palette-title {
      display: none;
    }
    /* Visually separate the field group from stamps/saved when the palette
       collapses into a single horizontal strip. */
    .se__stamps,
    .se__saved-list {
      padding-left: 12px;
      border-left: 1px solid hsl(var(--color-border));
    }
    .se__fields {
      display: flex;
      gap: 6px;
    }
    .se__field {
      width: auto;
      white-space: nowrap;
    }
    .se__field-plus {
      display: none;
    }
    .se__stamps {
      flex-wrap: nowrap;
    }
    .se__saved-list {
      display: flex;
    }
    .se__saved {
      width: 76px;
      flex: none;
    }
    .se__stage {
      height: clamp(340px, 52vh, 560px);
      padding: 14px;
    }
    .se__tbtn-label {
      display: none;
    }
    .se__coach {
      border-radius: var(--radius-lg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .se-ctx-enter-active,
    .se-ctx-leave-active {
      transition: none;
    }
  }
</style>
