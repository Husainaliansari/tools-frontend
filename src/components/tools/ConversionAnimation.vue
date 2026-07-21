<script setup lang="ts">
  /**
   * ConversionAnimation — the hero visual for the processing stage.
   *
   * A vector scene of the source document feeding through a conversion core
   * into the destination document. The destination "prints" bottom-up in sync
   * with real progress; on completion the core's gear morphs into a drawn
   * checkmark and the output document pops. Pure SVG + CSS transforms — no
   * animation libraries, compositor-friendly, honours prefers-reduced-motion.
   */
  import { computed } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { formatMeta, type FormatGlyph, type FormatMeta } from '@constants/formats'
  import { hexAlpha } from '@utils'
  import type { PdfTool } from '@types'

  const props = withDefaults(
    defineProps<{
      tool: PdfTool
      /** 0–100 — drives the destination document reveal. */
      progress: number
      /** Source format, e.g. 'XLSX'. */
      sourceExt: string
      /** Destination format, e.g. 'PDF'. */
      targetExt: string
      /** 'done' switches the core to the checkmark state. */
      state?: 'processing' | 'done'
    }>(),
    { state: 'processing' },
  )

  const src = computed<FormatMeta>(() => formatMeta(props.sourceExt))
  const dst = computed<FormatMeta>(() => formatMeta(props.targetExt))
  const done = computed(() => props.state === 'done')
  const clamped = computed(() => Math.min(100, Math.max(0, props.progress)))

  /** Destination reveal: clip from the top, eased by a CSS transition. */
  const revealClip = computed(() => `inset(${100 - clamped.value}% 0 0 0)`)

  // ─── Document artwork (viewBox 0 0 88 112) ────────────────────────────────
  const DOC_BODY = 'M16 4 H54 L76 26 V100 A8 8 0 0 1 68 108 H16 A8 8 0 0 1 8 100 V12 A8 8 0 0 1 16 4 Z'
  const DOC_FOLD = 'M54 4 V18 A8 8 0 0 0 62 26 H76 Z'

  /** Content sketch per format family, drawn as a single stroked path. */
  const GLYPHS: Record<FormatGlyph, string> = {
    text: 'M24 44 H60 M24 56 H60 M24 68 H46',
    grid: 'M22 40 H62 V76 H22 Z M22 52 H62 M22 64 H62 M42 40 V76',
    image: 'M20 38 H64 V78 H20 Z M31 50 a5 5 0 1 0 0.1 0 M20 71 L34 57 L44 67 L52 59 L64 71',
    slides: 'M20 40 H64 V68 H20 Z M34 76 H50 M42 68 V76',
  }

  function badgeWidth(meta: FormatMeta): number {
    return meta.label.length * 7.6 + 15
  }

  const coreStyle = computed(() =>
    done.value
      ? {
          background: 'hsl(var(--color-success))',
          boxShadow: '0 12px 28px -10px hsl(var(--color-success) / 0.55)',
        }
      : {
          background: `linear-gradient(135deg, hsl(var(--color-primary)), ${props.tool.color})`,
          boxShadow: `0 12px 28px -10px ${hexAlpha(props.tool.color, 0.55)}`,
        },
  )

  const pipeInStyle = computed(() => ({
    background: `linear-gradient(90deg, ${src.value.color}, ${props.tool.color})`,
  }))
  const pipeOutStyle = computed(() => ({
    background: `linear-gradient(90deg, ${props.tool.color}, ${dst.value.color})`,
  }))

  const PARTICLES = [0, 1, 2]
</script>

<template>
  <div class="conv" :class="{ 'conv--done': done }" aria-hidden="true">
    <!-- Source document -->
    <div class="conv__doc conv__doc--src">
      <svg class="conv__docsvg" viewBox="0 0 88 112">
        <path
          :d="DOC_BODY"
          :fill="hexAlpha(src.color, 0.1)"
          :stroke="src.color"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path
          :d="DOC_FOLD"
          :fill="hexAlpha(src.color, 0.28)"
          :stroke="src.color"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path
          :d="GLYPHS[src.glyph]"
          fill="none"
          :stroke="src.color"
          stroke-width="3.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.55"
        />
        <rect
          :x="44 - badgeWidth(src) / 2"
          y="83"
          :width="badgeWidth(src)"
          height="19"
          rx="7.5"
          :fill="src.color"
        />
        <text class="conv__badge-text" x="44" y="96.5">{{ src.label }}</text>
      </svg>
    </div>

    <!-- Feed pipe -->
    <div class="conv__pipe">
      <span class="conv__pipe-line" :style="pipeInStyle"></span>
      <span
        v-for="p in PARTICLES"
        :key="p"
        class="conv__lane"
        :style="{ animationDelay: `${p * 0.5}s`, color: src.color }"
      ></span>
    </div>

    <!-- Conversion core -->
    <div class="conv__core" :style="coreStyle">
      <span class="conv__halo"></span>
      <span class="conv__halo conv__halo--late"></span>
      <svg class="conv__orbit" viewBox="0 0 72 72" :style="{ color: done ? 'hsl(var(--color-success))' : tool.color }">
        <circle cx="36" cy="36" r="33" />
      </svg>
      <span class="conv__gear"><BaseIcon name="settings" :size="26" /></span>
      <svg class="conv__check" viewBox="0 0 36 36">
        <path d="M10 19 L16 25 L27 12" />
      </svg>
      <span v-for="s in 4" :key="s" :class="['conv__spark', `conv__spark--${s}`]"></span>
    </div>

    <!-- Output pipe -->
    <div class="conv__pipe conv__pipe--out">
      <span class="conv__pipe-line" :style="pipeOutStyle"></span>
      <span
        v-for="p in PARTICLES"
        :key="p"
        class="conv__lane"
        :style="{ animationDelay: `${p * 0.5 + 0.25}s`, color: dst.color }"
      ></span>
    </div>

    <!-- Destination document: ghost outline + progress-revealed print -->
    <div class="conv__doc conv__doc--dst">
      <svg class="conv__docsvg conv__ghost" viewBox="0 0 88 112">
        <path :d="DOC_BODY" stroke-width="3" stroke-linejoin="round" stroke-dasharray="7 7" />
        <path :d="DOC_FOLD" stroke-width="3" stroke-linejoin="round" stroke-dasharray="7 7" />
        <path
          :d="GLYPHS[dst.glyph]"
          fill="none"
          stroke-width="3.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.5"
        />
        <rect
          :x="44 - badgeWidth(dst) / 2"
          y="83"
          :width="badgeWidth(dst)"
          height="19"
          rx="7.5"
          fill="none"
          stroke-width="2"
        />
        <text class="conv__badge-text conv__badge-text--ghost" x="44" y="96.5">
          {{ dst.label }}
        </text>
      </svg>
      <svg class="conv__docsvg conv__print" viewBox="0 0 88 112" :style="{ clipPath: revealClip }">
        <path
          :d="DOC_BODY"
          :fill="hexAlpha(dst.color, 0.1)"
          :stroke="dst.color"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path
          :d="DOC_FOLD"
          :fill="hexAlpha(dst.color, 0.28)"
          :stroke="dst.color"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path
          :d="GLYPHS[dst.glyph]"
          fill="none"
          :stroke="dst.color"
          stroke-width="3.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.55"
        />
        <rect
          :x="44 - badgeWidth(dst) / 2"
          y="83"
          :width="badgeWidth(dst)"
          height="19"
          rx="7.5"
          :fill="dst.color"
        />
        <text class="conv__badge-text" x="44" y="96.5">{{ dst.label }}</text>
      </svg>
    </div>
  </div>
</template>

<style scoped>
  .conv {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(6px, 2vw, 14px);
    max-width: 520px;
    margin: 0 auto;
    padding: 10px 0 6px;
  }

  /* ─── Documents ─────────────────────────────────────────────────────────── */
  .conv__doc {
    position: relative;
    flex: none;
    width: clamp(64px, 17vw, 92px);
  }
  .conv__docsvg {
    display: block;
    width: 100%;
    height: auto;
  }
  .conv__badge-text {
    fill: #fff;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.02em;
    text-anchor: middle;
    font-family: inherit;
  }
  .conv__badge-text--ghost {
    fill: hsl(var(--color-text-faint));
  }
  .conv__doc--src .conv__docsvg {
    animation: conv-feed 2.4s ease-in-out infinite;
  }
  .conv--done .conv__doc--src .conv__docsvg {
    animation: none;
    opacity: 0.55;
    transition: opacity 0.4s;
  }
  .conv__ghost {
    stroke: hsl(var(--color-border-strong));
    fill: hsl(var(--color-surface-muted));
  }
  .conv__ghost path[fill='none'],
  .conv__ghost rect {
    fill: none;
  }
  .conv__print {
    position: absolute;
    inset: 0;
    transition: clip-path 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .conv--done .conv__doc--dst {
    animation: conv-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* ─── Pipes & particles ─────────────────────────────────────────────────── */
  .conv__pipe {
    position: relative;
    flex: 1;
    min-width: 26px;
    max-width: 120px;
    height: 24px;
  }
  .conv__pipe-line {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 3px;
    transform: translateY(-50%);
    border-radius: 2px;
    opacity: 0.3;
  }
  .conv--done .conv__pipe-line {
    opacity: 0.55;
  }
  /* Full-width lane: translateX(100%) moves the dot exactly one track length,
     so particle travel stays correct at every viewport width. */
  .conv__lane {
    position: absolute;
    left: 0;
    top: 50%;
    width: 100%;
    height: 0;
    opacity: 0;
    animation: conv-flow 1.6s linear infinite;
  }
  .conv__lane::before {
    content: '';
    position: absolute;
    left: -4px;
    top: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 10px currentColor;
  }
  .conv--done .conv__lane {
    display: none;
  }

  /* ─── Conversion core ───────────────────────────────────────────────────── */
  .conv__core {
    position: relative;
    flex: none;
    width: clamp(52px, 13vw, 68px);
    aspect-ratio: 1;
    border-radius: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }
  .conv__halo {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 2px solid currentColor;
    opacity: 0;
    animation: conv-halo 2.2s ease-out infinite;
    pointer-events: none;
  }
  .conv__halo--late {
    animation-delay: 1.1s;
  }
  .conv--done .conv__halo {
    animation: none;
  }
  .conv__orbit {
    position: absolute;
    inset: -12px;
    animation: conv-rotate 9s linear infinite reverse;
  }
  .conv__orbit circle {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-dasharray: 3 12;
    opacity: 0.6;
  }
  .conv--done .conv__orbit {
    animation: none;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .conv__gear {
    display: flex;
    animation: conv-rotate 6s linear infinite;
    transition:
      transform 0.3s,
      opacity 0.3s;
  }
  .conv--done .conv__gear {
    animation: none;
    transform: scale(0);
    opacity: 0;
  }
  .conv__check {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 16%;
  }
  .conv__check path {
    fill: none;
    stroke: #fff;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 34;
    stroke-dashoffset: 34;
  }
  .conv--done .conv__check path {
    animation: conv-draw 0.45s ease 0.15s forwards;
  }

  /* Sparks: pulsing motes while processing, radial burst on completion. */
  .conv__spark {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fff;
    opacity: 0;
    animation: conv-spark 1.8s ease-in-out infinite;
    pointer-events: none;
  }
  .conv__spark--1 {
    top: -8px;
    left: 12%;
    --tx: -18px;
    --ty: -22px;
  }
  .conv__spark--2 {
    top: -4px;
    right: 4%;
    --tx: 20px;
    --ty: -18px;
    animation-delay: 0.45s;
  }
  .conv__spark--3 {
    bottom: -6px;
    left: 4%;
    --tx: -20px;
    --ty: 18px;
    animation-delay: 0.9s;
  }
  .conv__spark--4 {
    bottom: -9px;
    right: 12%;
    --tx: 18px;
    --ty: 22px;
    animation-delay: 1.35s;
  }
  .conv--done .conv__spark {
    background: hsl(var(--color-success));
    animation: conv-burst 0.6s ease-out forwards;
  }

  /* ─── Keyframes ─────────────────────────────────────────────────────────── */
  @keyframes conv-feed {
    0%,
    100% {
      transform: translate(0, 0);
    }
    50% {
      transform: translate(4px, -3px);
    }
  }
  @keyframes conv-flow {
    0% {
      transform: translateX(0);
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    85% {
      opacity: 1;
    }
    100% {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  @keyframes conv-rotate {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes conv-halo {
    0% {
      transform: scale(1);
      opacity: 0.5;
    }
    100% {
      transform: scale(1.7);
      opacity: 0;
    }
  }
  @keyframes conv-draw {
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes conv-pop {
    0% {
      transform: scale(1);
    }
    45% {
      transform: scale(1.09);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes conv-spark {
    0%,
    100% {
      transform: scale(0);
      opacity: 0;
    }
    50% {
      transform: scale(1);
      opacity: 0.9;
    }
  }
  @keyframes conv-burst {
    0% {
      transform: translate(0, 0) scale(0.4);
      opacity: 1;
    }
    100% {
      transform: translate(var(--tx), var(--ty)) scale(1);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .conv__doc--src .conv__docsvg,
    .conv__lane,
    .conv__halo,
    .conv__orbit,
    .conv__gear,
    .conv__spark {
      animation: none;
    }
    .conv__lane {
      opacity: 0;
    }
    .conv--done .conv__doc--dst {
      animation: none;
    }
    .conv--done .conv__check path {
      animation: none;
      stroke-dashoffset: 0;
    }
    .conv__print {
      transition: none;
    }
  }
</style>
