<script setup lang="ts">
  /**
   * AnnotationOverlay — the interactive layer painted over one rendered page.
   *
   * Handles pointer input for creating, selecting (single, shift-click and
   * marquee multi-select), moving, resizing and rotating annotations, plus a
   * right-click context menu. Box-shaped annotations are drawn with CSS and
   * carry 8 resize handles; ink/line/arrow/squiggly are drawn in a scaled SVG
   * layer with transparent hit-boxes.
   *
   * All geometry is in PDF points (top-left origin); the overlay multiplies by
   * the editor's zoom to paint.
   */
  import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import { uuid, clamp } from '@utils'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import ContextMenu, { type MenuItem } from './ContextMenu.vue'
  import { useEditor } from './useEditor'
  import {
    BOX_TOOLS,
    boundsOf,
    snapBox,
    type Annotation,
    type Box,
    type FieldAnnotation,
    type ToolId,
  } from '@/lib/pdf'

  const props = defineProps<{
    page: number
    metrics: { pointWidth: number; pointHeight: number; cssWidth: number; cssHeight: number }
  }>()

  const editor = useEditor()
  const rootEl = ref<HTMLDivElement | null>(null)

  const scale = computed(() => editor.scale.value)
  const items = computed(() => editor.pageAnnotations(props.page))
  const selectedIds = computed(() => editor.selectedIds.value)
  const singleSelectedId = computed(() =>
    selectedIds.value.length === 1 ? selectedIds.value[0] : null,
  )

  // ─── Coordinate mapping ──────────────────────────────────────────────────
  function clientToPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = rootEl.value?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: clamp((clientX - rect.left) / scale.value, 0, props.metrics.pointWidth),
      y: clamp((clientY - rect.top) / scale.value, 0, props.metrics.pointHeight),
    }
  }

  // ─── Drag machine ────────────────────────────────────────────────────────
  type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  const MIN = 6

  interface Drag {
    kind: 'create' | 'move' | 'resize' | 'ink' | 'marquee' | 'rotate'
    startX: number
    startY: number
    id?: string
    /** Deep-copied originals of every dragged annotation, keyed by id. */
    origins?: Map<string, Annotation>
    handle?: Handle
    additive?: boolean
    before: string
    changed: boolean
  }
  const drag = ref<Drag | null>(null)
  const draft = ref<Box | null>(null)
  const marquee = ref<Box | null>(null)
  const inkPoints = ref<{ x: number; y: number }[]>([])

  const editingTextId = ref<string | null>(null)
  const openNoteId = ref<string | null>(null)

  function currentStyle() {
    return editor.style.value
  }

  function cloneOrigins(ids: string[]): Map<string, Annotation> {
    const map = new Map<string, Annotation>()
    for (const a of editor.annotations.value) {
      if (ids.includes(a.id)) map.set(a.id, JSON.parse(JSON.stringify(a)) as Annotation)
    }
    return map
  }

  // ─── Create / marquee ────────────────────────────────────────────────────
  function onSurfacePointerDown(event: PointerEvent): void {
    if (event.button !== 0) return
    const tool = editor.activeTool.value
    if (tool === 'hand') return
    // In select mode the root is pointer-events:none so this only fires from
    // annotation items. For drawing tools the root captures normally.
    const point = clientToPoint(event.clientX, event.clientY)

    if (tool === 'select') {
      // Clear content selection when interacting via annotation layer.
      editor.selectedContentId.value = null
      openNoteId.value = null
      drag.value = {
        kind: 'marquee',
        startX: point.x,
        startY: point.y,
        additive: event.shiftKey,
        before: editor.snapshot(),
        changed: false,
      }
      marquee.value = { x: point.x, y: point.y, w: 0, h: 0 }
      attach()
      return
    }

    if (tool === 'note') {
      const id = uuid()
      editor.addAnnotation({
        id,
        page: props.page,
        type: 'note',
        x: point.x,
        y: point.y,
        text: '',
        color: '#f59e0b',
      })
      openNoteId.value = id
      editor.setTool('select')
      return
    }

    if (tool === 'image') {
      if (editor.pendingImage.value) editor.placeImage(point, props.page)
      else editor.setTool('select')
      return
    }

    if (tool === 'stamp') {
      editor.placeStamp(point, props.page)
      return
    }

    if (tool === 'ink') {
      drag.value = { kind: 'ink', startX: point.x, startY: point.y, before: editor.snapshot(), changed: false }
      inkPoints.value = [point]
      attach()
      return
    }

    if (BOX_TOOLS.includes(tool)) {
      drag.value = { kind: 'create', startX: point.x, startY: point.y, before: editor.snapshot(), changed: false }
      draft.value = { x: point.x, y: point.y, w: 0, h: 0 }
      attach()
    }
  }

  function onItemPointerDown(event: PointerEvent, annotation: Annotation): void {
    if (event.button !== 0 || editor.activeTool.value !== 'select') return
    event.stopPropagation()
    const isMulti = event.shiftKey || event.ctrlKey || event.metaKey
    if (isMulti) {
      editor.toggleSelection(annotation.id)
      return
    }
    if (!selectedIds.value.includes(annotation.id)) editor.selectOnly(annotation.id)
    if (annotation.locked) return
    const point = clientToPoint(event.clientX, event.clientY)
    drag.value = {
      kind: 'move',
      startX: point.x,
      startY: point.y,
      id: annotation.id,
      origins: cloneOrigins(editor.selectedIds.value),
      before: editor.snapshot(),
      changed: false,
    }
    attach()
  }

  function onHandlePointerDown(event: PointerEvent, annotation: Annotation, handle: Handle): void {
    if (event.button !== 0 || annotation.locked) return
    event.stopPropagation()
    editor.selectOnly(annotation.id)
    const point = clientToPoint(event.clientX, event.clientY)
    drag.value = {
      kind: 'resize',
      startX: point.x,
      startY: point.y,
      id: annotation.id,
      origins: cloneOrigins([annotation.id]),
      handle,
      before: editor.snapshot(),
      changed: false,
    }
    attach()
  }

  function onRotatePointerDown(event: PointerEvent, annotation: Annotation): void {
    if (event.button !== 0 || annotation.locked) return
    event.stopPropagation()
    editor.selectOnly(annotation.id)
    const point = clientToPoint(event.clientX, event.clientY)
    drag.value = {
      kind: 'rotate',
      startX: point.x,
      startY: point.y,
      id: annotation.id,
      origins: cloneOrigins([annotation.id]),
      before: editor.snapshot(),
      changed: false,
    }
    attach()
  }

  // ─── Move / resize maths ──────────────────────────────────────────────────
  function unionBounds(origins: Map<string, Annotation>): Box {
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = 0
    let maxY = 0
    for (const a of origins.values()) {
      const b = boundsOf(a)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w)
      maxY = Math.max(maxY, b.y + b.h)
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }

  function onMove(event: PointerEvent): void {
    const state = drag.value
    if (!state) return
    const point = clientToPoint(event.clientX, event.clientY)

    if (state.kind === 'ink') {
      inkPoints.value = [...inkPoints.value, point]
      return
    }

    if ((state.kind === 'create' || state.kind === 'marquee')) {
      const rect = {
        x: Math.min(state.startX, point.x),
        y: Math.min(state.startY, point.y),
        w: Math.abs(point.x - state.startX),
        h: Math.abs(point.y - state.startY),
      }
      if (state.kind === 'create') draft.value = rect
      else marquee.value = rect
      return
    }

    const origins = state.origins
    if (!origins?.size) return
    let dx = point.x - state.startX
    let dy = point.y - state.startY

    if (state.kind === 'move') {
      // Clamp the group's union to the page so relative layout is preserved.
      const union = unionBounds(origins)
      dx = clamp(dx, -union.x, props.metrics.pointWidth - (union.x + union.w))
      dy = clamp(dy, -union.y, props.metrics.pointHeight - (union.y + union.h))

      // Snap only single box-moves, so groups feel predictable.
      if (origins.size === 1 && editor.snapEnabled.value) {
        const only = [...origins.values()][0]
        if (only.type !== 'ink' && only.type !== 'note') {
          const others: Box[] = items.value
            .filter((a) => a.id !== only.id && a.type !== 'ink' && a.type !== 'note')
            .map((a) => boundsOf(a))
          const pageBox: Box = { x: 0, y: 0, w: props.metrics.pointWidth, h: props.metrics.pointHeight }
          const snap = snapBox(
            { x: only.x + dx, y: only.y + dy, w: only.w, h: only.h },
            others,
            pageBox,
            6 / scale.value,
          )
          dx = snap.x - only.x
          dy = snap.y - only.y
          editor.setGuides(snap.guides)
        }
      }

      const patches = new Map<string, Partial<Annotation>>()
      for (const origin of origins.values()) {
        if (origin.type === 'ink') {
          patches.set(origin.id, {
            points: origin.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          })
        } else {
          patches.set(origin.id, { x: origin.x + dx, y: origin.y + dy })
        }
      }
      editor.updateAnnotations(patches, { record: false })
      state.changed = true
      return
    }

    if (state.kind === 'rotate') {
      const origin = [...origins.values()][0]
      if (!origin || origin.type !== 'image') return
      const cx = origin.x + origin.w / 2
      const cy = origin.y + origin.h / 2
      const a0 = Math.atan2(state.startY - cy, state.startX - cx)
      const a1 = Math.atan2(point.y - cy, point.x - cx)
      let deg = origin.rotation + ((a1 - a0) * 180) / Math.PI
      if (event.shiftKey) deg = Math.round(deg / 15) * 15
      editor.updateAnnotation(origin.id, { rotation: Math.round(deg) }, { record: false })
      state.changed = true
      return
    }

    // resize — box annotations only, single selection
    const origin = [...origins.values()][0]
    if (state.kind === 'resize' && origin && 'w' in origin && 'h' in origin) {
      const handle = state.handle as Handle
      let { x, y } = origin
      let x1 = origin.x + origin.w
      let y1 = origin.y + origin.h
      if (handle.includes('w')) x = Math.min(origin.x + dx, x1 - MIN)
      if (handle.includes('e')) x1 = Math.max(origin.x + origin.w + dx, x + MIN)
      if (handle.includes('n')) y = Math.min(origin.y + dy, y1 - MIN)
      if (handle.includes('s')) y1 = Math.max(origin.y + origin.h + dy, y + MIN)
      x = Math.max(0, x)
      y = Math.max(0, y)
      x1 = Math.min(props.metrics.pointWidth, x1)
      y1 = Math.min(props.metrics.pointHeight, y1)
      editor.updateAnnotation(origin.id, { x, y, w: x1 - x, h: y1 - y }, { record: false })
      state.changed = true
    }
  }

  function onUp(): void {
    const state = drag.value
    drag.value = null
    detach()
    editor.setGuides([])
    if (!state) return

    if (state.kind === 'marquee') {
      const rect = marquee.value
      marquee.value = null
      if (!rect) return
      if (rect.w < 3 && rect.h < 3) {
        if (!state.additive) editor.selectOnly(null)
        return
      }
      const hit = items.value
        .filter((a) => {
          const b = boundsOf(a)
          return !(
            b.x > rect.x + rect.w ||
            rect.x > b.x + b.w ||
            b.y > rect.y + rect.h ||
            rect.y > b.y + b.h
          )
        })
        .map((a) => a.id)
      editor.selectMany(state.additive ? [...editor.selectedIds.value, ...hit] : hit)
      return
    }

    if (state.kind === 'ink') {
      const points = inkPoints.value
      inkPoints.value = []
      if (points.length >= 2) {
        editor.addAnnotation({
          id: uuid(),
          page: props.page,
          type: 'ink',
          points,
          color: currentStyle().color,
          size: currentStyle().strokeWidth,
          opacity: currentStyle().opacity,
        })
        editor.setTool('select')
      }
      return
    }

    if (state.kind === 'create') {
      const rect = draft.value
      draft.value = null
      const tool = editor.activeTool.value
      if (!rect) return
      const created = makeBoxAnnotation(tool, rect)
      if (created) {
        if (created.type === 'text') {
          // Defer the history entry to blur, so create + first typing is one
          // undo step (an empty text box is never a state worth landing on).
          textEditBefore = editor.snapshot()
          textEditIsNew = true
          editor.addAnnotation(created, { record: false })
          editingTextId.value = created.id
          nextTick(focusEditingText)
        } else {
          editor.addAnnotation(created)
        }
        editor.setTool('select')
      }
      return
    }

    if ((state.kind === 'move' || state.kind === 'resize' || state.kind === 'rotate') && state.changed) {
      editor.pushHistory(state.before)
    }
  }

  function fieldName(tool: ToolId): string {
    const base = tool.replace('field-', '')
    const count = editor.annotations.value.filter((a) => a.type === tool).length + 1
    return `${base}-${count}`
  }

  function makeBoxAnnotation(tool: ToolId, rect: Box): Annotation | null {
    const s = currentStyle()
    const base = { id: uuid(), page: props.page }
    const tiny = rect.w < MIN || rect.h < MIN
    // Click-to-place defaults for tools that don't require a drag.
    const defaults: Partial<Record<ToolId, { w: number; h: number }>> = {
      text: { w: 160, h: s.fontSize * 1.6 },
      link: { w: 130, h: 22 },
      'field-text': { w: 170, h: 28 },
      'field-checkbox': { w: 18, h: 18 },
      'field-radio': { w: 18, h: 18 },
      'field-dropdown': { w: 170, h: 28 },
    }
    if (tiny) {
      const d = defaults[tool]
      if (!d) return null
      rect = { x: rect.x, y: rect.y, w: d.w, h: d.h }
    }
    switch (tool) {
      case 'highlight':
        return { ...base, type: 'highlight', ...rect, color: '#fde047', opacity: 0.4 }
      case 'underline':
        return { ...base, type: 'underline', ...rect, color: s.color, opacity: 1 }
      case 'strikethrough':
        return { ...base, type: 'strikethrough', ...rect, color: s.color, opacity: 1 }
      case 'squiggly':
        return { ...base, type: 'squiggly', ...rect, color: s.color, opacity: 1 }
      case 'rect':
        return { ...base, type: 'rect', ...rect, stroke: s.color, strokeWidth: s.strokeWidth, fill: s.fill, opacity: s.opacity }
      case 'ellipse':
        return { ...base, type: 'ellipse', ...rect, stroke: s.color, strokeWidth: s.strokeWidth, fill: s.fill, opacity: s.opacity }
      case 'arrow':
        return { ...base, type: 'arrow', ...rect, stroke: s.color, strokeWidth: s.strokeWidth, fill: null, opacity: s.opacity }
      case 'line':
        return { ...base, type: 'line', ...rect, stroke: s.color, strokeWidth: s.strokeWidth, fill: null, opacity: s.opacity }
      case 'whiteout':
        return { ...base, type: 'whiteout', ...rect }
      case 'link':
        return { ...base, type: 'link', ...rect, url: '' }
      case 'field-text':
      case 'field-checkbox':
      case 'field-radio':
      case 'field-dropdown':
        return {
          ...base,
          type: tool,
          ...rect,
          name: fieldName(tool),
          options:
            tool === 'field-dropdown'
              ? ['Option 1', 'Option 2']
              : tool === 'field-radio'
                ? ['Choice 1']
                : [],
          value: '',
        }
      case 'text':
        return {
          ...base,
          type: 'text',
          ...rect,
          text: '',
          fontSize: s.fontSize,
          color: s.color === '#f59e0b' ? '#111827' : s.color,
          align: 'left',
        }
      default:
        return null
    }
  }

  function attach(): void {
    globalThis.addEventListener('pointermove', onMove)
    globalThis.addEventListener('pointerup', onUp)
  }
  function detach(): void {
    globalThis.removeEventListener('pointermove', onMove)
    globalThis.removeEventListener('pointerup', onUp)
  }
  onBeforeUnmount(detach)

  // ─── Context menu ──────────────────────────────────────────────────────────
  const menu = ref<{ x: number; y: number; kind: 'item' | 'surface' } | null>(null)

  function onItemContext(event: MouseEvent, annotation: Annotation): void {
    if (editor.activeTool.value !== 'select') return
    event.preventDefault()
    event.stopPropagation()
    if (!selectedIds.value.includes(annotation.id)) editor.selectOnly(annotation.id)
    menu.value = { x: event.clientX, y: event.clientY, kind: 'item' }
  }
  function onSurfaceContext(event: MouseEvent): void {
    if (editor.activeTool.value !== 'select') return
    event.preventDefault()
    menu.value = { x: event.clientX, y: event.clientY, kind: 'surface' }
  }

  const menuItems = computed<MenuItem[]>(() => {
    if (!menu.value) return []
    if (menu.value.kind === 'surface') {
      return [
        { id: 'paste', label: 'Paste', icon: 'file-plus', disabled: !editor.clipboard.value.length },
        { id: 'select-all', label: 'Select all on page', icon: 'box-select' },
      ]
    }
    const single = editor.selected.value
    const isLocked = single?.locked
    const isGrouped = single?.groupId
    const totalSelected = editor.selectedIds.value.length + editor.selectedContentIds.value.length

    const out: MenuItem[] = []
    if (single?.type === 'text') out.push({ id: 'edit-text', label: 'Edit text', icon: 'type' })
    out.push(
      { id: 'cut', label: 'Cut', icon: 'scissors' },
      { id: 'copy', label: 'Copy', icon: 'copy' },
      { id: 'duplicate', label: 'Duplicate', icon: 'copy' },
      { id: isLocked ? 'unlock' : 'lock', label: isLocked ? 'Unlock' : 'Lock', icon: isLocked ? 'unlock' : 'lock' },
    )
    if (totalSelected >= 2) {
      out.push({ id: 'group', label: 'Group', icon: 'layers' })
    }
    if (isGrouped) {
      out.push({ id: 'ungroup', label: 'Ungroup', icon: 'grid' })
    }
    out.push(
      { id: 'front', label: 'Bring to front', icon: 'bring-front', divider: true },
      { id: 'back', label: 'Send to back', icon: 'send-back' },
      { id: 'delete', label: 'Delete', icon: 'trash', danger: true, divider: true },
    )
    return out
  })

  function onMenuPick(id: string): void {
    switch (id) {
      case 'edit-text': {
        const single = editor.selected.value
        if (single) beginEditText(single)
        break
      }
      case 'cut':
        editor.cutSelection()
        break
      case 'copy':
        editor.copySelection()
        break
      case 'paste':
        editor.pasteClipboard()
        break
      case 'duplicate':
        editor.duplicateSelection()
        break
      case 'lock':
        editor.lockSelection()
        break
      case 'unlock':
        editor.unlockSelection()
        break
      case 'group':
        editor.groupSelection()
        break
      case 'ungroup':
        editor.ungroupSelection()
        break
      case 'front':
        editor.reorderSelection('front')
        break
      case 'back':
        editor.reorderSelection('back')
        break
      case 'delete':
        editor.removeSelectedAnnotations()
        break
      case 'select-all':
        editor.selectAllOnPage(props.page)
        break
    }
  }

  // ─── Text editing ──────────────────────────────────────────────────────────
  const textEls = new Map<string, HTMLElement>()
  /** Model snapshot captured when a text box entered edit mode (for undo). */
  let textEditBefore = ''
  /** Whether the box being edited was just created (unblurred = discardable). */
  let textEditIsNew = false
  function setTextRef(id: string) {
    return (el: unknown) => {
      if (el) textEls.set(id, el as HTMLElement)
      else textEls.delete(id)
    }
  }
  function focusEditingText(): void {
    const id = editingTextId.value
    const el = id && textEls.get(id)
    if (!el) return
    const item = editor.annotations.value.find((a) => a.id === id)
    el.innerText = item && item.type === 'text' ? item.text : ''
    el.focus()
    const range = globalThis.document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = globalThis.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }
  // Coalesce text-box keystrokes into one rAF per frame: measuring height forces
  // a synchronous reflow, so doing it once per frame (not once per keystroke)
  // keeps typing smooth. Pending writes are flushed on blur.
  let textRaf = 0
  let pendingEl: HTMLElement | null = null
  let pendingId: string | null = null
  function commitPendingText(): void {
    if (!pendingId || !pendingEl) return
    const el = pendingEl
    const item = editor.annotations.value.find((a) => a.id === pendingId)
    if (item && item.type === 'text') {
      const parent = el.parentElement
      const savedH = parent ? parent.style.height : ''
      if (parent) parent.style.height = 'auto'
      const measuredPx = el.scrollHeight || el.offsetHeight || el.getBoundingClientRect().height
      if (parent) parent.style.height = savedH
      const minH = item.fontSize * (item.lineHeight || 1.25)
      const newH = Math.max(minH, measuredPx / (scale.value || 1))
      editor.updateAnnotation(pendingId, { text: el.innerText, h: newH }, { record: false })
    } else {
      editor.updateAnnotation(pendingId, { text: el.innerText }, { record: false })
    }
  }
  function flushTextSync(): void {
    if (textRaf) {
      globalThis.cancelAnimationFrame(textRaf)
      textRaf = 0
    }
    commitPendingText()
    pendingEl = null
    pendingId = null
  }
  function onTextInput(event: Event, id: string): void {
    pendingEl = event.target as HTMLElement
    pendingId = id
    if (textRaf) return
    textRaf = globalThis.requestAnimationFrame(() => {
      textRaf = 0
      commitPendingText()
    })
  }
  /** Keep keystrokes inside the box; Escape / Ctrl+Enter commit by blurring. */
  function onEditKeydown(event: KeyboardEvent): void {
    event.stopPropagation()
    if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
      event.preventDefault()
      ;(event.target as HTMLElement).blur()
    }
  }
  function onTextBlur(id: string): void {
    flushTextSync() // commit any keystrokes still queued for the next frame
    if (editingTextId.value === id) editingTextId.value = null
    const item = editor.pageAnnotations(props.page).find((a) => a.id === id)
    // Empty box: a freshly-created one is discarded silently; an existing one
    // emptied by the user is removed as an undoable step.
    if (item && item.type === 'text' && !item.text.trim()) {
      editor.removeAnnotation(id, { record: !textEditIsNew })
    } else if (textEditBefore && editor.snapshot() !== textEditBefore) {
      // Create + typing (or an edit) collapses into one undo step.
      editor.pushHistory(textEditBefore)
    }
    textEditBefore = ''
    textEditIsNew = false
  }
  function beginEditText(annotation: Annotation): void {
    if (annotation.type !== 'text') return
    editor.selectOnly(annotation.id)
    editingTextId.value = annotation.id
    textEditBefore = editor.snapshot()
    textEditIsNew = false
    nextTick(focusEditingText)
  }

  // ─── Note popups ─────────────────────────────────────────────────────────
  function toggleNote(id: string): void {
    openNoteId.value = openNoteId.value === id ? null : id
    editor.selectOnly(id)
  }
  function onNoteInput(event: Event, id: string): void {
    editor.updateAnnotation(id, { text: (event.target as HTMLTextAreaElement).value }, { record: false })
  }

  // ─── Rendering helpers ───────────────────────────────────────────────────
  function boxStyle(a: Box): Record<string, string> {
    return {
      left: `${a.x * scale.value}px`,
      top: `${a.y * scale.value}px`,
      width: `${a.w * scale.value}px`,
      height: `${a.h * scale.value}px`,
    }
  }
  function inkPath(points: { x: number; y: number }[]): string {
    return points.map((p, i) => `${i ? 'L' : 'M'}${p.x * scale.value},${p.y * scale.value}`).join(' ')
  }
  /** Wavy underline path along the bottom edge of a squiggly box. */
  function squigglyPath(a: Box): string {
    const k = scale.value
    const y = (a.y + a.h - 1.5) * k
    const amp = 1.8 * k
    const step = 3.2 * k
    let d = `M${a.x * k},${y}`
    const width = a.w * k
    for (let x = step; x <= width; x += step) {
      d += ` L${a.x * k + x},${y + Math.sin((x / step) * Math.PI) * amp}`
    }
    return d
  }

  /** Arrow-head polyline points (scaled screen space) for a line/arrow box. */
  function arrowHead(a: Box & { strokeWidth: number }): string {
    const k = scale.value
    const sx = a.x * k
    const sy = a.y * k
    const ex = (a.x + a.w) * k
    const ey = (a.y + a.h) * k
    const angle = Math.atan2(ey - sy, ex - sx)
    const len = Math.max(9, a.strokeWidth * k * 3.5)
    const spread = Math.PI / 7
    const p1x = ex - len * Math.cos(angle - spread)
    const p1y = ey - len * Math.sin(angle - spread)
    const p2x = ex - len * Math.cos(angle + spread)
    const p2y = ey - len * Math.sin(angle + spread)
    return `${p1x},${p1y} ${ex},${ey} ${p2x},${p2y}`
  }

  function stampFontSize(a: { w: number; h: number; label: string }): number {
    const byHeight = a.h * 0.52
    const byWidth = (a.w - 14) / Math.max(1, a.label.length * 0.68)
    return Math.max(6, Math.min(byHeight, byWidth)) * scale.value
  }

  function fieldOf(a: Annotation): FieldAnnotation {
    return a as FieldAnnotation
  }

  const cursorClass = computed(() => {
    const tool = editor.activeTool.value
    if (tool === 'hand') return 'ov--grab'
    if (tool === 'select') return 'ov--select'
    if (tool === 'image' || tool === 'stamp' || tool === 'note') return 'ov--place'
    return 'ov--draw'
  })

  watch(
    () => editor.activeTool.value,
    () => {
      if (editor.activeTool.value !== 'select') editingTextId.value = null
    },
  )
</script>

<template>
  <div
    ref="rootEl"
    class="ov"
    :class="[cursorClass, { 'ov--content-editing': editor.editMode.value !== 'none' }]"
    :style="{
      width: `${metrics.cssWidth}px`,
      height: `${metrics.cssHeight}px`,
      pointerEvents:
        editor.activeTool.value === 'hand' || editor.editMode.value !== 'none' ? 'none' : 'auto',
    }"
    @pointerdown="onSurfacePointerDown"
    @contextmenu="onSurfaceContext"
  >
    <!-- Vector layer: ink, lines, arrows, squiggly (scaled point space) -->
    <svg class="ov__vec" :width="metrics.cssWidth" :height="metrics.cssHeight">
      <template v-for="a in items" :key="`v-${a.id}`">
        <path
          v-if="a.type === 'ink'"
          :d="inkPath(a.points)"
          fill="none"
          :stroke="a.color"
          :stroke-width="a.size * scale"
          :opacity="a.opacity"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          v-else-if="a.type === 'squiggly'"
          :d="squigglyPath(a)"
          fill="none"
          :stroke="a.color"
          :stroke-width="1.4 * scale"
          :opacity="a.opacity"
          stroke-linecap="round"
        />
        <g v-else-if="a.type === 'line' || a.type === 'arrow'">
          <line
            :x1="a.x * scale"
            :y1="a.y * scale"
            :x2="(a.x + a.w) * scale"
            :y2="(a.y + a.h) * scale"
            :stroke="a.stroke"
            :stroke-width="a.strokeWidth * scale"
            :opacity="a.opacity"
            stroke-linecap="round"
          />
          <polyline
            v-if="a.type === 'arrow'"
            :points="arrowHead(a)"
            fill="none"
            :stroke="a.stroke"
            :stroke-width="a.strokeWidth * scale"
            :opacity="a.opacity"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>
      </template>
    </svg>

    <!-- Live ink preview while drawing -->
    <svg v-if="inkPoints.length" class="ov__vec" :width="metrics.cssWidth" :height="metrics.cssHeight">
      <path
        :d="inkPath(inkPoints)"
        fill="none"
        :stroke="editor.style.value.color"
        :stroke-width="editor.style.value.strokeWidth * scale"
        :opacity="editor.style.value.opacity"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <!-- Box annotations -->
    <template v-for="a in items" :key="a.id">
      <!-- Highlight / underline / strike / squiggly / whiteout / rect / ellipse -->
      <div
        v-if="['highlight', 'underline', 'strikethrough', 'squiggly', 'whiteout', 'rect', 'ellipse'].includes(a.type)"
        class="ov__box"
        :class="[`ov__box--${a.type}`, { 'ov__box--sel': selectedIds.includes(a.id) }]"
        :style="{
          ...boxStyle(a as any),
          ...(a.type === 'highlight' ? { background: (a as any).color, opacity: String((a as any).opacity) } : {}),
          ...(a.type === 'rect'
            ? { border: `${(a as any).strokeWidth * scale}px solid ${(a as any).stroke}`, background: (a as any).fill ?? 'transparent', opacity: String((a as any).opacity) }
            : {}),
          ...(a.type === 'ellipse'
            ? { border: `${(a as any).strokeWidth * scale}px solid ${(a as any).stroke}`, borderRadius: '50%', background: (a as any).fill ?? 'transparent', opacity: String((a as any).opacity) }
            : {}),
          ...(a.type === 'underline' ? { borderBottom: `${2 * scale}px solid ${(a as any).color}` } : {}),
        }"
        @pointerdown="onItemPointerDown($event, a)"
        @contextmenu="onItemContext($event, a)"
      >
        <span v-if="a.type === 'strikethrough'" class="ov__strike" :style="{ background: (a as any).color }" />
        <template v-if="a.id === singleSelectedId && editor.activeTool.value === 'select'">
          <span
            v-for="h in HANDLES"
            :key="h"
            class="ov__handle"
            :class="`ov__handle--${h}`"
            @pointerdown="onHandlePointerDown($event, a, h)"
          />
        </template>
      </div>

      <!-- Text box -->
      <div
        v-else-if="a.type === 'text'"
        class="ov__text"
        :class="{ 'ov__box--sel': selectedIds.includes(a.id), 'ov__text--editing': a.id === editingTextId }"
        :style="{
          ...boxStyle(a),
          fontSize: `${a.fontSize * scale}px`,
          fontFamily: a.fontFamily || 'inherit',
          fontWeight: a.fontWeight || (a.bold ? 700 : 400),
          fontStyle: a.fontStyle || (a.italic ? 'italic' : 'normal'),
          textDecoration: [(a.underline ? 'underline' : ''), (a.strikethrough ? 'line-through' : '')].filter(Boolean).join(' ') || 'none',
          backgroundColor: a.highlightColor || 'transparent',
          lineHeight: String(a.lineHeight || 1.25),
          letterSpacing: a.letterSpacing ? `${a.letterSpacing * scale}px` : 'normal',
          wordSpacing: a.wordSpacing ? `${a.wordSpacing * scale}px` : 'normal',
          textTransform: a.textTransform || 'none',
          color: a.color,
          textAlign: a.align,
        }"
        @pointerdown="onItemPointerDown($event, a)"
        @dblclick="beginEditText(a)"
        @contextmenu="onItemContext($event, a)"
      >
        <div v-if="a.id !== editingTextId" class="ov__text-view">{{ a.text }}</div>
        <div
          v-else
          :ref="setTextRef(a.id)"
          class="ov__text-edit"
          contenteditable
          spellcheck="false"
          @input="onTextInput($event, a.id)"
          @blur="onTextBlur(a.id)"
          @pointerdown.stop
          @keydown="onEditKeydown"
        />
        <div v-if="!a.text && a.id !== editingTextId" class="ov__text-ph">Text</div>
        <template v-if="a.id === singleSelectedId && editor.activeTool.value === 'select' && a.id !== editingTextId">
          <span
            v-for="h in HANDLES"
            :key="h"
            class="ov__handle"
            :class="`ov__handle--${h}`"
            @pointerdown="onHandlePointerDown($event, a, h)"
          />
        </template>
      </div>

      <!-- Placed image / signature -->
      <div
        v-else-if="a.type === 'image'"
        class="ov__image"
        :class="{ 'ov__box--sel': selectedIds.includes(a.id) }"
        :style="{
          ...boxStyle(a),
          opacity: String(a.opacity),
          transform: a.rotation ? `rotate(${a.rotation}deg)` : undefined,
        }"
        @pointerdown="onItemPointerDown($event, a)"
        @contextmenu="onItemContext($event, a)"
      >
        <img :src="a.src" class="ov__img" draggable="false" alt="" />
        <template v-if="a.id === singleSelectedId && editor.activeTool.value === 'select'">
          <span class="ov__rot" @pointerdown="onRotatePointerDown($event, a)" />
          <span
            v-for="h in HANDLES"
            :key="h"
            class="ov__handle"
            :class="`ov__handle--${h}`"
            @pointerdown="onHandlePointerDown($event, a, h)"
          />
        </template>
      </div>

      <!-- Rubber stamp -->
      <div
        v-else-if="a.type === 'stamp'"
        class="ov__stamp"
        :class="{ 'ov__box--sel': selectedIds.includes(a.id) }"
        :style="{
          ...boxStyle(a),
          color: a.color,
          borderColor: a.color,
          fontSize: `${stampFontSize(a)}px`,
        }"
        @pointerdown="onItemPointerDown($event, a)"
        @contextmenu="onItemContext($event, a)"
      >
        {{ a.label.toUpperCase() }}
        <template v-if="a.id === singleSelectedId && editor.activeTool.value === 'select'">
          <span
            v-for="h in HANDLES"
            :key="h"
            class="ov__handle"
            :class="`ov__handle--${h}`"
            @pointerdown="onHandlePointerDown($event, a, h)"
          />
        </template>
      </div>

      <!-- Hyperlink region -->
      <div
        v-else-if="a.type === 'link'"
        class="ov__link"
        :class="{ 'ov__box--sel': selectedIds.includes(a.id) }"
        :style="boxStyle(a)"
        :title="a.url || 'Set the link URL in the properties bar'"
        @pointerdown="onItemPointerDown($event, a)"
        @contextmenu="onItemContext($event, a)"
      >
        <BaseIcon name="link" :size="Math.max(10, 12 * scale)" class="ov__link-icon" />
        <template v-if="a.id === singleSelectedId && editor.activeTool.value === 'select'">
          <span
            v-for="h in HANDLES"
            :key="h"
            class="ov__handle"
            :class="`ov__handle--${h}`"
            @pointerdown="onHandlePointerDown($event, a, h)"
          />
        </template>
      </div>

      <!-- Form fields -->
      <div
        v-else-if="a.type.startsWith('field-')"
        class="ov__field"
        :class="[`ov__field--${a.type.replace('field-', '')}`, { 'ov__box--sel': selectedIds.includes(a.id) }]"
        :style="boxStyle(a as any)"
        @pointerdown="onItemPointerDown($event, a)"
        @contextmenu="onItemContext($event, a)"
      >
        <span v-if="a.type === 'field-text'" class="ov__field-ph" :style="{ fontSize: `${11 * scale}px` }">
          {{ fieldOf(a).value || fieldOf(a).name }}
        </span>
        <svg v-else-if="a.type === 'field-checkbox'" viewBox="0 0 24 24" class="ov__field-check" fill="none" stroke="currentColor" stroke-width="3">
          <path d="m5 13 4 4L19 7" />
        </svg>
        <span v-else-if="a.type === 'field-radio'" class="ov__field-dot" />
        <template v-else-if="a.type === 'field-dropdown'">
          <span class="ov__field-ph" :style="{ fontSize: `${11 * scale}px` }">
            {{ fieldOf(a).options[0] ?? fieldOf(a).name }}
          </span>
          <span class="ov__field-chev" :style="{ fontSize: `${10 * scale}px` }">▾</span>
        </template>
        <template v-if="a.id === singleSelectedId && editor.activeTool.value === 'select'">
          <span
            v-for="h in HANDLES"
            :key="h"
            class="ov__handle"
            :class="`ov__handle--${h}`"
            @pointerdown="onHandlePointerDown($event, a, h)"
          />
        </template>
      </div>

      <!-- Sticky note -->
      <div
        v-else-if="a.type === 'note'"
        class="ov__note-wrap"
        :style="{ left: `${a.x * scale}px`, top: `${a.y * scale}px` }"
      >
        <button
          type="button"
          class="ov__note"
          :class="{ 'ov__box--sel': selectedIds.includes(a.id) }"
          :style="{ background: a.color }"
          @pointerdown="onItemPointerDown($event, a)"
          @click="toggleNote(a.id)"
          @contextmenu="onItemContext($event, a)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <div v-if="openNoteId === a.id" class="ov__note-pop" @pointerdown.stop>
          <textarea
            class="ov__note-text"
            :value="a.text"
            placeholder="Add a comment…"
            @input="onNoteInput($event, a.id)"
            @blur="editor.pushHistory(editor.snapshot())"
          />
          <button type="button" class="ov__note-del" title="Delete note" @click="editor.removeAnnotation(a.id)">
            Delete
          </button>
        </div>
      </div>

      <!-- Selection/move hit-box for ink, line, arrow -->
      <div
        v-else-if="editor.activeTool.value === 'select'"
        class="ov__hit"
        :class="{ 'ov__box--sel': selectedIds.includes(a.id) }"
        :style="boxStyle(boundsOf(a))"
        @pointerdown="onItemPointerDown($event, a)"
        @contextmenu="onItemContext($event, a)"
      />
    </template>

    <!-- Draft preview while drawing a box -->
    <div
      v-if="draft"
      class="ov__draft"
      :style="{
        left: `${draft.x * scale}px`,
        top: `${draft.y * scale}px`,
        width: `${draft.w * scale}px`,
        height: `${draft.h * scale}px`,
      }"
    />

    <!-- Marquee selection preview -->
    <div
      v-if="marquee && (marquee.w > 2 || marquee.h > 2)"
      class="ov__marquee"
      :style="{
        left: `${marquee.x * scale}px`,
        top: `${marquee.y * scale}px`,
        width: `${marquee.w * scale}px`,
        height: `${marquee.h * scale}px`,
      }"
    />

    <ContextMenu
      v-if="menu"
      :x="menu.x"
      :y="menu.y"
      :items="menuItems"
      @pick="onMenuPick"
      @close="menu = null"
    />
  </div>
</template>

<style scoped>
  .ov {
    position: absolute;
    inset: 0;
    touch-action: none;
    z-index: 3;
  }
  .ov--draw {
    cursor: crosshair;
  }
  .ov--place {
    cursor: copy;
  }
  .ov--grab {
    cursor: grab;
    pointer-events: none;
  }
  .ov--select {
    cursor: default;
    pointer-events: none;
  }
  /* While editing page content, the whole annotation layer is inert so clicks
     fall through to the content layer beneath. */
  .ov--content-editing,
  .ov--content-editing * {
    pointer-events: none !important;
  }
  /* Annotation items remain interactive even when the overlay root is transparent. */
  .ov--select .ov__box,
  .ov--select .ov__hit,
  .ov--select .ov__text,
  .ov--select .ov__note,
  .ov--select .ov__stamp,
  .ov--select .ov__link,
  .ov--select .ov__image,
  .ov--select .ov__field {
    pointer-events: auto;
  }
  .ov__vec {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: visible;
  }

  .ov__box {
    position: absolute;
    box-sizing: border-box;
  }
  .ov__box--highlight {
    mix-blend-mode: multiply;
  }
  .ov__box--whiteout {
    background: #fff;
    outline: 1px dashed hsl(var(--color-border-strong));
  }
  .ov__box--sel {
    outline: 2px solid hsl(var(--color-primary));
    outline-offset: 1px;
    z-index: 3;
  }
  .ov__strike {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 2px;
    transform: translateY(-50%);
  }

  .ov__hit {
    position: absolute;
    cursor: move;
  }

  .ov__text {
    position: absolute;
    box-sizing: border-box;
    padding: 2px 4px;
    line-height: 1.25;
    overflow: hidden;
    cursor: move;
    min-width: 24px;
  }
  .ov__text--editing {
    cursor: text;
    outline: 2px solid hsl(var(--color-primary));
    background: hsl(var(--color-surface) / 0.6);
  }
  .ov__text-edit,
  .ov__text-view {
    outline: none;
    white-space: pre-wrap;
    word-break: break-word;
    min-height: 1em;
  }
  .ov__text-ph {
    position: absolute;
    inset: 2px 4px;
    color: hsl(var(--color-text-faint));
    pointer-events: none;
  }

  .ov__image {
    position: absolute;
    cursor: move;
    transform-origin: center;
  }
  .ov__img {
    width: 100%;
    height: 100%;
    object-fit: fill;
    pointer-events: none;
  }

  .ov__stamp {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2.5px solid;
    border-radius: 6px;
    font-weight: 800;
    letter-spacing: 0.08em;
    white-space: nowrap;
    overflow: hidden;
    cursor: move;
    opacity: 0.92;
    background: rgb(255 255 255 / 0.08);
    user-select: none;
  }

  .ov__link {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(37 99 235 / 0.12);
    border: 1.5px dashed rgb(37 99 235 / 0.55);
    border-radius: 3px;
    cursor: move;
  }
  .ov__link-icon {
    color: rgb(37 99 235 / 0.8);
  }

  .ov__field {
    position: absolute;
    box-sizing: border-box;
    background: rgb(219 234 254 / 0.55);
    border: 1.5px solid rgb(59 130 246 / 0.75);
    border-radius: 3px;
    cursor: move;
    display: flex;
    align-items: center;
    overflow: hidden;
  }
  .ov__field--radio {
    border-radius: 50%;
    justify-content: center;
  }
  .ov__field--checkbox {
    justify-content: center;
  }
  .ov__field-ph {
    padding: 0 6px;
    color: rgb(30 64 175 / 0.8);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  .ov__field-check {
    width: 70%;
    height: 70%;
    color: rgb(30 64 175 / 0.55);
  }
  .ov__field-dot {
    width: 45%;
    height: 45%;
    border-radius: 50%;
    background: rgb(30 64 175 / 0.45);
  }
  .ov__field-chev {
    padding-right: 5px;
    color: rgb(30 64 175 / 0.8);
  }

  .ov__note-wrap {
    position: absolute;
  }
  .ov__note {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid rgb(0 0 0 / 0.25);
    border-radius: 4px 4px 4px 0;
    color: #422006;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
  }
  .ov__note-pop {
    position: absolute;
    top: 28px;
    left: 0;
    width: 200px;
    padding: 8px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 5;
  }
  .ov__note-text {
    width: 100%;
    min-height: 64px;
    resize: vertical;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-sm);
    background: hsl(var(--color-surface-muted));
    color: hsl(var(--color-text));
    font: inherit;
    font-size: 13px;
    padding: 6px;
  }
  .ov__note-del {
    margin-top: 6px;
    background: none;
    border: none;
    color: hsl(var(--color-danger));
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .ov__draft {
    position: absolute;
    border: 2px dashed hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.1);
    pointer-events: none;
    z-index: 4;
  }
  .ov__marquee {
    position: absolute;
    border: 1.5px solid hsl(var(--color-primary) / 0.7);
    background: hsl(var(--color-primary) / 0.08);
    pointer-events: none;
    z-index: 4;
  }

  .ov__handle {
    position: absolute;
    width: 10px;
    height: 10px;
    background: hsl(var(--color-surface));
    border: 2px solid hsl(var(--color-primary));
    border-radius: 2px;
    z-index: 5;
  }
  .ov__handle--nw { top: -5px; left: -5px; cursor: nwse-resize; }
  .ov__handle--n { top: -5px; left: calc(50% - 5px); cursor: ns-resize; }
  .ov__handle--ne { top: -5px; right: -5px; cursor: nesw-resize; }
  .ov__handle--e { top: calc(50% - 5px); right: -5px; cursor: ew-resize; }
  .ov__handle--se { bottom: -5px; right: -5px; cursor: nwse-resize; }
  .ov__handle--s { bottom: -5px; left: calc(50% - 5px); cursor: ns-resize; }
  .ov__handle--sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
  .ov__handle--w { top: calc(50% - 5px); left: -5px; cursor: ew-resize; }
  .ov__rot {
    position: absolute;
    top: -22px;
    left: calc(50% - 6px);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: hsl(var(--color-surface));
    border: 2px solid hsl(var(--color-primary));
    cursor: grab;
    z-index: 5;
  }
  .ov__rot::after {
    content: '';
    position: absolute;
    top: 10px;
    left: 4px;
    width: 2px;
    height: 10px;
    background: hsl(var(--color-primary));
  }
</style>
