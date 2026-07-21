<script lang="ts">
  /** Module-scope counter: SVG gradient ids are document-global, so every
   * ring instance needs its own. */
  let ringInstanceCount = 0
</script>

<script setup lang="ts">
  /**
   * ProgressRing — bold circular progress indicator.
   *
   * A thick gradient arc (brand primary → accent color) over a muted track,
   * with a slot for center content (percentage, file counts, …). Scales with
   * its container: the SVG fills whatever width the parent gives it, so
   * responsiveness is a one-line CSS concern at the call site.
   */
  import { computed } from 'vue'

  const props = withDefaults(
    defineProps<{
      /** 0–100. Values outside the range are clamped. */
      progress: number
      /** Gradient end color (e.g. the tool's accent). */
      color?: string
      /** Accessible name announced by screen readers. */
      label?: string
    }>(),
    { color: 'hsl(var(--color-primary))', label: 'Overall progress' },
  )

  // Geometry: viewBox 120, radius leaves room for the 11-unit stroke.
  const RADIUS = 52
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  ringInstanceCount += 1
  const gradientId = `ring-gradient-${ringInstanceCount}`

  const clamped = computed(() => Math.min(100, Math.max(0, props.progress)))
  const dashOffset = computed(() => CIRCUMFERENCE * (1 - clamped.value / 100))
  const rounded = computed(() => Math.round(clamped.value))
</script>

<template>
  <div
    class="ring"
    role="progressbar"
    :aria-label="label"
    :aria-valuenow="rounded"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <svg class="ring__svg" viewBox="0 0 120 120">
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(var(--color-primary))" />
          <stop offset="100%" :stop-color="color" />
        </linearGradient>
      </defs>
      <circle class="ring__track" cx="60" cy="60" :r="RADIUS" />
      <circle
        class="ring__value"
        cx="60"
        cy="60"
        :r="RADIUS"
        :stroke="`url(#${gradientId})`"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <div class="ring__center">
      <slot />
    </div>
  </div>
</template>

<style scoped>
  .ring {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
  }
  .ring__svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
    display: block;
  }
  .ring__track {
    fill: none;
    stroke: hsl(var(--color-chip));
    stroke-width: 11;
  }
  .ring__value {
    fill: none;
    stroke-width: 11;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ring__center {
    position: absolute;
    inset: 12%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
</style>
