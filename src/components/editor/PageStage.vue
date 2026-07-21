<script setup lang="ts">
  /**
   * PageStage — the continuous, virtualized document canvas.
   *
   * Renders every page as a lazily-painted <PageView> in one scroll column:
   * pages near the viewport get a real canvas, far pages stay as sized
   * placeholders so scrolling is smooth and memory stays flat on large
   * documents. Owns scroll-spy (which page is current), programmatic page
   * jumps, fit-width/fit-page, Ctrl+wheel zoom, pinch-to-zoom and hand-tool
   * panning.
   */
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import PageView from './PageView.vue'
  import { useEditor } from './useEditor'

  const editor = useEditor()

  const stageEl = ref<HTMLDivElement | null>(null)
  const pageEls = new Map<number, HTMLElement>()
  const setPageEl = (page: number) => (el: unknown) => {
    const prev = pageEls.get(page)
    if (el) {
      const node = el as HTMLElement
      pageEls.set(page, node)
      if (io && node !== prev) io.observe(node)
    } else {
      if (prev && io) io.unobserve(prev)
      pageEls.delete(page)
    }
  }

  /** Pages currently intersecting the (padded) viewport. */
  const visible = ref<Set<number>>(new Set())
  let io: IntersectionObserver | null = null

  const pages = computed(() => editor.pageCount.value)

  /** A page renders when it's within two pages of anything visible. */
  function isActive(page: number): boolean {
    if (!visible.value.size) return page <= 3
    let min = Number.POSITIVE_INFINITY
    let max = 0
    for (const p of visible.value) {
      if (p < min) min = p
      if (p > max) max = p
    }
    return page >= min - 2 && page <= max + 2
  }

  function rebuildObserver(): void {
    io?.disconnect()
    if (!stageEl.value) return
    io = new IntersectionObserver(
      (entries) => {
        const next = new Set(visible.value)
        for (const entry of entries) {
          const page = Number((entry.target as HTMLElement).dataset.stagePage)
          if (!page) continue
          if (entry.isIntersecting) next.add(page)
          else next.delete(page)
        }
        visible.value = next
      },
      { root: stageEl.value, rootMargin: '600px 0px' },
    )
    for (const el of pageEls.values()) io.observe(el)
  }

  // ─── Scroll-spy: keep currentPage in sync while the user scrolls ───────────
  let spyRaf = 0
  let suppressSpy = false
  function onScroll(): void {
    if (spyRaf || suppressSpy) return
    spyRaf = globalThis.requestAnimationFrame(() => {
      spyRaf = 0
      const stage = stageEl.value
      if (!stage) return
      const mid = stage.getBoundingClientRect().top + stage.clientHeight / 2
      let best = editor.currentPage.value
      let bestDist = Number.POSITIVE_INFINITY
      for (const [page, el] of pageEls) {
        const r = el.getBoundingClientRect()
        const dist = Math.abs((r.top + r.bottom) / 2 - mid)
        if (dist < bestDist) {
          bestDist = dist
          best = page
        }
      }
      if (best !== editor.currentPage.value) editor.setPage(best, 'silent')
    })
  }

  function scrollToPage(page: number): void {
    const el = pageEls.get(page)
    const stage = stageEl.value
    if (!el || !stage) return
    suppressSpy = true
    stage.scrollTop = el.offsetTop - 16
    globalThis.setTimeout(() => {
      suppressSpy = false
    }, 80)
  }

  watch(
    () => editor.scrollTarget.value,
    (target) => {
      if (target) void nextTick(() => scrollToPage(target.page))
    },
  )

  // ─── Fit modes ──────────────────────────────────────────────────────────────
  function applyFit(): void {
    const stage = stageEl.value
    const size = editor.pageSizes.value[editor.currentPage.value - 1]
    if (!stage || !size || editor.fitMode.value === 'custom') return
    const isMobile = globalThis.innerWidth <= 640
    const padding = isMobile ? 16 : 48
    const widthScale = (stage.clientWidth - padding) / size.w
    const heightScale = (stage.clientHeight - padding) / size.h
    editor.setScale(
      editor.fitMode.value === 'page' ? Math.min(widthScale, heightScale) : widthScale,
    )
  }

  watch(
    () => editor.fitMode.value,
    (mode) => {
      if (mode !== 'custom') applyFit()
    },
  )
  watch(
    [() => editor.pageCount.value, () => editor.pageSizes.value, () => editor.docTick.value],
    async () => {
      await nextTick()
      applyFit()
      rebuildObserver()
    },
    { flush: 'post' },
  )

  // ─── Panning (hand tool) ───────────────────────────────────────────────────
  let pan: { x: number; y: number; left: number; top: number } | null = null
  function onStagePointerDown(event: PointerEvent): void {
    if (editor.activeTool.value !== 'hand' || event.button !== 0) return
    if (event.pointerType === 'touch') return // Let native touch scrolling handle it
    const stage = stageEl.value
    if (!stage) return
    pan = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop }
    globalThis.addEventListener('pointermove', onPanMove)
    globalThis.addEventListener('pointerup', onPanUp)
  }
  function onPanMove(event: PointerEvent): void {
    const stage = stageEl.value
    if (!stage || !pan) return
    stage.scrollLeft = pan.left - (event.clientX - pan.x)
    stage.scrollTop = pan.top - (event.clientY - pan.y)
  }
  function onPanUp(): void {
    pan = null
    globalThis.removeEventListener('pointermove', onPanMove)
    globalThis.removeEventListener('pointerup', onPanUp)
  }

  // ─── Zoom anchored to the pointer ──────────────────────────────────────────
  async function zoomAnchored(newScale: number, clientX: number, clientY: number): Promise<void> {
    const stage = stageEl.value
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    const old = editor.scale.value
    // Content coordinates (scale-independent) of the pointer.
    const cx = (stage.scrollLeft + px) / old
    const cy = (stage.scrollTop + py) / old
    editor.fitMode.value = 'custom'
    editor.setScale(newScale)
    await nextTick()
    const applied = editor.scale.value
    stage.scrollLeft = cx * applied - px
    stage.scrollTop = cy * applied - py
  }

  function onWheel(event: WheelEvent): void {
    if (!event.ctrlKey) return
    event.preventDefault()
    let delta = event.deltaY
    if (Math.abs(delta) >= 100) delta = Math.sign(delta) * 20
    const target = Math.min(5, Math.max(0.25, editor.scale.value * Math.exp(-delta * 0.008)))
    void zoomAnchored(target, event.clientX, event.clientY)
  }

  // ─── Touch gestures (pinch-to-zoom) ────────────────────────────────────────
  let touchStartDist = 0
  let touchStartScale = 1

  function onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      event.preventDefault()
      const [t1, t2] = [event.touches[0], event.touches[1]]
      touchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      touchStartScale = editor.scale.value
    }
  }
  function onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 2 && touchStartDist > 0) {
      event.preventDefault()
      const [t1, t2] = [event.touches[0], event.touches[1]]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      const target = Math.min(5, Math.max(0.25, touchStartScale * (dist / touchStartDist)))
      void zoomAnchored(target, (t1.clientX + t2.clientX) / 2, (t1.clientY + t2.clientY) / 2)
    }
  }
  function onTouchEnd(event: TouchEvent): void {
    if (event.touches.length < 2) touchStartDist = 0
  }

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    applyFit()
    rebuildObserver()
    resizeObserver = new ResizeObserver(() => applyFit())
    const stage = stageEl.value
    if (stage) {
      resizeObserver.observe(stage)
      stage.addEventListener('touchstart', onTouchStart, { passive: false })
      stage.addEventListener('touchmove', onTouchMove, { passive: false })
      stage.addEventListener('touchend', onTouchEnd)
      stage.addEventListener('touchcancel', onTouchEnd)
    }
  })
  onBeforeUnmount(() => {
    io?.disconnect()
    resizeObserver?.disconnect()
    if (spyRaf) globalThis.cancelAnimationFrame(spyRaf)
    onPanUp()
    const stage = stageEl.value
    if (stage) {
      stage.removeEventListener('touchstart', onTouchStart)
      stage.removeEventListener('touchmove', onTouchMove)
      stage.removeEventListener('touchend', onTouchEnd)
      stage.removeEventListener('touchcancel', onTouchEnd)
    }
  })
</script>

<template>
  <div
    ref="stageEl"
    class="stage"
    :class="{ 'stage--grab': editor.activeTool.value === 'hand', 'stage--grabbing': !!pan }"
    @pointerdown="onStagePointerDown"
    @wheel="onWheel"
    @scroll.passive="onScroll"
  >
    <div v-if="editor.loading.value" class="stage__status">
      <BaseIcon name="refresh" :size="18" class="stage__spin" /> Loading document…
    </div>
    <div v-else-if="editor.error.value" class="stage__status stage__status--error">
      <BaseIcon name="alert-circle" :size="18" /> {{ editor.error.value }}
    </div>

    <div v-else class="stage__column">
      <div
        v-for="n in pages"
        :key="n"
        :ref="setPageEl(n)"
        class="stage__slot"
        :data-stage-page="n"
      >
        <PageView :page="n" :active="isActive(n)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
  .stage {
    position: relative;
    flex: 1;
    overflow: auto;
    background:
      radial-gradient(hsl(var(--color-border)) 1px, transparent 1px) 0 0 / 24px 24px,
      hsl(var(--color-bg-alt));
    padding: 16px;
    scroll-behavior: auto;
  }
  @media (max-width: 640px) {
    .stage {
      padding: 8px;
    }
  }
  .stage--grab {
    cursor: grab;
  }
  .stage--grabbing {
    cursor: grabbing;
  }
  .stage__status {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-size: 14px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
  }
  .stage__status--error {
    color: hsl(var(--color-danger));
    text-align: center;
    padding: 0 24px;
  }
  .stage__spin {
    animation: stage-rotate 1.1s linear infinite;
  }
  .stage__column {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    width: fit-content;
    min-width: 100%;
  }
  .stage__slot {
    flex: none;
  }
  @keyframes stage-rotate {
    to {
      transform: rotate(360deg);
    }
  }
</style>
