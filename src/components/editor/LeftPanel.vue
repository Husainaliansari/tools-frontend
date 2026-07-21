<script setup lang="ts">
  /**
   * LeftPanel — the docked navigation panel: an icon rail plus four tabs.
   *
   *  • Pages     — thumbnails with drag-and-drop reordering and a per-page
   *                context menu (rotate / insert / duplicate / delete / extract)
   *  • Bookmarks — the document outline (read-only), click to navigate
   *  • Search    — full-document find with replace / replace-all
   *  • Comments  — every annotation, click to jump, delete inline
   */
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import ContextMenu, { type MenuItem } from './ContextMenu.vue'
  import { useEditor, type LeftTab, type OutlineNode } from './useEditor'
  import { renderPageToCanvas, type Annotation } from '@/lib/pdf'

  const editor = useEditor()
  const listEl = ref<HTMLElement | null>(null)

  const TABS: { id: LeftTab; icon: string; label: string }[] = [
    { id: 'pages', icon: 'copy', label: 'Pages' },
    { id: 'bookmarks', icon: 'bookmark', label: 'Bookmarks' },
    { id: 'search', icon: 'search', label: 'Search' },
    { id: 'comments', icon: 'message-square', label: 'Comments' },
  ]

  function pickTab(tab: LeftTab): void {
    if (editor.leftTab.value === tab && editor.leftOpen.value) {
      editor.leftOpen.value = false
    } else {
      editor.leftTab.value = tab
      editor.leftOpen.value = true
    }
  }

  // ─── Pages: thumbnails ─────────────────────────────────────────────────────
  const THUMB_W = 136
  const canvases = ref<HTMLCanvasElement[]>([])
  function setCanvas(index: number) {
    return (el: unknown) => {
      if (el) canvases.value[index] = el as HTMLCanvasElement
    }
  }

  let renderSeq = 0
  async function renderThumbs(): Promise<void> {
    const seq = ++renderSeq
    for (let n = 1; n <= editor.pageCount.value; n++) {
      if (seq !== renderSeq) return
      const canvas = canvases.value[n - 1]
      const page = await editor.getPage(n)
      if (!canvas || !page) continue
      const viewport = page.getViewport({ scale: 1 })
      const result = await renderPageToCanvas(page, canvas, THUMB_W / viewport.width)
      try {
        await result?.task.promise
      } catch {
        /* superseded — ignore */
      }
    }
  }

  watch(
    [() => editor.pageCount.value, () => editor.docTick.value, () => editor.leftOpen.value, () => editor.leftTab.value],
    async () => {
      if (!editor.pageCount.value || !editor.leftOpen.value || editor.leftTab.value !== 'pages') return
      canvases.value = []
      await nextTick()
      await renderThumbs()
    },
    { immediate: true },
  )

  // Scroll the active thumbnail into view.
  watch(
    () => editor.currentPage.value,
    () => {
      nextTick(() => {
        listEl.value
          ?.querySelector('.lp__item--active')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    },
  )

  // ─── Pages: drag-and-drop reorder ──────────────────────────────────────────
  const dragFrom = ref<number | null>(null)
  const dragOver = ref<number | null>(null)

  function onDragStart(event: DragEvent, page: number): void {
    dragFrom.value = page
    event.dataTransfer?.setData('text/plain', String(page))
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(event: DragEvent, page: number): void {
    event.preventDefault()
    dragOver.value = page
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  }
  function onDrop(event: DragEvent, page: number): void {
    event.preventDefault()
    const from = dragFrom.value
    dragFrom.value = null
    dragOver.value = null
    if (from && from !== page) void editor.movePage(from, page)
  }
  function onDragEnd(): void {
    dragFrom.value = null
    dragOver.value = null
  }

  // ─── Pages: context menu ───────────────────────────────────────────────────
  const pageMenu = ref<{ x: number; y: number; page: number } | null>(null)

  function onPageContext(event: MouseEvent, page: number): void {
    event.preventDefault()
    pageMenu.value = { x: event.clientX, y: event.clientY, page }
  }

  const pageMenuItems = computed<MenuItem[]>(() => [
    { id: 'rotate-left', label: 'Rotate left', icon: 'rotate-ccw' },
    { id: 'rotate-right', label: 'Rotate right', icon: 'rotate-cw' },
    { id: 'insert-after', label: 'Insert blank page after', icon: 'file-plus', divider: true },
    { id: 'duplicate', label: 'Duplicate page', icon: 'copy' },
    { id: 'extract', label: 'Extract as PDF', icon: 'file-output' },
    { id: 'export-png', label: 'Export as PNG', icon: 'image' },
    {
      id: 'delete',
      label: 'Delete page',
      icon: 'trash',
      danger: true,
      divider: true,
      disabled: editor.pageCount.value <= 1,
    },
  ])

  function onPageMenuPick(id: string): void {
    const page = pageMenu.value?.page
    if (!page) return
    if (id === 'rotate-left') void editor.rotatePage(page, -90)
    if (id === 'rotate-right') void editor.rotatePage(page, 90)
    if (id === 'insert-after') void editor.insertBlankPage(page)
    if (id === 'duplicate') void editor.duplicatePage(page)
    if (id === 'extract') void editor.extractPage(page)
    if (id === 'export-png') void editor.exportPageImage(page)
    if (id === 'delete') void editor.deletePage(page)
  }

  // ─── Search ────────────────────────────────────────────────────────────────
  const query = ref('')
  const replacement = ref('')
  const caseSensitive = ref(false)
  const replacedCount = ref<number | null>(null)

  async function submitSearch(): Promise<void> {
    replacedCount.value = null
    await editor.runSearch(query.value, caseSensitive.value)
  }
  async function doReplaceAll(): Promise<void> {
    replacedCount.value = await editor.replaceAll(replacement.value)
  }

  // ─── Comments ──────────────────────────────────────────────────────────────
  const TYPE_META: Record<string, { icon: string; label: string }> = {
    highlight: { icon: 'highlighter', label: 'Highlight' },
    underline: { icon: 'underline', label: 'Underline' },
    strikethrough: { icon: 'strikethrough', label: 'Strikethrough' },
    squiggly: { icon: 'pen-line', label: 'Squiggly' },
    ink: { icon: 'pen-line', label: 'Drawing' },
    rect: { icon: 'square', label: 'Rectangle' },
    ellipse: { icon: 'circle', label: 'Ellipse' },
    arrow: { icon: 'move-up-right', label: 'Arrow' },
    line: { icon: 'minus', label: 'Line' },
    text: { icon: 'type', label: 'Text box' },
    whiteout: { icon: 'eraser', label: 'Whiteout' },
    note: { icon: 'message-square', label: 'Note' },
    image: { icon: 'image', label: 'Image' },
    stamp: { icon: 'stamp', label: 'Stamp' },
    link: { icon: 'link', label: 'Link' },
    'field-text': { icon: 'form-input', label: 'Text field' },
    'field-checkbox': { icon: 'check-square', label: 'Checkbox' },
    'field-radio': { icon: 'circle-dot', label: 'Radio button' },
    'field-dropdown': { icon: 'chevron-down', label: 'Dropdown' },
  }

  const comments = computed(() =>
    [...editor.annotations.value].sort((a, b) => a.page - b.page),
  )

  function commentText(a: Annotation): string {
    if ('text' in a && a.text) return a.text
    if (a.type === 'stamp') return a.label
    if (a.type === 'link') return a.url || '(no URL yet)'
    if (a.type.startsWith('field-')) return (a as { name?: string }).name ?? ''
    return ''
  }

  function jumpTo(a: Annotation): void {
    editor.setPage(a.page)
    editor.selectOnly(a.id)
    // Clear content selection when jumping to an annotation.
    editor.selectedContentId.value = null
  }

  // ─── Responsive ────────────────────────────────────────────────────────────
  const isMobile = ref(false)
  function updateMobile(): void {
    isMobile.value = globalThis.innerWidth <= 1024
    if (isMobile.value) editor.leftOpen.value = false
  }
  onMounted(() => {
    updateMobile()
    globalThis.addEventListener('resize', updateMobile)
  })
  onBeforeUnmount(() => globalThis.removeEventListener('resize', updateMobile))

  function flatten(nodes: OutlineNode[], depth = 0): { node: OutlineNode; depth: number }[] {
    return nodes.flatMap((node) => [{ node, depth }, ...flatten(node.items, depth + 1)])
  }
  const flatOutline = computed(() => flatten(editor.outline.value))
</script>

<template>
  <div class="lp" :class="{ 'lp--open': editor.leftOpen.value, 'lp--mobile': isMobile }">
    <!-- Icon rail -->
    <div class="lp__rail">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        type="button"
        class="lp__rail-btn"
        :class="{ 'lp__rail-btn--active': editor.leftOpen.value && editor.leftTab.value === tab.id }"
        :title="tab.label"
        @click="pickTab(tab.id)"
      >
        <BaseIcon :name="tab.icon" :size="17" />
        <span
          v-if="tab.id === 'comments' && comments.length"
          class="lp__rail-badge"
        >{{ comments.length > 99 ? '99+' : comments.length }}</span>
      </button>
    </div>

    <!-- Panel body -->
    <div v-if="editor.leftOpen.value" class="lp__body">
      <div class="lp__head">
        <span class="lp__title">{{ TABS.find((t) => t.id === editor.leftTab.value)?.label }}</span>
        <button type="button" class="lp__close" title="Collapse panel" @click="editor.leftOpen.value = false">
          <BaseIcon name="chevron-left" :size="15" />
        </button>
      </div>

      <!-- Pages -->
      <div v-if="editor.leftTab.value === 'pages'" ref="listEl" class="lp__list">
        <div
          v-for="n in editor.pageCount.value"
          :key="`${editor.docTick.value}-${n}`"
          class="lp__item"
          :class="{
            'lp__item--active': n === editor.currentPage.value,
            'lp__item--dragover': dragOver === n && dragFrom !== n,
            'lp__item--dragging': dragFrom === n,
          }"
          draggable="true"
          @click="editor.setPage(n)"
          @contextmenu="onPageContext($event, n)"
          @dragstart="onDragStart($event, n)"
          @dragover="onDragOver($event, n)"
          @drop="onDrop($event, n)"
          @dragend="onDragEnd"
        >
          <span class="lp__frame">
            <canvas :ref="setCanvas(n - 1)" class="lp__canvas" />
            <span
              v-if="editor.pageAnnotations(n).length"
              class="lp__badge"
              :title="`${editor.pageAnnotations(n).length} annotation(s)`"
            >
              {{ editor.pageAnnotations(n).length }}
            </span>
          </span>
          <span class="lp__num">{{ n }}</span>
        </div>
        <p class="lp__hint">Drag pages to reorder · right-click for page actions</p>
      </div>

      <!-- Bookmarks -->
      <div v-else-if="editor.leftTab.value === 'bookmarks'" class="lp__list lp__list--flush">
        <p v-if="!flatOutline.length" class="lp__empty">This document has no bookmarks.</p>
        <button
          v-for="({ node, depth }, i) in flatOutline"
          :key="i"
          type="button"
          class="lp__bm"
          :style="{ paddingLeft: `${12 + depth * 14}px` }"
          :disabled="node.page === null"
          @click="node.page !== null && editor.setPage(node.page)"
        >
          <BaseIcon name="bookmark" :size="13" class="lp__bm-icon" />
          <span class="lp__bm-title">{{ node.title }}</span>
          <span v-if="node.page" class="lp__bm-page">{{ node.page }}</span>
        </button>
      </div>

      <!-- Search -->
      <div v-else-if="editor.leftTab.value === 'search'" class="lp__search">
        <form class="lp__search-form" @submit.prevent="submitSearch">
          <div class="lp__search-row">
            <input
              v-model="query"
              class="lp__input"
              type="search"
              placeholder="Find in document…"
              aria-label="Search text"
            />
            <button type="submit" class="lp__btn lp__btn--primary" :disabled="editor.searching.value || !query.trim()">
              <BaseIcon v-if="!editor.searching.value" name="search" :size="14" />
              <BaseIcon v-else name="refresh" :size="14" class="lp__spin" />
            </button>
          </div>
          <label class="lp__check">
            <input v-model="caseSensitive" type="checkbox" /> Match case
          </label>
          <div class="lp__search-row">
            <input
              v-model="replacement"
              class="lp__input"
              type="text"
              placeholder="Replace with…"
              aria-label="Replacement text"
            />
          </div>
          <div class="lp__search-row">
            <button
              type="button"
              class="lp__btn"
              :disabled="editor.searchActive.value < 0"
              @click="editor.replaceActive(replacement)"
            >
              Replace
            </button>
            <button
              type="button"
              class="lp__btn"
              :disabled="!editor.searchResults.value.length"
              @click="doReplaceAll"
            >
              Replace all
            </button>
          </div>
        </form>

        <div v-if="editor.searching.value" class="lp__progress">
          Searching… {{ editor.searchProgress.value }}%
        </div>
        <p v-else-if="replacedCount !== null" class="lp__hint">
          Replaced text on {{ replacedCount }} line{{ replacedCount === 1 ? '' : 's' }} — the
          document preview and export reflect the change.
        </p>
        <template v-else-if="editor.searchQuery.value">
          <div class="lp__search-meta">
            <span>{{ editor.searchResults.value.length }} result{{ editor.searchResults.value.length === 1 ? '' : 's' }}</span>
            <span v-if="editor.searchResults.value.length" class="lp__search-nav">
              <button type="button" class="lp__navbtn" title="Previous match" @click="editor.prevMatch()">
                <BaseIcon name="chevron-up" :size="14" />
              </button>
              <button type="button" class="lp__navbtn" title="Next match" @click="editor.nextMatch()">
                <BaseIcon name="chevron-down" :size="14" />
              </button>
            </span>
          </div>
          <div class="lp__results">
            <button
              v-for="(m, i) in editor.searchResults.value"
              :key="m.id"
              type="button"
              class="lp__result"
              :class="{ 'lp__result--active': i === editor.searchActive.value }"
              @click="editor.goToMatch(i)"
            >
              <span class="lp__result-page">p.{{ m.page }}</span>
              <span class="lp__result-text">
                {{ m.before }}<mark>{{ m.text }}</mark>{{ m.after }}
              </span>
            </button>
          </div>
        </template>
      </div>

      <!-- Comments -->
      <div v-else class="lp__list lp__list--flush">
        <p v-if="!comments.length" class="lp__empty">
          No annotations yet — everything you add shows up here for review.
        </p>
        <div v-for="a in comments" :key="a.id" class="lp__comment" @click="jumpTo(a)">
          <BaseIcon :name="TYPE_META[a.type]?.icon ?? 'edit'" :size="14" class="lp__comment-icon" />
          <div class="lp__comment-main">
            <span class="lp__comment-type">{{ TYPE_META[a.type]?.label ?? a.type }} · p.{{ a.page }}</span>
            <span v-if="commentText(a)" class="lp__comment-text">{{ commentText(a) }}</span>
          </div>
          <button
            type="button"
            class="lp__comment-del"
            title="Delete"
            @click.stop="editor.removeAnnotation(a.id)"
          >
            <BaseIcon name="trash" :size="13" />
          </button>
        </div>
      </div>
    </div>

    <ContextMenu
      v-if="pageMenu"
      :x="pageMenu.x"
      :y="pageMenu.y"
      :items="pageMenuItems"
      @pick="onPageMenuPick"
      @close="pageMenu = null"
    />
  </div>
</template>

<style scoped>
  .lp {
    display: flex;
    flex: none;
    border-right: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    min-height: 0;
  }
  .lp__rail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 6px;
    border-right: 1px solid hsl(var(--color-border));
    flex: none;
  }
  .lp__rail-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: var(--radius-md);
    background: none;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .lp__rail-btn:hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .lp__rail-btn--active {
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
  }
  .lp__rail-badge {
    position: absolute;
    top: 1px;
    right: 1px;
    min-width: 14px;
    height: 14px;
    padding: 0 3px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-primary));
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .lp__body {
    width: 230px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .lp--mobile .lp__body {
    position: absolute;
    left: 47px;
    top: 0;
    bottom: 0;
    z-index: 20;
    background: hsl(var(--color-surface));
    border-right: 1px solid hsl(var(--color-border));
    box-shadow: var(--shadow-xl);
  }
  .lp--mobile {
    position: relative;
  }
  .lp__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid hsl(var(--color-border));
    flex: none;
  }
  .lp__title {
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: hsl(var(--color-text-faint));
  }
  .lp__close {
    display: inline-flex;
    padding: 3px;
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
  }
  .lp__close:hover {
    background: hsl(var(--color-chip));
  }
  .lp__list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }
  .lp__list--flush {
    align-items: stretch;
    gap: 2px;
    padding: 8px;
  }
  .lp__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    border-radius: var(--radius-md);
    padding: 4px;
    transition: background 0.15s;
  }
  .lp__item--dragging {
    opacity: 0.45;
  }
  .lp__item--dragover {
    background: hsl(var(--color-primary) / 0.1);
    outline: 2px dashed hsl(var(--color-primary) / 0.5);
  }
  .lp__frame {
    position: relative;
    display: block;
    border: 2px solid transparent;
    border-radius: var(--radius-sm);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    background: #fff;
    line-height: 0;
    width: 140px;
    min-height: 60px;
  }
  .lp__item:hover .lp__frame {
    border-color: hsl(var(--color-border-strong));
  }
  .lp__item--active .lp__frame {
    border-color: hsl(var(--color-primary));
  }
  .lp__canvas {
    display: block;
    width: 100%;
    height: auto;
  }
  .lp__badge {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    background: hsl(var(--color-primary));
    color: #fff;
    font-size: 10.5px;
    font-weight: 700;
  }
  .lp__num {
    font-size: 11.5px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
  }
  .lp__item--active .lp__num {
    color: hsl(var(--color-primary));
  }
  .lp__hint {
    font-size: 11px;
    color: hsl(var(--color-text-faint));
    text-align: center;
    margin: 4px 0 0;
    padding: 0 6px;
  }
  .lp__empty {
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
    text-align: center;
    padding: 24px 12px;
    margin: 0;
  }

  /* Bookmarks */
  .lp__bm {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    padding: 7px 12px;
    border: none;
    border-radius: var(--radius-md);
    background: none;
    color: hsl(var(--color-text));
    font-size: 12.5px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  .lp__bm:hover:not(:disabled) {
    background: hsl(var(--color-chip));
  }
  .lp__bm:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .lp__bm-icon {
    color: hsl(var(--color-text-faint));
    flex: none;
  }
  .lp__bm-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lp__bm-page {
    font-size: 11px;
    color: hsl(var(--color-text-faint));
    font-variant-numeric: tabular-nums;
  }

  /* Search */
  .lp__search {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 12px;
    gap: 10px;
  }
  .lp__search-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: none;
  }
  .lp__search-row {
    display: flex;
    gap: 6px;
  }
  .lp__input {
    flex: 1;
    min-width: 0;
    height: 32px;
    padding: 0 10px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 12.5px;
  }
  .lp__input:focus {
    outline: 2px solid hsl(var(--color-primary) / 0.4);
    border-color: hsl(var(--color-primary));
  }
  .lp__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 32px;
    padding: 0 12px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    flex: 1;
  }
  .lp__btn:hover:not(:disabled) {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .lp__btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .lp__btn--primary {
    flex: none;
    width: 36px;
    background: hsl(var(--color-primary));
    border-color: hsl(var(--color-primary));
    color: #fff;
  }
  .lp__btn--primary:hover:not(:disabled) {
    background: hsl(var(--color-primary));
    color: #fff;
    filter: brightness(1.08);
  }
  .lp__check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
  }
  .lp__progress {
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-primary));
  }
  .lp__search-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    flex: none;
  }
  .lp__search-nav {
    display: flex;
    gap: 2px;
  }
  .lp__navbtn {
    display: inline-flex;
    padding: 4px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-sm);
    background: none;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
  }
  .lp__navbtn:hover {
    background: hsl(var(--color-chip));
  }
  .lp__results {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
  }
  .lp__result {
    display: flex;
    gap: 8px;
    padding: 7px 8px;
    border: none;
    border-radius: var(--radius-md);
    background: none;
    text-align: left;
    cursor: pointer;
    font-size: 12px;
    color: hsl(var(--color-text-muted));
    align-items: baseline;
  }
  .lp__result:hover {
    background: hsl(var(--color-chip));
  }
  .lp__result--active {
    background: hsl(var(--color-primary) / 0.1);
  }
  .lp__result-page {
    flex: none;
    font-weight: 700;
    font-size: 10.5px;
    color: hsl(var(--color-text-faint));
    font-variant-numeric: tabular-nums;
  }
  .lp__result-text {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.4;
  }
  .lp__result-text mark {
    background: rgb(250 204 21 / 0.6);
    border-radius: 2px;
    font-weight: 700;
    color: inherit;
  }
  .lp__spin {
    animation: lp-spin 1.1s linear infinite;
  }
  @keyframes lp-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Comments */
  .lp__comment {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    border-radius: var(--radius-md);
    cursor: pointer;
  }
  .lp__comment:hover {
    background: hsl(var(--color-chip));
  }
  .lp__comment-icon {
    color: hsl(var(--color-text-faint));
    flex: none;
    margin-top: 2px;
  }
  .lp__comment-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .lp__comment-type {
    font-size: 11px;
    font-weight: 700;
    color: hsl(var(--color-text-muted));
  }
  .lp__comment-text {
    font-size: 12px;
    color: hsl(var(--color-text-faint));
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .lp__comment-del {
    display: inline-flex;
    padding: 4px;
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: hsl(var(--color-text-faint));
    cursor: pointer;
    flex: none;
  }
  .lp__comment-del:hover {
    color: hsl(var(--color-danger));
    background: hsl(var(--color-danger) / 0.08);
  }
</style>
