<script setup lang="ts">
  /**
   * ContentLayer — editable overlay for the PDF's own content objects.
   *
   * Renders selectable boxes over the page's *detected* text and image objects.
   * Interacting with one materialises a content edit: the original region is
   * covered (with a sampled background colour) and the new object is drawn on
   * top, so the live canvas is WYSIWYG with the exported result.
   * Move/resize/rotate snap to neighbouring objects and the page, with live
   * alignment guides.
   *
   * Sits below the annotation overlay (lower z-index). Pointer events pass
   * through to this layer only when the annotation layer doesn't handle them.
   */
  import { computed, nextTick, onBeforeUnmount, ref, watch, type CSSProperties } from 'vue'
  import { clamp } from '@utils'
  import ContextMenu, { type MenuItem } from './ContextMenu.vue'
  import { useEditor } from './useEditor'
  import { normalizeText, snapBox, type Box, type ContentEdit, type DetectedObject } from '@/lib/pdf'

  const props = defineProps<{
    page: number
    metrics: { pointWidth: number; pointHeight: number; cssWidth: number; cssHeight: number }
  }>()

  const editor = useEditor()
  const rootEl = ref<HTMLDivElement | null>(null)
  const scale = computed(() => editor.scale.value)

  interface Cell {
    id: string
    kind: 'text' | 'image' | 'graphic' | 'region'
    det?: DetectedObject
    edit?: ContentEdit
  }
  /** Only the object families the active edit mode targets are interactive. */
  function kindAllowed(kind: Cell['kind']): boolean {
    const mode = editor.editMode.value
    if (mode === 'all') return true
    if (mode === 'text') return kind === 'text'
    if (mode === 'object') return kind !== 'text'
    return false
  }

  const cells = computed<Cell[]>(() => {
    if (editor.editMode.value === 'none') return []
    const dets = editor.detectedForPage(props.page)
    const edits = editor.contentEdits.value.filter((e) => e.page === props.page)
    const editMap = new Map(edits.map((e) => [e.id, e]))
    const rows: Cell[] = []
    for (const d of dets) {
      rows.push({ id: d.id, kind: d.kind, det: d, edit: editMap.get(d.id) })
      editMap.delete(d.id)
    }
    for (const e of editMap.values()) rows.push({ id: e.id, kind: 'region', edit: e })
    return rows.filter((c) => kindAllowed(c.kind))
  })

  /** Effective geometry (edit overrides the detected box). */
  function geomOf(cell: Cell): { x: number; y: number; w: number; h: number; rotation: number } {
    const g = cell.edit ?? cell.det!
    return { x: g.x, y: g.y, w: g.w, h: g.h, rotation: (cell.edit?.rotation ?? 0) }
  }
  const boxStyle = (g: { x: number; y: number; w: number; h: number; rotation: number }) => ({
    left: `${g.x * scale.value}px`,
    top: `${g.y * scale.value}px`,
    width: `${g.w * scale.value}px`,
    height: `${g.h * scale.value}px`,
    transform: g.rotation ? `rotate(${g.rotation}deg)` : undefined,
  })

  // ─── Coordinate mapping ──────────────────────────────────────────────────
  function clientToPoint(cx: number, cy: number): { x: number; y: number } {
    const rect = rootEl.value?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: clamp((cx - rect.left) / scale.value, 0, props.metrics.pointWidth),
      y: clamp((cy - rect.top) / scale.value, 0, props.metrics.pointHeight),
    }
  }

  // ─── Drag machine ────────────────────────────────────────────────────────
  type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  const MIN = 6

  interface Drag {
    kind: 'move' | 'resize' | 'rotate' | 'marquee'
    startX: number
    startY: number
    cell?: Cell
    origin?: { x: number; y: number; w: number; h: number; rotation: number }
    origins?: Map<string, { x: number; y: number; w: number; h: number; rotation: number; locked?: boolean }>
    handle?: Handle
    additive?: boolean
    before: string
    materialised: boolean
    changed: boolean
  }
  const drag = ref<Drag | null>(null)
  const marquee = ref<Box | null>(null)
  const editingId = ref<string | null>(null)
  let textBefore = ''

  const hoveredId = ref<string | null>(null)

  function pageBox(): Box {
    return { x: 0, y: 0, w: props.metrics.pointWidth, h: props.metrics.pointHeight }
  }
  function otherBoxes(exceptId: string): Box[] {
    return cells.value
      .filter((c) => c.id !== exceptId)
      .map((c) => {
        const g = geomOf(c)
        return { x: g.x, y: g.y, w: g.w, h: g.h }
      })
  }

  function findBestCellAt(px: number, py: number): Cell | null {
    const matches = cells.value.filter((cell) => {
      if (cell.edit && cell.edit.deleted) return false
      const g = geomOf(cell)
      // Ignore page-spanning background boxes from hit testing
      if (g.w >= props.metrics.pointWidth * 0.75 && g.h >= props.metrics.pointHeight * 0.75) return false
      return px >= g.x && px <= g.x + g.w && py >= g.y && py <= g.y + g.h
    })
    if (!matches.length) return null
    // Sort by priority (text > region/image > graphic) and smallest area
    matches.sort((a, b) => {
      const priority: Record<string, number> = { text: 3, region: 2, image: 2, graphic: 1 }
      const pA = priority[a.kind] || 0
      const pB = priority[b.kind] || 0
      if (pA !== pB) return pB - pA
      const gA = geomOf(a)
      const gB = geomOf(b)
      return (gA.w * gA.h) - (gB.w * gB.h)
    })
    return matches[0]
  }

  function onSurfaceDown(event: PointerEvent): void {
    if (event.button !== 0 || editor.activeTool.value === 'hand') return
    const p = clientToPoint(event.clientX, event.clientY)
    const best = findBestCellAt(p.x, p.y)
    if (best) {
      onCellDown(event, best)
    } else {
      const isMulti = event.shiftKey || event.ctrlKey || event.metaKey
      if (!isMulti) {
        editor.clearAllSelection()
        editingId.value = null
      }
      drag.value = {
        kind: 'marquee',
        startX: p.x,
        startY: p.y,
        additive: isMulti,
        before: editor.snapshot(),
        materialised: false,
        changed: false,
      }
      marquee.value = { x: p.x, y: p.y, w: 0, h: 0 }
      attach()
    }
  }

  function onCellDown(event: PointerEvent, cell: Cell): void {
    if (event.button !== 0 || editor.activeTool.value === 'hand') return
    event.stopPropagation()
    const g = geomOf(cell)
    // If user clicked a giant container cell, try finding a better sub-cell at coordinates
    if (g.w >= props.metrics.pointWidth * 0.75 && g.h >= props.metrics.pointHeight * 0.75) {
      const p = clientToPoint(event.clientX, event.clientY)
      const best = findBestCellAt(p.x, p.y)
      if (best && best.id !== cell.id) {
        onCellDown(event, best)
        return
      }
    }

    const isMulti = event.shiftKey || event.ctrlKey || event.metaKey
    if (isMulti) {
      editor.toggleContentSelection(cell.id)
    } else if (!editor.selectedContentIds.value.includes(cell.id)) {
      editor.selectContentOnly(cell.id)
    }
    // Clear annotation selection when selecting a content object.
    editor.selectedIds.value = []

    // Selection alone does NOT materialise an edit: the block stays as a plain
    // outline over the live page. A single editable layer is created only when
    // the block is actually edited, dragged, or restyled (see materialise()).
    // We only *read* the block's true colour so the toolbar reflects it.
    if (cell.kind === 'text' && cell.det) editor.ensureTextColor(cell.det)

    const origins = new Map<string, { x: number; y: number; w: number; h: number; rotation: number; locked?: boolean }>()
    for (const cid of editor.selectedContentIds.value) {
      const cCell = cells.value.find((c) => c.id === cid)
      if (cCell) {
        const cg = geomOf(cCell)
        origins.set(cid, { ...cg, locked: cCell.edit?.locked })
      }
    }

    const p = clientToPoint(event.clientX, event.clientY)
    drag.value = {
      kind: 'move',
      startX: p.x,
      startY: p.y,
      cell,
      origin: g,
      origins,
      before: editor.snapshot(),
      materialised: !!cell.edit,
      changed: false,
    }
    attach()
  }

  function onCellPointerEnter(cell: Cell): void {
    if (editor.activeTool.value === 'hand') return
    const g = geomOf(cell)
    if (!(g.w >= props.metrics.pointWidth * 0.75 && g.h >= props.metrics.pointHeight * 0.75)) {
      hoveredId.value = cell.id
    }
  }

  function onCellPointerLeave(cell: Cell): void {
    if (hoveredId.value === cell.id) {
      hoveredId.value = null
    }
  }

  function onHandleDown(event: PointerEvent, cell: Cell, handle: Handle): void {
    if (event.button !== 0) return
    event.stopPropagation()
    editor.selectContentOnly(cell.id)
    const p = clientToPoint(event.clientX, event.clientY)
    drag.value = {
      kind: 'resize',
      startX: p.x,
      startY: p.y,
      cell,
      origin: geomOf(cell),
      handle,
      before: editor.snapshot(),
      materialised: !!cell.edit,
      changed: false,
    }
    attach()
  }

  function onRotateDown(event: PointerEvent, cell: Cell): void {
    if (event.button !== 0) return
    event.stopPropagation()
    editor.selectContentOnly(cell.id)
    const p = clientToPoint(event.clientX, event.clientY)
    drag.value = {
      kind: 'rotate',
      startX: p.x,
      startY: p.y,
      cell,
      origin: geomOf(cell),
      before: editor.snapshot(),
      materialised: !!cell.edit,
      changed: false,
    }
    attach()
  }

  function materialise(cell: Cell): void {
    if (cell.det && !editor.editFor(cell.id)) editor.ensureContentEdit(cell.det)
  }

  function onMove(event: PointerEvent): void {
    const state = drag.value
    if (!state) return
    const p = clientToPoint(event.clientX, event.clientY)

    if (state.kind === 'marquee') {
      marquee.value = {
        x: Math.min(state.startX, p.x),
        y: Math.min(state.startY, p.y),
        w: Math.abs(p.x - state.startX),
        h: Math.abs(p.y - state.startY),
      }
      return
    }

    const cell = state.cell
    const origin = state.origin
    if (!cell || !origin) return
    if (!state.materialised) {
      materialise(cell)
      state.materialised = true
    }
    const dx = p.x - state.startX
    const dy = p.y - state.startY

    if (state.kind === 'move') {
      if (state.origins && state.origins.size > 0) {
        for (const [id, orig] of state.origins) {
          if (orig.locked) continue
          const cCell = cells.value.find((c) => c.id === id)
          if (cCell) materialise(cCell)
          let x = clamp(orig.x + dx, 0, props.metrics.pointWidth - orig.w)
          let y = clamp(orig.y + dy, 0, props.metrics.pointHeight - orig.h)
          if (id === cell.id && !orig.rotation && editor.snapEnabled.value) {
            const snap = snapBox({ x, y, w: orig.w, h: orig.h }, otherBoxes(cell.id), pageBox(), 6 / scale.value)
            x = snap.x
            y = snap.y
            editor.setGuides(snap.guides)
          }
          editor.patchContent(id, { x, y }, { record: false })
        }
      } else {
        let x = clamp(origin.x + dx, 0, props.metrics.pointWidth - origin.w)
        let y = clamp(origin.y + dy, 0, props.metrics.pointHeight - origin.h)
        if (!origin.rotation && editor.snapEnabled.value) {
          const snap = snapBox({ x, y, w: origin.w, h: origin.h }, otherBoxes(cell.id), pageBox(), 6 / scale.value)
          x = snap.x
          y = snap.y
          editor.setGuides(snap.guides)
        }
        editor.patchContent(cell.id, { x, y }, { record: false })
      }
      state.changed = true
      return
    }

    if (state.kind === 'resize' && state.handle) {
      const h = state.handle
      let x = origin.x
      let y = origin.y
      let x1 = origin.x + origin.w
      let y1 = origin.y + origin.h
      if (h.includes('w')) x = Math.min(origin.x + dx, x1 - MIN)
      if (h.includes('e')) x1 = Math.max(origin.x + origin.w + dx, x + MIN)
      if (h.includes('n')) y = Math.min(origin.y + dy, y1 - MIN)
      if (h.includes('s')) y1 = Math.max(origin.y + origin.h + dy, y + MIN)
      x = Math.max(0, x)
      y = Math.max(0, y)
      x1 = Math.min(props.metrics.pointWidth, x1)
      y1 = Math.min(props.metrics.pointHeight, y1)
      const patch: Partial<ContentEdit> = { x, y, w: x1 - x, h: y1 - y }
      // Scale text size with the box height for a natural resize.
      if (cell.kind === 'text') {
        const edit = editor.editFor(cell.id)
        if (edit && edit.kind === 'text') {
          (patch as { fontSize: number }).fontSize = Math.max(
            4,
            (edit.fontSize * (y1 - y)) / origin.h,
          )
        }
      }
      editor.patchContent(cell.id, patch, { record: false })
      state.changed = true
      return
    }

    if (state.kind === 'rotate') {
      const cx = origin.x + origin.w / 2
      const cy = origin.y + origin.h / 2
      const a0 = Math.atan2(state.startY - cy, state.startX - cx)
      const a1 = Math.atan2(p.y - cy, p.x - cx)
      let deg = origin.rotation + ((a1 - a0) * 180) / Math.PI
      if (event.shiftKey) deg = Math.round(deg / 15) * 15
      editor.patchContent(cell.id, { rotation: Math.round(deg) }, { record: false })
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
      const box = marquee.value
      marquee.value = null
      if (box && box.w >= MIN && box.h >= MIN) {
        // Find all content cells intersecting box
        const hitIds: string[] = []
        for (const c of cells.value) {
          const g = geomOf(c)
          if (!(g.w >= props.metrics.pointWidth * 0.75 && g.h >= props.metrics.pointHeight * 0.75)) {
            const intersects = !(
              g.x > box.x + box.w ||
              g.x + g.w < box.x ||
              g.y > box.y + box.h ||
              g.y + g.h < box.y
            )
            if (intersects) hitIds.push(c.id)
          }
        }
        if (hitIds.length) {
          if (state.additive) {
            editor.selectContentMany([...editor.selectedContentIds.value, ...hitIds])
          } else {
            editor.selectContentMany(hitIds)
          }
        } else if (!state.additive && editor.editMode.value !== 'text') {
          // Marquee over empty space lifts a bitmap region — object editing only.
          editor.liftRegionObject(box, props.page)
        }
      }
      return
    }
    if (state.changed) editor.pushHistory(state.before)
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

  // ─── Inline text editing ───────────────────────────────────────────────────
  const textEls = new Map<string, HTMLElement>()
  const setTextRef = (id: string) => (el: unknown) => {
    if (el) textEls.set(id, el as HTMLElement)
    else textEls.delete(id)
  }
  function beginEdit(cell: Cell): void {
    if (cell.kind !== 'text' || editor.activeTool.value === 'hand') return
    editor.selectContentOnly(cell.id)
    textBefore = editor.snapshot()
    if (cell.det && !editor.editFor(cell.id)) editor.ensureContentEdit(cell.det)
    editingId.value = cell.id
    nextTick(() => {
      const el = textEls.get(cell.id)
      const edit = editor.editFor(cell.id)
      if (!el) return
      el.innerText = edit && edit.kind === 'text' ? edit.text : ''
      el.focus()
      const range = globalThis.document.createRange()
      range.selectNodeContents(el)
      const sel = globalThis.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      syncTextHeight(cell.id, el)
    })
  }

  function measureTextHeight(el: HTMLElement, id: string): number {
    const edit = editor.editFor(id)
    const det = cells.value.find((c) => c.id === id)?.det
    const fontSize = edit && edit.kind === 'text' ? edit.fontSize : det && det.kind === 'text' ? det.fontSize : 12
    const lineHeightRatio = edit && edit.kind === 'text' ? (edit.lineHeight || 1.25) : 1.25
    const minH = fontSize * lineHeightRatio

    const parent = el.parentElement
    const savedH = parent ? parent.style.height : ''
    if (parent) parent.style.height = 'auto'

    const measuredPx = el.scrollHeight || el.offsetHeight || el.getBoundingClientRect().height
    if (parent) parent.style.height = savedH

    const measuredPt = measuredPx / (scale.value || 1)
    return Math.max(minH, measuredPt)
  }

  function syncTextHeight(id: string, el: HTMLElement, newText?: string): void {
    // Grow ONLY the edited block's own box so its overlay reflows within itself.
    // Surrounding blocks are never materialised or moved — moving a neighbour's
    // mask would uncover the original text baked into the page canvas beneath,
    // producing the ghost/duplicate layers this used to cause.
    const newH = measureTextHeight(el, id)
    const patch: Record<string, unknown> = { h: newH }
    if (newText !== undefined) patch.text = newText
    editor.patchContent(id, patch as Partial<ContentEdit>, { record: false })
  }

  function onTextInput(event: Event, id: string): void {
    const el = event.target as HTMLElement
    const text = normalizeText(el.innerText)
    syncTextHeight(id, el, text)
  }

  watch(
    () => {
      const id = editor.selectedContentId.value
      if (!id) return null
      const edit = editor.editFor(id)
      if (!edit || edit.kind !== 'text') return null
      return `${edit.fontSize}-${edit.lineHeight}-${edit.fontFamily}-${edit.letterSpacing}-${edit.bold}-${edit.italic}`
    },
    () => {
      const id = editor.selectedContentId.value
      if (!id) return
      nextTick(() => {
        const el = textEls.get(id)
        if (el) syncTextHeight(id, el)
      })
    },
  )
  function onTextBlur(): void {
    if (editingId.value) {
      const edit = editor.editFor(editingId.value)
      if (edit && edit.kind === 'text') {
        const cleanText = normalizeText(edit.text)
        if (cleanText !== edit.text) {
          editor.patchContent(editingId.value, { text: cleanText }, { record: false })
        }
      }
    }
    if (editingId.value && textBefore && editor.snapshot() !== textBefore) {
      editor.pushHistory(textBefore)
    }
    editingId.value = null
    textBefore = ''
  }
  function onEditKeydown(event: KeyboardEvent): void {
    event.stopPropagation()
    if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
      event.preventDefault()
      ;(event.target as HTMLElement).blur()
    }
  }

  // ─── Context menu ──────────────────────────────────────────────────────────
  const menu = ref<{ x: number; y: number; cell: Cell } | null>(null)

  function onCellContext(event: MouseEvent, cell: Cell): void {
    if (editor.activeTool.value === 'hand') return
    event.preventDefault()
    event.stopPropagation()
    if (!editor.selectedContentIds.value.includes(cell.id)) {
      editor.selectContentOnly(cell.id)
    }
    menu.value = { x: event.clientX, y: event.clientY, cell }
  }

  const menuItems = computed<MenuItem[]>(() => {
    if (!menu.value) return []
    const { cell } = menu.value
    const edit = cell.edit
    const out: MenuItem[] = []
    if (cell.kind === 'text') out.push({ id: 'edit', label: 'Edit text', icon: 'type' })
    out.push({ id: 'copy', label: 'Copy', icon: 'copy' })
    out.push({ id: 'duplicate', label: 'Duplicate', icon: 'copy' })
    out.push({
      id: edit?.locked ? 'unlock' : 'lock',
      label: edit?.locked ? 'Unlock' : 'Lock',
      icon: edit?.locked ? 'unlock' : 'lock',
    })
    if (editor.selectedContentIds.value.length >= 2 || editor.selectedIds.value.length >= 2) {
      out.push({ id: 'group', label: 'Group', icon: 'layers' })
    }
    if (edit?.groupId) {
      out.push({ id: 'ungroup', label: 'Ungroup', icon: 'grid' })
    }
    if (cell.edit && cell.det) out.push({ id: 'revert', label: 'Revert to original', icon: 'rotate-ccw' })
    out.push({ id: 'delete', label: 'Delete', icon: 'trash', danger: true, divider: out.length > 0 })
    return out
  })

  function onMenuPick(id: string): void {
    const cell = menu.value?.cell
    if (!cell) return
    if (id === 'edit') beginEdit(cell)
    if (id === 'copy') editor.copySelection()
    if (id === 'duplicate') editor.duplicateSelection()
    if (id === 'lock') editor.lockSelection()
    if (id === 'unlock') editor.unlockSelection()
    if (id === 'group') editor.groupSelection()
    if (id === 'ungroup') editor.ungroupSelection()
    if (id === 'delete') editor.deleteContent(cell.id)
    if (id === 'revert') {
      const before = editor.snapshot()
      editor.contentEdits.value = editor.contentEdits.value.filter((e) => e.id !== cell.id)
      editor.pushHistory(before)
    }
  }

  // ─── Detection lifecycle ───────────────────────────────────────────────────
  // Parse lazily and only for the active mode: Edit Text parses text alone,
  // Edit Object parses images/graphics alone. Nothing runs in `none`.
  watch(
    [() => props.page, () => editor.editMode.value],
    () => {
      const mode = editor.editMode.value
      if (mode === 'none') return
      void editor.detectPage(props.page, {
        text: mode === 'text' || mode === 'all',
        objects: mode === 'object' || mode === 'all',
      })
    },
    { immediate: true },
  )

  function textCss(cell: Cell): CSSProperties {
    const edit = editor.editFor(cell.id)
    const t = edit && edit.kind === 'text' ? edit : cell.det && cell.det.kind === 'text' ? cell.det : null
    if (!t) return {}

    const isSerif = /times|serif|georgia|roman|garamond|minion|book|cambria|palatino|baskerville|century/i.test(
      `${t.fontFamily || ''} ${t.originalFontName || ''}`,
    )
    const isMono = /mono|courier|consol|menlo|code|fixed/i.test(
      `${t.fontFamily || ''} ${t.originalFontName || ''}`,
    )

    const fallbackFont = isSerif ? 'Times New Roman, Georgia, serif' : isMono ? 'Courier New, monospace' : 'Helvetica, Arial, sans-serif'

    const fontStack = [
      t.loadedFontFamily ? `"${t.loadedFontFamily}"` : null,
      t.fontFamily ? `"${t.fontFamily}"` : null,
      t.originalFontName ? `"${t.originalFontName}"` : null,
      fallbackFont,
    ]
      .filter(Boolean)
      .join(', ')

    const opacity = edit ? (edit.opacity ?? 1) : 1
    const isMultiLine = t.text ? t.text.includes('\n') : false
    const lineHeight = isMultiLine ? (t.lineHeight || 1.15) : 1.05
    const letterSpacing = t.letterSpacing ? `${t.letterSpacing * scale.value}px` : 'normal'
    const paragraphSpacing = t.paragraphSpacing ? `${t.paragraphSpacing * scale.value}px` : '0px'

    const decs = [
      t.underline ? 'underline' : null,
      t.strikethrough ? 'line-through' : null,
    ].filter(Boolean).join(' ') || 'none'

    return {
      fontFamily: fontStack,
      fontSize: `${t.fontSize * scale.value}px`,
      fontWeight: t.bold ? 700 : 400,
      fontStyle: t.italic ? 'italic' : 'normal',
      textDecoration: decs,
      lineHeight: `${lineHeight}`,
      letterSpacing,
      marginBottom: paragraphSpacing,
      opacity,
      color: edit && edit.kind === 'text' ? edit.color : (t.color || '#111827'),
      textAlign: (edit && edit.kind === 'text' ? edit.align : t.align || 'left') as 'left',
      margin: '0',
      padding: '0',
      boxSizing: 'border-box',
    }
  }
</script>

<template>
  <div
    ref="rootEl"
    class="cl"
    :style="{
      width: `${metrics.cssWidth}px`,
      height: `${metrics.cssHeight}px`,
      pointerEvents: editor.activeTool.value === 'hand' ? 'none' : 'auto',
    }"
    @pointerdown="onSurfaceDown"
  >
    <!-- Covers over originals that have been edited -->
    <template v-for="cell in cells" :key="`cover-${cell.id}`">
      <div
        v-if="cell.edit"
        class="cl__cover"
        :style="{
          left: `${(cell.edit.orig.x - 2) * scale}px`,
          top: `${(cell.edit.orig.y - 2) * scale}px`,
          width: `${(cell.edit.orig.w + 4) * scale}px`,
          height: `${(cell.edit.orig.h + 4) * scale}px`,
          background: cell.edit.bg || '#ffffff',
        }"
      />
    </template>

    <!-- Objects -->
    <template v-for="cell in cells" :key="cell.id">
      <div
        v-if="!(cell.edit && cell.edit.deleted)"
        class="cl__obj"
        :class="{
          'cl__obj--sel': editor.selectedContentIds.value.includes(cell.id),
          'cl__obj--hover': cell.id === hoveredId && !editor.selectedContentIds.value.includes(cell.id),
          'cl__obj--text': cell.kind === 'text',
          'cl__obj--graphic': cell.kind === 'graphic',
          'cl__obj--edited': !!cell.edit,
          'cl__obj--locked': cell.edit?.locked,
        }"
        :style="boxStyle(geomOf(cell))"
        @pointerdown="onCellDown($event, cell)"
        @pointerenter="onCellPointerEnter(cell)"
        @pointerleave="onCellPointerLeave(cell)"
        @dblclick="beginEdit(cell)"
        @contextmenu="onCellContext($event, cell)"
      >
        <!-- Image / region bitmap -->
        <img
          v-if="cell.kind !== 'text' && cell.edit && cell.edit.kind === 'region'"
          :src="cell.edit.image"
          class="cl__img"
          draggable="false"
          alt=""
        />

        <!-- Edited text (WYSIWYG) -->
        <div
          v-if="cell.kind === 'text' && cell.edit"
          v-show="cell.id !== editingId"
          class="cl__text"
          :style="textCss(cell)"
        >
          {{ cell.edit.kind === 'text' ? cell.edit.text : '' }}
        </div>
        <div
          v-if="cell.kind === 'text' && cell.id === editingId"
          :ref="setTextRef(cell.id)"
          class="cl__text cl__text--edit"
          contenteditable
          spellcheck="false"
          :style="textCss(cell)"
          @pointerdown.stop
          @input="onTextInput($event, cell.id)"
          @blur="onTextBlur"
          @keydown="onEditKeydown"
        />

        <!-- Handles + rotate on selection -->
        <template v-if="editor.selectedContentIds.value.includes(cell.id)">
          <span v-if="!cell.edit?.locked" class="cl__rot" @pointerdown="onRotateDown($event, cell)" />
          <template v-if="!cell.edit?.locked">
            <span
              v-for="h in HANDLES"
              :key="h"
              class="cl__handle"
              :class="`cl__handle--${h}`"
              @pointerdown="onHandleDown($event, cell, h)"
            />
          </template>
        </template>
      </div>
    </template>

    <!-- Marquee (region lift) -->
    <div
      v-if="marquee"
      class="cl__marquee"
      :style="{
        left: `${marquee.x * scale}px`,
        top: `${marquee.y * scale}px`,
        width: `${marquee.w * scale}px`,
        height: `${marquee.h * scale}px`,
      }"
    />

    <div v-if="editor.detecting.value" class="cl__scan">Analysing page…</div>

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
  .cl {
    position: absolute;
    inset: 0;
    touch-action: none;
  }
  .cl__cover {
    position: absolute;
    pointer-events: none;
    z-index: 2;
  }
  .cl__obj {
    position: absolute;
    box-sizing: border-box;
    cursor: move;
    outline: none;
    transform-origin: center;
    transition: outline 0.12s ease, background-color 0.12s ease;
  }
  .cl__obj--text {
    z-index: 3;
  }
  .cl__obj--graphic {
    z-index: 1;
  }
  .cl__obj--hover {
    outline: 1.5px dashed hsl(var(--color-primary) / 0.85);
    background: hsl(var(--color-primary) / 0.04);
    z-index: 6;
  }
  .cl__obj--graphic.cl__obj--hover {
    outline: 1.5px dashed hsl(var(--color-purple) / 0.85);
    background: hsl(var(--color-purple) / 0.04);
  }
  .cl__obj--sel {
    outline: 2px solid hsl(var(--color-primary)) !important;
    background: transparent !important;
    z-index: 10 !important;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
  }
  .cl__img {
    width: 100%;
    height: 100%;
    object-fit: fill;
    pointer-events: none;
  }
  .cl__text {
    width: 100%;
    height: 100%;
    line-height: 1.05;
    overflow: visible;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  .cl__text--edit {
    outline: none;
    cursor: text;
    background: transparent;
  }
  .cl__marquee {
    position: absolute;
    border: 1.5px dashed hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.1);
    pointer-events: none;
    z-index: 6;
  }
  .cl__scan {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 12px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-text) / 0.8);
    color: hsl(var(--color-surface));
    font-size: 12px;
    font-weight: 600;
    pointer-events: none;
  }

  .cl__handle {
    position: absolute;
    width: 10px;
    height: 10px;
    background: hsl(var(--color-surface));
    border: 2px solid hsl(var(--color-primary));
    border-radius: 2px;
    z-index: 11;
  }
  .cl__handle--nw { top: -5px; left: -5px; cursor: nwse-resize; }
  .cl__handle--n { top: -5px; left: calc(50% - 5px); cursor: ns-resize; }
  .cl__handle--ne { top: -5px; right: -5px; cursor: nesw-resize; }
  .cl__handle--e { top: calc(50% - 5px); right: -5px; cursor: ew-resize; }
  .cl__handle--se { bottom: -5px; right: -5px; cursor: nwse-resize; }
  .cl__handle--s { bottom: -5px; left: calc(50% - 5px); cursor: ns-resize; }
  .cl__handle--sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
  .cl__handle--w { top: calc(50% - 5px); left: -5px; cursor: ew-resize; }
  .cl__rot {
    position: absolute;
    top: -22px;
    left: calc(50% - 6px);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: hsl(var(--color-surface));
    border: 2px solid hsl(var(--color-primary));
    cursor: grab;
    z-index: 11;
  }
  .cl__rot::after {
    content: '';
    position: absolute;
    top: 10px;
    left: 4px;
    width: 2px;
    height: 10px;
    background: hsl(var(--color-primary));
  }
</style>
