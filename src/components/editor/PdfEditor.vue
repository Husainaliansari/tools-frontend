<script setup lang="ts">
  /**
   * PdfEditor — the editor shell. Owns the editor session (provide/inject),
   * wires ribbon actions, keyboard shortcuts, autosave recovery, image and
   * signature insertion, fullscreen, and lays out the ribbon, properties bar,
   * left panel, continuous page stage and status bar.
   */
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { useFeedback } from '@composables'
  import EditorRibbon from './EditorRibbon.vue'
  import PropertiesBar from './PropertiesBar.vue'
  import LeftPanel from './LeftPanel.vue'
  import PageStage from './PageStage.vue'
  import MetadataModal from './MetadataModal.vue'
  import SignatureModal from './SignatureModal.vue'
  import { provideEditor, ZOOM_PRESETS } from './useEditor'
  import type { EditorAction } from './editor-tools'
  import type { ToolId } from '@/lib/pdf'

  const props = defineProps<{ file: File }>()
  const emit = defineEmits<{ close: [] }>()

  const editor = provideEditor()
  const { showToast } = useFeedback()
  const showMeta = ref(false)
  const showSignature = ref(false)
  const busy = ref(false)
  const rootEl = ref<HTMLDivElement | null>(null)
  const imageInput = ref<HTMLInputElement | null>(null)
  const isFullscreen = ref(false)


  watch(() => props.file, (file) => void editor.loadFile(file), { immediate: true })

  // Announce the reconstruction result once it finishes.
  watch(
    () => editor.reconstructed.value,
    (done) => {
      if (!done) return
      const s = editor.reconstructStats.value
      showToast(
        `Reconstructed ${s.total} objects — ${s.text} text, ${s.graphic} shapes, ${s.image} images`,
      )
    },
  )
  const reconstructPct = computed(() => {
    const p = editor.reconstructProgress.value
    return p.total ? Math.round((p.done / p.total) * 100) : 0
  })

  const autosaveAgo = computed(() => {
    const at = editor.autosaveAvailable.value
    if (!at) return ''
    const mins = Math.max(1, Math.round((Date.now() - at) / 60_000))
    if (mins < 60) return `${mins} min ago`
    const hours = Math.round(mins / 60)
    return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`
  })

  function restoreAutosave(): void {
    if (editor.restoreAutosave()) showToast('Previous edits restored')
    else showToast('Could not restore the saved session', 'error')
  }

  // ─── Image insertion ─────────────────────────────────────────────────────
  function pickImage(): void {
    imageInput.value?.click()
  }
  async function onImagePicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      showToast('Please choose a PNG or JPEG image', 'error')
      return
    }
    await editor.stageImageFile(file)
    showToast('Click on the page to place the image')
  }
  async function onSignatureDone(dataUrl: string): Promise<void> {
    await editor.stageImageData(dataUrl)
    showToast('Click on the page to place your signature')
  }

  // ─── Fullscreen ──────────────────────────────────────────────────────────
  function toggleFullscreen(): void {
    if (globalThis.document.fullscreenElement) void globalThis.document.exitFullscreen()
    else void rootEl.value?.requestFullscreen()
  }
  function onFullscreenChange(): void {
    isFullscreen.value = !!globalThis.document.fullscreenElement
  }

  async function onAction(action: EditorAction): Promise<void> {
    switch (action) {
      case 'edit-text':
        editor.setEditMode('text')
        showToast(editor.editMode.value === 'text' ? 'Edit Text — click a text block to edit' : 'Exited edit mode')
        return
      case 'edit-object':
        editor.setEditMode('object')
        showToast(editor.editMode.value === 'object' ? 'Edit Object — select an image or shape' : 'Exited edit mode')
        return
      case 'edit-all':
        editor.setEditMode('all')
        showToast(editor.editMode.value === 'all' ? 'Editing all page content' : 'Exited edit mode')
        return
      case 'edit-done':
        editor.setEditMode('none')
        return
      case 'undo':
        return editor.undo()
      case 'redo':
        return editor.redo()
      case 'metadata':
        showMeta.value = true
        return
      case 'search':
        editor.leftOpen.value = true
        editor.leftTab.value = 'search'
        return
      case 'signature':
        showSignature.value = true
        return
      case 'insert-image':
        pickImage()
        return
      case 'export': {
        busy.value = true
        try {
          await editor.exportDownload()
          showToast('Edited PDF downloaded')
        } catch {
          showToast('Could not export the PDF', 'error')
        } finally {
          busy.value = false
        }
        return
      }
      case 'export-png':
        try {
          await editor.exportPageImage()
          showToast(`Page ${editor.currentPage.value} exported as PNG`)
        } catch {
          showToast('Could not export the page image', 'error')
        }
        return
      case 'print':
        try {
          await editor.print()
        } catch {
          showToast('Could not prepare the document for printing', 'error')
        }
        return
      case 'duplicate':
        return editor.duplicateSelection()
      case 'copy':
        return editor.copySelection()
      case 'paste':
        return editor.pasteClipboard()
      case 'bring-front':
        return editor.reorderSelection('front')
      case 'send-back':
        return editor.reorderSelection('back')
      case 'align-left':
      case 'align-center':
      case 'align-right':
      case 'align-top':
      case 'align-middle':
      case 'align-bottom':
        return editor.alignSelection(action.replace('align-', '') as 'left')
      case 'distribute-h':
        return editor.distributeSelection('h')
      case 'distribute-v':
        return editor.distributeSelection('v')
      case 'rotate-left':
        await editor.rotatePage(editor.currentPage.value, -90)
        return
      case 'rotate-right':
        await editor.rotatePage(editor.currentPage.value, 90)
        return
      case 'insert-page':
        await editor.insertBlankPage(editor.currentPage.value)
        showToast('Blank page inserted')
        return
      case 'duplicate-page':
        await editor.duplicatePage(editor.currentPage.value)
        return
      case 'delete-page':
        await editor.deletePage(editor.currentPage.value)
        return
      case 'extract-page':
        try {
          await editor.extractPage(editor.currentPage.value)
        } catch {
          showToast('Could not extract the page', 'error')
        }
        return
    }
  }

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  const TOOL_KEYS: Record<string, ToolId> = {
    v: 'select',
    h: 'hand',
    t: 'text',
    n: 'note',
    d: 'ink',
    r: 'rect',
    o: 'ellipse',
    a: 'arrow',
    l: 'line',
  }

  function nudge(dx: number, dy: number): void {
    // Try content selection first, then annotation selection.
    const cid = editor.selectedContentId.value
    if (cid) {
      const edit = editor.editFor(cid)
      const det = editor.selectedDetected.value
      if (!edit && det) editor.ensureContentEdit(det)
      const base = editor.editFor(cid) ?? det
      if (base) editor.patchContent(cid, { x: Math.max(0, base.x + dx), y: Math.max(0, base.y + dy) })
      return
    }
    const targets = editor.selectedAnnotations.value
    if (!targets.length) return
    const patches = new Map<string, Partial<(typeof targets)[number]>>()
    for (const sel of targets) {
      if (sel.type === 'ink') {
        patches.set(sel.id, { points: sel.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) })
      } else {
        patches.set(sel.id, { x: Math.max(0, sel.x + dx), y: Math.max(0, sel.y + dy) })
      }
    }
    editor.updateAnnotations(patches)
  }

  function hasSelection(): boolean {
    return !!editor.selectedContentId.value || editor.selectedIds.value.length > 0
  }
  function deleteSelection(): void {
    if (editor.selectedContentId.value) {
      editor.deleteContent(editor.selectedContentId.value)
    } else {
      editor.removeSelectedAnnotations()
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null
    const typing = target?.closest('input, textarea, select, [contenteditable="true"]')
    const mod = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()

    if (mod && key === 'z') {
      event.preventDefault()
      if (event.shiftKey) editor.redo()
      else editor.undo()
      return
    }
    if (mod && key === 'y') {
      event.preventDefault()
      editor.redo()
      return
    }
    if (mod && key === 's') {
      event.preventDefault()
      void onAction('export')
      return
    }
    if (mod && key === 'p') {
      event.preventDefault()
      void onAction('print')
      return
    }
    if (mod && key === 'f') {
      event.preventDefault()
      void onAction('search')
      return
    }
    // Zoom
    if (mod && (key === '=' || key === '+')) {
      event.preventDefault()
      editor.zoomIn()
      return
    }
    if (mod && key === '-') {
      event.preventDefault()
      editor.zoomOut()
      return
    }
    if (mod && key === '0') {
      event.preventDefault()
      editor.fitMode.value = 'page'
      return
    }
    if (mod && key === '1') {
      event.preventDefault()
      editor.zoomTo(1)
      return
    }
    // Object clipboard
    if (mod && !typing) {
      if (key === 'c') return void (event.preventDefault(), editor.copySelection())
      if (key === 'x') return void (event.preventDefault(), editor.cutSelection())
      if (key === 'v') return void (event.preventDefault(), editor.pasteClipboard())
      if (key === 'd') return void (event.preventDefault(), editor.duplicateSelection())
      if (key === 'a') {
        event.preventDefault()
        editor.selectAllOnPage(editor.currentPage.value)
        return
      }
    }
    if (mod) return
    if (typing) return

    if (event.key === 'Escape') {
      const hadSelection = !!editor.selectedContentId.value || editor.selectedIds.value.length > 0
      editor.selectOnly(null)
      editor.selectedContentId.value = null
      editor.setTool('select')
      // A second Escape (nothing selected) leaves the active content-edit mode.
      if (!hadSelection && editor.editMode.value !== 'none') editor.setEditMode('none')
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (hasSelection()) {
        event.preventDefault()
        deleteSelection()
      }
      return
    }
    if (event.key === 'PageDown') {
      event.preventDefault()
      editor.setPage(editor.currentPage.value + 1)
      return
    }
    if (event.key === 'PageUp') {
      event.preventDefault()
      editor.setPage(editor.currentPage.value - 1)
      return
    }
    const step = event.shiftKey ? 10 : 1
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    if (arrows[event.key] && hasSelection()) {
      event.preventDefault()
      nudge(...arrows[event.key])
      return
    }
    const tool = TOOL_KEYS[key]
    if (tool) editor.setTool(tool)
  }

  function onPageInput(event: Event): void {
    editor.setPage(Number((event.target as HTMLInputElement).value))
  }

  function onZoomSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value
    if (value === 'fit-width') editor.fitMode.value = 'width'
    else if (value === 'fit-page') editor.fitMode.value = 'page'
    else editor.zoomTo(Number(value))
  }

  const zoomSelectValue = computed(() => {
    if (editor.fitMode.value === 'width') return 'fit-width'
    if (editor.fitMode.value === 'page') return 'fit-page'
    const preset = ZOOM_PRESETS.find((p) => Math.abs(p - editor.scale.value) < 0.01)
    return preset !== undefined ? String(preset) : ''
  })

  onMounted(() => {
    globalThis.addEventListener('keydown', onKeyDown)
    globalThis.document.addEventListener('fullscreenchange', onFullscreenChange)
  })
  onBeforeUnmount(() => {
    globalThis.removeEventListener('keydown', onKeyDown)
    globalThis.document.removeEventListener('fullscreenchange', onFullscreenChange)
  })
</script>

<template>
  <div ref="rootEl" class="editor" :class="{ 'editor--fs': isFullscreen }">
    <input
      ref="imageInput"
      type="file"
      accept="image/png,image/jpeg"
      style="display: none"
      @change="onImagePicked"
    />

    <div class="editor__bar">
      <div class="editor__file">
        <BaseIcon name="file-text" :size="16" />
        <span class="editor__name">{{ editor.fileName.value }}</span>
        <span v-if="editor.pageCount.value" class="editor__meta">{{ editor.pageCount.value }} pages</span>
        <span v-if="editor.isDirty.value" class="editor__dirty" title="Unsaved changes — download to keep them">●</span>
      </div>
      <div class="editor__bar-actions">
        <button
          type="button"
          class="editor__sbtn"
          :title="isFullscreen ? 'Exit full screen' : 'Full screen'"
          @click="toggleFullscreen"
        >
          <BaseIcon :name="isFullscreen ? 'minimize' : 'maximize'" :size="15" />
        </button>
        <button type="button" class="editor__close" @click="emit('close')">
          <BaseIcon name="x" :size="15" /> Close
        </button>
      </div>
    </div>

    <EditorRibbon @action="onAction" />
    <PropertiesBar />

    <!-- Autosave recovery -->
    <div v-if="editor.autosaveAvailable.value" class="editor__restore">
      <BaseIcon name="clock" :size="14" />
      <span>Unsaved edits from a previous session ({{ autosaveAgo }}) were found for this file.</span>
      <button type="button" class="editor__restore-btn" @click="restoreAutosave">Restore</button>
      <button type="button" class="editor__restore-dismiss" @click="editor.dismissAutosave()">Discard</button>
    </div>

    <!-- Full-document reconstruction progress -->
    <div v-if="editor.reconstructing.value" class="editor__recon">
      <div class="editor__recon-head">
        <BaseIcon name="refresh" :size="14" class="editor__recon-spin" />
        Reconstructing document — page {{ editor.reconstructProgress.value.done }} of
        {{ editor.reconstructProgress.value.total }}
      </div>
      <div class="editor__recon-track">
        <div class="editor__recon-fill" :style="{ width: `${reconstructPct}%` }" />
      </div>
    </div>

    <!-- Page-op progress -->
    <div v-if="editor.docBusy.value" class="editor__recon">
      <div class="editor__recon-head">
        <BaseIcon name="refresh" :size="14" class="editor__recon-spin" />
        Updating pages…
      </div>
    </div>

    <div class="editor__body">
      <LeftPanel />
      <PageStage />
    </div>

    <!-- Status / navigation bar -->
    <div class="editor__status">
      <div class="editor__nav">
        <button
          type="button"
          class="editor__sbtn"
          title="Toggle panel"
          :class="{ 'editor__sbtn--active': editor.leftOpen.value }"
          @click="editor.leftOpen.value = !editor.leftOpen.value"
        >
          <BaseIcon name="panel-left" :size="16" />
        </button>
        <button
          type="button"
          class="editor__sbtn"
          title="Previous page"
          :disabled="editor.currentPage.value <= 1"
          @click="editor.setPage(editor.currentPage.value - 1)"
        >
          <BaseIcon name="chevron-left" :size="16" />
        </button>
        <span class="editor__pages">
          <input
            class="editor__page-input"
            type="number"
            :value="editor.currentPage.value"
            :min="1"
            :max="editor.pageCount.value"
            aria-label="Page number"
            @change="onPageInput"
          />
          / {{ editor.pageCount.value || '—' }}
        </span>
        <button
          type="button"
          class="editor__sbtn"
          title="Next page"
          :disabled="editor.currentPage.value >= editor.pageCount.value"
          @click="editor.setPage(editor.currentPage.value + 1)"
        >
          <BaseIcon name="chevron-right" :size="16" />
        </button>
      </div>

      <div class="editor__zoom">
        <button
          type="button"
          class="editor__sbtn"
          :class="{ 'editor__sbtn--active': editor.showGrid.value }"
          title="Toggle grid"
          @click="editor.showGrid.value = !editor.showGrid.value"
        >
          <BaseIcon name="grid" :size="15" />
        </button>
        <button
          type="button"
          class="editor__sbtn"
          :class="{ 'editor__sbtn--active': editor.snapEnabled.value }"
          title="Snap to objects"
          @click="editor.snapEnabled.value = !editor.snapEnabled.value"
        >
          <BaseIcon name="magnet" :size="15" />
        </button>
        <span class="editor__sep" />
        <button type="button" class="editor__sbtn" title="Zoom out (Ctrl+-)" @click="editor.zoomOut()">
          <BaseIcon name="zoom-out" :size="16" />
        </button>
        <select
          class="editor__zoom-select"
          :value="zoomSelectValue"
          aria-label="Zoom level"
          @change="onZoomSelect"
        >
          <option v-if="!zoomSelectValue" value="" disabled>{{ editor.zoomPercent.value }}</option>
          <option value="fit-page">Fit page</option>
          <option value="fit-width">Fit width</option>
          <option v-for="p in ZOOM_PRESETS" :key="p" :value="String(p)">{{ Math.round(p * 100) }}%</option>
        </select>
        <button type="button" class="editor__sbtn" title="Zoom in (Ctrl+=)" @click="editor.zoomIn()">
          <BaseIcon name="zoom-in" :size="16" />
        </button>
      </div>
    </div>

    <MetadataModal v-if="showMeta" @close="showMeta = false" />
    <SignatureModal v-if="showSignature" @done="onSignatureDone" @close="showSignature = false" />
  </div>
</template>

<style scoped>
  .editor {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 68px);
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: hsl(var(--color-surface));
  }
  .editor--fs {
    height: 100vh;
    border: none;
    border-radius: 0;
  }
  @media (max-width: 1024px) {
    .editor {
      height: calc(100vh - 68px);
      border: none;
      border-radius: 0;
    }
  }
  .editor__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 14px;
    background: hsl(var(--color-surface));
    border-bottom: 1px solid hsl(var(--color-border));
    flex: none;
  }
  .editor__file {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: hsl(var(--color-text));
  }
  .editor__name {
    font-weight: 700;
    font-size: 13.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 32vw;
  }
  .editor__meta {
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
    white-space: nowrap;
  }
  .editor__dirty {
    color: hsl(var(--color-primary));
    font-size: 14px;
    line-height: 1;
  }
  .editor__bar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .editor__close {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 10px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: none;
    color: hsl(var(--color-text-muted));
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .editor__close:hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .editor__body {
    flex: 1;
    display: flex;
    min-height: 0;
    position: relative;
  }

  .editor__restore {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 14px;
    background: hsl(var(--color-primary) / 0.07);
    border-bottom: 1px solid hsl(var(--color-border));
    font-size: 12.5px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    flex: none;
  }
  .editor__restore-btn {
    padding: 4px 12px;
    border: none;
    border-radius: var(--radius-md);
    background: hsl(var(--color-primary));
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .editor__restore-dismiss {
    padding: 4px 10px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: none;
    color: hsl(var(--color-text-muted));
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .editor__recon {
    flex: none;
    padding: 8px 14px;
    background: hsl(var(--color-primary) / 0.06);
    border-bottom: 1px solid hsl(var(--color-border));
  }
  .editor__recon-head {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    font-weight: 600;
    color: hsl(var(--color-primary));
    margin-bottom: 6px;
  }
  .editor__recon-spin {
    animation: recon-spin 1.1s linear infinite;
  }
  .editor__recon-track {
    height: 5px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-primary) / 0.15);
    overflow: hidden;
  }
  .editor__recon-fill {
    height: 100%;
    background: hsl(var(--color-primary));
    border-radius: var(--radius-full);
    transition: width 0.2s ease;
  }
  @keyframes recon-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .editor__status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 14px;
    border-top: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    flex: none;
  }
  .editor__nav,
  .editor__zoom {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .editor__sep {
    width: 1px;
    height: 18px;
    background: hsl(var(--color-border));
    margin: 0 4px;
  }
  .editor__sbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border: none;
    border-radius: var(--radius-md);
    background: none;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .editor__sbtn:hover:not(:disabled) {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .editor__sbtn--active {
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
  }
  .editor__sbtn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .editor__pages {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    font-variant-numeric: tabular-nums;
  }
  .editor__page-input {
    width: 44px;
    padding: 5px 6px;
    text-align: center;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 12.5px;
    font-weight: 600;
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .editor__page-input::-webkit-outer-spin-button,
  .editor__page-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .editor__zoom-select {
    height: 28px;
    padding: 0 6px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    min-width: 86px;
    text-align: center;
  }
</style>
