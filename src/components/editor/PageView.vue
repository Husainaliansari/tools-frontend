<script setup lang="ts">
  /**
   * PageView — one page inside the continuous stage.
   *
   * Lazily renders its canvas only while `active` (near the viewport), frees
   * the backing store when scrolled far away, and hosts the interactive
   * overlays (annotate/content), search-hit highlights, alignment guides and
   * the optional layout grid. Placeholder geometry comes from the editor's
   * page-size table so the scroll height is stable before rendering.
   */
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import type { RenderTask } from 'pdfjs-dist'
  import AnnotationOverlay from './AnnotationOverlay.vue'
  import ContentLayer from './ContentLayer.vue'
  import { useEditor } from './useEditor'
  import { renderPageToCanvas } from '@/lib/pdf'

  const props = defineProps<{
    page: number
    /** Render the real canvas (page is in or near the viewport). */
    active: boolean
  }>()

  const editor = useEditor()
  const canvasEl = ref<HTMLCanvasElement | null>(null)
  const rendered = ref(false)

  let renderTask: RenderTask | null = null
  let renderSeq = 0

  const size = computed(() => editor.pageSizes.value[props.page - 1] ?? { w: 612, h: 792 })
  const cssWidth = computed(() => size.value.w * editor.scale.value)
  const cssHeight = computed(() => size.value.h * editor.scale.value)

  const overlayMetrics = computed(() => ({
    pointWidth: size.value.w,
    pointHeight: size.value.h,
    cssWidth: cssWidth.value,
    cssHeight: cssHeight.value,
  }))

  /** Search hits on this page, with their global result index. */
  const pageMatches = computed(() =>
    editor.searchResults.value
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.page === props.page),
  )

  const gridSize = computed(() => 36 * editor.scale.value)

  async function render(): Promise<void> {
    const canvas = canvasEl.value
    if (!canvas || !props.active) return
    const seq = ++renderSeq
    const page = await editor.getPage(props.page)
    if (!page || seq !== renderSeq) return
    renderTask?.cancel()
    const result = await renderPageToCanvas(page, canvas, editor.scale.value)
    if (!result || seq !== renderSeq) return
    renderTask = result.task
    try {
      await renderTask.promise
      rendered.value = true
      editor.registerPageCanvas(props.page, canvas)
    } catch (cause) {
      if ((cause as { name?: string })?.name !== 'RenderingCancelledException') throw cause
    }
  }

  function release(): void {
    renderSeq++
    renderTask?.cancel()
    renderTask = null
    rendered.value = false
    editor.registerPageCanvas(props.page, null)
    const canvas = canvasEl.value
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
      canvas.style.width = ''
      canvas.style.height = ''
    }
  }

  watch(
    [() => props.active, () => editor.scale.value, () => editor.docTick.value],
    ([active]) => {
      if (active) void render()
      else release()
    },
    { immediate: true },
  )

  onBeforeUnmount(release)
</script>

<template>
  <div
    class="pv"
    :style="{ width: `${cssWidth}px`, height: `${cssHeight}px` }"
    :data-page="page"
  >
    <canvas ref="canvasEl" class="pv__canvas" />
    <div v-if="!rendered" class="pv__ghost">{{ page }}</div>

    <!-- Layout grid -->
    <div
      v-if="editor.showGrid.value && rendered"
      class="pv__grid"
      :style="{ backgroundSize: `${gridSize}px ${gridSize}px` }"
    />

    <!-- Search highlights -->
    <div v-if="pageMatches.length" class="pv__hits">
      <div
        v-for="{ m, i } in pageMatches"
        :key="m.id"
        class="pv__hit"
        :class="{ 'pv__hit--active': i === editor.searchActive.value }"
        :style="{
          left: `${m.box.x * editor.scale.value}px`,
          top: `${m.box.y * editor.scale.value}px`,
          width: `${m.box.w * editor.scale.value}px`,
          height: `${m.box.h * editor.scale.value}px`,
        }"
      />
    </div>

    <!-- Content layer: only while an Edit mode is active (lazy content parsing) -->
    <ContentLayer
      v-if="active && editor.editMode.value !== 'none'"
      :page="page"
      :metrics="overlayMetrics"
      class="pv__content-layer"
    />
    <!-- Annotation layer: always on top -->
    <AnnotationOverlay
      :page="page"
      :metrics="overlayMetrics"
      class="pv__annotation-layer"
    />

    <!-- Alignment guides (only meaningful on the page being dragged) -->
    <svg
      v-if="editor.guides.value.length && page === editor.currentPage.value"
      class="pv__guides"
      :width="cssWidth"
      :height="cssHeight"
    >
      <line
        v-for="(g, i) in editor.guides.value"
        :key="i"
        :x1="g.orientation === 'v' ? g.pos * editor.scale.value : 0"
        :y1="g.orientation === 'h' ? g.pos * editor.scale.value : 0"
        :x2="g.orientation === 'v' ? g.pos * editor.scale.value : cssWidth"
        :y2="g.orientation === 'h' ? g.pos * editor.scale.value : cssHeight"
      />
    </svg>
  </div>
</template>

<style scoped>
  .pv {
    position: relative;
    background: #fff;
    border-radius: 2px;
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.14),
      0 12px 34px -12px rgb(0 0 0 / 0.35);
    flex: none;
  }
  .pv__canvas {
    display: block;
    border-radius: 2px;
  }
  .pv__ghost {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 700;
    color: hsl(var(--color-border-strong));
    user-select: none;
  }
  .pv__grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(to right, rgb(37 99 235 / 0.09) 1px, transparent 1px),
      linear-gradient(to bottom, rgb(37 99 235 / 0.09) 1px, transparent 1px);
    z-index: 1;
  }
  .pv__hits {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
  }
  .pv__hit {
    position: absolute;
    background: rgb(250 204 21 / 0.45);
    border-radius: 2px;
    mix-blend-mode: multiply;
  }
  .pv__hit--active {
    background: rgb(249 115 22 / 0.55);
    outline: 1.5px solid rgb(234 88 12);
  }
  .pv__content-layer {
    position: absolute;
    inset: 0;
    z-index: 3;
  }
  .pv__annotation-layer {
    position: absolute;
    inset: 0;
    z-index: 5;
  }
  .pv__guides {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 10;
    overflow: visible;
  }
  .pv__guides line {
    stroke: hsl(var(--color-purple));
    stroke-width: 1;
    stroke-dasharray: 4 3;
  }
</style>
