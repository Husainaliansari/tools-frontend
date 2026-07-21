<script setup lang="ts">
  /**
   * SignaturePad — a smooth freehand drawing surface for signatures.
   *
   * Strokes are captured from pointer events and rendered with quadratic
   * midpoint smoothing plus velocity-based width, which reads like real ink
   * rather than a jagged polyline. The parent pulls the result with
   * `toDataUrl()` (trimmed to the drawn bounds, transparent background).
   */
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

  const props = withDefaults(
    defineProps<{
      color?: string
      /** Base stroke width in CSS px. */
      strokeWidth?: number
    }>(),
    { color: '#1f2430', strokeWidth: 2.5 },
  )

  const emit = defineEmits<{ 'update:empty': [empty: boolean] }>()

  interface Point {
    x: number
    y: number
    /** Per-point width after velocity smoothing. */
    w: number
  }
  interface Stroke {
    color: string
    points: Point[]
  }

  const canvasEl = ref<HTMLCanvasElement | null>(null)
  const strokes = ref<Stroke[]>([])
  const drawing = ref(false)

  let context: CanvasRenderingContext2D | null = null
  let current: Stroke | null = null
  let lastTime = 0
  let lastWidth = 0
  let resizeObserver: ResizeObserver | null = null

  function dpr(): number {
    return Math.min(3, globalThis.devicePixelRatio || 1)
  }

  function resizeCanvas(): void {
    const canvas = canvasEl.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    canvas.width = Math.round(rect.width * dpr())
    canvas.height = Math.round(rect.height * dpr())
    redraw()
  }

  function localPoint(event: PointerEvent): { x: number; y: number } {
    const rect = canvasEl.value!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  /** Ink feel: fast movement thins the line, slow movement thickens it. */
  function velocityWidth(distance: number, elapsed: number): number {
    const speed = distance / Math.max(1, elapsed) // px per ms
    const target = props.strokeWidth * Math.max(0.45, Math.min(1.35, 1.35 - speed * 0.5))
    lastWidth = lastWidth ? lastWidth * 0.7 + target * 0.3 : target
    return lastWidth
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    event.preventDefault()
    canvasEl.value?.setPointerCapture(event.pointerId)
    drawing.value = true
    lastTime = event.timeStamp
    lastWidth = props.strokeWidth
    const { x, y } = localPoint(event)
    current = { color: props.color, points: [{ x, y, w: props.strokeWidth }] }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!drawing.value || !current) return
    const { x, y } = localPoint(event)
    const previous = current.points[current.points.length - 1]
    const distance = Math.hypot(x - previous.x, y - previous.y)
    if (distance < 1.2) return
    const width = velocityWidth(distance, event.timeStamp - lastTime)
    lastTime = event.timeStamp
    current.points.push({ x, y, w: width })
    drawStrokeTail(current)
  }

  function onPointerUp(): void {
    if (!drawing.value) return
    drawing.value = false
    if (current && current.points.length > 0) {
      strokes.value = [...strokes.value, current]
      emit('update:empty', false)
    }
    current = null
    redraw()
  }

  /** Paint just the newest segment while drawing (cheap incremental update). */
  function drawStrokeTail(stroke: Stroke): void {
    if (!context) return
    const points = stroke.points
    if (points.length < 2) return
    const scale = dpr()
    context.save()
    context.scale(scale, scale)
    drawSegment(context, stroke, points.length - 2)
    context.restore()
  }

  /** One smoothed segment: quadratic curve through the midpoints. */
  function drawSegment(ctx: CanvasRenderingContext2D, stroke: Stroke, index: number): void {
    const points = stroke.points
    const p0 = points[Math.max(0, index - 1)]
    const p1 = points[index]
    const p2 = points[index + 1]
    const m1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }
    const m2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
    ctx.beginPath()
    ctx.moveTo(m1.x, m1.y)
    ctx.quadraticCurveTo(p1.x, p1.y, m2.x, m2.y)
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = p2.w
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    const points = stroke.points
    if (points.length === 1) {
      const point = points[0]
      ctx.beginPath()
      ctx.arc(point.x, point.y, point.w / 2, 0, Math.PI * 2)
      ctx.fillStyle = stroke.color
      ctx.fill()
      return
    }
    for (let index = 0; index < points.length - 1; index += 1) {
      drawSegment(ctx, stroke, index)
    }
  }

  function redraw(): void {
    const canvas = canvasEl.value
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    const scale = dpr()
    context.save()
    context.scale(scale, scale)
    for (const stroke of strokes.value) drawStroke(context, stroke)
    if (current) drawStroke(context, current)
    context.restore()
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  function clear(): void {
    strokes.value = []
    current = null
    redraw()
    emit('update:empty', true)
  }

  function undoStroke(): void {
    if (!strokes.value.length) return
    strokes.value = strokes.value.slice(0, -1)
    redraw()
    emit('update:empty', strokes.value.length === 0)
  }

  function isEmpty(): boolean {
    return strokes.value.length === 0
  }

  /** Export the drawing trimmed to its bounds (padded, transparent PNG). */
  function toDataUrl(): string | null {
    const canvas = canvasEl.value
    if (!canvas || !strokes.value.length) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const stroke of strokes.value) {
      for (const point of stroke.points) {
        minX = Math.min(minX, point.x - point.w)
        minY = Math.min(minY, point.y - point.w)
        maxX = Math.max(maxX, point.x + point.w)
        maxY = Math.max(maxY, point.y + point.w)
      }
    }
    const pad = 6
    const scale = dpr()
    const width = Math.max(1, Math.ceil((maxX - minX + pad * 2) * scale))
    const height = Math.max(1, Math.ceil((maxY - minY + pad * 2) * scale))
    const out = globalThis.document.createElement('canvas')
    out.width = width
    out.height = height
    const outContext = out.getContext('2d')
    if (!outContext) return null
    outContext.scale(scale, scale)
    outContext.translate(pad - minX, pad - minY)
    for (const stroke of strokes.value) drawStroke(outContext, stroke)
    return out.toDataURL('image/png')
  }

  defineExpose({ clear, undoStroke, isEmpty, toDataUrl })

  watch(strokes, () => redraw(), { deep: false })

  onMounted(() => {
    context = canvasEl.value?.getContext('2d') ?? null
    resizeCanvas()
    resizeObserver = new ResizeObserver(() => resizeCanvas())
    if (canvasEl.value) resizeObserver.observe(canvasEl.value)
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
  })
</script>

<template>
  <div class="sp" :class="{ 'sp--drawing': drawing }">
    <canvas
      ref="canvasEl"
      class="sp__canvas"
      aria-label="Signature drawing area"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
    />
    <div class="sp__baseline" aria-hidden="true">
      <span class="sp__cross">×</span>
      <span class="sp__line" />
    </div>
  </div>
</template>

<style scoped>
  .sp {
    position: relative;
    border-radius: var(--radius-lg);
    border: 1.5px dashed hsl(var(--color-border-strong));
    background:
      linear-gradient(hsl(var(--color-surface)), hsl(var(--color-surface))) padding-box,
      hsl(var(--color-surface));
    transition: border-color 0.15s ease;
    overflow: hidden;
  }
  .sp--drawing,
  .sp:hover {
    border-color: hsl(var(--color-primary) / 0.55);
  }
  .sp__canvas {
    display: block;
    width: 100%;
    height: 220px;
    cursor: crosshair;
    touch-action: none;
  }
  .sp__baseline {
    position: absolute;
    left: 28px;
    right: 28px;
    bottom: 46px;
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: none;
    color: hsl(var(--color-text-faint));
  }
  .sp__cross {
    font-size: 15px;
    font-weight: 600;
    line-height: 1;
  }
  .sp__line {
    flex: 1;
    border-bottom: 1.5px solid hsl(var(--color-border-strong));
  }
</style>
