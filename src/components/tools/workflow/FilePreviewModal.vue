<script setup lang="ts">
  /**
   * FilePreviewModal — full preview of a selected file before processing.
   *
   * PDFs render page-by-page through pdf.js with pager controls; images show
   * at natural fit. Closes on Esc, backdrop click or the close button, and
   * restores focus handling to the page. Purely client-side.
   */
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import { usePdfDocument } from '@components/tools/redact/usePdfDocument'

  const props = defineProps<{
    file: File
  }>()
  const emit = defineEmits<{ close: [] }>()

  const isPdf = computed(
    () => props.file.type === 'application/pdf' || /\.pdf$/i.test(props.file.name),
  )
  const imageUrl = ref<string | null>(null)

  const { pageCount, loading, error, load, renderPage, destroy } = usePdfDocument()
  const canvas = ref<HTMLCanvasElement | null>(null)
  const viewer = ref<HTMLElement | null>(null)
  const closeButton = ref<HTMLElement | null>(null)
  const page = ref(1)

  const sizeLabel = computed(() => {
    const bytes = props.file.size
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  })

  async function draw(): Promise<void> {
    await nextTick()
    if (!canvas.value || !viewer.value) return
    // Fit the page to the viewer width (minus padding), capped for quality.
    const available = Math.min(860, viewer.value.clientWidth - 32)
    const firstPass = await renderPage(canvas.value, page.value, 1)
    if (!firstPass || !canvas.value) return
    const scale = available / firstPass.pointWidth
    await renderPage(canvas.value, page.value, Math.max(0.2, Math.min(3, scale)))
  }

  watch(page, () => void draw())

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') emit('close')
    if (event.key === 'ArrowRight' && page.value < pageCount.value) page.value += 1
    if (event.key === 'ArrowLeft' && page.value > 1) page.value -= 1
  }

  onMounted(async () => {
    globalThis.document.addEventListener('keydown', onKeydown)
    globalThis.document.body.style.overflow = 'hidden'
    closeButton.value?.focus()
    if (isPdf.value) {
      await load(props.file)
      await draw()
    } else {
      imageUrl.value = URL.createObjectURL(props.file)
    }
  })

  onBeforeUnmount(() => {
    globalThis.document.removeEventListener('keydown', onKeydown)
    globalThis.document.body.style.overflow = ''
    destroy()
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  })
</script>

<template>
  <Teleport to="body">
    <div class="pf-preview" @click.self="emit('close')">
      <div class="pf-preview__panel" role="dialog" aria-modal="true" :aria-label="`Preview of ${file.name}`">
        <header class="pf-preview__head">
          <div class="pf-preview__title">
            <BaseIcon name="eye" :size="17" />
            <span class="pf-preview__name">{{ file.name }}</span>
            <span class="pf-preview__size">{{ sizeLabel }}</span>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="pf-preview__close"
            aria-label="Close preview"
            @click="emit('close')"
          >
            <BaseIcon name="x" :size="18" />
          </button>
        </header>

        <div ref="viewer" class="pf-preview__viewer">
          <div v-if="loading" class="pf-preview__loading">
            <BaseIcon name="refresh" :size="22" class="animate-spin-slow" />
            Rendering preview…
          </div>
          <div v-else-if="error" class="pf-preview__error">
            <BaseIcon name="alert-circle" :size="20" />
            {{ error }}
          </div>
          <img
            v-else-if="imageUrl"
            :src="imageUrl"
            :alt="`Preview of ${file.name}`"
            class="pf-preview__image"
          />
          <canvas v-show="isPdf && !loading && !error" ref="canvas" class="pf-preview__canvas" />
        </div>

        <footer v-if="isPdf && pageCount > 1" class="pf-preview__pager">
          <BaseButton
            variant="secondary"
            size="sm"
            icon="chevron-left"
            :disabled="page <= 1"
            aria-label="Previous page"
            @click="page -= 1"
          />
          <span class="pf-preview__page">Page {{ page }} of {{ pageCount }}</span>
          <BaseButton
            variant="secondary"
            size="sm"
            icon="chevron-right"
            :disabled="page >= pageCount"
            aria-label="Next page"
            @click="page += 1"
          />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .pf-preview {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    background: rgb(8 12 24 / 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(10px, 3vw, 28px);
    animation: fadeIn 0.2s ease;
  }
  .pf-preview__panel {
    display: flex;
    flex-direction: column;
    width: min(920px, 100%);
    max-height: 100%;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    overflow: hidden;
    animation: fadeUp 0.25s ease;
  }
  .pf-preview__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 16px;
    border-bottom: 1px solid hsl(var(--color-border));
  }
  .pf-preview__title {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    color: hsl(var(--color-text));
    font-weight: 700;
    font-size: 14px;
  }
  .pf-preview__name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .pf-preview__size {
    flex: none;
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
  }
  .pf-preview__close {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: var(--radius-md);
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .pf-preview__close:hover {
    background: hsl(var(--color-border-strong));
    color: hsl(var(--color-text));
  }
  .pf-preview__viewer {
    flex: 1;
    min-height: 200px;
    overflow: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 16px;
    background: hsl(var(--color-bg-alt));
  }
  .pf-preview__loading,
  .pf-preview__error {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: auto;
    padding: 40px 16px;
    color: hsl(var(--color-text-muted));
    font-size: 14px;
    font-weight: 600;
  }
  .pf-preview__error {
    color: hsl(var(--color-danger));
  }
  .pf-preview__canvas,
  .pf-preview__image {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    box-shadow: var(--shadow-md);
    background: #fff;
  }
  .pf-preview__pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 11px 16px;
    border-top: 1px solid hsl(var(--color-border));
  }
  .pf-preview__page {
    font-size: 13px;
    font-weight: 700;
    color: hsl(var(--color-text-muted));
    font-variant-numeric: tabular-nums;
  }
</style>
