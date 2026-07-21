<script setup lang="ts">
  /**
   * SignReviewModal — the "Review & Apply" step. Renders every signed page
   * with its flattened overlay painted using the exact placement math the
   * backend applies, so what's shown here is what downloads.
   */
  import { onBeforeUnmount, onMounted, ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import { usePdfDocument } from '@components/tools/redact/usePdfDocument'
  import { paintOverlayPreview, type PageOverlay } from './sign-compose'

  export interface ReviewItem {
    name: string
    file: File
    overlays: PageOverlay[]
    pageSizes: Record<number, { width: number; height: number }>
    /** True when the document has no elements and will be skipped. */
    skipped: boolean
  }

  const props = defineProps<{ items: ReviewItem[] }>()

  const emit = defineEmits<{
    close: []
    apply: []
  }>()

  interface PagePreview {
    page: number
    src: string
  }
  /** Previews per item index (documents render one after another). */
  const previews = ref<Record<number, PagePreview[]>>({})
  const generating = ref(true)

  const { load, renderPage, destroy } = usePdfDocument()
  const PREVIEW_WIDTH = 300

  async function generate(): Promise<void> {
    for (const [index, item] of props.items.entries()) {
      if (item.skipped || !item.overlays.length) continue
      try {
        await load(item.file)
        const list: PagePreview[] = []
        for (const overlay of item.overlays) {
          const size = item.pageSizes[overlay.page]
          if (!size) continue
          const canvas = globalThis.document.createElement('canvas')
          const scale = PREVIEW_WIDTH / size.width
          const rendered = await renderPage(canvas, overlay.page, scale)
          if (!rendered) continue
          const context = canvas.getContext('2d')
          if (!context) continue
          // renderPage draws at devicePixelRatio: paint in backing-store px.
          const pixelsPerPoint = canvas.width / rendered.pointWidth
          await paintOverlayPreview(context, overlay, size, pixelsPerPoint)
          list.push({ page: overlay.page, src: canvas.toDataURL('image/jpeg', 0.85) })
          previews.value = { ...previews.value, [index]: [...list] }
        }
      } catch {
        // Preview generation is best-effort; applying still works.
      }
    }
    generating.value = false
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') emit('close')
  }

  onMounted(() => {
    globalThis.addEventListener('keydown', onKeyDown)
    void generate()
  })
  onBeforeUnmount(() => {
    globalThis.removeEventListener('keydown', onKeyDown)
    destroy()
  })

  const signableCount = props.items.filter((item) => !item.skipped).length
</script>

<template>
  <Teleport to="body">
    <div
      class="sr__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Review and apply signatures"
      @click.self="emit('close')"
    >
      <div class="sr animate-fade-up">
        <header class="sr__head">
          <h3 class="sr__title"><BaseIcon name="eye" :size="18" /> Review before applying</h3>
          <button type="button" class="sr__close" aria-label="Close" @click="emit('close')">
            <BaseIcon name="x" :size="18" />
          </button>
        </header>

        <p class="sr__sub">
          This is exactly how your signed page{{ signableCount > 1 ? 's' : '' }} will look. Elements
          are flattened permanently into the PDF.
        </p>

        <div class="sr__body">
          <section v-for="(item, index) in items" :key="item.name + index" class="sr__doc">
            <div class="sr__doc-head">
              <BaseIcon name="file-text" :size="15" />
              <span class="sr__doc-name">{{ item.name }}</span>
              <span v-if="item.skipped" class="sr__doc-skip">
                <BaseIcon name="alert-circle" :size="12" /> No fields placed — skipped
              </span>
              <span v-else class="sr__doc-pages">
                {{ item.overlays.length }} page{{ item.overlays.length === 1 ? '' : 's' }} signed
              </span>
            </div>
            <div v-if="!item.skipped" class="sr__pages">
              <figure
                v-for="preview in previews[index] ?? []"
                :key="preview.page"
                class="sr__page"
              >
                <img :src="preview.src" :alt="`Signed preview of page ${preview.page}`" />
                <figcaption>Page {{ preview.page }}</figcaption>
              </figure>
              <div
                v-if="generating && (previews[index]?.length ?? 0) < item.overlays.length"
                class="sr__page sr__page--loading"
              >
                <BaseIcon name="refresh" :size="17" class="sr__spin" />
                <span>Rendering…</span>
              </div>
            </div>
          </section>
        </div>

        <footer class="sr__foot">
          <BaseButton variant="secondary" icon="chevron-left" @click="emit('close')">
            Keep editing
          </BaseButton>
          <BaseButton icon="check-circle" :disabled="!signableCount" @click="emit('apply')">
            Apply &amp; sign
          </BaseButton>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .sr__backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgb(9 14 26 / 0.55);
    backdrop-filter: blur(4px);
  }
  .sr {
    display: flex;
    flex-direction: column;
    width: min(760px, 100%);
    max-height: calc(100vh - 36px);
    border-radius: var(--radius-xl);
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    box-shadow: var(--shadow-xl);
    overflow: hidden;
  }
  .sr__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px 4px;
  }
  .sr__title {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0;
    font-size: 16.5px;
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.01em;
  }
  .sr__title > svg {
    color: hsl(var(--color-primary));
  }
  .sr__close {
    display: flex;
    padding: 7px;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: hsl(var(--color-text-faint));
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .sr__close:hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .sr__sub {
    margin: 4px 18px 12px;
    font-size: 13px;
    color: hsl(var(--color-text-muted));
  }
  .sr__body {
    flex: 1;
    overflow-y: auto;
    padding: 4px 18px 14px;
    display: grid;
    gap: 18px;
  }
  .sr__doc-head {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 12px;
    color: hsl(var(--color-text-muted));
    font-size: 13px;
    flex-wrap: wrap;
  }
  .sr__doc-name {
    font-weight: 700;
    color: hsl(var(--color-text));
    overflow-wrap: anywhere;
  }
  .sr__doc-pages {
    font-size: 12px;
    font-weight: 700;
    color: hsl(var(--color-success));
    background: hsl(var(--color-success) / 0.1);
    padding: 2px 9px;
    border-radius: var(--radius-full);
  }
  .sr__doc-skip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 700;
    color: hsl(var(--color-warning));
    background: hsl(var(--color-warning) / 0.1);
    padding: 2px 9px;
    border-radius: var(--radius-full);
  }
  .sr__pages {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .sr__page {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
  }
  .sr__page img {
    width: min(300px, 42vw);
    border-radius: 6px;
    border: 1px solid hsl(var(--color-border));
    box-shadow: var(--shadow-md);
    background: white;
  }
  .sr__page figcaption {
    font-size: 11.5px;
    font-weight: 700;
    color: hsl(var(--color-text-faint));
  }
  .sr__page--loading {
    justify-content: center;
    width: min(300px, 42vw);
    aspect-ratio: 3 / 4;
    border-radius: 6px;
    border: 1.5px dashed hsl(var(--color-border-strong));
    color: hsl(var(--color-text-faint));
    font-size: 12.5px;
    font-weight: 600;
  }
  .sr__spin {
    animation: sr-rotate 1.2s linear infinite;
  }
  .sr__foot {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px;
    border-top: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface-muted));
  }

  @keyframes sr-rotate {
    to {
      transform: rotate(360deg);
    }
  }
</style>
