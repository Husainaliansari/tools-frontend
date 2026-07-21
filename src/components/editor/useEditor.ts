/**
 * useEditor — the editor session state machine.
 *
 * Owns the loaded document, the annotation model, multi-selection, the active
 * tool, zoom, page organization, document search, autosave and a unified
 * undo/redo history. Instantiated once in `PdfEditor.vue` and shared with
 * descendants through provide/inject (`EDITOR_KEY`).
 *
 * History entries capture the annotation/content-edit model **and** the index
 * of the working document bytes, so page operations (rotate/insert/delete/
 * reorder) participate in undo/redo alongside model edits.
 *
 * Annotation geometry lives in PDF points (top-left origin, scale 1); see
 * `@/lib/pdf/types`. Pure editing/rendering logic is imported from `@/lib/pdf`.
 */
import { computed, inject, provide, ref, shallowRef, watch, type InjectionKey } from 'vue'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import { uuid } from '@utils'
import {
  loadPdf,
  exportPdf,
  detectContent,
  pixelRatio,
  renderPageToPng,
  searchDocument,
  rotatePageBytes,
  deletePageBytes,
  insertBlankPageBytes,
  duplicatePageBytes,
  movePageBytes,
  extractPageBytes,
  remapAfterDelete,
  remapAfterInsert,
  remapAfterMove,
  rotatePoint,
  rotateBox,
  boundsOf,
  isBoxed,
  DEFAULT_STYLE,
  STAMP_PRESETS,
  type Annotation,
  type Box,
  type ContentEdit,
  type TextContentEdit,
  type DetectedObject,
  type DocumentMetadata,

  type Guide,
  type ImageAnnotation,
  type SearchMatch,
  type ToolId,
  type ToolStyle,
} from '@/lib/pdf'

const HISTORY_LIMIT = 120
const MIN_SCALE = 0.25
const MAX_SCALE = 5
/** Page-op byte versions kept for undo before history resets (memory guard). */
const MAX_DOC_STATES = 12
const AUTOSAVE_BYTES_LIMIT = 4_000_000
const PREFS_KEY = 'pdfedit:prefs'

export type FitMode = 'width' | 'page' | 'custom'
export type LeftTab = 'pages' | 'bookmarks' | 'search' | 'comments'
/**
 * Content-editing mode (Foxit's Edit tab). `none` = view/annotate only, the
 * PDF's own content is never parsed. Entering a mode lazily parses just the
 * families it needs, per visible page: `text` → text blocks only, `object` →
 * images + vector graphics only, `all` → both.
 */
export type EditMode = 'none' | 'text' | 'object' | 'all'

export const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]

export interface OutlineNode {
  title: string
  page: number | null
  items: OutlineNode[]
}

interface HistoryState {
  a: Annotation[]
  c: ContentEdit[]
  /** Index into the doc-bytes version list. */
  d: number
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createEditor() {
  // ─── Document ──────────────────────────────────────────────────────────────
  const doc = shallowRef<PDFDocumentProxy | null>(null)
  /** Working-baseline bytes (original file + applied page operations). */
  const sourceBytes = shallowRef<Uint8Array | null>(null)
  const fileName = ref('document.pdf')
  const pageCount = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** View-space page sizes (points, post-rotation) for every page. */
  const pageSizes = ref<{ w: number; h: number }[]>([])
  /** Bumps whenever the underlying document proxy is replaced (page ops). */
  const docTick = ref(0)
  /** A page operation is in flight. */
  const docBusy = ref(false)

  /** Byte versions of the document; history entries index into this list. */
  let docStates: Uint8Array[] = []
  const docIndex = ref(0)

  // ─── View ────────────────────────────────────────────────────────────────
  const currentPage = ref(1)
  const scale = ref(1)
  const fitMode = ref<FitMode>('page')
  /** Set to scroll the stage to a page; consumed by PageStage. */
  const scrollTarget = ref<{ page: number; token: number } | null>(null)
  const showGrid = ref(false)
  const snapEnabled = ref(true)

  // ─── Panels ─────────────────────────────────────────────────────────────
  const leftOpen = ref(true)
  const leftTab = ref<LeftTab>('pages')

  // ─── Tools & selection ─────────────────────────────────────────────────────
  const activeTool = ref<ToolId>('select')
  const selectedIds = ref<string[]>([])
  const style = ref<ToolStyle>({ ...DEFAULT_STYLE })
  /** Staged bitmap for the image tool (insert image / signature placement). */
  const pendingImage = shallowRef<{ src: string; w: number; h: number } | null>(null)
  const stampPreset = ref(STAMP_PRESETS[0])

  /** Single-selection accessor kept for existing call sites. */
  const selectedId = computed<string | null>({
    get: () => (selectedIds.value.length === 1 ? selectedIds.value[0] : (selectedIds.value[0] ?? null)),
    set: (v) => {
      selectedIds.value = v ? [v] : []
    },
  })

  // ─── Annotation model + history ────────────────────────────────────────────
  const annotations = ref<Annotation[]>([])
  const metadata = ref<DocumentMetadata>({})
  const past = ref<string[]>([])
  const future = ref<string[]>([])

  // ─── Content-editing model ─────────────────────────────────────────────────

  const contentEdits = ref<ContentEdit[]>([])
  const detected = ref<Record<number, DetectedObject[]>>({})
  /** Which object families have already been parsed for each page (cache guard). */
  const detectedKinds = new Map<number, { text: boolean; objects: boolean }>()
  /** True text colours sampled from the canvas, keyed by detected-object id. */
  const sampledColors = ref<Record<string, string>>({})
  /** Active content-editing mode. Nothing is parsed while this is `none`. */
  const editMode = ref<EditMode>('none')
  const detecting = ref(false)
  const reconstructed = ref(false)
  const reconstructing = ref(false)
  const reconstructProgress = ref<{ done: number; total: number }>({ done: 0, total: 0 })
  const reconstructStats = ref<{ text: number; image: number; graphic: number; total: number }>({
    text: 0,
    image: 0,
    graphic: 0,
    total: 0,
  })
  const selectedContentIds = ref<string[]>([])
  const selectedContentId = computed<string | null>({
    get: () => selectedContentIds.value[0] ?? null,
    set: (v) => {
      selectedContentIds.value = v ? [v] : []
    },
  })
  const guides = ref<Guide[]>([])
  /** Rendered page canvases, keyed by page — used to sample/lift pixels. */
  const pageCanvases = new Map<number, HTMLCanvasElement>()
  const clipboard = ref<Annotation[]>([])
  const clipboardContentEdits = ref<ContentEdit[]>([])

  // ─── Search ────────────────────────────────────────────────────────────────
  const searchQuery = ref('')
  const searchResults = ref<SearchMatch[]>([])
  const searchActive = ref(-1)
  const searching = ref(false)
  const searchProgress = ref(0)

  // ─── Bookmarks ─────────────────────────────────────────────────────────────
  const outline = ref<OutlineNode[]>([])

  // ─── Autosave ──────────────────────────────────────────────────────────────
  const autosaveKey = ref('')
  const autosaveAvailable = ref<number | null>(null)
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  const selected = computed(() =>
    selectedIds.value.length === 1
      ? (annotations.value.find((a) => a.id === selectedIds.value[0]) ?? null)
      : null,
  )
  const selectedAnnotations = computed(() =>
    annotations.value.filter((a) => selectedIds.value.includes(a.id)),
  )
  const selectedContentEdits = computed(() =>
    contentEdits.value.filter((e) => selectedContentIds.value.includes(e.id)),
  )
  const zoomPercent = computed(() => `${Math.round(scale.value * 100)}%`)
  const isDirty = computed(
    () =>
      annotations.value.length > 0 ||
      contentEdits.value.length > 0 ||
      past.value.length > 0 ||
      docIndex.value > 0,
  )

  function pageAnnotations(page: number): Annotation[] {
    return annotations.value.filter((a) => a.page === page)
  }

  /** History captures both layers + doc version, so undo/redo is unified. */
  function snapshot(): string {
    return JSON.stringify({
      a: annotations.value,
      c: contentEdits.value,
      d: docIndex.value,
    } satisfies HistoryState)
  }
  function restore(serialized: string): void {
    const state = JSON.parse(serialized) as HistoryState
    annotations.value = state.a ?? []
    contentEdits.value = state.c ?? []
    const d = state.d ?? docIndex.value
    if (d !== docIndex.value && docStates[d]) {
      docIndex.value = d
      void reloadDoc(docStates[d]).catch(() => undefined)
    }
  }

  function pushHistory(previous: string): void {
    past.value.push(previous)
    if (past.value.length > HISTORY_LIMIT) past.value.shift()
    future.value = []
  }

  function ensureSelectionExists(): void {
    if (selectedIds.value.length) {
      const alive = new Set(annotations.value.map((a) => a.id))
      const next = selectedIds.value.filter((id) => alive.has(id))
      if (next.length !== selectedIds.value.length) selectedIds.value = next
    }
    if (selectedContentIds.value.length) {
      const aliveContent = new Set([
        ...contentEdits.value.map((e) => e.id),
        ...allDetected().map((d) => d.id),
      ])
      const next = selectedContentIds.value.filter((id) => aliveContent.has(id))
      if (next.length !== selectedContentIds.value.length) selectedContentIds.value = next
    }
  }

  // ─── Selection ─────────────────────────────────────────────────────────────
  function selectOnly(id: string | null): void {
    selectedIds.value = id ? [id] : []
  }
  function toggleSelection(id: string): void {
    selectedIds.value = selectedIds.value.includes(id)
      ? selectedIds.value.filter((s) => s !== id)
      : [...selectedIds.value, id]
  }
  function selectMany(ids: string[]): void {
    selectedIds.value = [...new Set(ids)]
  }
  function selectContentOnly(id: string | null): void {
    selectedContentIds.value = id ? [id] : []
  }
  function toggleContentSelection(id: string): void {
    selectedContentIds.value = selectedContentIds.value.includes(id)
      ? selectedContentIds.value.filter((s) => s !== id)
      : [...selectedContentIds.value, id]
  }
  function selectContentMany(ids: string[]): void {
    selectedContentIds.value = [...new Set(ids)]
  }
  function selectAllOnPage(page: number): void {
    if (editMode.value === 'none') {
      // Not editing content: select annotations only.
      selectedIds.value = pageAnnotations(page).map((a) => a.id)
      selectedContentIds.value = []
      return
    }
    const { text, objects } = kindsForMode(editMode.value)
    selectedContentIds.value = detectedForPage(page)
      .filter((d) => (d.kind === 'text' ? text : objects))
      .map((d) => d.id)
    selectedIds.value = []
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────
  function addAnnotation(annotation: Annotation, options: { record?: boolean } = {}): void {
    if (options.record !== false) pushHistory(snapshot())
    annotations.value = [...annotations.value, annotation]
    selectOnly(annotation.id)
  }

  /** Patch one annotation. `record: false` skips history (use during drags). */
  function updateAnnotation(
    id: string,
    patch: Partial<Annotation>,
    options: { record?: boolean } = {},
  ): void {
    const previous = options.record !== false ? snapshot() : null
    annotations.value = annotations.value.map((a) =>
      a.id === id ? ({ ...a, ...patch } as Annotation) : a,
    )
    if (previous !== null) pushHistory(previous)
  }

  /** Patch several annotations at once as one undo step. */
  function updateAnnotations(
    patches: Map<string, Partial<Annotation>>,
    options: { record?: boolean } = {},
  ): void {
    const previous = options.record !== false ? snapshot() : null
    annotations.value = annotations.value.map((a) => {
      const patch = patches.get(a.id)
      return patch ? ({ ...a, ...patch } as Annotation) : a
    })
    if (previous !== null) pushHistory(previous)
  }

  function removeAnnotation(id: string, options: { record?: boolean } = {}): void {
    if (options.record !== false) pushHistory(snapshot())
    annotations.value = annotations.value.filter((a) => a.id !== id)
    selectedIds.value = selectedIds.value.filter((s) => s !== id)
  }

  function removeSelectedAnnotations(): void {
    if (!selectedIds.value.length && !selectedContentIds.value.length) return
    pushHistory(snapshot())
    if (selectedIds.value.length) {
      const gone = new Set(selectedIds.value)
      annotations.value = annotations.value.filter((a) => !gone.has(a.id))
      selectedIds.value = []
    }
    if (selectedContentIds.value.length) {
      for (const cid of selectedContentIds.value) {
        deleteContent(cid)
      }
      selectedContentIds.value = []
    }
  }

  function clearPage(page: number): void {
    if (!pageAnnotations(page).length) return
    pushHistory(snapshot())
    annotations.value = annotations.value.filter((a) => a.page !== page)
    ensureSelectionExists()
  }

  function undo(): void {
    if (!past.value.length) return
    future.value.push(snapshot())
    restore(past.value.pop() as string)
    ensureSelectionExists()
  }

  function redo(): void {
    if (!future.value.length) return
    past.value.push(snapshot())
    restore(future.value.pop() as string)
    ensureSelectionExists()
  }

  function setStyle(patch: Partial<ToolStyle>): void {
    style.value = { ...style.value, ...patch }
    const targets = selectedAnnotations.value

    if (targets.length) {
      const patches = new Map<string, Partial<Annotation>>()
      for (const current of targets) {
        const next: Record<string, unknown> = {}
        if ('color' in patch && 'color' in current) next.color = patch.color
        if ('color' in patch && current.type !== 'ink' && 'stroke' in current) next.stroke = patch.color
        if ('opacity' in patch && 'opacity' in current) next.opacity = patch.opacity
        if ('strokeWidth' in patch && 'strokeWidth' in current) next.strokeWidth = patch.strokeWidth
        if ('strokeWidth' in patch && current.type === 'ink') next.size = patch.strokeWidth
        if ('fontSize' in patch && current.type === 'text') next.fontSize = patch.fontSize
        if ('lineHeight' in patch && current.type === 'text') next.lineHeight = patch.lineHeight
        if ('letterSpacing' in patch && current.type === 'text') next.letterSpacing = patch.letterSpacing
        if ('fill' in patch && 'fill' in current) next.fill = patch.fill
        if (Object.keys(next).length) patches.set(current.id, next as Partial<Annotation>)
      }
      if (patches.size) updateAnnotations(patches)
    }

    if (selectedContentIds.value.length) {
      const cPatch: Partial<ContentEdit> = {}
      if ('color' in patch) (cPatch as Partial<TextContentEdit>).color = patch.color!
      if ('fontSize' in patch) (cPatch as Partial<TextContentEdit>).fontSize = patch.fontSize!
      if ('lineHeight' in patch) (cPatch as Partial<TextContentEdit>).lineHeight = patch.lineHeight!
      if ('letterSpacing' in patch) (cPatch as Partial<TextContentEdit>).letterSpacing = patch.letterSpacing!
      if ('opacity' in patch) cPatch.opacity = patch.opacity!
      if (Object.keys(cPatch).length) {
        for (const cid of selectedContentIds.value) {
          const det = allDetected().find((d) => d.id === cid)
          if (det && !editFor(cid)) ensureContentEdit(det)
          patchContent(cid, cPatch)
        }
      }
    }
  }

  // ─── Group & Lock operations ────────────────────────────────────────────────
  function lockSelection(): void {
    if (!selectedIds.value.length && !selectedContentIds.value.length) return
    const before = snapshot()
    if (selectedIds.value.length) {
      const set = new Set(selectedIds.value)
      annotations.value = annotations.value.map((a) => (set.has(a.id) ? { ...a, locked: true } : a))
    }
    if (selectedContentIds.value.length) {
      for (const cid of selectedContentIds.value) {
        const det = allDetected().find((d) => d.id === cid)
        if (det && !editFor(cid)) ensureContentEdit(det)
      }
      const cSet = new Set(selectedContentIds.value)
      contentEdits.value = contentEdits.value.map((c) => (cSet.has(c.id) ? { ...c, locked: true } : c))
    }
    pushHistory(before)
  }

  function unlockSelection(): void {
    if (!selectedIds.value.length && !selectedContentIds.value.length) return
    const before = snapshot()
    if (selectedIds.value.length) {
      const set = new Set(selectedIds.value)
      annotations.value = annotations.value.map((a) => (set.has(a.id) ? { ...a, locked: false } : a))
    }
    if (selectedContentIds.value.length) {
      const cSet = new Set(selectedContentIds.value)
      contentEdits.value = contentEdits.value.map((c) => (cSet.has(c.id) ? { ...c, locked: false } : c))
    }
    pushHistory(before)
  }

  function groupSelection(): void {
    const totalCount = selectedIds.value.length + selectedContentIds.value.length
    if (totalCount < 2) return
    const before = snapshot()
    const groupId = uuid()
    if (selectedIds.value.length) {
      const set = new Set(selectedIds.value)
      annotations.value = annotations.value.map((a) => (set.has(a.id) ? { ...a, groupId } : a))
    }
    if (selectedContentIds.value.length) {
      for (const cid of selectedContentIds.value) {
        const det = allDetected().find((d) => d.id === cid)
        if (det && !editFor(cid)) ensureContentEdit(det)
      }
      const cSet = new Set(selectedContentIds.value)
      contentEdits.value = contentEdits.value.map((c) => (cSet.has(c.id) ? { ...c, groupId } : c))
    }
    pushHistory(before)
  }

  function ungroupSelection(): void {
    if (!selectedIds.value.length && !selectedContentIds.value.length) return
    const before = snapshot()
    if (selectedIds.value.length) {
      const set = new Set(selectedIds.value)
      annotations.value = annotations.value.map((a) => (set.has(a.id) ? { ...a, groupId: undefined } : a))
    }
    if (selectedContentIds.value.length) {
      const cSet = new Set(selectedContentIds.value)
      contentEdits.value = contentEdits.value.map((c) => (cSet.has(c.id) ? { ...c, groupId: undefined } : c))
    }
    pushHistory(before)
  }

  // ─── Group operations (align / distribute / z-order) ──────────────────────
  type AlignKind = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

  interface SelectionItemBox {
    id: string
    isContent: boolean
    b: Box
    locked?: boolean
  }

  function getSelectionBoxes(): SelectionItemBox[] {
    const list: SelectionItemBox[] = []
    for (const a of selectedAnnotations.value) {
      if (isBoxed(a)) list.push({ id: a.id, isContent: false, b: boundsOf(a), locked: a.locked })
    }
    for (const cid of selectedContentIds.value) {
      const edit = editFor(cid)
      const det = allDetected().find((d) => d.id === cid)
      const g = edit ?? det
      if (g) list.push({ id: cid, isContent: true, b: { x: g.x, y: g.y, w: g.w, h: g.h }, locked: g.locked })
    }
    return list
  }

  function alignSelection(kind: AlignKind): void {
    const targets = getSelectionBoxes()
    if (targets.length < 2) return
    const minX = Math.min(...targets.map((t) => t.b.x))
    const maxX = Math.max(...targets.map((t) => t.b.x + t.b.w))
    const minY = Math.min(...targets.map((t) => t.b.y))
    const maxY = Math.max(...targets.map((t) => t.b.y + t.b.h))
    const before = snapshot()

    for (const item of targets) {
      if (item.locked) continue
      const b = item.b
      let x = b.x
      let y = b.y
      if (kind === 'left') x = minX
      if (kind === 'right') x = maxX - b.w
      if (kind === 'center') x = minX + (maxX - minX - b.w) / 2
      if (kind === 'top') y = minY
      if (kind === 'bottom') y = maxY - b.h
      if (kind === 'middle') y = minY + (maxY - minY - b.h) / 2

      if (item.isContent) {
        const det = allDetected().find((d) => d.id === item.id)
        if (det && !editFor(item.id)) ensureContentEdit(det)
        patchContent(item.id, { x, y }, { record: false })
      } else {
        updateAnnotation(item.id, { x, y } as Partial<Annotation>, { record: false })
      }
    }
    pushHistory(before)
  }

  function distributeSelection(axis: 'h' | 'v'): void {
    const targets = getSelectionBoxes().sort((a, b) => (axis === 'h' ? a.b.x - b.b.x : a.b.y - b.b.y))
    if (targets.length < 3) return
    const first = targets[0].b
    const last = targets[targets.length - 1].b
    const span = axis === 'h' ? last.x + last.w - first.x : last.y + last.h - first.y
    const total = targets.reduce((s, i) => s + (axis === 'h' ? i.b.w : i.b.h), 0)
    const gap = (span - total) / (targets.length - 1)
    const before = snapshot()
    let cursor = axis === 'h' ? first.x : first.y

    for (const item of targets) {
      if (item !== targets[0] && item !== targets[targets.length - 1] && !item.locked) {
        const patch = axis === 'h' ? { x: cursor } : { y: cursor }
        if (item.isContent) {
          const det = allDetected().find((d) => d.id === item.id)
          if (det && !editFor(item.id)) ensureContentEdit(det)
          patchContent(item.id, patch, { record: false })
        } else {
          updateAnnotation(item.id, patch as Partial<Annotation>, { record: false })
        }
      }
      cursor += (axis === 'h' ? item.b.w : item.b.h) + gap
    }
    pushHistory(before)
  }

  /** Move the selection to the end (front) or start (back) of paint order. */
  function reorderSelection(to: 'front' | 'back'): void {
    if (!selectedIds.value.length) return
    const chosen = new Set(selectedIds.value)
    const picked = annotations.value.filter((a) => chosen.has(a.id))
    const rest = annotations.value.filter((a) => !chosen.has(a.id))
    pushHistory(snapshot())
    annotations.value = to === 'front' ? [...rest, ...picked] : [...picked, ...rest]
  }

  // ─── Content editing ───────────────────────────────────────────────────────
  /** Clear both selection models so only one "layer" is active at a time. */
  function clearAllSelection(): void {
    selectedIds.value = []
    selectedContentId.value = null
  }

  async function reconstructDocument(): Promise<void> {
    if (reconstructing.value || !pageCount.value) return
    reconstructing.value = true
    reconstructProgress.value = { done: 0, total: pageCount.value }
    const stats = { text: 0, image: 0, graphic: 0, total: 0 }
    try {
      for (let n = 1; n <= pageCount.value; n++) {
        const objects = await detectPage(n)
        for (const o of objects) {
          stats.total++
          stats[o.kind]++
        }
        reconstructProgress.value = { done: n, total: pageCount.value }
      }
      reconstructStats.value = stats
      reconstructed.value = true
    } finally {
      reconstructing.value = false
    }
  }

  function detectedForPage(page: number): DetectedObject[] {
    return detected.value[page] ?? []
  }
  function allDetected(): DetectedObject[] {
    return Object.values(detected.value).flat()
  }

  /** Object families implied by an edit mode (`none` parses nothing). */
  function kindsForMode(mode: EditMode): { text: boolean; objects: boolean } {
    return {
      text: mode === 'text' || mode === 'all',
      objects: mode === 'object' || mode === 'all',
    }
  }

  /**
   * Ensure the requested object families are parsed for a page, then return the
   * page's accumulated detection. Only the missing families are parsed; results
   * merge into the per-page cache so switching modes never re-parses.
   */
  async function detectPage(
    page: number,
    kinds: { text?: boolean; objects?: boolean } = { text: true, objects: true },
  ): Promise<DetectedObject[]> {
    const have = detectedKinds.get(page) ?? { text: false, objects: false }
    const needText = !!kinds.text && !have.text
    const needObjects = !!kinds.objects && !have.objects
    if (!needText && !needObjects) return detected.value[page] ?? []
    detecting.value = true
    try {
      const p = await getPage(page)
      if (!p) return detected.value[page] ?? []
      const found = await detectContent(p, { text: needText, objects: needObjects })
      const merged = [...(detected.value[page] ?? []), ...found]
      detected.value = { ...detected.value, [page]: merged }
      detectedKinds.set(page, { text: have.text || needText, objects: have.objects || needObjects })
      return merged
    } finally {
      detecting.value = false
    }
  }

  /**
   * Switch content-editing mode. Entering a mode drops any live selections and
   * parks the pointer on `select`; parsing itself stays lazy (per visible page,
   * driven by the content layer). Leaving to `none` clears content selection.
   */
  function setEditMode(mode: EditMode): void {
    if (editMode.value === mode) mode = 'none' // toggling the active mode exits it
    editMode.value = mode
    selectedContentIds.value = []
    if (mode !== 'none') {
      selectedIds.value = []
      activeTool.value = 'select'
      pendingImage.value = null
    }
  }

  /**
   * Resolve the true colour of a detected text object for the toolbar, without
   * materialising an edit (selection must never alter appearance). Samples the
   * canvas once and caches the result reactively.
   */
  function ensureTextColor(det: DetectedObject): string {
    if (det.kind !== 'text') return '#111827'
    const edit = editFor(det.id)
    if (edit && edit.kind === 'text') return edit.color
    const cached = sampledColors.value[det.id]
    if (cached) return cached
    const color = sampleTextColor({ x: det.x, y: det.y, w: det.w, h: det.h }, det.page)
    sampledColors.value = { ...sampledColors.value, [det.id]: color }
    return color
  }

  const editFor = (id: string | null): ContentEdit | null =>
    contentEdits.value.find((e) => e.id === id) ?? null
  const selectedContentEdit = computed(() => editFor(selectedContentId.value))
  const selectedDetected = computed(
    () => allDetected().find((d) => d.id === selectedContentId.value) ?? null,
  )

  // ── Pixel helpers on the rendered page canvases ────────────────────────────
  function registerPageCanvas(page: number, canvas: HTMLCanvasElement | null): void {
    if (canvas) pageCanvases.set(page, canvas)
    else pageCanvases.delete(page)
  }
  function canvasFactor(): number {
    return scale.value * pixelRatio()
  }
  function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)] || 0
  }
  /** Sample the page background just outside `box` to blend covers into it. */
  function sampleBackground(box: Box, page: number): string {
    const canvas = pageCanvases.get(page)
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })
    if (!canvas || !ctx) return '#ffffff'
    const k = canvasFactor()
    const pad = 4
    const x0 = box.x * k
    const y0 = box.y * k
    const x1 = (box.x + box.w) * k
    const y1 = (box.y + box.h) * k
    const probes: [number, number][] = [
      [x0 + (x1 - x0) / 2, y0 - pad],
      [x0 + (x1 - x0) / 2, y1 + pad],
      [x0 - pad, y0 + (y1 - y0) / 2],
      [x1 + pad, y0 + (y1 - y0) / 2],
      [x0 - pad, y0 - pad],
      [x1 + pad, y1 + pad],
    ]
    const rs: number[] = []
    const gs: number[] = []
    const bs: number[] = []
    for (const [px, py] of probes) {
      const cx = Math.max(0, Math.min(canvas.width - 1, Math.round(px)))
      const cy = Math.max(0, Math.min(canvas.height - 1, Math.round(py)))
      try {
        const [r, g, b, a] = ctx.getImageData(cx, cy, 1, 1).data
        if (a > 50) {
          // Filter out dark pixels (text glyphs or line strokes) to ensure sampling clean background
          const brightness = (r * 299 + g * 587 + b * 114) / 1000
          if (brightness > 120) {
            rs.push(r)
            gs.push(g)
            bs.push(b)
          }
        }
      } catch {
        return '#ffffff'
      }
    }
    if (!rs.length) return '#ffffff'
    const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
    return `#${hex(median(rs))}${hex(median(gs))}${hex(median(bs))}`
  }
  /** Crop `box` out of the page's rendered canvas as a PNG data URL. */
  function liftRegion(box: Box, page: number): string {
    const canvas = pageCanvases.get(page)
    if (!canvas) return ''
    const k = canvasFactor()
    const off = document.createElement('canvas')
    off.width = Math.max(1, Math.round(box.w * k))
    off.height = Math.max(1, Math.round(box.h * k))
    const ctx = off.getContext('2d')
    if (!ctx) return ''
    ctx.drawImage(canvas, box.x * k, box.y * k, box.w * k, box.h * k, 0, 0, off.width, off.height)
    return off.toDataURL('image/png')
  }

  /**
   * Sample a text run's true colour from the rendered page canvas.
   *
   * Averaging every inked pixel drags the result toward the background because
   * anti-aliased glyph edges are half-blended — black text reads as grey. We
   * instead keep only the pixels *furthest* from the background (the solid glyph
   * cores) and average those, so black stays black and coloured text keeps its
   * hue.
   */
  function sampleTextColor(box: Box, page: number): string {
    const canvas = pageCanvases.get(page)
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })
    if (!canvas || !ctx) return '#111827'
    const k = canvasFactor()
    const x0 = Math.max(0, Math.round(box.x * k))
    const y0 = Math.max(0, Math.round(box.y * k))
    const w = Math.min(canvas.width - x0, Math.round(box.w * k))
    const h = Math.min(canvas.height - y0, Math.round(box.h * k))
    if (w <= 0 || h <= 0) return '#111827'
    try {
      const data = ctx.getImageData(x0, y0, w, h).data
      const bg = sampleBackground(box, page)
      const bgR = Number.parseInt(bg.slice(1, 3), 16) || 255
      const bgG = Number.parseInt(bg.slice(3, 5), 16) || 255
      const bgB = Number.parseInt(bg.slice(5, 7), 16) || 255
      // Collect inked pixels tagged with their distance from the background.
      const inked: { r: number; g: number; b: number; dist: number }[] = []
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        if (a < 50) continue
        const dist = Math.hypot(r - bgR, g - bgG, b - bgB)
        if (dist > 35) inked.push({ r, g, b, dist })
      }
      if (!inked.length) return '#111827'
      // Keep the most-saturated core (top 45% by distance) — the glyph body,
      // not the faint anti-aliased fringe — and average it.
      inked.sort((p, q) => q.dist - p.dist)
      const core = inked.slice(0, Math.max(1, Math.floor(inked.length * 0.45)))
      let tr = 0, tg = 0, tb = 0
      for (const p of core) {
        tr += p.r
        tg += p.g
        tb += p.b
      }
      const hex = (n: number) => Math.round(n / core.length).toString(16).padStart(2, '0')
      return `#${hex(tr)}${hex(tg)}${hex(tb)}`
    } catch {
      /* fallback */
    }
    return '#111827'
  }

  /** Materialise an edit for a detected object (no history entry itself). */
  function ensureContentEdit(det: DetectedObject): ContentEdit {
    const existing = editFor(det.id)
    if (existing) return existing
    const orig: Box = { x: det.x, y: det.y, w: det.w, h: det.h }
    const bg = sampleBackground(orig, det.page)
    const base = { id: det.id, page: det.page, orig, ...orig, rotation: 0, bg }
    const edit: ContentEdit =
      det.kind === 'text'
        ? {
            ...base,
            kind: 'text',
            text: det.text,
            fontSize: det.fontSize,
            fontFamily: det.fontFamily,
            loadedFontFamily: det.loadedFontFamily,
            originalFontName: det.originalFontName,
            embeddedFont: det.embeddedFont,
            color: sampledColors.value[det.id] ?? sampleTextColor(orig, det.page),
            align: det.align || 'left',
            bold: det.bold,
            italic: det.italic,
            lineHeight: det.lineHeight || 1.25,
            letterSpacing: det.letterSpacing || 0,
            opacity: 1,
          }
        : { ...base, kind: 'region', opacity: 1, image: liftRegion(orig, det.page) }
    contentEdits.value = [...contentEdits.value, edit]
    return edit
  }

  /** Lift an arbitrary marquee region into a movable bitmap object. */
  function liftRegionObject(box: Box, page: number): ContentEdit {
    const before = snapshot()
    const edit: ContentEdit = {
      id: uuid(),
      page,
      kind: 'region',
      orig: { ...box },
      ...box,
      rotation: 0,
      bg: sampleBackground(box, page),
      image: liftRegion(box, page),
    }
    contentEdits.value = [...contentEdits.value, edit]
    pushHistory(before)
    selectedContentId.value = edit.id
    return edit
  }

  function patchContent(
    id: string,
    patch: Partial<ContentEdit>,
    options: { record?: boolean } = {},
  ): void {
    const before = options.record !== false ? snapshot() : null
    contentEdits.value = contentEdits.value.map((e) =>
      e.id === id ? ({ ...e, ...patch } as ContentEdit) : e,
    )
    if (before !== null) pushHistory(before)
  }

  /** Edit the selected content object (materialising it first if needed). */
  function editSelectedContent(patch: Partial<ContentEdit>): void {
    const ids = selectedContentIds.value
    if (!ids.length) return
    const before = snapshot()
    for (const id of ids) {
      const det = allDetected().find((d) => d.id === id)
      if (det && !editFor(id)) ensureContentEdit(det)
    }
    const set = new Set(ids)
    contentEdits.value = contentEdits.value.map((e) =>
      set.has(e.id) ? ({ ...e, ...patch } as ContentEdit) : e,
    )
    pushHistory(before)
  }

  /** Delete a content object: a detected one is covered; a region is dropped. */
  function deleteContent(id: string): void {
    const before = snapshot()
    const det = allDetected().find((d) => d.id === id)
    if (det) {
      ensureContentEdit(det)
      contentEdits.value = contentEdits.value.map((e) =>
        e.id === id ? { ...e, deleted: true } : e,
      )
    } else {
      // A lifted region: removing the edit restores the original pixels.
      contentEdits.value = contentEdits.value.filter((e) => e.id !== id)
    }
    pushHistory(before)
    selectedContentIds.value = selectedContentIds.value.filter((s) => s !== id)
  }

  function setGuides(next: Guide[]): void {
    guides.value = next
  }

  // ─── Object operations (clipboard, duplicate) ──────────────────────────────
  function cloneAnnotation(a: Annotation, dx = 14): Annotation {
    const copy = JSON.parse(JSON.stringify(a)) as Annotation
    copy.id = uuid()
    copy.page = currentPage.value
    if (copy.type === 'ink') copy.points = copy.points.map((p) => ({ x: p.x + dx, y: p.y + dx }))
    else {
      copy.x += dx
      copy.y += dx
    }
    return copy
  }
  function cloneContentEdit(c: ContentEdit, dx = 14): ContentEdit {
    const copy = JSON.parse(JSON.stringify(c)) as ContentEdit
    copy.id = uuid()
    copy.page = currentPage.value
    copy.x += dx
    copy.y += dx
    copy.orig = { ...copy.orig, x: copy.orig.x + dx, y: copy.orig.y + dx }
    return copy
  }

  function copySelection(): void {
    if (selectedAnnotations.value.length) {
      clipboard.value = JSON.parse(JSON.stringify(selectedAnnotations.value)) as Annotation[]
    } else {
      clipboard.value = []
    }
    if (selectedContentIds.value.length) {
      for (const cid of selectedContentIds.value) {
        const det = allDetected().find((d) => d.id === cid)
        if (det && !editFor(cid)) ensureContentEdit(det)
      }
      clipboardContentEdits.value = JSON.parse(
        JSON.stringify(selectedContentEdits.value),
      ) as ContentEdit[]
    } else {
      clipboardContentEdits.value = []
    }
  }
  function cutSelection(): void {
    if (!selectedAnnotations.value.length && !selectedContentIds.value.length) return
    copySelection()
    removeSelectedAnnotations()
  }
  function pasteClipboard(): void {
    if (!clipboard.value.length && !clipboardContentEdits.value.length) return
    const before = snapshot()
    if (clipboard.value.length) {
      const clones = clipboard.value.map((a) => cloneAnnotation(a))
      annotations.value = [...annotations.value, ...clones]
      selectMany(clones.map((c) => c.id))
    }
    if (clipboardContentEdits.value.length) {
      const clones = clipboardContentEdits.value.map((c) => cloneContentEdit(c))
      contentEdits.value = [...contentEdits.value, ...clones]
      selectContentMany(clones.map((c) => c.id))
    }
    pushHistory(before)
  }
  function duplicateSelection(): void {
    if (!selectedAnnotations.value.length && !selectedContentIds.value.length) return
    const before = snapshot()
    if (selectedAnnotations.value.length) {
      const clones = selectedAnnotations.value.map((a) => cloneAnnotation(a))
      annotations.value = [...annotations.value, ...clones]
      selectMany(clones.map((c) => c.id))
    }
    if (selectedContentIds.value.length) {
      for (const cid of selectedContentIds.value) {
        const det = allDetected().find((d) => d.id === cid)
        if (det && !editFor(cid)) ensureContentEdit(det)
      }
      const clones = selectedContentEdits.value.map((c) => cloneContentEdit(c))
      contentEdits.value = [...contentEdits.value, ...clones]
      selectContentMany(clones.map((c) => c.id))
    }
    pushHistory(before)
  }

  // ─── Image / signature placement ──────────────────────────────────────────
  async function stageImageFile(file: File): Promise<void> {
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(file)
    })
    await stageImageData(src)
  }

  /** Stage a data-URL bitmap (also used by the signature pad). */
  async function stageImageData(src: string): Promise<void> {
    const size = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth || 200, h: img.naturalHeight || 100 })
      img.onerror = () => resolve({ w: 200, h: 100 })
      img.src = src
    })
    pendingImage.value = { src, ...size }
    activeTool.value = 'image'
  }

  /** Place the staged image centred at `point` on `page`. */
  function placeImage(point: { x: number; y: number }, page: number): void {
    const staged = pendingImage.value
    if (!staged) return
    const pageSize = pageSizes.value[page - 1] ?? { w: 612, h: 792 }
    const maxW = pageSize.w * 0.5
    const k = staged.w > maxW ? maxW / staged.w : 1
    const w = Math.max(24, staged.w * k)
    const h = Math.max(24, staged.h * k)
    const annotation: ImageAnnotation = {
      id: uuid(),
      page,
      type: 'image',
      x: Math.max(0, point.x - w / 2),
      y: Math.max(0, point.y - h / 2),
      w,
      h,
      src: staged.src,
      opacity: 1,
      rotation: 0,
    }
    addAnnotation(annotation)
    pendingImage.value = null
    setTool('select')
  }

  /** Flip an image annotation's pixels in place (keeps export trivial). */
  async function flipImage(id: string, axis: 'h' | 'v'): Promise<void> {
    const target = annotations.value.find((a) => a.id === id)
    if (!target || target.type !== 'image') return
    const flipped = await new Promise<string | null>((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        if (axis === 'h') {
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
        } else {
          ctx.translate(0, canvas.height)
          ctx.scale(1, -1)
        }
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => resolve(null)
      img.src = target.src
    })
    if (flipped) updateAnnotation(id, { src: flipped })
  }

  function placeStamp(point: { x: number; y: number }, page: number): void {
    const preset = stampPreset.value
    const w = Math.max(96, preset.label.length * 13 + 28)
    const h = 34
    addAnnotation({
      id: uuid(),
      page,
      type: 'stamp',
      x: Math.max(0, point.x - w / 2),
      y: Math.max(0, point.y - h / 2),
      w,
      h,
      label: preset.label,
      color: preset.color,
    })
    setTool('select')
  }

  // ─── View actions ──────────────────────────────────────────────────────────
  function setScale(next: number): void {
    scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
  }
  function zoomIn(): void {
    fitMode.value = 'custom'
    setScale(scale.value * 1.2)
  }
  function zoomOut(): void {
    fitMode.value = 'custom'
    setScale(scale.value / 1.2)
  }
  function zoomTo(value: number): void {
    fitMode.value = 'custom'
    setScale(value)
  }
  let scrollToken = 0
  function setPage(next: number, behavior: 'jump' | 'silent' = 'jump'): void {
    const clamped = Math.min(Math.max(1, Math.round(next) || 1), pageCount.value || 1)
    currentPage.value = clamped
    if (behavior === 'jump') scrollTarget.value = { page: clamped, token: ++scrollToken }
  }
  function setTool(tool: ToolId): void {
    // Picking any create/annotate tool leaves content-edit mode: the annotation
    // layer takes back pointer input, matching Foxit's mutually-exclusive modes.
    // `select`/`hand` are shared and preserve the active edit mode.
    if (tool !== 'select' && tool !== 'hand' && editMode.value !== 'none') {
      editMode.value = 'none'
    }
    activeTool.value = tool
    if (tool !== 'select') {
      selectedIds.value = []
      selectedContentIds.value = []
    }
    if (tool !== 'image') pendingImage.value = null
  }

  async function getPage(n: number): Promise<PDFPageProxy | null> {
    if (!doc.value) return null
    return doc.value.getPage(n)
  }

  // ─── Document lifecycle ────────────────────────────────────────────────────
  async function computePageSizes(): Promise<void> {
    const d = doc.value
    if (!d) {
      pageSizes.value = []
      return
    }
    const sizes: { w: number; h: number }[] = []
    for (let n = 1; n <= d.numPages; n++) {
      const page = await d.getPage(n)
      const vp = page.getViewport({ scale: 1 })
      sizes.push({ w: vp.width, h: vp.height })
    }
    pageSizes.value = sizes
  }

  async function loadOutline(): Promise<void> {
    const d = doc.value
    if (!d) {
      outline.value = []
      return
    }
    try {
      interface RawOutline {
        title: string
        dest: string | unknown[] | null
        items: RawOutline[]
      }
      const raw = (await d.getOutline()) as RawOutline[] | null
      const resolveNodes = async (items: RawOutline[], depth: number): Promise<OutlineNode[]> =>
        Promise.all(
          items.slice(0, 200).map(async (item) => {
            let page: number | null = null
            try {
              let dest = item.dest
              if (typeof dest === 'string') dest = await d.getDestination(dest)
              if (Array.isArray(dest) && dest[0]) {
                page = (await d.getPageIndex(dest[0] as Parameters<typeof d.getPageIndex>[0])) + 1
              }
            } catch {
              /* unresolvable dest */
            }
            return {
              title: item.title,
              page,
              items: depth < 4 && item.items?.length ? await resolveNodes(item.items, depth + 1) : [],
            }
          }),
        )
      outline.value = raw?.length ? await resolveNodes(raw, 0) : []
    } catch {
      outline.value = []
    }
  }

  /** Guards overlapping reloads (e.g. rapid undo/redo of page operations). */
  let reloadSeq = 0

  /** Swap in a new document (initial load or after a page operation). */
  async function reloadDoc(bytes: Uint8Array): Promise<void> {
    const seq = ++reloadSeq
    const old = doc.value
    const loaded = await loadPdf(bytes.slice())
    if (seq !== reloadSeq) {
      // A newer reload superseded this one — discard the stale document.
      void (loaded as unknown as { destroy?: () => Promise<void> })?.destroy?.()?.catch(() => undefined)
      return
    }
    doc.value = loaded
    pageCount.value = loaded.numPages
    sourceBytes.value = bytes
    detected.value = {}
    detectedKinds.clear()
    sampledColors.value = {}
    reconstructed.value = false
    await computePageSizes()
    docTick.value++
    if (currentPage.value > loaded.numPages) currentPage.value = loaded.numPages
    void (old as unknown as { destroy?: () => Promise<void> })?.destroy?.()?.catch(() => undefined)
  }

  async function loadFile(file: File): Promise<void> {
    loading.value = true
    error.value = null
    annotations.value = []
    contentEdits.value = []
    detected.value = {}
    detectedKinds.clear()
    sampledColors.value = {}
    editMode.value = 'none'
    reconstructed.value = false
    reconstructing.value = false
    reconstructStats.value = { text: 0, image: 0, graphic: 0, total: 0 }
    past.value = []
    future.value = []
    selectedIds.value = []
    selectedContentId.value = null
    currentPage.value = 1
    fitMode.value = 'page'
    searchQuery.value = ''
    searchResults.value = []
    searchActive.value = -1
    outline.value = []
    docStates = []
    docIndex.value = 0
    try {
      const buffer = await file.arrayBuffer()
      const initial = new Uint8Array(buffer.slice(0))
      docStates = [initial]
      sourceBytes.value = initial
      const loaded = await loadPdf(buffer.slice(0))
      doc.value = loaded
      pageCount.value = loaded.numPages
      fileName.value = file.name
      await computePageSizes()
      void loadOutline()
      // Lazy by contract: the document is NOT parsed on load. Content is parsed
      // per visible page only after the user enters an Edit mode (see setEditMode).
      docTick.value++
      // Seed the metadata editor from the file's own document info.
      try {
        const info = (await loaded.getMetadata()).info as Record<string, unknown>
        metadata.value = {
          title: (info?.Title as string) || '',
          author: (info?.Author as string) || '',
          subject: (info?.Subject as string) || '',
          keywords: info?.Keywords ? String(info.Keywords).split(/[,;]\s*/) : [],
        }
      } catch {
        metadata.value = {}
      }
      // Offer autosave recovery for this exact file.
      autosaveKey.value = `pdfedit:${file.name}:${file.size}`
      try {
        const saved = localStorage.getItem(autosaveKey.value)
        if (saved) {
          const parsed = JSON.parse(saved) as { t?: number }
          autosaveAvailable.value = parsed.t ?? Date.now()
        } else {
          autosaveAvailable.value = null
        }
      } catch {
        autosaveAvailable.value = null
      }
    } catch (cause) {
      const name = (cause as { name?: string })?.name
      error.value =
        name === 'PasswordException'
          ? 'This PDF is password-protected. Remove the password first, then reopen it here.'
          : 'Could not open this PDF. The file may be corrupted.'
      doc.value = null
      pageCount.value = 0
    } finally {
      loading.value = false
    }
  }

  // ─── Page operations ───────────────────────────────────────────────────────
  async function applyDocOp(
    produce: (bytes: Uint8Array) => Promise<Uint8Array>,
    remapModel: () => void,
  ): Promise<void> {
    if (docBusy.value || !docStates.length) return
    docBusy.value = true
    try {
      const before = snapshot()
      const bytes = await produce(docStates[docIndex.value])
      docStates.push(bytes)
      docIndex.value = docStates.length - 1
      pushHistory(before)
      remapModel()
      // Hit geometry is tied to the old page layout — drop stale results.
      searchResults.value = []
      searchActive.value = -1
      await reloadDoc(bytes)
      if (docStates.length > MAX_DOC_STATES) {
        // Memory guard: keep only the current bytes and reset history.
        docStates = [docStates[docIndex.value]]
        docIndex.value = 0
        past.value = []
        future.value = []
      }
    } finally {
      docBusy.value = false
    }
  }

  function rotateModelForPage(page: number, delta: number): void {
    const size = pageSizes.value[page - 1]
    if (!size) return
    annotations.value = annotations.value.map((a) => {
      if (a.page !== page) return a
      if (a.type === 'ink') {
        return { ...a, points: a.points.map((p) => rotatePoint(p.x, p.y, delta, size.w, size.h)) }
      }
      if (a.type === 'note') {
        const p = rotatePoint(a.x, a.y, delta, size.w, size.h)
        return { ...a, x: p.x, y: p.y }
      }
      return { ...a, ...rotateBox(a, delta, size.w, size.h) }
    })
    contentEdits.value = contentEdits.value.map((e) =>
      e.page === page
        ? {
            ...e,
            ...rotateBox(e, delta, size.w, size.h),
            orig: rotateBox(e.orig, delta, size.w, size.h),
          }
        : e,
    )
  }

  async function rotatePage(page: number, delta: 90 | -90 | 180): Promise<void> {
    await applyDocOp(
      (b) => rotatePageBytes(b, page, delta),
      () => rotateModelForPage(page, delta),
    )
  }

  async function deletePage(page: number): Promise<void> {
    if (pageCount.value <= 1) return
    await applyDocOp(
      (b) => deletePageBytes(b, page),
      () => {
        annotations.value = remapAfterDelete(annotations.value, page)
        contentEdits.value = remapAfterDelete(contentEdits.value, page)
        ensureSelectionExists()
      },
    )
    if (currentPage.value > pageCount.value) setPage(pageCount.value)
  }

  async function insertBlankPage(afterPage: number): Promise<void> {
    await applyDocOp(
      (b) => insertBlankPageBytes(b, afterPage),
      () => {
        annotations.value = remapAfterInsert(annotations.value, afterPage)
        contentEdits.value = remapAfterInsert(contentEdits.value, afterPage)
      },
    )
  }

  async function duplicatePage(page: number): Promise<void> {
    await applyDocOp(
      (b) => duplicatePageBytes(b, page),
      () => {
        annotations.value = remapAfterInsert(annotations.value, page)
        contentEdits.value = remapAfterInsert(contentEdits.value, page)
      },
    )
  }

  async function movePage(from: number, to: number): Promise<void> {
    if (from === to) return
    await applyDocOp(
      (b) => movePageBytes(b, from, to),
      () => {
        annotations.value = remapAfterMove(annotations.value, from, to)
        contentEdits.value = remapAfterMove(contentEdits.value, from, to)
      },
    )
    setPage(to)
  }

  async function extractPage(page: number): Promise<void> {
    if (!docStates.length) return
    const bytes = await extractPageBytes(docStates[docIndex.value], page)
    downloadBlob(
      new Blob([bytes as BlobPart], { type: 'application/pdf' }),
      fileName.value.replace(/\.pdf$/i, '') + `-page-${page}.pdf`,
    )
  }

  // ─── Search ────────────────────────────────────────────────────────────────
  async function runSearch(query: string, caseSensitive = false): Promise<void> {
    searchQuery.value = query
    searchActive.value = -1
    if (!query.trim() || !doc.value) {
      searchResults.value = []
      return
    }
    searching.value = true
    searchProgress.value = 0
    try {
      const results = await searchDocument(doc.value, query, {
        caseSensitive,
        onProgress: (done, total) => {
          searchProgress.value = total ? Math.round((done / total) * 100) : 0
        },
      })
      searchResults.value = results
      if (results.length) goToMatch(0)
    } finally {
      searching.value = false
    }
  }

  function goToMatch(index: number): void {
    const total = searchResults.value.length
    if (!total) return
    const wrapped = ((index % total) + total) % total
    searchActive.value = wrapped
    setPage(searchResults.value[wrapped].page)
  }
  function nextMatch(): void {
    goToMatch(searchActive.value + 1)
  }
  function prevMatch(): void {
    goToMatch(searchActive.value - 1)
  }

  /** Replace one hit by rewriting its containing detected text line. */
  async function replaceMatch(match: SearchMatch, replacement: string): Promise<boolean> {
    const dets = await detectPage(match.page)
    const cx = match.box.x + match.box.w / 2
    const cy = match.box.y + match.box.h / 2
    const line = dets.find(
      (d) =>
        d.kind === 'text' &&
        cx >= d.x - 2 &&
        cx <= d.x + d.w + 2 &&
        cy >= d.y - 2 &&
        cy <= d.y + d.h + 2,
    )
    if (!line) return false
    const before = snapshot()
    ensureContentEdit(line)
    const rx = new RegExp(escapeRegExp(searchQuery.value), 'i')
    contentEdits.value = contentEdits.value.map((e) =>
      e.id === line.id && e.kind === 'text' ? { ...e, text: e.text.replace(rx, replacement) } : e,
    )
    pushHistory(before)
    return true
  }

  async function replaceActive(replacement: string): Promise<void> {
    const match = searchResults.value[searchActive.value]
    if (!match) return
    const ok = await replaceMatch(match, replacement)
    if (ok) {
      searchResults.value = searchResults.value.filter((m) => m.id !== match.id)
      if (searchResults.value.length) goToMatch(Math.min(searchActive.value, searchResults.value.length - 1))
      else searchActive.value = -1
    }
  }

  async function replaceAll(replacement: string): Promise<number> {
    if (!searchQuery.value.trim()) return 0
    const before = snapshot()
    const rx = new RegExp(escapeRegExp(searchQuery.value), 'gi')
    const pages = [...new Set(searchResults.value.map((m) => m.page))]
    let replaced = 0
    for (const page of pages) {
      const dets = await detectPage(page)
      for (const det of dets) {
        if (det.kind !== 'text') continue
        const current = editFor(det.id)
        const text = current?.kind === 'text' ? current.text : det.text
        if (!rx.test(text)) {
          rx.lastIndex = 0
          continue
        }
        rx.lastIndex = 0
        ensureContentEdit(det)
        contentEdits.value = contentEdits.value.map((e) =>
          e.id === det.id && e.kind === 'text' ? { ...e, text: text.replace(rx, replacement) } : e,
        )
        rx.lastIndex = 0
        replaced++
      }
    }
    if (replaced) {
      pushHistory(before)
      searchResults.value = []
      searchActive.value = -1
    }
    return replaced
  }

  // ─── Autosave ──────────────────────────────────────────────────────────────
  function autosaveNow(): void {
    if (!autosaveKey.value) return
    try {
      if (!annotations.value.length && !contentEdits.value.length) {
        localStorage.removeItem(autosaveKey.value)
        return
      }
      const payload = JSON.stringify({
        a: annotations.value,
        c: contentEdits.value,
        t: Date.now(),
      })
      if (payload.length <= AUTOSAVE_BYTES_LIMIT) localStorage.setItem(autosaveKey.value, payload)
    } catch {
      /* quota exceeded / private mode — autosave is best-effort */
    }
  }

  watch([annotations, contentEdits], () => {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(autosaveNow, 1200)
  })

  function restoreAutosave(): boolean {
    try {
      const saved = localStorage.getItem(autosaveKey.value)
      if (!saved) return false
      const parsed = JSON.parse(saved) as { a?: Annotation[]; c?: ContentEdit[] }
      annotations.value = parsed.a ?? []
      contentEdits.value = parsed.c ?? []
      past.value = []
      future.value = []
      autosaveAvailable.value = null
      return true
    } catch {
      return false
    }
  }
  function dismissAutosave(): void {
    try {
      localStorage.removeItem(autosaveKey.value)
    } catch {
      /* ignore */
    }
    autosaveAvailable.value = null
  }

  // ─── Preferences ───────────────────────────────────────────────────────────
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as {
      grid?: boolean
      snap?: boolean
    }
    showGrid.value = !!prefs.grid
    snapEnabled.value = prefs.snap !== false
  } catch {
    /* defaults */
  }
  watch([showGrid, snapEnabled], () => {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ grid: showGrid.value, snap: snapEnabled.value }),
      )
    } catch {
      /* ignore */
    }
  })

  // ─── Export / print ────────────────────────────────────────────────────────
  async function buildBytes(): Promise<Uint8Array | null> {
    const baseline = docStates[docIndex.value]
    if (!baseline) return null
    return exportPdf(baseline.slice(), annotations.value, contentEdits.value, {
      metadata: metadata.value,
    })
  }

  function downloadBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  function downloadName(): string {
    return fileName.value.replace(/\.pdf$/i, '') + '-edited.pdf'
  }

  async function exportDownload(): Promise<void> {
    const bytes = await buildBytes()
    if (!bytes) return
    downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), downloadName())
  }

  /** Export one page (default: current) as a PNG image. */
  async function exportPageImage(pageNum = currentPage.value): Promise<void> {
    const page = await getPage(pageNum)
    if (!page) return
    const blob = await renderPageToPng(page, 2)
    downloadBlob(blob, fileName.value.replace(/\.pdf$/i, '') + `-page-${pageNum}.png`)
  }

  async function print(): Promise<void> {
    const bytes = await buildBytes()
    if (!bytes) return
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    frame.src = url
    frame.onload = () => {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    }
    document.body.appendChild(frame)
    setTimeout(() => {
      frame.remove()
      URL.revokeObjectURL(url)
    }, 60_000)
  }

  return {
    // state
    doc,
    sourceBytes,
    fileName,
    pageCount,
    loading,
    error,
    pageSizes,
    docTick,
    docBusy,
    currentPage,
    scale,
    fitMode,
    scrollTarget,
    showGrid,
    snapEnabled,
    leftOpen,
    leftTab,
    activeTool,
    selectedId,
    selectedIds,
    style,
    annotations,
    metadata,
    pendingImage,
    stampPreset,
    // content editing
    contentEdits,
    detected,
    detecting,
    editMode,
    setEditMode,
    sampledColors,
    ensureTextColor,
    reconstructed,
    reconstructing,
    reconstructProgress,
    reconstructStats,
    selectedContentId,
    selectedContentIds,
    selectedContentEdit,
    selectedContentEdits,
    selectedDetected,
    guides,
    clipboard,
    // search
    searchQuery,
    searchResults,
    searchActive,
    searching,
    searchProgress,
    // bookmarks
    outline,
    // autosave
    autosaveAvailable,
    // getters
    canUndo,
    canRedo,
    selected,
    selectedAnnotations,
    zoomPercent,
    isDirty,
    // helpers
    pageAnnotations,
    snapshot,
    pushHistory,
    getPage,
    editFor,
    detectedForPage,
    registerPageCanvas,
    // selection
    selectOnly,
    toggleSelection,
    selectMany,
    selectContentOnly,
    toggleContentSelection,
    selectContentMany,
    selectAllOnPage,
    // mutations
    addAnnotation,
    updateAnnotation,
    updateAnnotations,
    removeAnnotation,
    removeSelectedAnnotations,
    clearPage,
    undo,
    redo,
    setStyle,
    alignSelection,
    distributeSelection,
    reorderSelection,
    lockSelection,
    unlockSelection,
    groupSelection,
    ungroupSelection,
    // content actions
    clearAllSelection,
    detectPage,
    reconstructDocument,
    ensureContentEdit,
    liftRegionObject,
    patchContent,
    editSelectedContent,
    deleteContent,
    setGuides,
    sampleBackground,
    sampleTextColor,
    // object operations
    copySelection,
    cutSelection,
    pasteClipboard,
    duplicateSelection,
    stageImageFile,
    stageImageData,
    placeImage,
    flipImage,
    placeStamp,
    // pages
    rotatePage,
    deletePage,
    insertBlankPage,
    duplicatePage,
    movePage,
    extractPage,
    // search actions
    runSearch,
    goToMatch,
    nextMatch,
    prevMatch,
    replaceActive,
    replaceAll,
    // autosave actions
    restoreAutosave,
    dismissAutosave,
    // view
    setScale,
    zoomIn,
    zoomOut,
    zoomTo,
    setPage,
    setTool,
    // lifecycle
    loadFile,
    exportDownload,
    exportPageImage,
    print,
  }
}

export type EditorApi = ReturnType<typeof createEditor>

export const EDITOR_KEY: InjectionKey<EditorApi> = Symbol('pdf-editor')

/** Create the editor session and expose it to descendants. */
export function provideEditor(): EditorApi {
  const api = createEditor()
  provide(EDITOR_KEY, api)
  return api
}

/** Consume the editor session from a descendant component. */
export function useEditor(): EditorApi {
  const api = inject(EDITOR_KEY)
  if (!api) throw new Error('useEditor() must be used within <PdfEditor>')
  return api
}
