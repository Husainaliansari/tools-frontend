<script setup lang="ts">
  /**
   * WatermarkPreview — instant client-side approximation of the stamped page.
   *
   * Renders a mock A4 page (595×842 pt) with skeleton "content" lines and
   * overlays the watermark using the same anchor/offset/rotation math as the
   * backend overlay engine, scaled from PDF points to on-screen pixels.
   */
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { FONT_STACKS, type WatermarkPreviewState } from './watermark-types'

  const props = defineProps<{
    state: WatermarkPreviewState
    /** Object URL of the uploaded watermark image (image mode). */
    imageUrl?: string | null
  }>()

  // A4 portrait in PDF points — the reference space for all measurements.
  const PAGE_W = 595
  const PAGE_H = 842
  const MM_TO_PT = 72 / 25.4

  const pageEl = ref<HTMLDivElement | null>(null)
  /** Pixels per PDF point, kept in sync with the rendered page width. */
  const pxPerPt = ref(0.4)
  let observer: ResizeObserver | null = null

  onMounted(() => {
    observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) pxPerPt.value = width / PAGE_W
    })
    if (pageEl.value) observer.observe(pageEl.value)
  })
  onBeforeUnmount(() => observer?.disconnect())

  const px = (pt: number) => pt * pxPerPt.value

  const marginPt = computed(() => props.state.marginMm * MM_TO_PT)
  const offsetXPt = computed(() => props.state.offsetXmm * MM_TO_PT)
  const offsetYPt = computed(() => props.state.offsetYmm * MM_TO_PT)

  /** left/top/right/bottom anchoring per 3×3 position (mirrors the backend). */
  const anchorStyle = computed<Record<string, string>>(() => {
    const position = props.state.position
    const [vertical, horizontal] =
      position === 'center' ? ['center', 'center'] : position.split('-')
    const style: Record<string, string> = {}
    const translate: string[] = []

    if (horizontal === 'left') style.left = `${px(marginPt.value)}px`
    else if (horizontal === 'right') style.right = `${px(marginPt.value)}px`
    else {
      style.left = '50%'
      translate.push('translateX(-50%)')
    }
    if (vertical === 'top') style.top = `${px(marginPt.value)}px`
    else if (vertical === 'bottom') style.bottom = `${px(marginPt.value)}px`
    else {
      style.top = '50%'
      translate.push('translateY(-50%)')
    }

    // Offsets follow screen conventions (+x right, +y down); PDF rotation is
    // counter-clockwise, CSS is clockwise — hence the sign flip.
    translate.push(`translate(${px(offsetXPt.value)}px, ${px(offsetYPt.value)}px)`)
    translate.push(`rotate(${-props.state.rotation}deg)`)
    style.transform = translate.join(' ')
    return style
  })

  const textStyle = computed<Record<string, string>>(() => ({
    fontFamily: FONT_STACKS[props.state.fontFamily],
    fontWeight: props.state.bold ? '700' : '400',
    fontStyle: props.state.italic ? 'italic' : 'normal',
    textDecoration: props.state.underline ? 'underline' : 'none',
    fontSize: `${px(props.state.fontSize)}px`,
    letterSpacing: `${px(props.state.letterSpacing)}px`,
    lineHeight: `${props.state.lineHeight}`,
    color: props.state.color,
    textAlign: props.state.align,
  }))

  /** Sizing box for the image stamp (aspect kept → square fit box). */
  const imageBoxStyle = computed<Record<string, string>>(() => {
    if (props.state.keepAspect) {
      const target = px(Math.min(PAGE_W, PAGE_H) * props.state.scale)
      return { width: `${target}px`, height: `${target}px` }
    }
    return {
      width: `${px(PAGE_W * props.state.scaleX)}px`,
      height: `${px(PAGE_H * props.state.scaleY)}px`,
    }
  })

  /** Tile grid gaps roughly matching the backend's stamp steps. */
  const tileStyle = computed<Record<string, string>>(() => ({
    transform: `rotate(${-props.state.rotation}deg)`,
    columnGap: `${px(Math.max(props.state.fontSize * 2, 48))}px`,
    rowGap: `${px(Math.max(props.state.fontSize * 1.6, 48))}px`,
  }))

  const showText = computed(() => props.state.mode === 'text' && props.state.text.trim() !== '')
  const showImage = computed(() => props.state.mode === 'image' && !!props.imageUrl)

  // Enough copies to cover the rotated, oversized tile plane.
  const TILE_COUNT = 60
</script>

<template>
  <div class="pf-wmprev">
    <div ref="pageEl" class="pf-wmprev__page" aria-hidden="true">
      <!-- Watermark layer -->
      <div
        class="pf-wmprev__stamp-layer"
        :class="{ 'pf-wmprev__stamp-layer--below': state.layer === 'below' }"
        :style="{ opacity: state.opacity }"
      >
        <!-- Tiled -->
        <div
          v-if="(showText || showImage) && state.tile"
          class="pf-wmprev__tiles"
          :style="tileStyle"
        >
          <template v-for="i in TILE_COUNT" :key="i">
            <span v-if="showText" class="pf-wmprev__text" :style="textStyle">{{ state.text }}</span>
            <span v-else class="pf-wmprev__imgbox" :style="imageBoxStyle">
              <img
                :src="imageUrl!"
                :class="state.keepAspect ? 'pf-wmprev__img--contain' : 'pf-wmprev__img--fill'"
                alt=""
              />
            </span>
          </template>
        </div>

        <!-- Single, anchored -->
        <template v-else>
          <span
            v-if="showText"
            class="pf-wmprev__text pf-wmprev__stamp"
            :style="{ ...anchorStyle, ...textStyle }"
            >{{ state.text }}</span
          >
          <span
            v-else-if="showImage"
            class="pf-wmprev__imgbox pf-wmprev__stamp"
            :style="{ ...anchorStyle, ...imageBoxStyle }"
          >
            <img
              :src="imageUrl!"
              :class="state.keepAspect ? 'pf-wmprev__img--contain' : 'pf-wmprev__img--fill'"
              alt=""
            />
          </span>
        </template>
      </div>

      <!-- Skeleton page content -->
      <div class="pf-wmprev__content">
        <div class="pf-wmprev__line pf-wmprev__line--title" />
        <div class="pf-wmprev__line" style="width: 92%" />
        <div class="pf-wmprev__line" style="width: 100%" />
        <div class="pf-wmprev__line" style="width: 86%" />
        <div class="pf-wmprev__line" style="width: 95%" />
        <div class="pf-wmprev__line pf-wmprev__line--gap" style="width: 64%" />
        <div class="pf-wmprev__line" style="width: 100%" />
        <div class="pf-wmprev__line" style="width: 90%" />
        <div class="pf-wmprev__line" style="width: 97%" />
        <div class="pf-wmprev__line" style="width: 72%" />
        <div class="pf-wmprev__line pf-wmprev__line--gap" style="width: 88%" />
        <div class="pf-wmprev__line" style="width: 100%" />
        <div class="pf-wmprev__line" style="width: 81%" />
      </div>
    </div>
    <div class="pf-wmprev__caption">Live preview — approximate rendering</div>
  </div>
</template>

<style scoped>
  .pf-wmprev {
    width: 100%;
  }
  /* The mock page is deliberately paper-white in both themes, like a PDF
     viewer, so watermark colors read true. */
  .pf-wmprev__page {
    position: relative;
    width: 100%;
    aspect-ratio: 595 / 842;
    background: #ffffff;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .pf-wmprev__stamp-layer {
    position: absolute;
    inset: 0;
    z-index: 2;
    transition: opacity 0.15s ease;
  }
  .pf-wmprev__stamp-layer--below {
    z-index: 1;
  }

  .pf-wmprev__stamp {
    position: absolute;
  }
  .pf-wmprev__text {
    display: inline-block;
    white-space: pre;
    transition:
      color 0.15s ease,
      font-size 0.15s ease;
  }
  .pf-wmprev__imgbox {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .pf-wmprev__imgbox img {
    width: 100%;
    height: 100%;
  }
  .pf-wmprev__img--contain {
    object-fit: contain;
  }
  .pf-wmprev__img--fill {
    object-fit: fill;
  }

  .pf-wmprev__tiles {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 250%;
    height: 250%;
    translate: -50% -50%;
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    justify-content: center;
    align-items: center;
  }

  /* Skeleton content: fixed light grays — it plays a white printed page. */
  .pf-wmprev__content {
    position: relative;
    z-index: 1;
    padding: 9% 8%;
    display: flex;
    flex-direction: column;
    gap: 3.2%;
    height: 100%;
    box-sizing: border-box;
  }
  .pf-wmprev__stamp-layer--below ~ .pf-wmprev__content {
    z-index: 2;
    pointer-events: none;
  }
  .pf-wmprev__line {
    height: 2.1%;
    border-radius: 99px;
    background: #e5e7eb;
    flex: none;
  }
  .pf-wmprev__line--title {
    height: 3.4%;
    width: 46%;
    background: #d1d5db;
    margin-bottom: 2%;
  }
  .pf-wmprev__line--gap {
    margin-bottom: 3%;
  }

  .pf-wmprev__caption {
    margin-top: 8px;
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
  }
</style>
