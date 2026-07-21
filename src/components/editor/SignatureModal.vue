<script setup lang="ts">
  /**
   * SignatureModal — draw a signature (or initials) on a canvas pad.
   *
   * Emits `done` with a trimmed transparent PNG data URL; the shell stages it
   * on the image tool so the next click places it on the page.
   */
  import { onMounted, ref } from 'vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'

  const emit = defineEmits<{ done: [string]; close: [] }>()

  const padEl = ref<HTMLCanvasElement | null>(null)
  const hasInk = ref(false)
  const color = ref('#1e3a8a')
  const COLORS = ['#1e3a8a', '#111827', '#b91c1c']

  let ctx: CanvasRenderingContext2D | null = null
  let drawing = false
  let last: { x: number; y: number } | null = null

  function toLocal(event: PointerEvent): { x: number; y: number } {
    const rect = padEl.value!.getBoundingClientRect()
    const k = padEl.value!.width / rect.width
    return { x: (event.clientX - rect.left) * k, y: (event.clientY - rect.top) * k }
  }

  function onDown(event: PointerEvent): void {
    if (!ctx) return
    drawing = true
    last = toLocal(event)
    padEl.value?.setPointerCapture(event.pointerId)
  }
  function onMove(event: PointerEvent): void {
    if (!drawing || !ctx || !last) return
    const p = toLocal(event)
    ctx.strokeStyle = color.value
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last = p
    hasInk.value = true
  }
  function onUp(): void {
    drawing = false
    last = null
  }

  function clear(): void {
    const canvas = padEl.value
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasInk.value = false
  }

  /** Crop the drawing to its ink bounds (plus padding) before exporting. */
  function save(): void {
    const canvas = padEl.value
    if (!canvas || !ctx || !hasInk.value) return
    const { width, height } = canvas
    const data = ctx.getImageData(0, 0, width, height).data
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 8) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return
    const pad = 8
    minX = Math.max(0, minX - pad)
    minY = Math.max(0, minY - pad)
    maxX = Math.min(width, maxX + pad)
    maxY = Math.min(height, maxY + pad)
    const out = globalThis.document.createElement('canvas')
    out.width = maxX - minX
    out.height = maxY - minY
    out.getContext('2d')?.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height)
    emit('done', out.toDataURL('image/png'))
    emit('close')
  }

  onMounted(() => {
    const canvas = padEl.value
    if (!canvas) return
    canvas.width = 760
    canvas.height = 280
    ctx = canvas.getContext('2d')
  })
</script>

<template>
  <Teleport to="body">
    <div class="sig" @click.self="emit('close')">
      <div class="sig__panel" role="dialog" aria-modal="true" aria-label="Draw signature">
        <div class="sig__head">
          <div class="sig__title"><BaseIcon name="file-signature" :size="18" /> Draw your signature</div>
          <button type="button" class="sig__x" aria-label="Close" @click="emit('close')">
            <BaseIcon name="x" :size="18" />
          </button>
        </div>
        <div class="sig__body">
          <canvas
            ref="padEl"
            class="sig__pad"
            @pointerdown="onDown"
            @pointermove="onMove"
            @pointerup="onUp"
            @pointercancel="onUp"
          />
          <div class="sig__row">
            <div class="sig__colors">
              <button
                v-for="c in COLORS"
                :key="c"
                type="button"
                class="sig__swatch"
                :class="{ 'sig__swatch--on': color === c }"
                :style="{ background: c }"
                :aria-label="`Ink color ${c}`"
                @click="color = c"
              />
            </div>
            <button type="button" class="sig__clear" :disabled="!hasInk" @click="clear">
              <BaseIcon name="eraser" :size="14" /> Clear
            </button>
          </div>
        </div>
        <div class="sig__foot">
          <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
          <BaseButton icon="check" :disabled="!hasInk" @click="save">Use signature</BaseButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .sig {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgb(2 6 23 / 0.55);
    backdrop-filter: blur(2px);
    animation: fadeIn 0.15s ease;
  }
  .sig__panel {
    width: 100%;
    max-width: 560px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    overflow: hidden;
  }
  .sig__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
    border-bottom: 1px solid hsl(var(--color-border));
  }
  .sig__title {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 16px;
    font-weight: 700;
    color: hsl(var(--color-text));
  }
  .sig__x {
    background: none;
    border: none;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-md);
  }
  .sig__x:hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .sig__body {
    padding: 18px;
  }
  .sig__pad {
    width: 100%;
    aspect-ratio: 760 / 280;
    border: 1.5px dashed hsl(var(--color-border-strong));
    border-radius: var(--radius-lg);
    background:
      linear-gradient(transparent calc(100% - 56px), hsl(var(--color-border)) calc(100% - 56px), hsl(var(--color-border)) calc(100% - 55px), transparent calc(100% - 55px)),
      hsl(var(--color-surface-muted));
    cursor: crosshair;
    touch-action: none;
    display: block;
  }
  .sig__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
  }
  .sig__colors {
    display: flex;
    gap: 8px;
  }
  .sig__swatch {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    box-shadow: inset 0 0 0 2px hsl(var(--color-surface));
  }
  .sig__swatch--on {
    border-color: hsl(var(--color-primary));
  }
  .sig__clear {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: none;
    color: hsl(var(--color-text-muted));
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .sig__clear:hover:not(:disabled) {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .sig__clear:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .sig__foot {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 18px;
    border-top: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface-muted));
  }
</style>
