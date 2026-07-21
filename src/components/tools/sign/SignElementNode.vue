<script setup lang="ts">
  /**
   * SignElementNode — one placed element on the page overlay: renders its
   * content (bitmap, text, date or stamp) plus the selection chrome (corner
   * resize handles, a rotate handle and quick actions). All pointer math
   * lives in SignEditor; this node only reports which part was grabbed.
   */
  import { computed } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { elementFontString, isImageElement, type SignElement } from './sign-types'

  const props = defineProps<{
    element: SignElement
    /** Current viewer scale (CSS px per PDF point). */
    scale: number
    selected: boolean
    /** Hide chrome while its element is being dragged/rotated. */
    interacting: boolean
  }>()

  const emit = defineEmits<{
    grab: [event: PointerEvent]
    resize: [event: PointerEvent, corner: 'nw' | 'ne' | 'se' | 'sw']
    rotate: [event: PointerEvent]
    duplicate: []
    remove: []
  }>()

  const CORNERS = ['nw', 'ne', 'se', 'sw'] as const

  const boxStyle = computed(() => ({
    left: `${props.element.x * props.scale}px`,
    top: `${props.element.y * props.scale}px`,
    width: `${props.element.width * props.scale}px`,
    height: `${props.element.height * props.scale}px`,
    transform: props.element.rotation ? `rotate(${props.element.rotation}deg)` : undefined,
    opacity: props.element.opacity,
  }))

  const textStyle = computed(() => ({
    font: elementFontString(props.element, (props.element.fontSize ?? 16) * props.scale),
    color: props.element.color ?? '#1f2430',
  }))

  const stampStyle = computed(() => {
    const size = (props.element.fontSize ?? 16) * props.scale
    return {
      color: props.element.color ?? '#b91c1c',
      borderColor: props.element.color ?? '#b91c1c',
      fontSize: `${size}px`,
      borderWidth: `${Math.max(1.5, size * 0.14)}px`,
      borderRadius: `${size * 0.35}px`,
    }
  })

  const isImage = computed(() => isImageElement(props.element))
</script>

<template>
  <div
    class="sn"
    :class="{ 'sn--selected': selected, 'sn--interacting': interacting }"
    :style="boxStyle"
    @pointerdown="emit('grab', $event)"
  >
    <!-- Content -->
    <img v-if="isImage" class="sn__image" :src="element.src" alt="" draggable="false" />
    <span v-else-if="element.type === 'stamp'" class="sn__stamp" :style="stampStyle">
      {{ element.text }}
    </span>
    <span v-else class="sn__text" :style="textStyle">{{ element.text }}</span>

    <!-- Selection chrome -->
    <template v-if="selected">
      <span
        v-for="corner in CORNERS"
        :key="corner"
        class="sn__handle"
        :class="`sn__handle--${corner}`"
        @pointerdown.stop="emit('resize', $event, corner)"
      />
      <span class="sn__rotate-stem" aria-hidden="true" />
      <button
        type="button"
        class="sn__rotate"
        title="Drag to rotate"
        aria-label="Rotate element"
        @pointerdown.stop="emit('rotate', $event)"
      >
        <BaseIcon name="rotate-cw" :size="11" />
      </button>
      <div v-if="!interacting" class="sn__actions">
        <button
          type="button"
          class="sn__action"
          title="Duplicate (Ctrl+D)"
          aria-label="Duplicate element"
          @pointerdown.stop
          @click.stop="emit('duplicate')"
        >
          <BaseIcon name="copy" :size="13" />
        </button>
        <button
          type="button"
          class="sn__action sn__action--danger"
          title="Delete (Del)"
          aria-label="Delete element"
          @pointerdown.stop
          @click.stop="emit('remove')"
        >
          <BaseIcon name="trash" :size="13" />
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
  .sn {
    position: absolute;
    cursor: move;
    border-radius: 2px;
    outline: 1.5px dashed transparent;
    outline-offset: 2px;
    transition: outline-color 0.12s ease;
    user-select: none;
    touch-action: none;
  }
  .sn:hover {
    outline-color: hsl(var(--color-primary) / 0.45);
  }
  .sn--selected {
    outline: 1.5px solid hsl(var(--color-primary));
    z-index: 3;
  }

  .sn__image {
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }
  .sn__text {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    white-space: nowrap;
    overflow: visible;
    pointer-events: none;
    line-height: 1;
  }
  .sn__stamp {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-style: solid;
    font-weight: 800;
    letter-spacing: 0.08em;
    font-family: Arial, sans-serif;
    white-space: nowrap;
    overflow: hidden;
    pointer-events: none;
    line-height: 1;
  }

  /* Handles */
  .sn__handle {
    position: absolute;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: hsl(var(--color-surface));
    border: 2px solid hsl(var(--color-primary));
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
    z-index: 4;
  }
  .sn__handle--nw {
    top: -6px;
    left: -6px;
    cursor: nwse-resize;
  }
  .sn__handle--ne {
    top: -6px;
    right: -6px;
    cursor: nesw-resize;
  }
  .sn__handle--se {
    bottom: -6px;
    right: -6px;
    cursor: nwse-resize;
  }
  .sn__handle--sw {
    bottom: -6px;
    left: -6px;
    cursor: nesw-resize;
  }

  .sn__rotate-stem {
    position: absolute;
    top: -22px;
    left: 50%;
    width: 1.5px;
    height: 16px;
    background: hsl(var(--color-primary) / 0.6);
    transform: translateX(-50%);
    pointer-events: none;
  }
  .sn__rotate {
    position: absolute;
    top: -36px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid hsl(var(--color-primary));
    background: hsl(var(--color-surface));
    color: hsl(var(--color-primary));
    cursor: grab;
    z-index: 4;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
  }
  .sn__rotate:active {
    cursor: grabbing;
  }

  /* Quick actions above the element */
  .sn__actions {
    position: absolute;
    bottom: calc(100% + 34px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: var(--radius-md);
    background: hsl(var(--color-text) / 0.92);
    box-shadow: var(--shadow-md);
    z-index: 5;
    animation: fadeIn 0.15s ease;
  }
  .sn__action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: calc(var(--radius-md) - 3px);
    background: transparent;
    color: hsl(var(--color-surface));
    cursor: pointer;
    transition: background 0.12s;
  }
  .sn__action:hover {
    background: rgb(255 255 255 / 0.18);
  }
  .sn__action--danger:hover {
    background: hsl(var(--color-danger) / 0.85);
  }
</style>
